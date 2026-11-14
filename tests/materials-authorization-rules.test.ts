import { describe, it, expect, beforeAll, vi } from "vitest";
import { getDatabase } from "../src/lib/db/client";
import {
  findOrCreateParticipant,
  createEnrollment,
  getEnrollmentById,
  getUserMaterialEntitlements,
  autoGrantMaterialForEnrollment,
  verifyMaterialAccess,
} from "../src/lib/db/repository";
import { GET as downloadMaterialRoute } from "../src/app/api/materiales/[id]/download/route";
import * as sessionModule from "../src/lib/auth/session";

describe("DAOM Learning — Validación Estricta de Autorización de Materiales (H028/H031)", () => {
  const canaryPrefix = `VAL-MAT-${Date.now()}`;
  const trainingId = `${canaryPrefix}-TRN`;
  const editionId = `${canaryPrefix}-EDT`;
  const assetId = `${canaryPrefix}-AST`;
  let studentUser: any;
  const nowIso = new Date().toISOString();

  beforeAll(async () => {
    const db = getDatabase();

    // 1. Capacitación
    await db.run(
      `INSERT INTO trainings (
        capacitacion_id, tipo, titulo, subtitulo, descripcion, estado_editorial, verificacion, orden, destacada, synced_at
      ) VALUES (?, 'seminario', 'Seminario Biomecánica Test', 'Subtítulo', 'Descripción', 'publicado', 'verificado', 1, 'SI', ?)`,
      [trainingId, nowIso]
    );

    // 2. Edición
    await db.run(
      `INSERT INTO training_editions (
        oferta_id, capacitacion_id, nombre_edicion, fecha_inicio, modalidades, cupo_presencial, cupo_streaming,
        estado_comercial, estado_editorial, verificacion, synced_at
      ) VALUES (?, ?, 'Edición Noviembre 2026', '2026-11-29', 'presencial, streaming', 30, 60, 'abierta', 'publicado', 'verificado', ?)`,
      [editionId, trainingId, nowIso]
    );

    // 3. Asset de Material Didáctico Complementario ZIP
    await db.run(
      `INSERT INTO material_assets (
        id, capacitacion_id, title, file_name, file_size_bytes, mime_type, storage_path, version, is_active, created_at
      ) VALUES (?, ?, 'Material Didáctico Complementario ZIP', 'test-material.zip', 1048576, 'application/zip', 'data/materials/test-material.zip', '1.0', 1, ?)`,
      [assetId, trainingId, nowIso]
    );

    // 4. Usuario Alumno de prueba
    studentUser = await findOrCreateParticipant({
      email: `alumno-${canaryPrefix.toLowerCase()}@daom.ar`,
      fullName: "Estudiante Autenticado DAOM",
      phone: "+5491155550000",
    });
  });

  it("1. Usuario autenticado con inscripción PENDIENTE: Acceso denegado (HTTP 403 FORBIDDEN)", async () => {
    const db = getDatabase();
    const enrollment = await createEnrollment({
      userId: studentUser.id,
      capacitacionId: trainingId,
      ofertaId: editionId,
      modalityId: "presencial",
      currency: "ARS",
      amountTotal: 45000,
      paymentMethod: "mercadopago",
    });

    // Verificar que la inscripción nace en pendiente_pago
    expect(enrollment.status).toBe("pendiente_pago");

    // Mock de sesión activa como alumno
    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: studentUser.id,
      email: studentUser.email,
      role: "PARTICIPANT",
      fullName: studentUser.full_name,
    });

    // Intentar acceder directamente al repositorio de autorización
    const entitlement = await verifyMaterialAccess(studentUser.id, assetId);
    expect(entitlement).toBeNull();

    // Invocar endpoint de descarga de material
    const req = new Request(`http://localhost:3000/api/materiales/${assetId}/download`, {
      method: "GET",
    });
    const res = await downloadMaterialRoute(req, { params: { id: assetId } });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN");
    expect(body.message).toContain("No posee una inscripción confirmada con pago acreditado");
  });

  it("2. Usuario autenticado con inscripción CONFIRMADA (Pago acreditado): Acceso concedido (autorización aprobada)", async () => {
    const db = getDatabase();
    
    // Obtener la inscripción del usuario
    const enrollments = await db.query<any>(
      `SELECT * FROM enrollments WHERE user_id = ? AND capacitacion_id = ?`,
      [studentUser.id, trainingId]
    );
    const enrollmentId = enrollments[0].id;

    // Confirmar pago y vacante
    await db.run(
      `UPDATE enrollments SET status = 'confirmada', amount_paid = 45000, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), enrollmentId]
    );

    // Habilitar material mediante el workflow automático de acreditación
    await autoGrantMaterialForEnrollment(studentUser.id, trainingId, enrollmentId);

    // Mock de sesión activa como alumno
    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: studentUser.id,
      email: studentUser.email,
      role: "PARTICIPANT",
      fullName: studentUser.full_name,
    });

    // Verificar que el acceso está autorizado en base de datos
    const entitlement = await verifyMaterialAccess(studentUser.id, assetId);
    expect(entitlement).not.toBeNull();
    expect(entitlement?.is_revoked).toBe(0);
    expect(entitlement?.material_asset_id).toBe(assetId);

    // Al invocar el endpoint, la autorización pasa la barrera 403 (retorna 404 estructurado porque el archivo ZIP físico no está publicado en disco en tests, o 200 si existe)
    const req = new Request(`http://localhost:3000/api/materiales/${assetId}/download`, {
      method: "GET",
    });
    const res = await downloadMaterialRoute(req, { params: { id: assetId } });

    // NO debe ser 401 ni 403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect([200, 404]).toContain(res.status);
    if (res.status === 404) {
      const body = await res.json();
      expect(body.error).toBe("MATERIAL_PENDING_PUBLICATION");
    }
  });

  it("3. Usuario autenticado con inscripción CANCELADA: Acceso denegado (HTTP 403 FORBIDDEN)", async () => {
    const db = getDatabase();
    const enrollments = await db.query<any>(
      `SELECT * FROM enrollments WHERE user_id = ? AND capacitacion_id = ?`,
      [studentUser.id, trainingId]
    );
    const enrollmentId = enrollments[0].id;

    // Cancelar la inscripción y revocar entitlements
    await db.run(
      `UPDATE enrollments SET status = 'cancelada', updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), enrollmentId]
    );
    await db.run(
      `UPDATE material_entitlements SET is_revoked = 1, revoked_at = ? WHERE enrollment_id = ?`,
      [new Date().toISOString(), enrollmentId]
    );

    // Mock de sesión activa como alumno
    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: studentUser.id,
      email: studentUser.email,
      role: "PARTICIPANT",
      fullName: studentUser.full_name,
    });

    // Intentar acceder al material revocado
    const entitlement = await verifyMaterialAccess(studentUser.id, assetId);
    expect(entitlement).toBeNull();

    // Invocar endpoint de descarga
    const req = new Request(`http://localhost:3000/api/materiales/${assetId}/download`, {
      method: "GET",
    });
    const res = await downloadMaterialRoute(req, { params: { id: assetId } });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN");
    expect(body.message).toContain("No posee una inscripción confirmada");
  });
});
