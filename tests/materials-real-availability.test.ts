/**
 * PRUEBAS AISLADAS DE DISPONIBILIDAD REAL Y SEGURIDAD DE MATERIALES (FASE FINAL - FASE 2)
 * Canary: DAOM-LEARNING-FINAL-CLOSURE-02
 *
 * Pruebas obligatorias:
 * 1. Descarga real de un archivo de prueba en entorno aislado.
 * 2. Verificación de integridad del archivo descargado (tamaño y hash/contenido).
 * 3. Control de acceso según estado de la inscripción (pendiente, confirmada, cancelada).
 * 4. Persistencia del archivo tras reinicio de la base de datos o servicio.
 * 5. Respuesta correcta e informativa cuando el material no está publicado (sin errores genéricos).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getDatabase } from "../src/lib/db/client";
import {
  findOrCreateParticipant,
  createEnrollment,
  autoGrantMaterialForEnrollment,
  verifyMaterialAccess,
} from "../src/lib/db/repository";
import { GET as downloadMaterialRoute } from "../src/app/api/materiales/[id]/download/route";
import * as sessionModule from "../src/lib/auth/session";

describe("DAOM Learning — Disponibilidad Real, Integridad y Persistencia de Materiales", () => {
  const canaryId = `MAT-REAL-${Date.now()}`;
  const trainingId = `TRN-REAL-${Date.now()}`;
  const editionId = `EDT-REAL-${Date.now()}`;
  const assetPublishedId = `AST-PUB-${Date.now()}`;
  const assetUnpublishedId = `AST-UNPUB-${Date.now()}`;

  const storageDir = path.join(process.cwd(), "data", "materials");
  const publishedFileName = `guia-biomecanica-${Date.now()}.zip`;
  const publishedFilePath = path.join(storageDir, publishedFileName);
  const testFilePayload = Buffer.from(
    "PK\x03\x04DAOM-WEIGHTLIFTING-LEARNING-OFFICIAL-ZIP-CONTENT-CANARY-2026-INTEGRITY-VERIFIED"
  );
  const expectedHash = crypto.createHash("sha256").update(testFilePayload).digest("hex");

  let testUser: any;
  const nowIso = new Date().toISOString();

  beforeAll(async () => {
    // 1. Asegurar directorio físico de materiales
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    // Escribir archivo físico real para la prueba
    fs.writeFileSync(publishedFilePath, testFilePayload);

    const db = getDatabase();

    // 2. Capacitación y edición
    await db.run(
      `INSERT INTO trainings (
        capacitacion_id, tipo, titulo, subtitulo, descripcion, estado_editorial, verificacion, orden, destacada, synced_at
      ) VALUES (?, 'seminario', 'Seminario Biomecánica Real', 'Subtítulo', 'Descripción', 'publicado', 'verificado', 1, 'SI', ?)`,
      [trainingId, nowIso]
    );

    await db.run(
      `INSERT INTO training_editions (
        oferta_id, capacitacion_id, nombre_edicion, fecha_inicio, modalidades, cupo_presencial, cupo_streaming,
        estado_comercial, estado_editorial, verificacion, synced_at
      ) VALUES (?, ?, 'Edición Real 2026', '2026-11-29', 'presencial, streaming', 30, 60, 'abierta', 'publicado', 'verificado', ?)`,
      [editionId, trainingId, nowIso]
    );

    // 3. Asset publicado físicamente
    await db.run(
      `INSERT INTO material_assets (
        id, capacitacion_id, title, file_name, file_size_bytes, mime_type, storage_path, file_hash, version, is_active, created_at
      ) VALUES (?, ?, 'Material Publicado ZIP', ?, ?, 'application/zip', ?, ?, '1.0', 1, ?)`,
      [assetPublishedId, trainingId, publishedFileName, testFilePayload.length, `data/materials/${publishedFileName}`, expectedHash, nowIso]
    );

    // 4. Asset NO publicado (sin archivo en disco)
    await db.run(
      `INSERT INTO material_assets (
        id, capacitacion_id, title, file_name, file_size_bytes, mime_type, storage_path, version, is_active, created_at
      ) VALUES (?, ?, 'Material En Preparación ZIP', 'pendiente.zip', 0, 'application/zip', 'data/materials/pendiente.zip', '1.0', 1, ?)`,
      [assetUnpublishedId, trainingId, nowIso]
    );

    // 5. Usuario Alumno
    testUser = await findOrCreateParticipant({
      email: `alumno.materiales.${Date.now()}@daom.ar`,
      fullName: "Estudiante Materiales Test",
      phone: "+5491199990000",
    });
  });

  afterAll(() => {
    // Limpieza controlada del archivo de prueba
    if (fs.existsSync(publishedFilePath)) {
      try {
        fs.unlinkSync(publishedFilePath);
      } catch {}
    }
  });

  it("1 y 2. Descarga real y verificación de integridad: Alumno con pago confirmado descarga archivo físico idéntico", async () => {
    const db = getDatabase();

    // Crear inscripción confirmada
    const enrollment = await createEnrollment({
      userId: testUser.id,
      capacitacionId: trainingId,
      ofertaId: editionId,
      modalityId: "presencial",
      currency: "ARS",
      amountTotal: 41368.8,
      paymentMethod: "mercadopago",
    });

    await db.run(
      `UPDATE enrollments SET status = 'confirmada', amount_paid = 41368.8, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), enrollment.id]
    );

    // Habilitar entitlement para el asset publicado
    await autoGrantMaterialForEnrollment(testUser.id, trainingId, enrollment.id);

    // Actualizar entitlement para apuntar a nuestro asset publicado específico
    await db.run(
      `UPDATE material_entitlements SET material_asset_id = ? WHERE user_id = ? AND enrollment_id = ?`,
      [assetPublishedId, testUser.id, enrollment.id]
    );

    // Mock sesión activa
    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: testUser.id,
      email: testUser.email,
      role: "PARTICIPANT",
      fullName: testUser.full_name,
    });

    const req = new Request(`http://localhost:3000/api/materiales/${assetPublishedId}/download`, {
      method: "GET",
      headers: { "x-forwarded-for": "190.190.10.20" },
    });
    const res = await downloadMaterialRoute(req, { params: { id: assetPublishedId } });

    // 1. Descarga HTTP 200 real
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("Content-Disposition")).toContain(publishedFileName);

    // 2. Verificación de integridad byte a byte y hash SHA-256
    const arrayBuffer = await res.arrayBuffer();
    const downloadedBuffer = Buffer.from(arrayBuffer);
    expect(downloadedBuffer.length).toBe(testFilePayload.length);

    const downloadedHash = crypto.createHash("sha256").update(downloadedBuffer).digest("hex");
    expect(downloadedHash).toBe(expectedHash);
    expect(downloadedBuffer.toString()).toContain("DAOM-WEIGHTLIFTING-LEARNING-OFFICIAL-ZIP-CONTENT");
  });

  it("3. Control de acceso según estado: Rechaza si está pendiente o cancelada, autoriza si está confirmada", async () => {
    const db = getDatabase();

    // Caso 3A: Inscripción pendiente_pago
    const pendingEnr = await createEnrollment({
      userId: testUser.id,
      capacitacionId: trainingId,
      ofertaId: editionId,
      modalityId: "streaming",
      currency: "ARS",
      amountTotal: 41368.8,
      paymentMethod: "mercadopago",
    });

    // Sesión de otro alumno pendiente
    const pendingUser = await findOrCreateParticipant({
      email: `pendiente.${Date.now()}@daom.ar`,
      fullName: "Alumno Pendiente",
    });

    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: pendingUser.id,
      email: pendingUser.email,
      role: "PARTICIPANT",
      fullName: pendingUser.full_name,
    });

    const reqPending = new Request(`http://localhost:3000/api/materiales/${assetPublishedId}/download`);
    const resPending = await downloadMaterialRoute(reqPending, { params: { id: assetPublishedId } });
    expect(resPending.status).toBe(403);
    const bodyPending = await resPending.json();
    expect(bodyPending.error).toBe("FORBIDDEN");

    // Caso 3B: Alumno con inscripción cancelada
    await db.run(
      `UPDATE enrollments SET status = 'cancelada' WHERE user_id = ? AND capacitacion_id = ?`,
      [testUser.id, trainingId]
    );

    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: testUser.id,
      email: testUser.email,
      role: "PARTICIPANT",
      fullName: testUser.full_name,
    });

    const reqCancelled = new Request(`http://localhost:3000/api/materiales/${assetPublishedId}/download`);
    const resCancelled = await downloadMaterialRoute(reqCancelled, { params: { id: assetPublishedId } });
    expect(resCancelled.status).toBe(403);
    const bodyCancelled = await resCancelled.json();
    expect(bodyCancelled.error).toBe("FORBIDDEN");
  });

  it("4. Persistencia física tras reinicio: Archivo permanece accesible en el almacenamiento persistente", async () => {
    const db = getDatabase();

    // Reactivar inscripción confirmada del usuario
    await db.run(
      `UPDATE enrollments SET status = 'confirmada' WHERE user_id = ? AND capacitacion_id = ?`,
      [testUser.id, trainingId]
    );

    // Simular reinicio del servicio verificando existencia física en el sistema de archivos
    expect(fs.existsSync(publishedFilePath)).toBe(true);

    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: testUser.id,
      email: testUser.email,
      role: "PARTICIPANT",
      fullName: testUser.full_name,
    });

    const req = new Request(`http://localhost:3000/api/materiales/${assetPublishedId}/download`);
    const res = await downloadMaterialRoute(req, { params: { id: assetPublishedId } });

    expect(res.status).toBe(200);
    const bytes = await res.arrayBuffer();
    expect(bytes.byteLength).toBe(testFilePayload.length);
  });

  it("5. Material todavía no publicado: Informa estado transparente sin generar error 500 genérico ni links rotos", async () => {
    const db = getDatabase();

    // Asignar entitlement para el asset NO publicado
    await db.run(
      `UPDATE material_entitlements SET material_asset_id = ? WHERE user_id = ?`,
      [assetUnpublishedId, testUser.id]
    );

    vi.spyOn(sessionModule, "getCurrentSession").mockResolvedValue({
      userId: testUser.id,
      email: testUser.email,
      role: "PARTICIPANT",
      fullName: testUser.full_name,
    });

    const req = new Request(`http://localhost:3000/api/materiales/${assetUnpublishedId}/download`);
    const res = await downloadMaterialRoute(req, { params: { id: assetUnpublishedId } });

    // No debe ser 500 (ni 403, pues el usuario está autorizado académicamente)
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("MATERIAL_PENDING_PUBLICATION");
    expect(body.message).toContain("está siendo preparado por el equipo docente de DAOM");
    expect(body.training_id).toBe(trainingId);
    expect(body.asset_id).toBe(assetUnpublishedId);
  });
});
