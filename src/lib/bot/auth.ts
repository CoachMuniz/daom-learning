import { NextResponse } from "next/server";
import { findIntegrationEvent } from "@/lib/db/repository";

const DEFAULT_BOT_KEY = "daom_bot_integration_key_secret_2026_secure";

export interface BotAuthResult {
  authorized: boolean;
  errorResponse?: NextResponse;
}

/**
 * Valida la autenticación Server-to-Server entre el bot y DAOM Learning.
 * Admite cabecera 'x-api-key' o 'Authorization: Bearer <KEY>'.
 */
export function validateBotRequest(request: Request): BotAuthResult {
  const configuredKey = process.env.BOT_API_SECRET_KEY || DEFAULT_BOT_KEY;

  const headerKey = request.headers.get("x-api-key");
  const authHeader = request.headers.get("authorization");
  let bearerKey: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    bearerKey = authHeader.substring(7).trim();
  }

  const providedKey = headerKey || bearerKey;

  if (!providedKey || providedKey !== configuredKey) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "Credenciales de servicio inválidas o ausentes para la integración con el bot.",
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 401 }
      ),
    };
  }

  return { authorized: true };
}

/**
 * Verifica si un evento de integración ya fue procesado mediante idempotency_key.
 */
export async function checkIdempotency(idempotencyKey: string) {
  const existing = await findIntegrationEvent(idempotencyKey);
  if (existing) {
    let payload = {};
    try {
      payload = JSON.parse(existing.payload);
    } catch {}
    return {
      isDuplicate: true,
      existingEvent: existing,
      response: NextResponse.json(
        {
          success: true,
          idempotent: true,
          message: "Evento previamente procesado de forma idempotente.",
          event_id: existing.id,
          event_type: existing.event_type,
          processed_at: existing.processed_at,
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 200 }
      ),
    };
  }
  return { isDuplicate: false };
}
