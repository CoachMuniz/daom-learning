import { NextResponse } from "next/server";
import { getTrainingBySlugOrId, getPublishedFaqs } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST", message: "Slug o ID no proporcionado" },
        { status: 400 }
      );
    }

    // Consultar capacitación publicada y verificada
    const training = await getTrainingBySlugOrId(slug, false);

    if (!training) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: `Capacitación no encontrada o no publicada: ${slug}`,
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 404 }
      );
    }

    // Obtener preguntas frecuentes vinculadas
    const faqs = await getPublishedFaqs(training.capacitacion_id);

    return NextResponse.json(
      {
        success: true,
        training,
        faqs,
        canary: "DAOM-FORMACION-SHEET-01",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Error al obtener ficha de capacitación",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 500 }
    );
  }
}
