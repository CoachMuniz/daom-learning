import { NextResponse } from "next/server";
import { validateBotRequest, checkIdempotency } from "@/lib/bot/auth";
import { AttendanceRecordSchema } from "@/lib/bot/schemas";
import { recordAttendance, recordIntegrationEvent, getEnrollmentById } from "@/lib/db/repository";

export async function POST(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const json = await request.json();
    const parsed = AttendanceRecordSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const {
      idempotency_key,
      enrollment_id,
      user_id,
      session_date,
      attended,
      modality_attended,
      checked_in_by,
      notes,
    } = parsed.data;

    const idempotency = await checkIdempotency(idempotency_key);
    if (idempotency.isDuplicate) return idempotency.response!;

    const enrollment = await getEnrollmentById(enrollment_id);
    if (!enrollment) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Inscripción no encontrada: ${enrollment_id}` },
        { status: 404 }
      );
    }

    // Regla: la compra On Demand no acredita asistencia presencial ni virtual en vivo
    if (enrollment.modality_id === "on_demand" && attended) {
      return NextResponse.json(
        {
          error: "INELIGIBLE_MODALITY",
          message: "La modalidad On Demand no acredita asistencia presencial ni streaming en vivo.",
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 422 }
      );
    }

    const record = await recordAttendance({
      enrollmentId: enrollment_id,
      userId: user_id,
      sessionDate: session_date,
      attended,
      modalityAttended: modality_attended,
      checkedInBy: checked_in_by,
      notes,
    });

    const event = await recordIntegrationEvent({
      idempotencyKey: idempotency_key,
      eventType: "attendance.recorded",
      source: "bot",
      payload: parsed.data,
      status: "processed",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Asistencia registrada con éxito.",
        attendance_id: record.id,
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
