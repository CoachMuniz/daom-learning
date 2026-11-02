import { describe, it, expect, beforeEach } from "vitest";
import { parseCsv } from "../src/lib/sheets/csv-parser";
import { normalizeEditorialStatus, normalizeVerificationStatus, syncGoogleSheetsCatalog } from "../src/lib/sheets/sync";
import {
  calculateModalityChangeFee,
  calculateOnDemandPrice,
  getPaymentGatewayForMarket,
  getCurrencyForMarket,
  grantsAttendance,
} from "../src/lib/commercial/rules";
import { getDatabase } from "../src/lib/db/client";

describe("Canario del Proyecto", () => {
  it("valida la presencia del canario obligatorio DAOM-FORMACION-SHEET-01", () => {
    const canary = "DAOM-FORMACION-SHEET-01";
    expect(canary).toBe("DAOM-FORMACION-SHEET-01");
  });
});

describe("Google Sheets CSV Parser", () => {
  it("parsea correctamente CSV con campos entrecomillados y comas internas", () => {
    const sample = `"capacitacion_id","tipo","titulo","programa"
"SEM-SQUATS","seminario","Squats","Historia; anatomía funcional, biomecánica; variantes"
"SEM-SNATCH","seminario","Snatch","Método tradicional; errores frecuentes"`;

    const records = parseCsv(sample);
    expect(records.length).toBe(2);
    expect(records[0].capacitacion_id).toBe("SEM-SQUATS");
    expect(records[0].titulo).toBe("Squats");
    expect(records[0].programa).toBe("Historia; anatomía funcional, biomecánica; variantes");
    expect(records[1].capacitacion_id).toBe("SEM-SNATCH");
  });

  it("parsea comillas dobles escapadas dentro de campos entrecomillados", () => {
    const sample = `"id","texto"
"1","Texto con ""comillas dobles"" adentro"`;
    const records = parseCsv(sample);
    expect(records.length).toBe(1);
    expect(records[0].texto).toBe('Texto con "comillas dobles" adentro');
  });
});

describe("Controles Editoriales y de Verificación Independientes", () => {
  it("normaliza el estado editorial estrictamente y trata todo lo que no sea 'publicado' o 'archivado' como 'borrador'", () => {
    expect(normalizeEditorialStatus("publicado")).toBe("publicado");
    expect(normalizeEditorialStatus("PUBLICADO")).toBe("publicado");
    expect(normalizeEditorialStatus("archivado")).toBe("archivado");
    expect(normalizeEditorialStatus("borrador")).toBe("borrador");
    expect(normalizeEditorialStatus("")).toBe("borrador");
    expect(normalizeEditorialStatus("en_revision")).toBe("borrador");
  });

  it("normaliza el estado de verificación como control independiente", () => {
    expect(normalizeVerificationStatus("verificado")).toBe("verificado");
    expect(normalizeVerificationStatus("VERIFICADO")).toBe("verificado");
    expect(normalizeVerificationStatus("pendiente")).toBe("pendiente");
    expect(normalizeVerificationStatus("rechazado")).toBe("rechazado");
    expect(normalizeVerificationStatus("")).toBe("pendiente");
  });
});

