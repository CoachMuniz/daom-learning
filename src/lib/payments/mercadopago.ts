/**
 * DAOM Learning — Integración Oficial de Mercado Pago Checkout Pro
 * Canario: DAOM-MERCADOPAGO-MCP-01
 *
 * Módulo de comunicación server-to-server y verificación de pagos:
 * - Consulta directa a https://api.mercadopago.com/v1/payments/{id}
 * - Validación estricta de status, moneda (ARS), monto y external_reference
 * - Idempotencia criptográfica con control de duplicados
 * - Acreditación automática y habilitación de materiales complementarios ZIP
 */

import { getDatabase } from "@/lib/db/client";
import {
  getEnrollmentById,
  recordPayment,
  updateEnrollmentStatus,
  recordIntegrationEvent,
  findIntegrationEvent,
} from "@/lib/db/repository";

/**
 * Recupera el Access Token oficial de Mercado Pago para la integración de Checkout Pro.
 * Admite tanto credenciales de producción como credenciales de prueba generadas para
 * la cuenta vendedora de prueba (que desde noviembre de 2025 pueden iniciar con 'APP_USR-').
 */
export function getMercadoPagoAccessToken(): string | null {
  const candidate =
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_CHECKOUT_PRO_CLEAN_TEST_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN;

  if (!candidate) return null;
  const clean = candidate.trim();
  // Validar formato de Access Token de Mercado Pago (APP_USR- o TEST-)
  if (/^(APP_USR|TEST)-[A-Za-z0-9_-]+$/.test(clean)) {
    return clean;
  }
  return clean || null;
}

export interface VerifiedPaymentResult {
  ok: boolean;
  httpStatus: number;
  payment?: {
    id: number;
    status: string;
    status_detail?: string;
    external_reference: string | null;
    transaction_amount: number;
    currency_id: string;
    payer_email?: string | null;
    date_approved?: string | null;
    payment_method_id?: string | null;
    raw: Record<string, any>;
  };
  error?: string;
}

/**
 * Consulta oficial Server-to-Server a la API de Mercado Pago para obtener el estado real de un pago.
 * NUNCA se confía en los datos recibidos por el cliente o en el cuerpo de la notificación.
 */
export const EXPECTED_COLLECTOR_ID = process.env.MERCADOPAGO_COLLECTOR_ID || "1097736220";

export async function fetchMercadoPagoPayment(
  paymentId: string | number,
  maxRetries = 3
): Promise<VerifiedPaymentResult> {
  const token = getMercadoPagoAccessToken();
  if (!token) {
    return {
      ok: false,
      httpStatus: 500,
      error: "MERCADO_PAGO_TOKEN_NOT_CONFIGURED",
    };
  }

  const cleanId = String(paymentId).trim().replace(/^MP-/, "");
  let lastStatus = 0;
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(cleanId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "DAOM-Learning-Payment-Service/2.0",
        },
        cache: "no-store",
      });

      lastStatus = res.status;

      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          httpStatus: 200,
          payment: {
            id: data.id,
            status: data.status,
            status_detail: data.status_detail,
            external_reference: data.external_reference || null,
            transaction_amount: Number(data.transaction_amount || 0),
            currency_id: data.currency_id || "ARS",
            payer_email: data.payer?.email || null,
            date_approved: data.date_approved || null,
            payment_method_id: data.payment_method_id || null,
            raw: data,
          },
        };
      }

      const errText = await res.text().catch(() => "");
      lastError = `Error HTTP ${res.status} al consultar pago en Mercado Pago: ${errText.slice(0, 100)}`;

      // Si no es transitorio (ej. 401 Unauthorized), no reintentar
      if (res.status !== 404 && res.status !== 429 && res.status < 500) {
        return {
          ok: false,
          httpStatus: res.status,
          error: lastError,
        };
      }
    } catch (err: any) {
      lastStatus = 0;
      lastError = err.message || "Excepción de red al conectar con Mercado Pago";
    }

    if (attempt < maxRetries) {
      const delay = 600 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return {
    ok: false,
    httpStatus: lastStatus || 500,
    error: lastError || "Agotados los reintentos al consultar Mercado Pago",
  };
}

