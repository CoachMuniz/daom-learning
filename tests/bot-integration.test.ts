import { describe, it, expect } from "vitest";
import { validateBotRequest, checkIdempotency } from "../src/lib/bot/auth";
import {
  PaymentConfirmSchema,
  EnrollmentStatusSchema,
  AttendanceRecordSchema,
  CertificateLinkSchema,
  ModalityChangeRequestSchema,
} from "../src/lib/bot/schemas";
import { recordIntegrationEvent, findIntegrationEvent } from "../src/lib/db/repository";
import { calculateModalityChangeFee } from "../src/lib/commercial/rules";

describe("Contrato de Integración con el Bot (API v1)", () => {
  it("valida la autenticación Server-to-Server entre el bot y la plataforma", () => {
    // 1. Petición sin credenciales
    const unauthReq = new Request("http://localhost:3000/api/v1/bot/payments/confirm", {
      method: "POST",
    });
    const unauthResult = validateBotRequest(unauthReq);
    expect(unauthResult.authorized).toBe(false);

    // 2. Petición con API key correcta
    const authReq = new Request("http://localhost:3000/api/v1/bot/payments/confirm", {
      method: "POST",
      headers: {
        "x-api-key": "daom_bot_integration_key_secret_2026_secure",
      },
    });
    const authResult = validateBotRequest(authReq);
    expect(authResult.authorized).toBe(true);

    // 3. Petición con Bearer token correcto
    const bearerReq = new Request("http://localhost:3000/api/v1/bot/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: "Bearer daom_bot_integration_key_secret_2026_secure",
      },
    });
    const bearerResult = validateBotRequest(bearerReq);
    expect(bearerResult.authorized).toBe(true);
  });

  it("garantiza idempotencia estricta en el procesamiento de eventos de integración", async () => {
    const uniqueKey = `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Primer chequeo: no existe
    const firstCheck = await checkIdempotency(uniqueKey);
    expect(firstCheck.isDuplicate).toBe(false);

    // 2. Registrar el evento
    await recordIntegrationEvent({
      idempotencyKey: uniqueKey,
      eventType: "payment.confirmed",
      source: "bot",
      payload: { amount: 150000, enrollment_id: "ENR-TEST-1" },
      status: "processed",
    });

    // 3. Segundo chequeo con la misma clave: debe marcarse como duplicado idempotente
    const secondCheck = await checkIdempotency(uniqueKey);
    expect(secondCheck.isDuplicate).toBe(true);
    expect(secondCheck.existingEvent?.idempotency_key).toBe(uniqueKey);
  });

  it("valida rigurosamente los esquemas de payload Zod para cada operación del bot", () => {
    // PaymentConfirm: requiere idempotency_key de al menos 8 caracteres y amount positivo
    const validPayment = {
      idempotency_key: "IDEMP-VALID-12345",
      enrollment_id: "ENR-123",
      provider: "mercadopago",
      amount: 150000,
      currency: "ARS",
    };
    expect(PaymentConfirmSchema.safeParse(validPayment).success).toBe(true);

    const invalidPayment = {
      idempotency_key: "short", // Demasiado corto
      enrollment_id: "ENR-123",
      provider: "invalid_gateway",
      amount: -50,
      currency: "BTC",
    };
    expect(PaymentConfirmSchema.safeParse(invalidPayment).success).toBe(false);

    // AttendanceRecord: formato de fecha estricto YYYY-MM-DD
    const validAttendance = {
      idempotency_key: "IDEMP-ATT-12345",
      enrollment_id: "ENR-123",
      user_id: "USR-123",
      session_date: "2026-11-15",
      attended: true,
      modality_attended: "presencial",
    };
    expect(AttendanceRecordSchema.safeParse(validAttendance).success).toBe(true);

    const invalidAttendance = {
      idempotency_key: "IDEMP-ATT-12345",
      enrollment_id: "ENR-123",
      user_id: "USR-123",
      session_date: "15/11/2026", // Formato incorrecto
    };
    expect(AttendanceRecordSchema.safeParse(invalidAttendance).success).toBe(false);
  });

  it("calcula recargo de cambio de modalidad para el bot respetando el umbral de 7 días", () => {
    const basePrice = 200000;
    const refDate = new Date("2026-11-01T10:00:00-03:00");

    // Menos de 7 días antes del evento (ej: a 4 días)
    const lateChange = calculateModalityChangeFee(basePrice, "2026-11-05", refDate);
    expect(lateChange.surchargePercentage).toBe(25);
    expect(lateChange.surchargeAmount).toBe(50000);
    expect(lateChange.totalWithFee).toBe(250000);

    // Con 7 o más días de anticipación (ej: a 12 días)
    const earlyChange = calculateModalityChangeFee(basePrice, "2026-11-13", refDate);
    expect(earlyChange.surchargePercentage).toBe(0);
    expect(earlyChange.surchargeAmount).toBe(0);
    expect(earlyChange.totalWithFee).toBe(200000);
  });
});
