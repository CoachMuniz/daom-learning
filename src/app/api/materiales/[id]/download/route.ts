import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { verifyMaterialAccess, recordMaterialDownload } from "@/lib/db/repository";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * Endpoint de descarga segura de Material Didáctico Complementario (ZIP).
 * Canario: DAOM-LEARNING-FINAL-01
 *
 * Principio de Entrega Real:
 * 1. Verifica autenticación y autorización estricta (pago acreditado).
 * 2. Si el archivo físico real no ha sido cargado aún por el equipo docente,
 *    retorna un mensaje informativo HTTP 404 estructurado.
 * 3. NUNCA genera ni sirve archivos ZIP vacíos ni documentos ficticios.
 * 4. Registra cada descarga para auditoría de accesos.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      {
        error: "UNAUTHENTICATED",
        message: "Debe iniciar sesión para descargar material complementario.",
        canary: "DAOM-LEARNING-FINAL-01",
      },
      { status: 401 }
    );
  }

  const assetId = params.id;
  const entitlement = await verifyMaterialAccess(session.userId, assetId);

  if (!entitlement) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message:
          "Acceso denegado. No posee una inscripción confirmada con pago acreditado para este material complementario.",
        canary: "DAOM-LEARNING-FINAL-01",
      },
      { status: 403 }
    );
  }

  // Resolver ubicación en almacenamiento local o volumen persistente
  const fileName = entitlement.asset?.file_name || `material-${assetId}.zip`;
  const storageDir = path.join(process.cwd(), "data", "materials");
  const filePath = path.join(storageDir, fileName);

  // Si el archivo físico no existe en disco, informar transparentemente
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      {
        error: "MATERIAL_PENDING_PUBLICATION",
        message:
          "El material didáctico complementario de esta capacitación está siendo preparado por el equipo docente de DAOM y estará disponible para su descarga en tu portal antes del inicio de la cursada.",
        asset_id: assetId,
        training_id: entitlement.asset?.capacitacion_id,
        canary: "DAOM-LEARNING-FINAL-01",
      },
      { status: 404 }
    );
  }

  // Registrar descarga en base de datos y auditoría de accesos
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  await recordMaterialDownload(entitlement.id, ip);

  const fileStat = fs.statSync(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": fileStat.size.toString(),
      "X-Canary-Project": "DAOM-LEARNING-FINAL-01",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
