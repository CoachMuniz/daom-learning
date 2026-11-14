import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import {
  findUserById,
  findOrCreateParticipant,
  getTrainingById,
  getPricesForEdition,
  getUserEnrollmentForTraining,
  createEnrollment,
  recordPayment,
  recordAuditLog,
  recordIntegrationEvent,
  autoGrantMaterialForEnrollment,
} from "@/lib/db/repository";
import {
  findMatchingPrice,
  calculateEffectivePrice,
  calculateOnDemandPrice,
} from "@/lib/commercial/rules";
import type { ModalityId, CurrencyType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ManualEnrollmentSchema = z.object({
  // Participante: ID existente O datos de registro nuevo
  userId: z.string().optional(),
  newParticipant: z
    .object({
      email: z.string().email(),
      fullName: z.string().min(2),
      phone: z.string().optional(),
      documentId: z.string().optional(),
      country: z.string().default("AR"),
    })
    .optional(),

  // Capacitación y Modalidad
  capacitacionId: z.string().min(1),
  ofertaId: z.string().optional(),
  modalityId: z.enum(["presencial", "streaming", "on_demand"]),

  // Arancel y Moneda
  market: z.enum(["AR", "INT"]).default("AR"),
  currency: z.enum(["ARS", "USD"]).default("ARS"),
  overrideAmount: z.number().positive().optional(),

  // Pago
  paymentMethod: z.enum(["efectivo", "transferencia", "mercadopago_presencial", "pendiente"]),
  paymentStatus: z.enum(["acreditado", "declarado", "pendiente"]),
  amountReceived: z.number().min(0).default(0),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
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
    const parsed = ManualEnrollmentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const {
      userId,
      newParticipant,
      capacitacionId,
      ofertaId,
      modalityId,
      market,
      currency,
      overrideAmount,
      paymentMethod,
      paymentStatus,
      amountReceived,
      paymentReference,
      notes,
    } = parsed.data;

    // 1. Resolver usuario participante (existente o nuevo)
    let participant: any = null;
    if (userId) {
      participant = await findUserById(userId);
      if (!participant) {
        return NextResponse.json(
          { error: "PARTICIPANT_NOT_FOUND", message: `No se encontró el participante con ID: ${userId}` },
          { status: 404 }
        );
      }
    } else if (newParticipant) {
      participant = await findOrCreateParticipant({
        email: newParticipant.email,
        fullName: newParticipant.fullName,
        phone: newParticipant.phone,
        documentId: newParticipant.documentId,
        country: newParticipant.country || "AR",
      });
    } else {
      return NextResponse.json(
        {
          error: "MISSING_PARTICIPANT_DATA",
          message: "Debe seleccionar un participante existente o ingresar los datos para registrar uno nuevo.",
        },
        { status: 400 }
      );
    }

    // 2. Resolver capacitación y edición
    const training = await getTrainingById(capacitacionId, true);
    if (!training) {
      return NextResponse.json(
        { error: "TRAINING_NOT_FOUND", message: `Capacitación no encontrada: ${capacitacionId}` },
        { status: 404 }
      );
    }

    const edition = ofertaId
      ? training.ediciones?.find((e) => e.oferta_id === ofertaId)
      : training.ediciones?.[0];
    const targetOfertaId = edition?.oferta_id || ofertaId || null;

    // 3. Determinar arancel comercial
    let amountTotal = 0;
    if (overrideAmount && overrideAmount > 0) {
      amountTotal = overrideAmount;
    } else {
      let candidatePrices: any[] = [];
      if (targetOfertaId) {
        candidatePrices = await getPricesForEdition(targetOfertaId, false);
      }
      if ((!candidatePrices || candidatePrices.length === 0) && training.ediciones && training.ediciones.length > 0) {
        for (const ed of training.ediciones) {
          if (ed.precios && ed.precios.length > 0) {
            candidatePrices = ed.precios;
            break;
          }
        }
      }

      if (candidatePrices && candidatePrices.length > 0) {
        const matched = findMatchingPrice(candidatePrices, market, currency);
        if (matched) {
          const effective = calculateEffectivePrice(matched);
          amountTotal = effective.effectivePrice;
        }
      }

      // Si es On Demand, recargo si corresponde
      if (modalityId === "on_demand" && amountTotal > 0 && edition?.fecha_inicio) {
        const onDemandCalc = calculateOnDemandPrice(amountTotal, edition.fecha_inicio);
        amountTotal = onDemandCalc.finalPrice;
      }
    }

    // 4. Regla de negocio: Prevención de duplicados
    const existingEnrollment = await getUserEnrollmentForTraining(participant.id, capacitacionId, targetOfertaId);
    if (existingEnrollment) {
      if (existingEnrollment.status === "confirmada") {
        return NextResponse.json(
          {
            error: "ALREADY_CONFIRMED",
            message: `El participante ${participant.full_name} (${participant.email}) ya posee una inscripción confirmada para esta capacitación.`,
            enrollmentId: existingEnrollment.id,
          },
          { status: 409 }
        );
      } else if (existingEnrollment.status === "pendiente_pago") {
        return NextResponse.json(
          {
            error: "PENDING_ENROLLMENT_EXISTS",
            message: `El participante ya tiene una inscripción pendiente de pago (${existingEnrollment.id}). Puede registrar el pago sobre esa inscripción en lugar de duplicarla.`,
            enrollmentId: existingEnrollment.id,
          },
          { status: 409 }
        );
      }
    }

    // 5. Determinar estado de pago e inscripción
    // REGLA CRÍTICA:
    // Nunca acreditar automáticamente una transferencia por el solo hecho de cargar un comprobante.
    // Si paymentMethod == "transferencia" y paymentStatus == "declarado", el pago queda pendiente de verificación.
    // Si el administrador explícitamente selecciona "acreditado", se confirma.
    const isAcredited = paymentStatus === "acreditado" && amountReceived >= amountTotal;
    const initialStatus = isAcredited ? "confirmada" : "pendiente_pago";

    // 6. Crear la inscripción
    const adminNote = `Inscripción manual por admin: ${session.email}. Medio: ${paymentMethod}. Ref: ${paymentReference || "N/A"}. Obs: ${notes || "Ninguna"}`;
    const enrollment = await createEnrollment({
      userId: participant.id,
      capacitacionId,
      ofertaId: targetOfertaId,
      modalityId: modalityId as ModalityId,
      currency: currency as CurrencyType,
      amountTotal,
      paymentMethod,
      notes: adminNote,
    });

    // 7. Si hay pago declarado o acreditado, registrar el payment_record
    let paymentRecord: any = null;
    if (amountReceived > 0 || paymentReference || paymentStatus !== "pendiente") {
      const recordStatus = isAcredited ? "approved" : "pending";
      const externalRef = paymentReference ? `MANUAL-${paymentReference.trim()}` : `MANUAL-${enrollment.id}-${Date.now()}`;

      paymentRecord = await recordPayment({
        enrollmentId: enrollment.id,
        externalPaymentId: externalRef,
        provider: "manual",
        status: recordStatus,
        amount: amountReceived,
        currency: currency as CurrencyType,
        payerEmail: participant.email,
        rawPayload: {
          adminEmail: session.email,
          paymentMethod,
          paymentStatus,
          paymentReference: paymentReference || null,
          adminNotes: notes || null,
          createdAt: new Date().toISOString(),
        },
      });

      // Si fue acreditado, autoGrantMaterial ya se ejecuta dentro de recordPayment si status == "approved",
      // pero nos aseguramos explícitamente
      if (isAcredited) {
        await autoGrantMaterialForEnrollment(participant.id, capacitacionId, enrollment.id);
      }
    }

    // 8. Registro de auditoría
    await recordAuditLog({
      userId: session.userId,
      action: "MANUAL_ENROLLMENT_CREATED",
      entityType: "enrollment",
      entityId: enrollment.id,
      details: {
        adminEmail: session.email,
        participantId: participant.id,
        participantEmail: participant.email,
        capacitacionId,
        modalityId,
        amountTotal,
        amountReceived,
        paymentMethod,
        paymentStatus,
        isAcredited,
        paymentReference: paymentReference || null,
      },
    });

    // 9. Integración con Jerkson / Ecosistema: Emitir eventos de integración
    // a. Evento enrollment.created
    await recordIntegrationEvent({
      idempotencyKey: `EVT-ENR-CRE-${enrollment.id}`,
      eventType: "enrollment.created",
      source: "admin_manual",
      payload: {
        enrollmentId: enrollment.id,
        userId: participant.id,
        email: participant.email,
        fullName: participant.full_name,
        phone: participant.profile?.phone || null,
        capacitacionId,
        ofertaId: targetOfertaId,
        modality: modalityId,
        status: enrollment.status,
        amountTotal,
        adminEmail: session.email,
      },
      status: "processed",
    });

    // b. Si el pago quedó acreditado, emitir payment.confirmed con datos para Jerkson
    if (isAcredited) {
      await recordIntegrationEvent({
        idempotencyKey: `EVT-PAY-CONF-${enrollment.id}`,
        eventType: "payment.confirmed",
        source: "admin_manual",
        payload: {
          enrollmentId: enrollment.id,
          userId: participant.id,
          email: participant.email,
          fullName: participant.full_name,
          phone: participant.profile?.phone || null,
          capacitacionId,
          ofertaId: targetOfertaId,
          modality: modalityId,
          amountPaid: amountReceived,
          currency,
          paymentMethod,
          whatsappGroupUrl: edition?.whatsapp_group_url || null,
          materialsGranted: true,
          adminEmail: session.email,
        },
        status: "processed",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: isAcredited
          ? "Inscripción manual confirmada con éxito. Pago acreditado y materiales habilitados."
          : "Inscripción manual registrada con éxito en estado pendiente de pago/verificación.",
        enrollment: {
          id: enrollment.id,
          status: isAcredited ? "confirmada" : "pendiente_pago",
          capacitacion_id: enrollment.capacitacion_id,
          modality_id: enrollment.modality_id,
          amount_total: amountTotal,
          amount_paid: isAcredited ? amountReceived : 0,
          currency: enrollment.currency,
          participant: {
            id: participant.id,
            email: participant.email,
            fullName: participant.full_name,
            phone: participant.profile?.phone || null,
          },
          edition: {
            oferta_id: targetOfertaId,
            whatsapp_group_url: edition?.whatsapp_group_url || null,
          },
        },
        payment: paymentRecord,
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
