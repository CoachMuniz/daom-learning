import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/client";
import { getEnrollmentById } from "@/lib/db/repository";
import type { TrainingEdition } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Endpoint autenticado y protegido para recuperar el enlace de invitación de WhatsApp
 * exclusivamente para participantes que posean una inscripción confirmada y paga para la edición.
 * 
 * Reglas de seguridad:
 * 1. Visitante anónimo: HTTP 401 Unauthorized.
 * 2. Usuario sin inscripción: HTTP 403 Forbidden.
 * 3. Inscripción pendiente, cancelada o reembolsada: HTTP 403 Forbidden.
 * 4. Inscripción perteneciente a otro usuario o a otra edición: HTTP 403 Forbidden.
 * 5. Inscripción confirmada: HTTP 200 OK con { success: true, whatsappGroupUrl }.
 * 6. No expone el enlace en errores ni diagnósticos.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Debe iniciar sesión para acceder a los grupos académicos." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const enrollmentId = searchParams.get("enrollmentId");
  const ofertaId = searchParams.get("ofertaId");

  if (!enrollmentId && !ofertaId) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Se requiere enrollmentId u ofertaId." },
      { status: 400 }
    );
  }

  const db = getDatabase();

  // Caso A: Búsqueda por enrollmentId
  if (enrollmentId) {
    const enrollment = await getEnrollmentById(enrollmentId);
    if (!enrollment || enrollment.user_id !== user.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Inscripción no válida o no autorizada para este usuario." },
        { status: 403 }
      );
    }

    if (enrollment.status !== "confirmada") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "El acceso al grupo oficial de WhatsApp requiere una inscripción confirmada." },
        { status: 403 }
      );
    }

    // Si se especificó ofertaId adicional, validar concordancia estricta
    if (ofertaId && enrollment.oferta_id !== ofertaId) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "La inscripción no corresponde a la edición solicitada." },
        { status: 403 }
      );
    }

    const edition = enrollment.oferta_id
      ? await db.get<TrainingEdition>(`SELECT whatsapp_group_url FROM training_editions WHERE oferta_id = ?`, [enrollment.oferta_id])
      : null;

    const groupUrl = edition?.whatsapp_group_url || null;
    return NextResponse.json({
      success: true,
      whatsappGroupUrl: groupUrl,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  }

  // Caso B: Búsqueda por ofertaId (validar que el usuario tenga alguna inscripción confirmada para esa oferta)
  if (ofertaId) {
    const validEnrollment = await db.get<{ id: string }>(
      `SELECT id FROM enrollments WHERE user_id = ? AND oferta_id = ? AND status = 'confirmada' LIMIT 1`,
      [user.id, ofertaId]
    );

    if (!validEnrollment) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "No se encontró una inscripción confirmada para esta edición." },
        { status: 403 }
      );
    }

    const edition = await db.get<TrainingEdition>(
      `SELECT whatsapp_group_url FROM training_editions WHERE oferta_id = ?`,
      [ofertaId]
    );

    return NextResponse.json({
      success: true,
      whatsappGroupUrl: edition?.whatsapp_group_url || null,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  }

  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}
