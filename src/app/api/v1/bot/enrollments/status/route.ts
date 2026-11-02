import { NextResponse } from "next/server";
import { validateBotRequest, checkIdempotency } from "@/lib/bot/auth";
import { EnrollmentStatusSchema } from "@/lib/bot/schemas";
import { updateEnrollmentStatus, recordIntegrationEvent, getEnrollmentById } from "@/lib/db/repository";

export async function POST(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const json = await request.json();
    const parsed = EnrollmentStatusSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const { idempotency_key, enrollment_id, status, notes } = parsed.data;

    const idempotency = await checkIdempotency(idempotency_key);
    if (idempotency.isDuplicate) return idempotency.response!;

    const enrollment = await getEnrollmentById(enrollment_id);
    if (!enrollment) {
      await recordIntegrationEvent({
        idempotencyKey: idempotency_key,
        eventType: "enrollment.status_updated",
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

    await updateEnrollmentStatus(enrollment_id, status, notes);

    const event = await recordIntegrationEvent({
      idempotencyKey: idempotency_key,
      eventType: "enrollment.status_updated",
      source: "bot",
      payload: parsed.data,
      status: "processed",
    });

    return NextResponse.json(
      {
        success: true,
        message: `Estado de inscripción actualizado a "${status}".`,
        enrollment_id,
        new_status: status,
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
