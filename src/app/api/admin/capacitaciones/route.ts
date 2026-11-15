import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getPublishedTrainings } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET() {
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
    const trainings = await getPublishedTrainings();

    return NextResponse.json(
      {
        success: true,
        count: trainings.length,
        trainings: trainings.map((t) => ({
          capacitacion_id: t.capacitacion_id,
          titulo: t.titulo,
          subtitulo: t.subtitulo,
          tipo: t.tipo,
          ediciones: t.ediciones?.map((e) => ({
            oferta_id: e.oferta_id,
            nombre_edicion: e.nombre_edicion,
            modalidades: e.modalidades,
            fecha_inicio: e.fecha_inicio,
            whatsapp_group_url: e.whatsapp_group_url || null,
            google_meet_url: (e as any).google_meet_url || null,
            precios: e.precios || [],
          })),
        })),
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
