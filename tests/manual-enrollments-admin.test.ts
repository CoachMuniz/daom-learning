import { describe, it, expect, beforeAll, vi } from "vitest";
import { getDatabase } from "../src/lib/db/client";
import {
  createUser,
  findUserByEmail,
  getTrainingById,
  getUserEnrollmentForTraining,
  getEnrollmentById,
  getUserMaterialEntitlements,
  listIntegrationEvents,
  getAuditLogs,
} from "../src/lib/db/repository";
import { POST as manualEnrollmentHandler } from "../src/app/api/admin/inscripciones/manual/route";
import { POST as confirmPaymentHandler } from "../src/app/api/admin/inscripciones/confirmar-pago/route";
import { POST as updateWhatsAppGroupHandler } from "../src/app/api/admin/capacitaciones/whatsapp-group/route";
import { GET as getEnrollmentDetailHandler } from "../src/app/api/admin/inscripciones/[id]/route";
import * as sessionModule from "../src/lib/auth/session";

describe("DAOM Learning — Inscripciones Manuales y Administración", () => {
  const timestamp = Date.now();
  let adminUser: any;
  let participantUser: any;
  const adminEmail = `admin_manual_${timestamp}@daom.org`;
  const participantEmail = `alumno_existente_${timestamp}@daom-test.com`;

  beforeAll(async () => {
    // 1. Crear usuario ADMIN
    adminUser = await createUser({
      email: adminEmail,
      fullName: "Administrador General DAOM",
      role: "ADMIN",
    });

    // 2. Crear usuario PARTICIPANT para pruebas
    participantUser = await createUser({
      email: participantEmail,
      fullName: "Juan Ignacio Pérez",
      role: "PARTICIPANT",
      phone: "+54 11 5555-4321",
      documentId: "38999123",
      country: "AR",
    });
  });

  const setAdminSession = () => {
    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      fullName: adminUser.full_name,
    });
  };

  const setParticipantSession = () => {
    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: participantUser.id,
      email: participantUser.email,
      role: participantUser.role,
      fullName: participantUser.full_name,
    });
  };

  const makeJsonRequest = (url: string, body: any) => {
    return new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  it("1. Inscripción manual con efectivo: registra y confirma de inmediato acreditando el pago", async () => {
    setAdminSession();

    const req = makeJsonRequest("http://localhost:3000/api/admin/inscripciones/manual", {
      userId: participantUser.id,
      capacitacionId: "SEM-BIOMECANICA",
      modalityId: "presencial",
      paymentMethod: "efectivo",
      paymentStatus: "acreditado",
      amountReceived: 51711,
      overrideAmount: 51711,
      notes: "Cobro presencial en administración del club",
    });

    const res = await manualEnrollmentHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.enrollment.status).toBe("confirmada");
    expect(data.enrollment.amount_paid).toBe(51711);
    expect(data.payment.status).toBe("approved");

    // Verificar que el material complementario quedó automáticamente habilitado
    const entitlements = await getUserMaterialEntitlements(participantUser.id);
    expect(entitlements.length).toBeGreaterThan(0);
    expect(entitlements.some((e) => e.is_revoked === 0)).toBe(true);
  });

  it("2. Protección contra inscripciones duplicadas: rechaza nueva inscripción para participante ya confirmado", async () => {
    setAdminSession();

    const req = makeJsonRequest("http://localhost:3000/api/admin/inscripciones/manual", {
      userId: participantUser.id,
      capacitacionId: "SEM-BIOMECANICA",
      modalityId: "presencial",
      paymentMethod: "efectivo",
      paymentStatus: "acreditado",
      amountReceived: 51711,
      overrideAmount: 51711,
    });

    const res = await manualEnrollmentHandler(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("ALREADY_CONFIRMED");
  });

  it("3. Inscripción manual con transferencia / pago pendiente: no acredita automáticamente", async () => {
    setAdminSession();

    const newEmail = `alumno_transferencia_${timestamp}@test.com`;
    const req = makeJsonRequest("http://localhost:3000/api/admin/inscripciones/manual", {
      newParticipant: {
        email: newEmail,
        fullName: "Sofía Valentina Gómez",
        phone: "+54 11 6789-0123",
      },
      capacitacionId: "SEM-BIOMECANICA",
      modalityId: "streaming",
      paymentMethod: "transferencia",
      paymentStatus: "declarado",
      amountReceived: 51711,
      overrideAmount: 51711,
      paymentReference: `TRF-BANCO-${timestamp}`,
      notes: "Adjuntó comprobante de transferencia bancaria pendiente de conciliar",
    });

    const res = await manualEnrollmentHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.enrollment.status).toBe("pendiente_pago");
    expect(data.enrollment.amount_paid).toBe(0);
    expect(data.payment.status).toBe("pending");

    // El participante no debe tener material habilitado hasta que se confirme el pago
    const foundUser = await findUserByEmail(newEmail);
    expect(foundUser).not.toBeNull();
    const pendingEntitlements = await getUserMaterialEntitlements(foundUser!.id);
    expect(pendingEntitlements.length).toBe(0);
  });

  it("4. Confirmación posterior de pago pendiente: valida acreditación y habilita accesos", async () => {
    setAdminSession();

    const user = await findUserByEmail(`alumno_transferencia_${timestamp}@test.com`);
    expect(user).not.toBeNull();

    const enr = await getUserEnrollmentForTraining(user!.id, "SEM-BIOMECANICA");
    expect(enr).not.toBeNull();
    expect(enr!.status).toBe("pendiente_pago");

    const reqConfirm = makeJsonRequest("http://localhost:3000/api/admin/inscripciones/confirmar-pago", {
      enrollmentId: enr!.id,
      amount: 51711,
      paymentMethod: "transferencia",
      paymentReference: `TRF-ACREDITADA-${timestamp}`,
      notes: "Verificado en extracto bancario oficial",
    });

    const res = await confirmPaymentHandler(reqConfirm);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe("confirmada");

    // Verificar que ahora sí posee acceso al material
    const confirmedEntitlements = await getUserMaterialEntitlements(user!.id);
    expect(confirmedEntitlements.length).toBeGreaterThan(0);
    expect(confirmedEntitlements.some((e) => e.is_revoked === 0)).toBe(true);
  });

  it("5. Protección contra doble acreditación: rechaza confirmar pago en inscripción ya acreditada", async () => {
    setAdminSession();

    const user = await findUserByEmail(`alumno_transferencia_${timestamp}@test.com`);
    const enr = await getUserEnrollmentForTraining(user!.id, "SEM-BIOMECANICA");

    const reqConfirmAgain = makeJsonRequest("http://localhost:3000/api/admin/inscripciones/confirmar-pago", {
      enrollmentId: enr!.id,
      amount: 51711,
    });

    const res = await confirmPaymentHandler(reqConfirmAgain);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("ALREADY_ACCREDITED");
  });

  it("6. Seguridad y Permisos: rechaza acceso a usuarios sin rol de administración", async () => {
    setParticipantSession();

    const req = makeJsonRequest("http://localhost:3000/api/admin/inscripciones/manual", {
      userId: participantUser.id,
      capacitacionId: "SEM-BIOMECANICA",
      modalityId: "presencial",
    });

    const res = await manualEnrollmentHandler(req);
    expect(res.status).toBe(401);
  });

  it("7. Registro y verificación del grupo oficial de WhatsApp para SEM-BIOMECANICA", async () => {
    setAdminSession();
    const officialGroupUrl = "https://chat.whatsapp.com/H2GeOaYVJx3HWU8ZSgKpsk?s=cl&p=a&iam=2";

    // Intentar guardar en una capacitación inexistente debe fallar
    const invalidReq = makeJsonRequest("http://localhost:3000/api/admin/capacitaciones/whatsapp-group", {
      capacitacionId: "CAP-INEXISTENTE-999",
      whatsappGroupUrl: officialGroupUrl,
    });
    const invalidRes = await updateWhatsAppGroupHandler(invalidReq);
    expect(invalidRes.status).toBe(404);

    // Guardar para SEM-BIOMECANICA
    const validReq = makeJsonRequest("http://localhost:3000/api/admin/capacitaciones/whatsapp-group", {
      capacitacionId: "SEM-BIOMECANICA",
      whatsappGroupUrl: officialGroupUrl,
    });
    const validRes = await updateWhatsAppGroupHandler(validReq);
    expect(validRes.status).toBe(200);
    const data = await validRes.json();
    expect(data.whatsapp_group_url).toBe(officialGroupUrl);

    // Comprobar persistencia en la base de datos
    const db = getDatabase();
    const ed = await db.get<any>(
      `SELECT whatsapp_group_url FROM training_editions WHERE capacitacion_id = ?`,
      ["SEM-BIOMECANICA"]
    );
    expect(ed?.whatsapp_group_url).toBe(officialGroupUrl);
  });

  it("8. Auditoría y Jerkson: registra logs de auditoría y emite eventos de integración", async () => {
    setAdminSession();

    const logs = await getAuditLogs(20);
    const manualLog = logs.find((l) => l.action === "MANUAL_ENROLLMENT_CREATED");
    expect(manualLog).toBeDefined();

    const paymentConfirmLog = logs.find((l) => l.action === "MANUAL_PAYMENT_CONFIRMED");
    expect(paymentConfirmLog).toBeDefined();

    const events = await listIntegrationEvents({ limit: 10 });
    const confirmedEvents = events.filter((e) => e.event_type === "payment.confirmed");
    expect(confirmedEvents.length).toBeGreaterThan(0);
  });

  it("9. Consulta de detalle de inscripción y comprobantes", async () => {
    setAdminSession();

    const user = await findUserByEmail(`alumno_transferencia_${timestamp}@test.com`);
    const enr = await getUserEnrollmentForTraining(user!.id, "SEM-BIOMECANICA");

    const req = new Request(`http://localhost:3000/api/admin/inscripciones/${enr!.id}`);
    const res = await getEnrollmentDetailHandler(req, { params: { id: enr!.id } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.enrollment.id).toBe(enr!.id);
    expect(data.payments.length).toBeGreaterThan(0);
  });
});
