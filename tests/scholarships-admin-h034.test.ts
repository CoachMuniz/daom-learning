import { describe, it, expect, beforeAll, vi } from "vitest";
import { getDatabase } from "../src/lib/db/client";
import {
  createUser,
  createEnrollment,
  getEnrollmentById,
  grantScholarship,
  getAllScholarshipsAdmin,
  getScholarshipByEnrollmentId,
  getUserMaterialEntitlements,
  listIntegrationEvents,
  recordPayment,
} from "../src/lib/db/repository";
import { POST as scholarshipHandler, GET as getScholarshipsHandler } from "../src/app/api/admin/becas/route";
import * as sessionModule from "../src/lib/auth/session";

describe("DAOM Learning — Sistema de Becas Institucionales Inmutables (DAOM-LEARNING-ADMIN-2.0)", () => {
  const timestamp = Date.now();
  let adminUser: any;
  let staffUser: any;
  let participant1: any;
  let participant2: any;
  let enrollmentPartial: any;
  let enrollmentFull: any;

  beforeAll(async () => {
    adminUser = await createUser({
      email: `admin_becas_${timestamp}@daom.org`,
      fullName: "Admin Becas General",
      role: "ADMIN",
    });

    staffUser = await createUser({
      email: `staff_becas_${timestamp}@daom.org`,
      fullName: "Staff Auxiliar",
      role: "STAFF",
    });

    participant1 = await createUser({
      email: `alumno_parcial_${timestamp}@daom.org`,
      fullName: "Federico Parcial",
      role: "PARTICIPANT",
    });

    participant2 = await createUser({
      email: `alumno_total_${timestamp}@daom.org`,
      fullName: "Camila Beca Completa",
      role: "PARTICIPANT",
    });

    enrollmentPartial = await createEnrollment({
      userId: participant1.id,
      capacitacionId: "SEM-BIOMECANICA",
      modalityId: "presencial",
      currency: "ARS",
      amountTotal: 50000,
      paymentMethod: "manual",
    });

    enrollmentFull = await createEnrollment({
      userId: participant2.id,
      capacitacionId: "SEM-BIOMECANICA",
      modalityId: "streaming",
      currency: "ARS",
      amountTotal: 50000,
      paymentMethod: "manual",
    });
  });

  const setSession = (u: any) => {
    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: u.id,
      email: u.email,
      role: u.role,
      fullName: u.full_name,
    } as any);
  };

  it("1. Beca parcial (35%): Bonifica correctamente y mantiene la inscripción pendiente con saldo", async () => {
    setSession(adminUser);

    const req = new Request("http://localhost/api/admin/becas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentId: enrollmentPartial.id,
        percentage: 35,
        reason: "Beca de estímulo deportivo",
      }),
    });

    const res = await scholarshipHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Number(data.scholarship.percentage)).toBe(35);
    expect(Number(data.scholarship.original_amount)).toBe(50000);
    expect(Number(data.scholarship.discounted_amount)).toBe(17500);
    expect(Number(data.scholarship.remaining_amount)).toBe(32500);

    // Verificar estado de la inscripción en base de datos
    const enr = await getEnrollmentById(enrollmentPartial.id);
    expect(enr?.status).toBe("pendiente_pago");
    expect(enr?.notes).toContain("Beca parcial 35% concedida (Saldo restante: $32500)");

    // Verificar que NO se habilitaron los materiales protegidos aún
    const entitlements = await getUserMaterialEntitlements(participant1.id);
    expect(entitlements.length).toBe(0);

    // Verificar evento para Jerkson
    const events = await listIntegrationEvents({ eventType: "scholarship.granted.partial" });
    const event = events.find((e) => JSON.parse(e.payload).enrollmentId === enrollmentPartial.id);
    expect(event).toBeDefined();
    expect(JSON.parse(event!.payload).remainingAmount).toBe(32500);
  });

  it("2. Beca completa (100%): Confirma la inscripción de inmediato y habilita materiales sin pago", async () => {
    setSession(adminUser);

    const req = new Request("http://localhost/api/admin/becas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentId: enrollmentFull.id,
        percentage: 100,
        reason: "Beca de mérito deportivo 100%",
      }),
    });

    const res = await scholarshipHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Number(data.scholarship.percentage)).toBe(100);
    expect(Number(data.scholarship.remaining_amount)).toBe(0);

    // Verificar confirmación automática de la inscripción
    const enr = await getEnrollmentById(enrollmentFull.id);
    expect(enr?.status).toBe("confirmada");
    expect(Number(enr?.amount_paid)).toBe(0);

    // Verificar habilitación de materiales ZIP protegidos
    const entitlements = await getUserMaterialEntitlements(participant2.id);
    expect(entitlements.length).toBeGreaterThan(0);
    expect(entitlements[0].is_revoked).toBe(0);

    // Verificar evento para Jerkson
    const events = await listIntegrationEvents({ eventType: "scholarship.granted.full" });
    const event = events.find((e) => JSON.parse(e.payload).enrollmentId === enrollmentFull.id);
    expect(event).toBeDefined();
    expect(JSON.parse(event!.payload).isFullScholarship).toBe(true);
  });

  it("3. Inmutabilidad definitiva: Rechaza cualquier intento de modificar o duplicar la beca", async () => {
    setSession(adminUser);

    const req = new Request("http://localhost/api/admin/becas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentId: enrollmentPartial.id,
        percentage: 50, // Intento de cambio de 35% a 50%
      }),
    });

    const res = await scholarshipHandler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("SCHOLARSHIP_ERROR");
    expect(data.message).toContain("inmutable y no puede modificarse ni duplicarse");
  });

  it("4. Restricción de permisos: STAFF no puede otorgar becas (exclusivo ADMIN)", async () => {
    setSession(staffUser);

    const tempEnrollment = await createEnrollment({
      userId: participant1.id,
      capacitacionId: "SEM-SQUATS",
      modalityId: "presencial",
      currency: "ARS",
      amountTotal: 40000,
    });

    const req = new Request("http://localhost/api/admin/becas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentId: tempEnrollment.id,
        percentage: 50,
      }),
    });

    const res = await scholarshipHandler(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("UNAUTHORIZED");
    expect(data.message).toContain("Solo administradores con rol ADMIN pueden otorgar becas");
  });

  it("5. No permite becas retroactivas sobre inscripciones ya abonadas al 100%", async () => {
    setSession(adminUser);

    const paidEnrollment = await createEnrollment({
      userId: participant1.id,
      capacitacionId: "SEM-JERK",
      modalityId: "presencial",
      currency: "ARS",
      amountTotal: 30000,
    });

    await recordPayment({
      enrollmentId: paidEnrollment.id,
      externalPaymentId: `PAY-RETRO-${Date.now()}`,
      provider: "manual",
      status: "approved",
      amount: 30000,
      currency: "ARS",
    });

    const req = new Request("http://localhost/api/admin/becas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentId: paidEnrollment.id,
        percentage: 20,
      }),
    });

    const res = await scholarshipHandler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain("No es posible otorgar una beca retroactiva");
  });
});
