import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { verifyMaterialAccess, recordMaterialDownload } from "@/lib/db/repository";
import fs from "node:fs";
import path from "node:path";

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
        canary: "DAOM-FORMACION-SHEET-01",
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
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 403 }
    );
  }

  // Registrar descarga en base de datos y auditoría
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  await recordMaterialDownload(entitlement.id, ip);

  // Servir el archivo ZIP protegido
  const fileName = entitlement.asset?.file_name || `material-${assetId}.zip`;
  const storageDir = path.join(process.cwd(), "data", "materials");
  const filePath = path.join(storageDir, fileName);

  // Asegurar que exista un archivo ZIP de muestra si aún no fue subido físicamente
  if (!fs.existsSync(filePath)) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    // Escribir un archivo ZIP canónico válido mínimo (encabezado PK\x03\x04 de ZIP estándar)
    // PK\x05\x06 es el end of central directory de un zip vacío válido (22 bytes)
    const emptyZip = Buffer.from([
      0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ]);
    fs.writeFileSync(filePath, emptyZip);
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": fileBuffer.length.toString(),
      "X-Canary-Project": "DAOM-FORMACION-SHEET-01",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
