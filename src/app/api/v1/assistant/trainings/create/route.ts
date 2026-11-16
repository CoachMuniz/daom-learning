import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getAllTrainingsAdmin,
  getAllInstructorsAdmin,
  createJornada,
  createEncuentro,
  recordAuditLog,
} from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/**
 * Endpoint de acción para Custom GPT: "DAOM Learning — Creador de Capacitaciones"
 * Valida la autenticación administrativa (Bearer token con BOT_API_SECRET_KEY o sesión ADMIN),
 * permite crear borradores, jornadas y encuentros estructurados de forma conversacional.
 */
export async function POST(request: Request) {
  // 1. Validar autenticación administrativa o clave compartida de GPT
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");
  const secretKey = process.env.BOT_API_SECRET_KEY || "daom_bot_integration_key_secret_2026_secure";

  let isAuthorized = false;
  let callerEmail = "chatgpt_assistant";

  if (apiKeyHeader === secretKey || (authHeader && authHeader.replace("Bearer ", "").trim() === secretKey)) {
    isAuthorized = true;
  } else {
    const session = await getCurrentSession();
    if (session && (session.role === "ADMIN" || session.role === "STAFF")) {
      isAuthorized = true;
      callerEmail = session.email;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Credenciales de servicio o sesión administrativa inválidas." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    // Acción: Obtener catálogo y docentes disponibles para el asistente
    if (action === "get_context") {
      const trainings = await getAllTrainingsAdmin();
      const instructors = await getAllInstructorsAdmin();
      return NextResponse.json({
        success: true,
        catalog_count: trainings.length,
        instructors: instructors.map((i) => ({ id: i.docente_id, name: i.nombre, specialty: i.especialidad })),
        existing_trainings: trainings.map((t) => ({ id: t.capacitacion_id, title: t.titulo })),
      });
    }

    // Acción: Crear borrador estructurado de capacitación
    if (action === "create_training_structure") {
      const {
        capacitacionId,
        titulo,
        tipo,
        jornadas, // Array de { nombre, descripcion, modalidad, precio, encuentros: [...] }
      } = body;

      if (!capacitacionId || !titulo || !Array.isArray(jornadas)) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Se requiere capacitacionId, titulo y un array de jornadas." },
          { status: 400 }
        );
      }

      const createdJornadas = [];

      for (let jIndex = 0; jIndex < jornadas.length; jIndex++) {
        const jData = jornadas[jIndex];
        const jor = await createJornada({
          capacitacionId,
          nombre: jData.nombre,
          descripcion: jData.descripcion,
          modalidad: jData.modalidad || "presencial",
          precioIndividual: Number(jData.precio || 0),
          orden: jIndex + 1,
        });

        const createdEncuentros = [];
        if (Array.isArray(jData.encuentros)) {
          for (let eIndex = 0; eIndex < jData.encuentros.length; eIndex++) {
            const eData = jData.encuentros[eIndex];
            const enc = await createEncuentro({
              jornadaId: jor.id,
              capacitacionId,
              nombre: eData.nombre,
              contenido: eData.contenido,
              fecha: eData.fecha,
              horaInicio: eData.horaInicio,
              horaFin: eData.horaFin,
              duracionHoras: Number(eData.duracionHoras || 2),
              modalidad: eData.modalidad || jData.modalidad || "presencial",
              ubicacionFisica: eData.ubicacionFisica,
              orden: eIndex + 1,
            });
            createdEncuentros.push(enc);
          }
        }
        jor.encuentros = createdEncuentros;
        createdJornadas.push(jor);
      }

      await recordAuditLog({
        action: "TRAINING_STRUCTURED_BY_CHATGPT",
        entityType: "training",
        entityId: capacitacionId,
        details: {
          caller: callerEmail,
          jornadasCreated: createdJornadas.length,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Estructura académica de ${titulo} creada exitosamente con ${createdJornadas.length} jornada(s).`,
        capacitacionId,
        jornadas: createdJornadas,
      });
    }

    return NextResponse.json(
      { error: "UNKNOWN_ACTION", message: "Acción no reconocida. Use 'get_context' o 'create_training_structure'." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
