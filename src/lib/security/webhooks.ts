/**
 * DAOM Learning — Verificación Criptográfica de Firmas de Webhooks
 * Canario: DAOM-MERCADOPAGO-MCP-01
 *
 * Implementa validación estricta de firmas HMAC-SHA256 para Mercado Pago:
 * - Cabecera x-signature (ts=..., v1=...)
 * - Cabecera x-request-id
 * - Verificación anti-replay con tolerancia temporal
 * - Comparación en tiempo constante con timingSafeEqual
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface SignatureVerificationResult {
  valid: boolean;
  reason?: string;
  timestamp?: number;
}

export function verifyMercadoPagoSignature(
  xSignatureHeader: string | null | undefined,
  dataId: string | number | undefined,
  xRequestId: string | null | undefined,
  secret: string,
  toleranceSeconds = 300
): SignatureVerificationResult {
  if (!xSignatureHeader) {
    return { valid: false, reason: "Cabecera x-signature ausente" };
  }

  // Parsear ts=... y v1=...
  const parts = xSignatureHeader.split(",");
  let tsStr: string | undefined;
  let receivedHash: string | undefined;

  for (const part of parts) {
    const [k, v] = part.trim().split("=");
    if (k === "ts") tsStr = v;
    if (k === "v1") receivedHash = v;
  }

  if (!tsStr || !receivedHash) {
    return { valid: false, reason: "Formato de cabecera x-signature inválido" };
  }

  const rawTsNum = Number(tsStr);
  const tsInSeconds = rawTsNum > 1e11 ? Math.floor(rawTsNum / 1000) : rawTsNum;
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - tsInSeconds) > toleranceSeconds) {
    return { valid: false, reason: "Firma Mercado Pago fuera de tolerancia temporal", timestamp: rawTsNum };
  }

  // Manifiesto estándar de Mercado Pago: id:[data.id];request-id:[x-request-id];ts:[ts];
  let manifest = "";
  if (dataId !== undefined && dataId !== null && dataId !== "") {
    manifest += `id:${dataId};`;
  }
  if (xRequestId) {
    manifest += `request-id:${xRequestId};`;
  }
  manifest += `ts:${tsStr};`;

  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");
  const expectedBuf = Buffer.from(expectedHash);
  const receivedBuf = Buffer.from(receivedHash);

  if (expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: true, timestamp: rawTsNum };
  }

  return { valid: false, reason: "Firma Mercado Pago inválida o falsificada", timestamp: rawTsNum };
}
