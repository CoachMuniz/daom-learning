import { NextResponse } from "next/server";
import { validateBotRequest, checkIdempotency } from "@/lib/bot/auth";
import { PaymentConfirmSchema } from "@/lib/bot/schemas";
import { recordPayment, recordIntegrationEvent, getEnrollmentById } from "@/lib/db/repository";

export async function POST(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const json = await request.json();
    const parsed = PaymentConfirmSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          issues: parsed.error.issues,
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 400 }
      );
    }

    const {
      idempotency_key,
      enrollment_id,
      external_payment_id,
      provider,
      amount,
      currency,
      payer_email,
      notes,
    } = parsed.data;

    // Verificar idempotencia
    const idempotency = await checkIdempotency(idempotency_key);
    if (idempotency.isDuplicate) return idempotency.response!;

    const enrollment = await getEnrollmentById(enrollment_id);
    if (!enrollment) {
      await recordIntegrationEvent({
        idempotencyKey: idempotency_key,
        eventType: "payment.confirmed",
        source: "bot",
        payload: parsed.data,
        status: "failed",
        errorMessage: `Inscripción no encontrada: ${enrollment_id}`,
      });
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Inscripción no encontrada: ${enrollment_id}` },
        { status: 404 }
      );
    }

    // Registrar pago y habilitar automáticamente materiales
    const payment = await recordPayment({
      enrollmentId: enrollment_id,
      externalPaymentId: external_payment_id,
      provider,
      status: "approved",
      amount,
      currency,
      payerEmail: payer_email,
      rawPayload: json,
    });

    const event = await recordIntegrationEvent({
      idempotencyKey: idempotency_key,
      eventType: "payment.confirmed",
      source: "bot",
      payload: parsed.data,
      status: "processed",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pago confirmado exitosamente y material complementario habilitado de inmediato.",
        payment_id: payment.id,
        enrollment_id: enrollment.id,
        event_id: event.id,
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
