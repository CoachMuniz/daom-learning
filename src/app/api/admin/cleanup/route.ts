import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { executeProductionCleanup } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Acceso denegado. Se requiere rol ADMIN para ejecutar la limpieza de producción.",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (body.confirmation !== "CONFIRMAR_LIMPIEZA_DAOM_PRODUCCION") {
      return NextResponse.json(
        {
          error: "CONFIRMATION_REQUIRED",
          message:
            "Debe enviar 'confirmation': 'CONFIRMAR_LIMPIEZA_DAOM_PRODUCCION' para autorizar la purga de registros ficticios.",
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 400 }
      );
    }

    const report = await executeProductionCleanup();

    return NextResponse.json({
      success: true,
      message: "Limpieza de producción completada con éxito.",
      report,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
