import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getEnrollmentById,
  getPaymentsForEnrollment,
  updateEnrollmentAdmin,
  deleteEnrollmentAdmin,
} from "@/lib/db/repository";

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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Solo administradores con rol ADMIN pueden modificar inscripciones.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const updated = await updateEnrollmentAdmin(params.id, {
      modalityId: body.modalityId,
      status: body.status,
      notes: body.notes,
      amountPaid: body.amountPaid !== undefined ? Number(body.amountPaid) : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Inscripción no encontrada." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      enrollment: updated,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Solo administradores con rol ADMIN pueden eliminar inscripciones.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 403 }
    );
  }

  try {
    const result = await deleteEnrollmentAdmin(params.id);
    if (!result.success) {
      return NextResponse.json(
        { error: "OPERATION_FAILED", message: result.reason, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.reason,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
