import { describe, it, expect, beforeAll, vi } from "vitest";
import { getDatabase } from "../src/lib/db/client";
import {
  createUser,
  findUserByEmail,
  getTrainingById,
  createEnrollment,
  getEnrollmentById,
  recordPayment,
  updateParticipantAdmin,
  deleteParticipantAdmin,
  updateEnrollmentAdmin,
  deleteEnrollmentAdmin,
  deleteTrainingAdmin,
  executeProductionCleanup,
  recordAuditLog,
  getAuditLogs,
} from "../src/lib/db/repository";
import { PATCH as updateParticipantHandler, DELETE as deleteParticipantHandler } from "../src/app/api/admin/participantes/[id]/route";
import { PATCH as updateEnrollmentHandler, DELETE as deleteEnrollmentHandler } from "../src/app/api/admin/inscripciones/[id]/route";
import { DELETE as deleteTrainingHandler } from "../src/app/api/admin/capacitaciones/[id]/route";
import { POST as cleanupHandler } from "../src/app/api/admin/cleanup/route";
import * as sessionModule from "../src/lib/auth/session";

describe("DAOM Learning — Gestión Administrativa y Limpieza Quirúrgica (DAOM-LEARNING-CLEANUP-01)", () => {
  const timestamp = Date.now();
  let adminUser: any;
  let testParticipant: any;
  let legitParticipant: any;
  let testEnrollment: any;
  let legitEnrollment: any;

  beforeAll(async () => {
    // 1. Crear Admin
    adminUser = await createUser({
      email: `admin_cleanup_${timestamp}@daom.org`,
      fullName: "Admin Responsable DAOM",
      role: "ADMIN",
    });

    // 2. Crear Participante de Prueba
    testParticipant = await createUser({
      email: `atleta_test_${timestamp}@daom-test.com`,
      fullName: "Participante Ficticio Vitest",
      role: "PARTICIPANT",
      phone: "+54 11 1111-2222",
      documentId: "99887766",
      country: "AR",
    });

    // 3. Crear Participante Legítimo
    legitParticipant = await createUser({
      email: `atleta_real_${timestamp}@gmail.com`,
      fullName: "Carlos Pesista Real",
      role: "PARTICIPANT",
      phone: "+54 11 3333-4444",
      documentId: "35444111",
      country: "AR",
    });

    // 4. Crear Inscripción de Prueba sin cobro real
    testEnrollment = await createEnrollment({
      userId: testParticipant.id,
      capacitacionId: "SEM-BIOMECANICA",
      modalityId: "streaming",
      currency: "ARS",
      amountTotal: 85000,
      paymentMethod: "manual",
      notes: "Inscripción de prueba temporal",
    });

    // 5. Crear Inscripción Legítima con pago aprobado
    legitEnrollment = await createEnrollment({
      userId: legitParticipant.id,
      capacitacionId: "SEM-BIOMECANICA",
      modalityId: "presencial",
      currency: "ARS",
      amountTotal: 85000,
      paymentMethod: "mercadopago",
    });

    await recordPayment({
      enrollmentId: legitEnrollment.id,
      externalPaymentId: `PAY-LEGIT-${timestamp}`,
      provider: "mercadopago",
      status: "approved",
      amount: 85000,
      currency: "ARS",
      payerEmail: legitParticipant.email,
    });
  });

  const setAdminSession = () => {
    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      fullName: adminUser.full_name,
    } as any);
  };

  it("1. Edición de participante: actualiza datos personales y estado activo", async () => {
    setAdminSession();

    const req = new Request(`http://localhost/api/admin/participantes/${testParticipant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Participante Modificado Test",
        phone: "+54 9 11 9999-0000",
        country: "UY",
        isActive: 0,
      }),
    });

    const res = await updateParticipantHandler(req, { params: { id: testParticipant.id } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.participant.full_name).toBe("Participante Modificado Test");
    expect(data.participant.is_active).toBe(0);
    expect(data.participant.profile.country).toBe("UY");
  });

  it("2. Protección inquebrantable: rechaza eliminar un usuario administrador institucional", async () => {
    setAdminSession();

    const req = new Request(`http://localhost/api/admin/participantes/${adminUser.id}`, {
      method: "DELETE",
    });

    const res = await deleteParticipantHandler(req, { params: { id: adminUser.id } });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBeUndefined();
    expect(data.message).toContain("No es posible eliminar una cuenta administrativa institucional protegida");
  });

  it("3. Eliminación con actividad legítima: archiva/desactiva en vez de destruir", async () => {
    setAdminSession();

    const req = new Request(`http://localhost/api/admin/participantes/${legitParticipant.id}`, {
      method: "DELETE",
    });

    const res = await deleteParticipantHandler(req, { params: { id: legitParticipant.id } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("desactivado y archivado de forma segura");

    // Verificar que el usuario no fue borrado de la DB sino desactivado
    const checkDb = await findUserByEmail(legitParticipant.email);
    expect(checkDb).not.toBeNull();
    expect(checkDb?.is_active).toBe(0);
  });

  it("4. Edición de inscripción: permite corregir modalidad, monto y estado", async () => {
    setAdminSession();

    const req = new Request(`http://localhost/api/admin/inscripciones/${testEnrollment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modalityId: "presencial",
        status: "confirmada",
        amountPaid: 85000,
        notes: "Acreditado por secretaría",
      }),
    });

    const res = await updateEnrollmentHandler(req, { params: { id: testEnrollment.id } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.enrollment.modality_id).toBe("presencial");
    expect(data.enrollment.status).toBe("confirmada");
    expect(Number(data.enrollment.amount_paid)).toBe(85000);
  });

  it("5. Eliminación de inscripción con cobros aprobados: cancela sin destruir trazabilidad", async () => {
    setAdminSession();

    const req = new Request(`http://localhost/api/admin/inscripciones/${legitEnrollment.id}`, {
      method: "DELETE",
    });

    const res = await deleteEnrollmentHandler(req, { params: { id: legitEnrollment.id } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("Se canceló preservando la auditoría contable");

    const checkEnr = await getEnrollmentById(legitEnrollment.id);
    expect(checkEnr).not.toBeNull();
    expect(checkEnr?.status).toBe("cancelada");
  });

  it("6. Eliminación de inscripción ficticia sin cobros: elimina definitivamente", async () => {
    setAdminSession();

    // Resetear status para test
    await updateEnrollmentAdmin(testEnrollment.id, { status: "pendiente_pago", amountPaid: 0 });

    const req = new Request(`http://localhost/api/admin/inscripciones/${testEnrollment.id}`, {
      method: "DELETE",
    });

    const res = await deleteEnrollmentHandler(req, { params: { id: testEnrollment.id } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const checkEnr = await getEnrollmentById(testEnrollment.id);
    expect(checkEnr).toBeNull();
  });

  it("7. Endpoint de Limpieza de Producción: exige confirmación estricta y preserva administradores", async () => {
    setAdminSession();

    // 7.1 Sin confirmación correcta
    const badReq = new Request("http://localhost/api/admin/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "erronea" }),
    });

    const badRes = await cleanupHandler(badReq);
    expect(badRes.status).toBe(400);

    // 7.2 Con confirmación autorizada
    const goodReq = new Request("http://localhost/api/admin/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "CONFIRMAR_LIMPIEZA_DAOM_PRODUCCION" }),
    });

    const goodRes = await cleanupHandler(goodReq);
    const data = await goodRes.json();

    expect(goodRes.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.report.backupSummary).toBeDefined();
    expect(data.report.purgedCounts).toBeDefined();
    expect(data.report.preservedAdmins.length).toBeGreaterThan(0);
  });
});
