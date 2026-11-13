import { describe, it, expect } from "vitest";
import {
  isArgentinaMarket,
  isInternationalMarket,
  findMatchingPrice,
} from "@/lib/commercial/rules";
import type { Price } from "@/lib/types";

describe("DAOM Learning — Normalización de Mercados y Precios (H028 / FASE A)", () => {
  it("reconoce correctamente variaciones de mercado Argentina", () => {
    expect(isArgentinaMarket("AR")).toBe(true);
    expect(isArgentinaMarket("ar")).toBe(true);
    expect(isArgentinaMarket("ARGENTINA")).toBe(true);
    expect(isArgentinaMarket("Argentina")).toBe(true);
    expect(isArgentinaMarket("argentina")).toBe(true);
    expect(isArgentinaMarket("INT")).toBe(false);
  });

  it("reconoce correctamente variaciones de mercado Internacional", () => {
    expect(isInternationalMarket("INT")).toBe(true);
    expect(isInternationalMarket("int")).toBe(true);
    expect(isInternationalMarket("INTERNATIONAL")).toBe(true);
    expect(isInternationalMarket("INTERNACIONAL")).toBe(true);
    expect(isInternationalMarket("EXTERIOR")).toBe(true);
    expect(isInternationalMarket("AR")).toBe(false);
  });

  it("resuelve el precio en ARS aunque la planilla cargue 'ARGENTINA'", () => {
    const samplePrices: Price[] = [
      {
        precio_id: "PR-01",
        oferta_id: "OF-SQUATS-2026-1",
        mercado: "ARGENTINA" as any,
        moneda: "ARS",
        precio_base: 51711,
        estado: "publicado",
        verificacion: "verificado",
        synced_at: "2026-11-13T10:00:00Z",
      },
      {
        precio_id: "PR-02",
        oferta_id: "OF-SQUATS-2026-1",
        mercado: "INT",
        moneda: "USD",
        precio_base: 70,
        estado: "publicado",
        verificacion: "verificado",
        synced_at: "2026-11-13T10:00:00Z",
      },
    ];

    const matchedAr = findMatchingPrice(samplePrices, "AR", "ARS");
    expect(matchedAr).toBeDefined();
    expect(matchedAr?.precio_base).toBe(51711);
    expect(matchedAr?.moneda).toBe("ARS");

    const matchedInt = findMatchingPrice(samplePrices, "INT", "USD");
    expect(matchedInt).toBeDefined();
    expect(matchedInt?.precio_base).toBe(70);
  });
});
