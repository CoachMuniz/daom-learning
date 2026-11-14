import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getEnrollmentById, getPaymentsForEnrollment } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Acceso exclusivo para administradores autorizados.",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 401 }
    );
  }

  try {
    const { id } = params;
    const enrollment = await getEnrollmentById(id);
    if (!enrollment) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Inscripción no encontrada: ${id}` },
        { status: 404 }
      );
    }

    const payments = await getPaymentsForEnrollment(id);

    return NextResponse.json(
      {
        success: true,
        enrollment,
        payments,
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
