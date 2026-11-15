import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  findUserById,
  updateParticipantAdmin,
  deleteParticipantAdmin,
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
    const user = await findUserById(params.id);
    if (!user) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Participante no encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      participant: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        phone: user.profile?.phone || null,
        documentId: user.profile?.document_id || null,
        country: user.profile?.country || "AR",
        identities: user.identities || [],
      },
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Solo administradores con rol ADMIN pueden editar participantes.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const updated = await updateParticipantAdmin(params.id, {
      fullName: body.fullName,
      phone: body.phone,
      documentId: body.documentId,
      country: body.country,
      isActive: body.isActive,
    });

    if (!updated) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Participante no encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      participant: updated,
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
      { error: "UNAUTHORIZED", message: "Solo administradores con rol ADMIN pueden eliminar participantes.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 403 }
    );
  }

  try {
    const result = await deleteParticipantAdmin(params.id);
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