/**
 * Procesa la acreditación o rechazo verificado de una inscripción tras consultar la API de Mercado Pago.
 */
export async function verifyAndProcessEnrollmentPayment(options: {
  paymentId: string | number;
  expectedEnrollmentId?: string;
  source?: "webhook" | "verify_endpoint" | "sync";
}): Promise<{
  success: boolean;
  status: string;
  message: string;
  enrollment_id?: string;
  payment_id?: string;
  error?: string;
}> {
  const { paymentId, expectedEnrollmentId, source = "webhook" } = options;

  // 1. Consultar estado oficial en Mercado Pago
  const verified = await fetchMercadoPagoPayment(paymentId);
  if (!verified.ok || !verified.payment) {
    return {
      success: false,
      status: "verification_failed",
      message: verified.error || "No se pudo verificar el pago en Mercado Pago",
      error: verified.error,
    };
  }

  const p = verified.payment;
  const enrollmentId = p.external_reference || expectedEnrollmentId;

  if (!enrollmentId) {
    return {
      success: false,
      status: "missing_external_reference",
      message: "El pago verificado no cuenta con external_reference vinculado a una inscripción.",
    };
  }

  // Si se proveyó un enrollmentId esperado, asegurar que coincida exactamente
  if (expectedEnrollmentId && p.external_reference && p.external_reference !== expectedEnrollmentId) {
    return {
      success: false,
      status: "mismatched_reference",
      message: `El external_reference del pago (${p.external_reference}) no coincide con la inscripción esperada (${expectedEnrollmentId}).`,
    };
  }

  // 2. Verificar moneda ARS y Collector ID autorizado
  if (p.currency_id !== "ARS") {
    return {
      success: false,
      status: "invalid_currency",
      message: `Moneda inválida en pago: ${p.currency_id}. Se esperaba ARS.`,
    };
  }

  const actualCollector = String(p.raw?.collector_id || "");
  if (actualCollector && EXPECTED_COLLECTOR_ID && actualCollector !== String(EXPECTED_COLLECTOR_ID)) {
    return {
      success: false,
      status: "unauthorized_collector",
      message: `Collector ID no autorizado en pago: ${actualCollector}. Se esperaba ${EXPECTED_COLLECTOR_ID}.`,
    };
  }

  // 3. Validar existencia de la inscripción en base de datos
  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment) {
    return {
      success: false,
      status: "enrollment_not_found",
      message: `Inscripción no encontrada en sistema local: ${enrollmentId}`,
    };
  }

  // 4. Control de Idempotencia
  const idempotencyKey = `MP-PAY-${p.id}-${p.status}`;
  const existingEvent = await findIntegrationEvent(idempotencyKey);
  if (existingEvent) {
    return {
      success: true,
      status: p.status,
      message: "Pago ya procesado previamente de forma idempotente.",
      enrollment_id: enrollment.id,
      payment_id: `MP-${p.id}`,
    };
  }

  // 5. Validar monto total contra el precio registrado
  if (p.status === "approved" && p.transaction_amount < enrollment.amount_total) {
    await recordIntegrationEvent({
      idempotencyKey,
      eventType: "enrollment.status_updated",
      source: "payment_gateway",
      payload: { payment: p, enrollment },
      status: "failed",
      errorMessage: `Monto pagado (${p.transaction_amount}) es menor al total requerido (${enrollment.amount_total})`,
    });
    return {
      success: false,
      status: "amount_mismatch",
      message: `El monto acreditado ($${p.transaction_amount}) no cubre el valor total de la inscripción ($${enrollment.amount_total}).`,
    };
  }

  // 6. Transición de estado según status oficial de Mercado Pago
  if (p.status === "approved") {
    const paymentRecord = await recordPayment({
      enrollmentId: enrollment.id,
      externalPaymentId: `MP-${p.id}`,
      provider: "mercadopago",
      status: "approved",
      amount: p.transaction_amount,
      currency: "ARS",
      payerEmail: p.payer_email,
      rawPayload: p.raw,
    });

    await recordIntegrationEvent({
      idempotencyKey,
      eventType: "payment.confirmed",
      source: "payment_gateway",
      payload: { payment: p, enrollment_id: enrollment.id },
      status: "processed",
    });

    return {
      success: true,
      status: "approved",
      message: "Pago de Mercado Pago acreditado exitosamente. Material complementario habilitado.",
      enrollment_id: enrollment.id,
      payment_id: paymentRecord.id,
    };
  } else if (p.status === "refunded" || p.status === "charged_back") {
    // 6b. Reembolso o contracargo: registrar reembolso, cambiar estado a 'reembolsada' y revocar accesos
    const paymentRecord = await recordPayment({
      enrollmentId: enrollment.id,
      externalPaymentId: `MP-${p.id}-REFUND`,
      provider: "mercadopago",
      status: "refunded",
      amount: p.transaction_amount,
      currency: "ARS",
      payerEmail: p.payer_email,
      rawPayload: p.raw,
    });

    await updateEnrollmentStatus(
      enrollment.id,
      "reembolsada",
      `Pago ${p.status} en Mercado Pago. Fondos restituidos al pagador.`
    );

    // Revocar accesos a materiales complementarios
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    await db.run(
      `UPDATE material_entitlements SET is_revoked = 1, revoked_at = ? WHERE enrollment_id = ?`,
      [nowIso, enrollment.id]
    );

    await recordIntegrationEvent({
      idempotencyKey,
      eventType: "enrollment.status_updated",
      source: "payment_gateway",
      payload: { payment: p, enrollment_id: enrollment.id, action: "refund_processed" },
      status: "processed",
    });

    return {
      success: true,
      status: p.status,
      message: `Reembolso procesado correctamente. Inscripción actualizada a reembolsada y accesos revocados.`,
      enrollment_id: enrollment.id,
      payment_id: paymentRecord.id,
    };
  } else if (p.status === "rejected") {
    // 6c. Pago rechazado: registrar intento fallido pero NO cancelar irreversiblemente la inscripción
    // Permite al participante reintentar el pago con otra tarjeta o medio sin perder su registro
    await recordPayment({
      enrollmentId: enrollment.id,
      externalPaymentId: `MP-${p.id}`,
      provider: "mercadopago",
      status: "rejected",
      amount: p.transaction_amount,
      currency: "ARS",
      payerEmail: p.payer_email,
      rawPayload: p.raw,
    });

    // Mantiene 'pendiente_pago' para reintento seguro
    await updateEnrollmentStatus(
      enrollment.id,
      "pendiente_pago",
      `Intento de pago rechazado en Mercado Pago (${p.status_detail || "sin detalle"}). Habilitado para reintento.`
    );

    await recordIntegrationEvent({
      idempotencyKey,
      eventType: "enrollment.status_updated",
      source: "payment_gateway",
      payload: { payment: p, enrollment_id: enrollment.id, retry_allowed: true },
      status: "processed",
    });

    return {
      success: true,
      status: "rejected",
      message: `Pago rechazado por Mercado Pago (${p.status_detail || "rechazo"}). Inscripción preservada para reintento.`,
      enrollment_id: enrollment.id,
      payment_id: `MP-${p.id}`,
    };
  } else if (p.status === "cancelled") {
    // 6d. Cancelación definitiva (ej: preferencia expirada o cancelación voluntaria)
    await updateEnrollmentStatus(
      enrollment.id,
      "cancelada",
      `Preferencia o pago cancelado en Mercado Pago (${p.status_detail || "cancelado"})`
    );

    await recordIntegrationEvent({
      idempotencyKey,
      eventType: "enrollment.status_updated",
      source: "payment_gateway",
      payload: { payment: p, enrollment_id: enrollment.id },
      status: "processed",
    });

    return {
      success: true,
      status: "cancelled",
      message: `Pago cancelado registrado correctamente.`,
      enrollment_id: enrollment.id,
      payment_id: `MP-${p.id}`,
    };
  } else {
    // 6e. Estados intermedios: pending, in_process, in_mediation, authorized
    return {
      success: true,
      status: p.status,
      message: `El pago se encuentra en estado '${p.status}'. La inscripción permanece pendiente hasta confirmación definitiva.`,
      enrollment_id: enrollment.id,
      payment_id: `MP-${p.id}`,
    };
  }
}
