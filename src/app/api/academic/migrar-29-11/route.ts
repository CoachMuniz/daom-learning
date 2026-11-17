import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import {
  getJornadasForTraining,
  createJornada,
  createEncuentro,
  recordAuditLog,
} from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/**
 * Endpoint de migración para incorporar el Seminario de Biomecánica del 29/11/2026
 * a la arquitectura académica 2.0 (Jornada -> Encuentro).
 * Es idempotente, reversible y conserva todas las inscripciones, pagos y becas.
 */
export async function POST(request: Request) {
  const db = getDatabase();

  try {
    const capacitacionId = "SEM-BIOMECANICA";
    const ofertaId = "OF-BIOMEC-2026-11";

    // 1. Verificar si ya existen jornadas para esta capacitación
    const existingJornadas = await getJornadasForTraining(capacitacionId, false);
    if (existingJornadas.length > 0) {
      // Garantizar que la vigencia del presentismo para el 29/11/2026 sea exactamente 2026-12-01T02:59:59.000Z
      // (23:59:59 en America/Argentina/Buenos_Aires UTC-3 del día posterior)
      const correctValidUntil = "2026-12-01T02:59:59.000Z";
      await db.run(
        `UPDATE encuentros SET attendance_valid_until = ?, updated_at = ?
         WHERE capacitacion_id = ? AND fecha = '2026-11-29' AND attendance_valid_until != ?`,
        [correctValidUntil, new Date().toISOString(), capacitacionId, correctValidUntil]
      );

      const refreshedJornadas = await getJornadasForTraining(capacitacionId, false);
      return NextResponse.json({
        success: true,
        message: "El Seminario del 29/11 ya se encuentra incorporado a la arquitectura académica 2.0.",
        jornadas: refreshedJornadas,
        canary: "DAOM-FORMACION-SHEET-01",
      });
    }

    // 2. Crear la Jornada oficial para el 29/11/2026
    const jornada = await createJornada({
      capacitacionId,
      ofertaId,
      nombre: "Jornada Completa: Biomecánica y Videoanálisis",
      descripcion: "Jornada teórico-práctica con análisis newtoniano, anatomía funcional y videoanálisis deportivo.",
      modalidad: "hibrida",
      precioIndividual: 51711,
      cupoIndependiente: 30,
      orden: 1,
    });

    // 3. Crear los dos encuentros programados de la jornada (Teórico mañana y Práctico tarde)
    // 09:00 a 13:30 (4.5h) y 14:30 a 19:00 (4.5h) = 9-10 horas de cátedra
    const encuentro1 = await createEncuentro({
      jornadaId: jornada.id,
      capacitacionId,
      nombre: "Módulo 1: Fundamentos de Mecánica Newtoniana y Anatomía Funcional",
      contenido: "Áreas de la biomecánica, mecánica newtoniana, análisis instantáneo y clasificación deportiva.",
      fecha: "2026-11-29",
      horaInicio: "09:00",
      horaFin: "13:30",
      duracionHoras: 4.5,
      modalidad: "streaming",
      ubicacionFisica: "Club DAOM (Tarima Principal) / Streaming Google Meet",
      orden: 1,
    });

    const encuentro2 = await createEncuentro({
      jornadaId: jornada.id,
      capacitacionId,
      nombre: "Módulo 2: Videoanálisis Deportivo y Criterios de Rendimiento",
      contenido: "Videoanálisis en plataforma, estructura del movimiento, propósitos mecánicos y principios aplicados.",
      fecha: "2026-11-29",
      horaInicio: "14:30",
      horaFin: "19:00",
      duracionHoras: 4.5,
      modalidad: "streaming",
      ubicacionFisica: "Club DAOM (Tarima Principal) / Streaming Google Meet",
      orden: 2,
    });

    // 4. Vincular las inscripciones existentes en la base de datos a esta jornada (sin alterar pagos ni becas)
    const enrollments = await db.query<{ id: string }>(
      `SELECT id FROM enrollments WHERE capacitacion_id = ?`,
      [capacitacionId]
    );

    for (const enr of enrollments) {
      const enrJorId = `ENR-JOR-${enr.id}-${jornada.id}`;
      await db.run(
        `INSERT INTO enrollment_jornadas (id, enrollment_id, jornada_id, price_paid, is_package, created_at)
         VALUES (?, ?, ?, 0, 1, ?)
         ON CONFLICT(enrollment_id, jornada_id) DO NOTHING`,
        [enrJorId, enr.id, jornada.id, new Date().toISOString()]
      );
    }

    await recordAuditLog({
      action: "SEMINAR_29_11_MIGRATED_TO_ACADEMIC_2_0",
      entityType: "training",
      entityId: capacitacionId,
      details: {
        jornadaId: jornada.id,
        encuentrosCount: 2,
        migratedEnrollmentsCount: enrollments.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Migración del Seminario del 29/11/2026 completada exitosamente sin alterar ventas ni pagos.",
      jornada: {
        ...jornada,
        encuentros: [encuentro1, encuentro2],
      },
      migratedEnrollmentsCount: enrollments.length,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
