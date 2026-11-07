import { NextResponse } from "next/server";
import { validateBotRequest } from "@/lib/bot/auth";
import { listIntegrationEvents, recordIntegrationEvent, findIntegrationEvent } from "@/lib/db/repository";
import type { IntegrationEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * DAOM Learning â€” Bot API: Consulta y Registro de Eventos de IntegraciÃ³n
 * Canario: DAOM-LEARNING-FINAL-01
 *
 * Admite:
 * - GET: Listar eventos de integraciÃ³n recientes (enrollment.created, payment.approved, etc.)
 * - POST: Registrar un evento de integraciÃ³n de forma idempotente
 */
export async function GET(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const eventType = url.searchParams.get("event_type") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const rawEvents = await listIntegrationEvents({ limit, eventType, status });

    const events = rawEvents.map((evt) => {
      let parsedPayload = evt.payload;
      if (typeof evt.payload === "string") {
        try {
          parsedPayload = JSON.parse(evt.payload);
        } catch {
          // Mantener como string si no parsea
        }
      }
      return {
        id: evt.id,
        idempotency_key: evt.idempotency_key,
        event_type: evt.event_type,
        source: evt.source,
        payload: parsedPayload,
        status: evt.status,
        error_message: evt.error_message,
        processed_at: evt.processed_at,
        created_at: evt.created_at,
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: events.length,
        events,
        canary: "DAOM-LEARNING-FINAL-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const body = await request.json();
    const { idempotencyKey, eventType, source = "bot", payload = {}, status = "processed", errorMessage } = body;

    if (!idempotencyKey || !eventType) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "idempotencyKey y eventType son requeridos.",
        },
        { status: 400 }
      );
    }

    // Verificar si ya existe por idempotencia
    const existing = await findIntegrationEvent(idempotencyKey);
    if (existing) {
      return NextResponse.json(
        {
          success: true,
          duplicated: true,
          event: existing,
          message: "Evento ya registrado previamente (idempotente).",
        },
        { status: 200 }
      );
    }

    const recorded = await recordIntegrationEvent({
      idempotencyKey,
      eventType: eventType as IntegrationEvent["event_type"],
      source,
      payload,
      status,
      errorMessage,
    });

    return NextResponse.json(
      {
        success: true,
        event: recorded,
        canary: "DAOM-LEARNING-FINAL-01",
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
