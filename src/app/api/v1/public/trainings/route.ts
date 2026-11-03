import { NextResponse } from "next/server";
import { getPublishedTrainings } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || undefined;
    const search = searchParams.get("search") || undefined;

    const trainings = await getPublishedTrainings({
      tipo: tipo && tipo !== "todos" ? tipo : undefined,
      search,
    });

    return NextResponse.json(
      {
        success: true,
        count: trainings.length,
        trainings,
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
        message: err.message || "Error al obtener catálogo de capacitaciones",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 500 }
    );
  }
}
