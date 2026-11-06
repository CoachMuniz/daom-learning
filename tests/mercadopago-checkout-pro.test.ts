import { describe, it, expect, beforeAll, vi } from "vitest";
import { getDatabase } from "../src/lib/db/client";
import {
  createEnrollment,
  findOrCreateParticipant,
  getEnrollmentById,
  getUserMaterialEntitlements,
} from "../src/lib/db/repository";
import {
  getMercadoPagoAccessToken,
  fetchMercadoPagoPayment,
  verifyAndProcessEnrollmentPayment,
} from "../src/lib/payments/mercadopago";
import { verifyMercadoPagoSignature } from "../src/lib/security/webhooks";
import { createHmac } from "node:crypto";

describe("Mercado Pago Checkout Pro — Integración Oficial, Calidad y Seguridad", () => {
  const canaryTrainingId = `MP-TEST-TRAINING-${Date.now()}`;
  const ofertaId = `MP-OFE-${Date.now()}`;
  let testUserId: string;
  let testEnrollmentId: string;
  const nowIso = new Date().toISOString();

  beforeAll(async () => {
    const db = getDatabase();

    // 1. Capacitación
    await db.run(
      `INSERT INTO trainings (
        capacitacion_id, tipo, titulo, subtitulo, descripcion, estado_editorial, verificacion, orden, destacada, synced_at
      ) VALUES (?, 'seminario', 'Seminario de Levantamiento Olímpico Avanzado', 'Potencia y Dinámica', 'Descripción', 'publicado', 'verificado', 1, 'SI', ?)`,
      [canaryTrainingId, nowIso]
    );

    // 2. Edición
    await db.run(
      `INSERT INTO training_editions (
        oferta_id, capacitacion_id, nombre_edicion, fecha_inicio, modalidades, cupo_presencial, cupo_streaming,
        estado_comercial, estado_editorial, verificacion, synced_at
      ) VALUES (?, ?, 'Edición Noviembre 2026', '2026-11-25', 'presencial, streaming', 25, 50, 'abierta', 'publicado', 'verificado', ?)`,
      [ofertaId, canaryTrainingId, nowIso]
    );

    // 3. Material educativo ZIP para verificar habilitación automática
    await db.run(
      `INSERT INTO material_assets (
        id, capacitacion_id, title, file_name, file_size_bytes, mime_type, storage_path, version, is_active, created_at
      ) VALUES (?, ?, 'Guía Completa en PDF y Planillas ZIP', 'guia-levantamiento.zip', 14500000, 'application/zip', 'https://storage.daom-weightlifting.com/materials/guia-levantamiento.zip', '1.0', 1, ?)`,
      [`MAT-${Date.now()}`, canaryTrainingId, nowIso]
    );

    // 4. Participante
    const user = await findOrCreateParticipant({
      email: `atleta.mp.${Date.now()}@daom.ar`,
      fullName: "Brenda Analia Daom",
      country: "AR",
      documentId: "35123456",
      phone: "+5491122334455",
    });
    testUserId = user.id;

    // 5. Inscripción en pendiente_pago
    const enr = await createEnrollment({
      userId: testUserId,
      capacitacionId: canaryTrainingId,
      ofertaId,
      modalityId: "presencial",
      currency: "ARS",
      amountTotal: 45000,
      paymentMethod: "mercadopago",
    });
    testEnrollmentId = enr.id;
  });

  it("1. Recupera el token oficial de Mercado Pago para la aplicación autorizada 4543074824173101", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN =
      process.env.MERCADOPAGO_ACCESS_TOKEN ||
      process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN ||
      "TEST-4543074824173101-mock-token-1097736220";

    const token = getMercadoPagoAccessToken();
    expect(token).toBeTruthy();
    expect(token).toMatch(/^TEST-4543074824173101/);
  });

  it("2. Valida la firma criptográfica HMAC-SHA256 con timestamp en milisegundos y cabecera x-request-id", () => {
    const testSecret = "47cf48b_test_secret_daom_secure_webhook_key_2026";
    const dataId = "123456789";
    const xRequestId = "daom-req-uuid-98765";
    const nowMs = Date.now(); // Milisegundos como envía Mercado Pago real

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${nowMs};`;
    const v1Hash = createHmac("sha256", testSecret).update(manifest).digest("hex");
    const xSignatureHeader = `ts=${nowMs},v1=${v1Hash}`;

    // 1. Firma legítima dentro de tolerancia
    const validResult = verifyMercadoPagoSignature(xSignatureHeader, dataId, xRequestId, testSecret);
    expect(validResult.valid).toBe(true);

    // 2. Firma falsificada
    const invalidResult = verifyMercadoPagoSignature(
      `ts=${nowMs},v1=fakehash1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`,
      dataId,
      xRequestId,
      testSecret
    );
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.reason).toContain("inválida");

    // 3. Firma expirada (fuera de tolerancia temporal de 300s)
    const oldMs = nowMs - 600 * 1000;
    const oldManifest = `id:${dataId};request-id:${xRequestId};ts:${oldMs};`;
    const oldHash = createHmac("sha256", testSecret).update(oldManifest).digest("hex");
    const expiredResult = verifyMercadoPagoSignature(`ts=${oldMs},v1=${oldHash}`, dataId, xRequestId, testSecret);
    expect(expiredResult.valid).toBe(false);
    expect(expiredResult.reason).toContain("tolerancia temporal");
  });

  it("3. Anti-tampering: Rechaza pagos con moneda diferente a ARS o montos inferiores al total", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const testPaymentId1 = Math.floor(10000000 + Math.random() * 90000000);
    const testPaymentId2 = Math.floor(10000000 + Math.random() * 90000000);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: testPaymentId1,
        status: "approved",
        external_reference: testEnrollmentId,
        transaction_amount: 45000,
        currency_id: "USD", // Inválido
        payer: { email: "atleta@daom.ar" },
      }),
    } as any);

    const currencyResult = await verifyAndProcessEnrollmentPayment({
      paymentId: testPaymentId1,
      expectedEnrollmentId: testEnrollmentId,
    });
    expect(currencyResult.success).toBe(false);
    expect(currencyResult.status).toBe("invalid_currency");

    // Mock de pago con monto alterado (menor al total requerido)
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: testPaymentId2,
        status: "approved",
        external_reference: testEnrollmentId,
        transaction_amount: 1000, // Menor a 45000
        currency_id: "ARS",
        payer: { email: "atleta@daom.ar" },
      }),
    } as any);

    const amountResult = await verifyAndProcessEnrollmentPayment({
      paymentId: testPaymentId2,
      expectedEnrollmentId: testEnrollmentId,
    });
    expect(amountResult.success).toBe(false);
    expect(amountResult.status).toBe("amount_mismatch");

    fetchSpy.mockRestore();
  });

  let sharedApprovedPaymentId: number;

  it("4. Acreditación Server-to-Server aprobada: cambia estado a 'confirmada', registra pago y otorga material ZIP", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    sharedApprovedPaymentId = Math.floor(10000000 + Math.random() * 90000000);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: sharedApprovedPaymentId,
        status: "approved",
        status_detail: "accredited",
        external_reference: testEnrollmentId,
        transaction_amount: 45000,
        currency_id: "ARS",
        date_approved: nowIso,
        payer: { email: "brenda.daom@daom.ar" },
      }),
    } as any);

    const processResult = await verifyAndProcessEnrollmentPayment({
      paymentId: sharedApprovedPaymentId,
      expectedEnrollmentId: testEnrollmentId,
    });

    expect(processResult.success).toBe(true);
    expect(processResult.status).toBe("approved");

    // Verificar en BD que la inscripción pasó a confirmada
    const enrUpdated = await getEnrollmentById(testEnrollmentId);
    expect(enrUpdated).toBeTruthy();
    expect(enrUpdated?.status).toBe("confirmada");
    expect(enrUpdated?.amount_paid).toBe(45000);

    // Verificar que los materiales complementarios ZIP se habilitaron automáticamente
    const entitlements = await getUserMaterialEntitlements(testUserId);
    expect(entitlements.length).toBeGreaterThan(0);
    expect(entitlements[0].asset?.file_name).toContain(".zip");

    fetchSpy.mockRestore();
  });

  it("5. Idempotencia estricta: un segundo webhook o verificación con el mismo payment_id no duplica acreditación", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: sharedApprovedPaymentId,
        status: "approved",
        status_detail: "accredited",
        external_reference: testEnrollmentId,
        transaction_amount: 45000,
        currency_id: "ARS",
        payer: { email: "brenda.daom@daom.ar" },
      }),
    } as any);

    const duplicateResult = await verifyAndProcessEnrollmentPayment({
      paymentId: sharedApprovedPaymentId,
      expectedEnrollmentId: testEnrollmentId,
    });

    expect(duplicateResult.success).toBe(true);
    expect(duplicateResult.message).toContain("idempotente");

    // Verificar que el monto pagado sigue siendo 45000 y no 90000
    const enr = await getEnrollmentById(testEnrollmentId);
    expect(enr?.amount_paid).toBe(45000);

    fetchSpy.mockRestore();
  });

  it("6. Manejo de pagos rechazados/cancelados: actualiza estado a 'cancelada' sin otorgar materiales", async () => {
    // Crear una nueva inscripción para prueba de rechazo
    const enrCancel = await createEnrollment({
      userId: testUserId,
      capacitacionId: canaryTrainingId,
      ofertaId,
      modalityId: "streaming",
      currency: "ARS",
      amountTotal: 35000,
      paymentMethod: "mercadopago",
    });

    const fetchSpy = vi.spyOn(global, "fetch");
    const rejectedPaymentId = Math.floor(10000000 + Math.random() * 90000000);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: rejectedPaymentId,
        status: "rejected",
        status_detail: "cc_rejected_insufficient_amount",
        external_reference: enrCancel.id,
        transaction_amount: 35000,
        currency_id: "ARS",
        payer: { email: "brenda.daom@daom.ar" },
      }),
    } as any);

    const rejectResult = await verifyAndProcessEnrollmentPayment({
      paymentId: rejectedPaymentId,
      expectedEnrollmentId: enrCancel.id,
    });

    expect(rejectResult.success).toBe(true);
    expect(rejectResult.status).toBe("rejected");

    const enrCancelled = await getEnrollmentById(enrCancel.id);
    expect(enrCancelled?.status).toBe("cancelada");

    fetchSpy.mockRestore();
  });

  it("7. Conexión Real a Mercado Pago API: crea una preferencia Checkout Pro válida en Sandbox con App 4543074824173101", async () => {
    const token = getMercadoPagoAccessToken();
    if (!token) {
      console.warn("MERCADO_PAGO_TEST_ACCESS_TOKEN no configurado en entorno. Omitiendo llamada real.");
      return;
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: canaryTrainingId,
            title: "DAOM Learning: Levantamiento Olímpico Avanzado",
            description: "Modalidad: presencial - DAOM Weightlifting",
            category_id: "learnings",
            quantity: 1,
            unit_price: 45000,
            currency_id: "ARS",
          },
        ],
        payer: {
          name: "Brenda",
          surname: "Daom",
          email: "test_payer_daom@example.com",
        },
        statement_descriptor: "DAOM LEARNING",
        binary_mode: true,
        external_reference: testEnrollmentId,
        notification_url: "https://www.daom-weightlifting.com/api/v1/webhooks/mercadopago",
        back_urls: {
          success: `https://www.daom-weightlifting.com/capacitaciones/confirmacion?enrollment_id=${testEnrollmentId}&status=approved`,
          pending: `https://www.daom-weightlifting.com/capacitaciones/confirmacion?enrollment_id=${testEnrollmentId}&status=pending`,
          failure: `https://www.daom-weightlifting.com/capacitaciones/confirmacion?enrollment_id=${testEnrollmentId}&status=failure`,
        },
        auto_return: "approved",
      }),
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    expect(data.id).toContain("1097736220"); // Owner ID de la aplicación 4543074824173101
    expect(data.sandbox_init_point).toBeTruthy();
    expect(data.init_point).toBeTruthy();
  });
});
