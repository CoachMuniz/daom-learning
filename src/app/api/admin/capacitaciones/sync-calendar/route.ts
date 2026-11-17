import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/client";
import {
  getEncuentrosForTraining,
  updateEncuentroCalendarAndMeet,
  recordAuditLog,
} from "@/lib/db/repository";
import { createAcademicCalendarEvent } from "@/lib/calendar/googleCalendar";

export const dynamic = "force-dynamic";

/**
 * Endpoint administrativo para sincronizar encuentros con Google Calendar y generar reuniones de Google Meet.
 * Identificador: DAOM-LEARNING-2.0-ACADEMIC-ENGINE
 * 
 * Reglas de seguridad institucional:
 * - Acceso exclusivo para administradores autenticados (ADMIN / STAFF).
 * - Idempotente: Si el encuentro ya tiene `google_calendar_event_id` y `google_meet_url`, no lo duplica.
 * - NO envía invitaciones masivas durante la sincronización inicial de eventos.
 */
export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Acceso exclusivo para administradores autorizados." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const capacitacionId = body.capacitacionId || "SEM-BIOMECANICA";
    const forceRecreate = Boolean(body.forceRecreate);

    const encuentros = await getEncuentrosForTraining(capacitacionId);
    if (!encuentros || encuentros.length === 0) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `No se encontraron encuentros activos para la capacitación ${capacitacionId}.` },
        { status: 404 }
      );
    }

    const results = [];

    for (const enc of encuentros) {
      // Si ya tiene evento y Meet, y no se fuerza recreación, se conserva
      if (enc.google_calendar_event_id && enc.google_meet_url && !forceRecreate) {
        results.push({
          encuentroId: enc.id,
          nombre: enc.nombre,
          status: "already_configured",
          eventId: enc.google_calendar_event_id,
          meetUrl: enc.google_meet_url,
        });
        continue;
      }

      // Calcular ISO 8601 con zona horaria Argentina (-03:00)
      const startDateTime = `${enc.fecha}T${enc.hora_inicio}:00-03:00`;
      const endDateTime = `${enc.fecha}T${enc.hora_fin}:00-03:00`;

      const calendarResult = await createAcademicCalendarEvent(enc.id, {
        title: `DAOM Learning — ${enc.nombre}`,
        description: `${enc.contenido || enc.nombre}\n\nCapacitación: ${capacitacionId}\nEncuentro ID: ${enc.id}\nOrganiza: DAOM Weightlifting (daom.weightlifting@gmail.com)`,
        startDateTime,
        endDateTime,
        timeZone: enc.zona_horaria || "America/Argentina/Buenos_Aires",
        location: enc.ubicacion_fisica || "Club DAOM / Google Meet",
        generateMeet: true,
        // attendeesEmails vacíos para NO enviar invitaciones a participantes reales durante la provisión de eventos
        attendeesEmails: [],
      });

      if (calendarResult.eventId) {
        await updateEncuentroCalendarAndMeet(enc.id, calendarResult.eventId, calendarResult.meetUrl || null);
        results.push({
          encuentroId: enc.id,
          nombre: enc.nombre,
          status: calendarResult.status,
          eventId: calendarResult.eventId,
          meetUrl: calendarResult.meetUrl,
        });
      } else {
        results.push({
          encuentroId: enc.id,
          nombre: enc.nombre,
          status: "failed",
          error: calendarResult.message,
        });
      }
    }

    await recordAuditLog({
      userId: session.userId,
      action: "CALENDAR_AND_MEET_SYNC_TRIGGERED",
      entityType: "training",
      entityId: capacitacionId,
      details: {
        adminEmail: session.email,
        results,
      },
    });

    return NextResponse.json({
      success: true,
      capacitacionId,
      results,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    console.error("[Sync Calendar Route Error]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
