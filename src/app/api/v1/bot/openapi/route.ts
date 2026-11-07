import { NextResponse } from "next/server";

export async function GET() {
  const openApiDoc = {
    openapi: "3.1.0",
    info: {
      title: "DAOM Learning — Bot Integration API",
      version: "1.1.0",
      description:
        "Contrato oficial de integración entre el bot de DAOM y la plataforma web de capacitaciones DAOM Learning. Canario: DAOM-LEARNING-FINAL-01.",
      contact: {
        name: "DAOM Weightlifting — Formación & Tecnología",
        email: "capacitaciones@daom-weightlifting.com",
      },
    },
    servers: [
      {
        url: "/api/v1/bot",
        description: "Servidor API v1 de Integración con el Bot",
      },
    ],
    security: [
      { ApiKeyAuth: [] },
      { BearerAuth: [] },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Clave secreta compartida entre el bot y DAOM Learning.",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Token de autorización Bearer de servicio a servicio.",
        },
      },
      schemas: {
        PaymentConfirmRequest: {
          type: "object",
          required: ["idempotency_key", "enrollment_id", "provider", "amount", "currency"],
          properties: {
            idempotency_key: { type: "string", minLength: 8 },
            enrollment_id: { type: "string" },
            external_payment_id: { type: "string" },
            provider: { type: "string", enum: ["mercadopago", "stripe", "manual", "bot"] },
            amount: { type: "number", minimum: 0 },
            currency: { type: "string", enum: ["ARS", "USD"] },
            payer_email: { type: "string", format: "email" },
            notes: { type: "string" },
          },
        },
        EnrollmentStatusRequest: {
          type: "object",
          required: ["idempotency_key", "enrollment_id", "status"],
          properties: {
            idempotency_key: { type: "string", minLength: 8 },
            enrollment_id: { type: "string" },
            status: {
              type: "string",
              enum: ["pendiente_pago", "confirmada", "cancelada", "reembolsada", "en_espera"],
            },
            notes: { type: "string" },
          },
        },
        AttendanceRecordRequest: {
          type: "object",
          required: ["idempotency_key", "enrollment_id", "user_id", "session_date"],
          properties: {
            idempotency_key: { type: "string", minLength: 8 },
            enrollment_id: { type: "string" },
            user_id: { type: "string" },
            session_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            attended: { type: "boolean", default: true },
            modality_attended: { type: "string", enum: ["presencial", "streaming"] },
            checked_in_by: { type: "string", default: "bot" },
            notes: { type: "string" },
          },
        },
        CertificateLinkRequest: {
          type: "object",
          required: ["idempotency_key", "enrollment_id", "user_id", "certificate_code", "title", "issue_date", "pdf_url"],
          properties: {
            idempotency_key: { type: "string", minLength: 8 },
            enrollment_id: { type: "string" },
            user_id: { type: "string" },
            certificate_code: { type: "string" },
            title: { type: "string" },
            issue_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            pdf_url: { type: "string", format: "uri" },
            verification_hash: { type: "string" },
          },
        },
        ModalityChangeRequest: {
          type: "object",
          required: ["idempotency_key", "enrollment_id", "requested_modality"],
          properties: {
            idempotency_key: { type: "string", minLength: 8 },
            enrollment_id: { type: "string" },
            requested_modality: { type: "string", enum: ["presencial", "streaming", "on_demand"] },
            reason: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/events": {
        get: {
          summary: "Consultar registro de eventos de integración del ecosistema",
          operationId: "listIntegrationEvents",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            { name: "event_type", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Lista de eventos de integración" },
            "401": { description: "No autorizado" },
          },
        },
        post: {
          summary: "Registrar evento de integración de forma idempotente",
          operationId: "recordIntegrationEvent",
          responses: {
            "201": { description: "Evento registrado" },
            "200": { description: "Evento ya registrado (idempotente)" },
            "400": { description: "Parámetros inválidos" },
            "401": { description: "No autorizado" },
          },
        },
      },
      "/payments/confirm": {
        post: {
          summary: "Confirmar pago y habilitar de inmediato el material ZIP",
          operationId: "confirmPayment",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentConfirmRequest" } } },
          },
          responses: {
            "200": { description: "Pago confirmado y material habilitado" },
            "400": { description: "Payload inválido" },
            "401": { description: "No autorizado" },
            "404": { description: "Inscripción no encontrada" },
          },
        },
      },
      "/enrollments/status": {
        post: {
          summary: "Actualizar estado de una inscripción",
          operationId: "updateEnrollmentStatus",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/EnrollmentStatusRequest" } } },
          },
          responses: {
            "200": { description: "Estado actualizado" },
            "401": { description: "No autorizado" },
            "404": { description: "Inscripción no encontrada" },
          },
        },
      },
      "/materials/authorize": {
        post: {
          summary: "Conceder autorización para descarga de material complementario",
          operationId: "authorizeMaterial",
          responses: {
            "200": { description: "Autorización concedida" },
            "401": { description: "No autorizado" },
          },
        },
      },
      "/attendance/record": {
        post: {
          summary: "Registrar asistencia de un participante a una jornada",
          operationId: "recordAttendance",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/AttendanceRecordRequest" } } },
          },
          responses: {
            "200": { description: "Asistencia guardada" },
            "422": { description: "Modalidad On Demand no acredita asistencia" },
          },
        },
      },
      "/certificates/link": {
        post: {
          summary: "Vincular certificado emitido por el bot",
          operationId: "linkCertificate",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/CertificateLinkRequest" } } },
          },
          responses: {
            "200": { description: "Certificado vinculado para visualización del participante" },
            "422": { description: "Modalidad no califica para certificación" },
          },
        },
      },
      "/modality-change/request": {
        post: {
          summary: "Registrar solicitud de cambio de modalidad con cálculo de recargo",
          operationId: "requestModalityChange",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ModalityChangeRequest" } } },
          },
          responses: {
            "200": { description: "Solicitud registrada con cálculo de recargo (0% o 25%)" },
          },
        },
      },
      "/trainings/catalog": {
        get: {
          summary: "Consultar catálogo público verificado y publicado",
          operationId: "getVerifiedCatalog",
          responses: {
            "200": { description: "Lista de capacitaciones autorizadas" },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiDoc, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Canary-Project": "DAOM-LEARNING-FINAL-01",
    },
  });
}
