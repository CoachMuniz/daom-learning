import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getTrainingById,
  deleteTrainingAdmin,
} from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Acceso exclusivo para administradores.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 401 }
    );
  }

  try {
    const training = await getTrainingById(params.id, true);
    if (!training) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Capacitación no encontrada." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      training,
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
      { error: "UNAUTHORIZED", message: "Solo administradores con rol ADMIN pueden eliminar capacitaciones.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 403 }
    );
  }

  try {
    const result = await deleteTrainingAdmin(params.id);
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
