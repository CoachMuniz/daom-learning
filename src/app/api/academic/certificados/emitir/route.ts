import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { issueOrUpdateCertificate2 } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Solo administradores autorizados pueden emitir o recalcular certificados.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { enrollmentId } = body;

    if (!enrollmentId) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "enrollmentId es requerido." }, { status: 400 });
    }

    const cert = await issueOrUpdateCertificate2(enrollmentId);
    if (!cert) {
      return NextResponse.json({ error: "CERTIFICATE_FAILED", message: "No se pudo emitir el certificado." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      certificate: cert,
      message: `Certificado ${cert.certificate_code} emitido/actualizado con ${cert.horas_certificadas} horas acreditadas.`,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
