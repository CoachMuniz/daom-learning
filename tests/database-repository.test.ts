import { describe, it, expect, beforeAll } from "vitest";
import { getDatabase } from "../src/lib/db/client";
import {
  createUser,
  findUserByEmail,
  getPublishedTrainings,
  getAllTrainingsAdmin,
  createEnrollment,
  getEnrollmentById,
  recordPayment,
  verifyMaterialAccess,
  ensureDefaultMaterialAsset,
  autoGrantMaterialForEnrollment,
  linkCertificate,
  getUserCertificates,
} from "../src/lib/db/repository";

describe("Base de Datos y Repositorio de DAOM Learning", () => {
  const testEmail = `atleta_${Date.now()}@daom-test.com`;

  it("crea y recupera usuarios con sus roles y perfiles", async () => {
    const user = await createUser({
      email: testEmail,
      passwordHash: "hash_de_prueba",
      fullName: "Atleta Federado Test",
      role: "PARTICIPANT",
      country: "AR",
      phone: "+54 11 1234-5678",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.role).toBe("PARTICIPANT");
    expect(user.profile?.country).toBe("AR");

    const found = await findUserByEmail(testEmail);
    expect(found).not.toBeNull();
    expect(found?.full_name).toBe("Atleta Federado Test");
  });

  it("garantiza aislamiento editorial: los borradores NO se publican en el catálogo público", async () => {
    const db = getDatabase();
    const draftId = `SEM-DRAFT-${Date.now()}`;
    const publishedId = `SEM-PUB-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 1. Insertar un curso en borrador y pendiente de verificación
    await db.run(
      `INSERT INTO trainings (
        capacitacion_id, tipo, titulo, subtitulo, estado_editorial, verificacion, orden, destacada, synced_at
      ) VALUES (?, 'seminario', 'Seminario Borrador', 'Subtitulo', 'borrador', 'pendiente', 99, 'NO', ?)`,
      [draftId, nowIso]
    );

    // 2. Insertar un curso publicado y verificado
    await db.run(
      `INSERT INTO trainings (
        capacitacion_id, tipo, titulo, subtitulo, estado_editorial, verificacion, orden, destacada, synced_at
      ) VALUES (?, 'seminario', 'Seminario Oficial Publicado', 'Subtitulo', 'publicado', 'verificado', 1, 'SI', ?)`,
      [publishedId, nowIso]
    );

    // 3. Consultar catálogo público
    const publicCatalog = await getPublishedTrainings();
    const hasDraft = publicCatalog.some((t) => t.capacitacion_id === draftId);
    const hasPublished = publicCatalog.some((t) => t.capacitacion_id === publishedId);

    expect(hasDraft).toBe(false); // El borrador JAMÁS debe figurar
    expect(hasPublished).toBe(true);

    // 4. Consultar panel administrativo: debe mostrar ambos
    const adminCatalog = await getAllTrainingsAdmin();
    expect(adminCatalog.some((t) => t.capacitacion_id === draftId)).toBe(true);
    expect(adminCatalog.some((t) => t.capacitacion_id === publishedId)).toBe(true);
  });

  it("regla obligatoria de material ZIP: se habilita automáticamente tras confirmar el pago", async () => {
    const db = getDatabase();
    const user = await createUser({
      email: `zip_student_${Date.now()}@daom-test.com`,
      passwordHash: "dummy",
      fullName: "Estudiante ZIP",
      role: "PARTICIPANT",
    });

    const trainingId = `SEM-TEST-ZIP-${Date.now()}`;
    await db.run(
      `INSERT INTO trainings (capacitacion_id, tipo, titulo, estado_editorial, verificacion, synced_at)
       VALUES (?, 'seminario', 'Capacitación con Material ZIP', 'publicado', 'verificado', ?)`,
      [trainingId, new Date().toISOString()]
    );

    const asset = await ensureDefaultMaterialAsset(trainingId, "Guía Metodológica ZIP");

    // 1. Crear inscripción pendiente de pago
    const enrollment = await createEnrollment({
      userId: user.id,
      capacitacionId: trainingId,
      modalityId: "presencial",
      currency: "ARS",
      amountTotal: 150000,
    });

    // 2. Antes del pago: acceso NO autorizado
    const accessBeforePayment = await verifyMaterialAccess(user.id, asset.id);
    expect(accessBeforePayment).toBeNull();

    // 3. Registrar confirmación de pago
    await recordPayment({
      enrollmentId: enrollment.id,
      provider: "mercadopago",
      status: "approved",
      amount: 150000,
      currency: "ARS",
      externalPaymentId: "MP-123456",
    });

    // 4. Después del pago: acceso AUTORIZADO de inmediato
    const accessAfterPayment = await verifyMaterialAccess(user.id, asset.id);
    expect(accessAfterPayment).not.toBeNull();
    expect(accessAfterPayment?.material_asset_id).toBe(asset.id);
    expect(accessAfterPayment?.user_id).toBe(user.id);
  });

  it("rechaza acceso a material ZIP a usuarios no inscriptos o de otras capacitaciones", async () => {
    const intruder = await createUser({
      email: `intruder_${Date.now()}@daom-test.com`,
      passwordHash: "dummy",
      fullName: "Usuario No Autorizado",
      role: "PARTICIPANT",
    });

    const foreignAssetId = "MAT-FOREIGN-ASSET-999";
    const access = await verifyMaterialAccess(intruder.id, foreignAssetId);
    expect(access).toBeNull();
  });
});
