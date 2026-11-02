import { NextResponse } from "next/server";
import { syncGoogleSheetsCatalog } from "@/lib/sheets/sync";
import { getCurrentSession } from "@/lib/auth/session";

const DEFAULT_SYNC_TOKEN = "daom_sync_trigger_secret_token_2026";

export async function POST(request: Request) {
  // 1. Verificar si la llamada proviene de un administrador autenticado
  const session = await getCurrentSession();
  const isAdmin = session?.role === "ADMIN";

  // 2. O si proviene de un cron / webhook con token Bearer
  const authHeader = request.headers.get("authorization");
  const configuredToken = process.env.SYNC_SECRET_TOKEN || DEFAULT_SYNC_TOKEN;
  const isBearerAuthorized = authHeader === `Bearer ${configuredToken}`;

  if (!isAdmin && !isBearerAuthorized) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "No posee permisos para ejecutar la sincronización del catálogo.",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 401 }
    );
  }

  try {
    const triggeredBy = isAdmin ? `admin:${session?.email}` : "scheduled_or_webhook";
    const report = await syncGoogleSheetsCatalog({ triggeredBy });

    return NextResponse.json(
      {
        success: report.status !== "failed",
        report,
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "SYNC_FAILED",
        message: err.message,
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 500 }
    );
  }
}
