import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getTrainingById,
  updateEditionWhatsAppGroupUrl,
  updateTrainingWhatsAppGroupUrl,
  recordAuditLog,
  recordIntegrationEvent,
} from "@/lib/db/repository";

export const dynamic = "force-dynamic";

const WhatsAppGroupSchema = z.object({
  capacitacionId: z.string().min(1),
  ofertaId: z.string().optional(),
  whatsappGroupUrl: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+(\?.*)?$/i.test(val),
      {
        message: "El enlace debe ser una URL válida de invitación a grupo de WhatsApp (https://chat.whatsapp.com/...).",
      }
    ),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Acceso exclusivo para administradores autorizados.",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 401 }
    );
  }

  try {
    const json = await request.json();
    const parsed = WhatsAppGroupSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const { capacitacionId, ofertaId, whatsappGroupUrl } = parsed.data;

    // 1. Verificar correspondencia del identificador con la capacitación existente
    const training = await getTrainingById(capacitacionId, true);
    if (!training) {
      return NextResponse.json(
        {
          error: "TRAINING_NOT_FOUND",
          message: `La capacitación identificada como "${capacitacionId}" no existe en el sistema.`,
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 404 }
      );
    }

    // 2. Actualizar enlace en la edición específica o en todas las ediciones de la capacitación
    if (ofertaId) {
      await updateEditionWhatsAppGroupUrl(ofertaId, whatsappGroupUrl || null);
    } else {
      await updateTrainingWhatsAppGroupUrl(capacitacionId, whatsappGroupUrl || null);
    }

    // 3. Registrar auditoría
    await recordAuditLog({
      userId: session.userId,
      action: "WHATSAPP_GROUP_URL_UPDATED",
      entityType: "training",
      entityId: capacitacionId,
      details: {
        adminEmail: session.email,
        ofertaId: ofertaId || "all",
        whatsappGroupUrl: whatsappGroupUrl || null,
      },
    });

    // 4. Emitir evento de integración para que Jerkson y el ecosistema reflejen la actualización
    await recordIntegrationEvent({
      idempotencyKey: `WA-GRP-${capacitacionId}-${Date.now()}`,
      eventType: "enrollment.status_updated",
      source: "admin_manual",
      payload: {
        action: "whatsapp_group_updated",
        capacitacionId,
        ofertaId: ofertaId || null,
        whatsappGroupUrl: whatsappGroupUrl || null,
        adminEmail: session.email,
      },
      status: "processed",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Enlace del grupo de WhatsApp guardado correctamente para la capacitación.",
        capacitacion_id: capacitacionId,
        oferta_id: ofertaId || null,
        whatsapp_group_url: whatsappGroupUrl || null,
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
