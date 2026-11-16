import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getJornadasForTraining,
  createJornada,
  createEncuentro,
} from "@/lib/db/repository";
import { createAcademicCalendarEvent } from "@/lib/calendar/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const capacitacionId = url.searchParams.get("capacitacionId");
    if (!capacitacionId) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "capacitacionId es requerido." }, { status: 400 });
    }

    const jornadas = await getJornadasForTraining(capacitacionId, false);
    return NextResponse.json({ success: true, count: jornadas.length, jornadas });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Solo administradores pueden crear jornadas o encuentros." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_encuentro") {
      const {
        jornadaId,
        capacitacionId,
        nombre,
        contenido,
        fecha,
        horaInicio,
        horaFin,
        zonaHoraria,
        duracionHoras,
        modalidad,
        ubicacionFisica,
      } = body;

      const enc = await createEncuentro({
        jornadaId,
        capacitacionId,
        nombre,
        contenido,
        fecha,
        horaInicio,
        horaFin,
        zonaHoraria,
        duracionHoras,
        modalidad,
        ubicacionFisica,
      });

      // Crear evento en Google Calendar si la modalidad es streaming o híbrida
      if (modalidad === "streaming" || modalidad === "hibrida") {
        const startIso = `${fecha}T${horaInicio}:00`;
        const endIso = `${fecha}T${horaFin}:00`;
        await createAcademicCalendarEvent(enc.id, {
          title: `DAOM Learning: ${nombre}`,
          description: contenido || "Encuentro académico interactivo de DAOM Learning.",
          startDateTime: startIso,
          endDateTime: endIso,
          timeZone: zonaHoraria,
          generateMeet: true,
        });
      }

      return NextResponse.json({ success: true, encuentro: enc });
    }

    // Default: create jornada
    const {
      capacitacionId,
      ofertaId,
      nombre,
      descripcion,
      modalidad,
      precioIndividual,
      cupoIndependiente,
      orden,
    } = body;

    const jor = await createJornada({
      capacitacionId,
      ofertaId,
      nombre,
      descripcion,
      modalidad,
      precioIndividual,
      cupoIndependiente,
      orden,
    });

    return NextResponse.json({ success: true, jornada: jor });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