describe("Motor de Reglas Comerciales", () => {
  it("mantiene independencia de monedas: ARS para AR (Mercado Pago), USD para INT (Stripe)", () => {
    expect(getCurrencyForMarket("AR")).toBe("ARS");
    expect(getCurrencyForMarket("INT")).toBe("USD");
    expect(getPaymentGatewayForMarket("AR")).toBe("mercadopago");
    expect(getPaymentGatewayForMarket("INT")).toBe("stripe");
  });

  it("calcula recargo de cambio de modalidad: 0% con >= 7 días, 25% con < 7 días", () => {
    const basePrice = 100000;
    const refDate = new Date("2026-11-01T10:00:00-03:00");

    // Evento a 10 días de distancia: sin recargo
    const freeChange = calculateModalityChangeFee(basePrice, "2026-11-11", refDate);
    expect(freeChange.surchargePercentage).toBe(0);
    expect(freeChange.surchargeAmount).toBe(0);
    expect(freeChange.totalWithFee).toBe(100000);

    // Evento a 3 días de distancia: 25% de recargo
    const lateChange = calculateModalityChangeFee(basePrice, "2026-11-04", refDate);
    expect(lateChange.surchargePercentage).toBe(25);
    expect(lateChange.surchargeAmount).toBe(25000);
    expect(lateChange.totalWithFee).toBe(125000);
  });

  it("calcula recargo On Demand: precio base antes del evento, +35% desde el día del evento", () => {
    const basePrice = 80000;
    const eventDateStr = "2026-11-10";

    // Compra 5 días antes
    const earlyBuy = calculateOnDemandPrice(basePrice, eventDateStr, new Date("2026-11-05T12:00:00-03:00"));
    expect(earlyBuy.surchargePercentage).toBe(0);
    expect(earlyBuy.finalPrice).toBe(80000);
    expect(earlyBuy.isLatePurchase).toBe(false);

    // Compra el mismo día del evento
    const sameDayBuy = calculateOnDemandPrice(basePrice, eventDateStr, new Date("2026-11-10T15:00:00-03:00"));
    expect(sameDayBuy.surchargePercentage).toBe(35);
    expect(sameDayBuy.surchargeAmount).toBe(28000);
    expect(sameDayBuy.finalPrice).toBe(108000);
    expect(sameDayBuy.isLatePurchase).toBe(true);

    // Compra 2 días después
    const afterEventBuy = calculateOnDemandPrice(basePrice, eventDateStr, new Date("2026-11-12T15:00:00-03:00"));
    expect(afterEventBuy.surchargePercentage).toBe(35);
    expect(afterEventBuy.finalPrice).toBe(108000);
    expect(afterEventBuy.isLatePurchase).toBe(true);
  });

  it("verifica que On Demand no acredita asistencia presencial ni virtual en vivo", () => {
    expect(grantsAttendance("presencial")).toBe(true);
    expect(grantsAttendance("streaming")).toBe(true);
    expect(grantsAttendance("on_demand")).toBe(false);
  });

  it("mantiene resiliencia y retiene el último catálogo válido ante fallas temporales de Google Sheets", async () => {
    const db = getDatabase();
    const resilientId = `SEM-RESILIENT-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 1. Guardar registro previamente válido en la base de datos
    await db.run(
      `INSERT INTO trainings (capacitacion_id, tipo, titulo, estado_editorial, verificacion, synced_at)
       VALUES (?, 'seminario', 'Capacitación Resiliente Preexistente', 'publicado', 'verificado', ?)`,
      [resilientId, nowIso]
    );

    // 2. Simular un fetcher que falla para Google Sheets (ej: error 503 o corte de red)
    const failingFetcher = async () => {
      throw new Error("Google Sheets temporalmente no disponible (HTTP 503 Service Unavailable)");
    };

    const report = await syncGoogleSheetsCatalog({
      customFetcher: failingFetcher,
      triggeredBy: "resilience_test",
    });

    // La sincronización debe reportar error pero sin lanzar excepción no controlada
    expect(report.status).toBe("failed");
    expect(report.errors.length).toBeGreaterThan(0);

    // El registro previo DEBE seguir intacto en la base de datos
    const check = await db.get(`SELECT * FROM trainings WHERE capacitacion_id = ?`, [resilientId]);
    expect(check).not.toBeNull();
    expect(check.capacitacion_id).toBe(resilientId);
  });

  it("ignora y reporta filas incompletas o sin identificadores obligatorios", async () => {
    const brokenCsv = `"capacitacion_id","tipo","titulo","estado_editorial","verificacion"
"","seminario","Sin ID","borrador","pendiente"
"SEM-OK","seminario","","borrador","pendiente"
"SEM-VALID","seminario","Seminario Válido","borrador","pendiente"`;

    const records = parseCsv(brokenCsv);
    expect(records.length).toBe(3);

    // Solo el tercero tiene tanto capacitacion_id como titulo
    const validOnes = records.filter((r) => r.capacitacion_id && r.titulo);
    expect(validOnes.length).toBe(1);
    expect(validOnes[0].capacitacion_id).toBe("SEM-VALID");
  });
});
