import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getEnrollmentById,
  recordPayment,
  recordAuditLog,
  recordIntegrationEvent,
  autoGrantMaterialForEnrollment,
} from "@/lib/db/repository";
import type { CurrencyType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ConfirmPaymentSchema = z.object({
  enrollmentId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(["efectivo", "transferencia", "mercadopago_presencial", "manual"]).default("transferencia"),
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
    const parsed = ConfirmPaymentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const { enrollmentId, amount, paymentMethod, paymentReference, notes } = parsed.data;

    // 1. Obtener la inscripción
    const enrollment = await getEnrollmentById(enrollmentId);
    if (!enrollment) {
      return NextResponse.json(
        { error: "ENROLLMENT_NOT_FOUND", message: `Inscripción no encontrada: ${enrollmentId}` },
        { status: 404 }
      );
    }

    // 2. Protección contra doble acreditación
    if (enrollment.status === "confirmada" && enrollment.amount_paid >= enrollment.amount_total) {
      return NextResponse.json(
        {
          error: "ALREADY_ACCREDITED",
          message: "Esta inscripción ya se encuentra completamente acreditada y confirmada. No se permite doble acreditación.",
          enrollmentId,
          amountPaid: enrollment.amount_paid,
          amountTotal: enrollment.amount_total,
        },
        { status: 409 }
      );
    }

    // 3. Registrar el pago aprobado
    const externalRef = paymentReference
      ? `CONFIRM-${paymentReference.trim()}`
      : `CONFIRM-${enrollment.id}-${Date.now()}`;

    const payment = await recordPayment({
      enrollmentId: enrollment.id,
      externalPaymentId: externalRef,
      provider: "manual",
      status: "approved",
      amount,
      currency: enrollment.currency as CurrencyType,
      payerEmail: enrollment.user?.email || null,
      rawPayload: {
        confirmedByAdmin: session.email,
        paymentMethod,
        paymentReference: paymentReference || null,
        adminNotes: notes || null,
        confirmedAt: new Date().toISOString(),
      },
    });

    // 4. Habilitar de inmediato material educativo complementario
    await autoGrantMaterialForEnrollment(enrollment.user_id, enrollment.capacitacion_id, enrollment.id);

    // 5. Auditoría
    await recordAuditLog({
      userId: session.userId,
      action: "MANUAL_PAYMENT_CONFIRMED",
      entityType: "enrollment",
      entityId: enrollment.id,
      details: {
        adminEmail: session.email,
        amount,
        paymentMethod,
        paymentReference: paymentReference || null,
        previousStatus: enrollment.status,
        newStatus: "confirmada",
      },
    });

    // 6. Integración con Jerkson / Ecosistema: Emitir payment.confirmed
    await recordIntegrationEvent({
      idempotencyKey: `EVT-PAY-CONFIRM-${enrollment.id}-${Date.now()}`,
      eventType: "payment.confirmed",
      source: "admin_manual",
      payload: {
        enrollmentId: enrollment.id,
        userId: enrollment.user_id,
        email: enrollment.user?.email || null,
        fullName: enrollment.user?.full_name || null,
        phone: enrollment.user?.profile?.phone || null,
        capacitacionId: enrollment.capacitacion_id,
        ofertaId: enrollment.oferta_id,
        modality: enrollment.modality_id,
        amountPaid: amount,
        currency: enrollment.currency,
        paymentMethod,
        whatsappGroupUrl: enrollment.edition?.whatsapp_group_url || null,
        materialsGranted: true,
        adminEmail: session.email,
      },
      status: "processed",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pago confirmado y acreditado exitosamente. Materiales habilitados y evento de confirmación emitido.",
        enrollmentId: enrollment.id,
        status: "confirmada",
        amountPaid: amount,
        paymentId: payment.id,
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
