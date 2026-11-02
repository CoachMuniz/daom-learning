import { NextResponse } from "next/server";
import { validateBotRequest, checkIdempotency } from "@/lib/bot/auth";
import { CertificateLinkSchema } from "@/lib/bot/schemas";
import { linkCertificate, recordIntegrationEvent, getEnrollmentById } from "@/lib/db/repository";

export async function POST(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const json = await request.json();
    const parsed = CertificateLinkSchema.safeParse(json);
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
      certificate_code,
      title,
      issue_date,
      pdf_url,
      verification_hash,
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

    // Regla: la compra On Demand no acredita certificado de asistencia
    if (enrollment.modality_id === "on_demand") {
      return NextResponse.json(
        {
          error: "INELIGIBLE_MODALITY",
          message: "La modalidad On Demand no acredita certificado de asistencia.",
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 422 }
      );
    }

    const cert = await linkCertificate({
      enrollmentId: enrollment_id,
      userId: user_id,
      certificateCode: certificate_code,
      title,
      issueDate: issue_date,
      pdfUrl: pdf_url,
      verificationHash: verification_hash,
    });

    const event = await recordIntegrationEvent({
      idempotencyKey: idempotency_key,
      eventType: "certificate.linked",
      source: "bot",
      payload: parsed.data,
      status: "processed",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Certificado emitido por el bot vinculado correctamente.",
        certificate_id: cert.id,
        certificate_code: cert.certificate_code,
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
