import { describe, it, expect, beforeAll } from "vitest";
import { getDatabase } from "../src/lib/db/client";
import {
  getTrainingBySlugOrId,
  createEnrollment,
  createUser,
  findUserByEmail,
  recordPayment,
  autoGrantMaterialForEnrollment,
} from "../src/lib/db/repository";
import {
  calculateEffectivePrice,
  calculateOnDemandPrice,
} from "../src/lib/commercial/rules";
import type { Price } from "../src/lib/types";

describe("API Pública y Reglas de Integración de DAOM Learning", () => {
  const canaryTrainingId = `SEM-BIOMECANICA-TEST-${Date.now()}`;
  const ofertaId = `OFE-BIO-${Date.now()}`;
  const nowIso = new Date().toISOString();

  beforeAll(async () => {
    const db = getDatabase();

    // 1. Insertar capacitación publicada y verificada para pruebas
    await db.run(
      `INSERT INTO trainings (
        capacitacion_id, tipo, titulo, subtitulo, descripcion, estado_editorial, verificacion, orden, destacada, synced_at
      ) VALUES (?, 'seminario', 'Seminario de Biomecánica del Movimiento', 'Análisis técnico y postural', 'Descripción detallada', 'publicado', 'verificado', 1, 'SI', ?)`,
      [canaryTrainingId, nowIso]
    );

    // 2. Insertar edición publicada
    await db.run(
      `INSERT INTO training_editions (
        oferta_id, capacitacion_id, nombre_edicion, fecha_inicio, modalidades, cupo_presencial, cupo_streaming,
        estado_comercial, estado_editorial, verificacion, synced_at
      ) VALUES (?, ?, 'Edición Noviembre 2026', '2026-11-20', 'presencial, streaming, on_demand', 30, 100, 'abierta', 'publicado', 'verificado', ?)`,
      [ofertaId, canaryTrainingId, nowIso]
    );

    // 3. Insertar precio en ARS con promoción vigente
    await db.run(
      `INSERT INTO prices (
        precio_id, oferta_id, mercado, moneda, precio_base, promocion_tipo, promocion_valor, promocion_inicio, promocion_fin, estado, verificacion, synced_at
      ) VALUES (?, ?, 'AR', 'ARS', 100000, 'porcentaje', 20, '2026-11-01', '2026-11-30', 'activo', 'verificado', ?)`,
      [`PRC-AR-${Date.now()}`, ofertaId, nowIso]
    );

    // 4. Insertar precio en USD sin promoción
    await db.run(
      `INSERT INTO prices (
        precio_id, oferta_id, mercado, moneda, precio_base, estado, verificacion, synced_at
      ) VALUES (?, ?, 'INT', 'USD', 120, 'activo', 'verificado', ?)`,
      [`PRC-INT-${Date.now()}`, ofertaId, nowIso]
    );
  });

  it("resuelve slugs y códigos de capacitación de manera flexible y segura", async () => {
    // 1. Por ID exacto
    const byId = await getTrainingBySlugOrId(canaryTrainingId, false);
    expect(byId).not.toBeNull();
    expect(byId?.capacitacion_id).toBe(canaryTrainingId);

    // 2. Por slug normalizado
    const bySlug = await getTrainingBySlugOrId("biomecanica", false);
    // Debe resolver ya sea el de prueba o el existente si coincide con biomecánica
    expect(bySlug).not.toBeNull();
  });

  it("calcula promociones vigentes y descarta promociones vencidas", () => {
    // Precio con promo activa
    const activePrice: Price = {
      precio_id: "P1",
      oferta_id: "O1",
      mercado: "AR",
      moneda: "ARS",
      precio_base: 100000,
      promocion_tipo: "porcentaje",
      promocion_valor: 20,
      promocion_inicio: "2026-11-01",
      promocion_fin: "2026-11-30",
      estado: "activo",
      verificacion: "verificado",
      synced_at: new Date().toISOString(),
    };

    const refDateActive = new Date("2026-11-15T12:00:00-03:00");
    const activeResult = calculateEffectivePrice(activePrice, refDateActive);
    expect(activeResult.isPromoActive).toBe(true);
    expect(activeResult.discountAmount).toBe(20000);
    expect(activeResult.effectivePrice).toBe(80000);

    // Precio con promo vencida
    const expiredPrice: Price = {
      ...activePrice,
      promocion_fin: "2026-10-31", // venció ayer
    };
    const expiredResult = calculateEffectivePrice(expiredPrice, refDateActive);
    expect(expiredResult.isPromoActive).toBe(false);
    expect(expiredResult.discountAmount).toBe(0);
    expect(expiredResult.effectivePrice).toBe(100000);
  });

  it("aplica recargo para modalidad on_demand si la compra es tardía", () => {
    // Compra antes del evento: precio base
    const beforeResult = calculateOnDemandPrice(100000, "2026-11-20", new Date("2026-11-10"));
    expect(beforeResult.finalPrice).toBe(100000);
    expect(beforeResult.isLatePurchase).toBe(false);

    // Compra el día del evento o después: +35%
    const lateResult = calculateOnDemandPrice(100000, "2026-11-20", new Date("2026-11-21"));
    expect(lateResult.finalPrice).toBe(135000);
    expect(lateResult.isLatePurchase).toBe(true);
  });

  it("permite registrar participantes sin exigir contraseña obligatoria", async () => {
    const studentEmail = `atleta_nopass_${Date.now()}@daom-test.com`;
    const { findOrCreateParticipant } = await import("../src/lib/db/repository");

    const participant = await findOrCreateParticipant({
      email: studentEmail,
      fullName: "Atleta Sin Password",
      country: "AR",
      phone: "+54 9 11 9999-8888",
    });

    expect(participant.id).toBeDefined();
    expect(participant.role).toBe("PARTICIPANT");
    expect(participant.full_name).toBe("Atleta Sin Password");

    // Si se invoca nuevamente, no duplica el usuario
    const again = await findOrCreateParticipant({
      email: studentEmail,
      fullName: "Atleta Sin Password",
    });
    expect(again.id).toBe(participant.id);
  });
});
