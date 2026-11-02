import { NextResponse } from "next/server";
import { validateBotRequest, checkIdempotency } from "@/lib/bot/auth";
import { ModalityChangeRequestSchema } from "@/lib/bot/schemas";
import { calculateModalityChangeFee } from "@/lib/commercial/rules";
import { requestModalityChange, recordIntegrationEvent, getEnrollmentById } from "@/lib/db/repository";

export async function POST(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const json = await request.json();
    const parsed = ModalityChangeRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const { idempotency_key, enrollment_id, requested_modality, reason } = parsed.data;

    const idempotency = await checkIdempotency(idempotency_key);
    if (idempotency.isDuplicate) return idempotency.response!;

    const enrollment = await getEnrollmentById(enrollment_id);
    if (!enrollment) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Inscripción no encontrada: ${enrollment_id}` },
        { status: 404 }
      );
    }

    const eventStartDate = enrollment.edition?.fecha_inicio || null;
    const feeCalculation = calculateModalityChangeFee(enrollment.amount_total, eventStartDate);

    await requestModalityChange(enrollment_id, requested_modality, feeCalculation.surchargeAmount);

    const event = await recordIntegrationEvent({
      idempotencyKey: idempotency_key,
      eventType: "modality_change.requested",
      source: "bot",
      payload: { ...parsed.data, fee_calculation: feeCalculation },
      status: "processed",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Solicitud de cambio de modalidad registrada con éxito.",
        enrollment_id,
        current_modality: enrollment.modality_id,
        requested_modality,
        fee_calculation: feeCalculation,
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
