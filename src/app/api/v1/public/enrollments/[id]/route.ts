import { NextResponse } from "next/server";
import { getEnrollmentById } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST", message: "ID de inscripción requerido" },
        { status: 400 }
      );
    }

    const enrollment = await getEnrollmentById(id);
    if (!enrollment) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "Inscripción no encontrada",
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        enrollment: {
          id: enrollment.id,
          capacitacion_id: enrollment.capacitacion_id,
          oferta_id: enrollment.oferta_id,
          modality_id: enrollment.modality_id,
          status: enrollment.status,
          currency: enrollment.currency,
          amount_total: enrollment.amount_total,
          amount_paid: enrollment.amount_paid,
          payment_method: enrollment.payment_method,
          is_paid: enrollment.status === "confirmada",
          created_at: enrollment.created_at,
          training: enrollment.training
            ? {
                capacitacion_id: enrollment.training.capacitacion_id,
                titulo: enrollment.training.titulo,
                tipo: enrollment.training.tipo,
                imagen_url: enrollment.training.imagen_url,
              }
            : undefined,
        },
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Error al consultar estado de inscripción",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 500 }
    );
  }
}
