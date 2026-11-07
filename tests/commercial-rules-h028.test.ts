import { describe, it, expect } from "vitest";
import {
  calculateModalityChangeFee,
  calculateOnDemandPrice,
  evaluateRevocationRequest,
} from "../src/lib/commercial/rules";

describe("DAOM Learning (Core) — Precios Dinámicos y Protección Legal al Consumidor (H028)", () => {
  const testPrices = [45000, 80000, 120000, 51711];

  describe("1. Precios Dinámicos, Paridad y Ausencia de Valores Fijos (H028-1)", () => {
    testPrices.forEach((basePrice) => {
      it(`comprueba paridad presencial/streaming para arancel dinámico de $${basePrice.toLocaleString("es-AR")}`, () => {
        const eventDate = "2026-12-15";
        const refDate = new Date("2026-11-20T10:00:00-03:00");

        const changeResult = calculateModalityChangeFee(basePrice, eventDate, refDate, "streaming", "presencial");
        expect(changeResult.surchargeAmount).toBe(0);
        expect(changeResult.priceDifference).toBe(0);
        expect(changeResult.totalWithFee).toBe(basePrice);
        expect(changeResult.requiresApproval).toBe(true);
        expect(changeResult.reason).toContain("Streaming y Presencial tienen el mismo precio base");
      });

      it(`comprueba precio On-Demand anticipado para arancel dinámico de $${basePrice.toLocaleString("es-AR")}`, () => {
        const eventDate = "2026-12-15";
        const preEventDate = new Date("2026-12-01T10:00:00-03:00");

        const onDemandPre = calculateOnDemandPrice(basePrice, eventDate, preEventDate);
        expect(onDemandPre.basePrice).toBe(basePrice);
        expect(onDemandPre.surchargePercentage).toBe(0);
        expect(onDemandPre.surchargeAmount).toBe(0);
        expect(onDemandPre.finalPrice).toBe(basePrice);
        expect(onDemandPre.isLatePurchase).toBe(false);
      });

      it(`comprueba recargo del 35% y redondeo monetario para On-Demand post-evento de $${basePrice.toLocaleString("es-AR")}`, () => {
        const eventDate = "2026-12-15";
        const postEventDate = new Date("2026-12-15T12:00:00-03:00");

        const onDemandPost = calculateOnDemandPrice(basePrice, eventDate, postEventDate);
        const expectedSurcharge = Math.round(basePrice * 0.35 * 100) / 100;
        const expectedFinal = Math.round((basePrice + expectedSurcharge) * 100) / 100;

        expect(onDemandPost.surchargePercentage).toBe(35);
        expect(onDemandPost.surchargeAmount).toBe(expectedSurcharge);
        expect(onDemandPost.finalPrice).toBe(expectedFinal);
        expect(onDemandPost.isLatePurchase).toBe(true);

        const decimals = (onDemandPost.finalPrice.toString().split(".")[1] || "").length;
        expect(decimals).toBeLessThanOrEqual(2);
      });
    });

    it("rechaza o neutraliza precios base nulos, negativos o indefinidos", () => {
      const zeroPrice = calculateOnDemandPrice(0, "2026-12-15");
      expect(zeroPrice.finalPrice).toBe(0);

      const negPrice = calculateOnDemandPrice(-5000, "2026-12-15");
      expect(negPrice.finalPrice).toBe(0);
    });
  });

  describe("2. Separación de Cambios Voluntarios y Derechos del Consumidor (H028-2)", () => {
    const basePrice = 85000;
    const eventDate = "2026-12-01";

    it("cambio voluntario >= 7 días aplica 0% de penalidad administrativa", () => {
      const refDate = new Date("2026-11-20T10:00:00-03:00");
      const res = calculateModalityChangeFee(basePrice, eventDate, refDate, "presencial", "streaming");
      expect(res.isEligible).toBe(true);
      expect(res.surchargePercentage).toBe(0);
      expect(res.surchargeAmount).toBe(0);
      expect(res.totalWithFee).toBe(basePrice);
      expect(res.legalNotice).toBeDefined();
    });

    it("cambio voluntario < 7 días aplica 25% de cargo administrativo", () => {
      const refDate = new Date("2026-11-28T10:00:00-03:00");
      const res = calculateModalityChangeFee(basePrice, eventDate, refDate, "presencial", "streaming");
      expect(res.isEligible).toBe(true);
      expect(res.surchargePercentage).toBe(25);
      expect(res.surchargeAmount).toBe(Math.round(basePrice * 0.25 * 100) / 100);
      expect(res.totalWithFee).toBe(basePrice + res.surchargeAmount);
    });

    it("cambio voluntario con evento iniciado o pasado informa no elegibilidad para autogestión sin perjuicio legal", () => {
      const refDate = new Date("2026-12-02T10:00:00-03:00");
      const res = calculateModalityChangeFee(basePrice, eventDate, refDate, "presencial", "streaming");
      expect(res.isEligible).toBe(false);
      expect(res.reason).toContain("sin perjuicio de los derechos irrenunciables del consumidor");
    });

    it("solicitud de arrepentimiento dentro del plazo legal de 10 días se registra para trámite de reintegro", () => {
      const purchaseDate = new Date("2026-11-10T12:00:00-03:00");
      const evalDate = new Date("2026-11-15T12:00:00-03:00");

      const res = evaluateRevocationRequest({
        purchaseDate,
        eventStartDateIso: eventDate,
        serviceConsumed: false,
        currentDate: evalDate,
      });

      expect(res.isWithinStatutoryPeriod).toBe(true);
      expect(res.status).toBe("pending_review");
      expect(res.exceptionApplies).toBe(false);
      expect(res.legalBasis).toContain("Ley 24.240 Art. 34");
    });

    it("solicitud de arrepentimiento con servicio consumido (excepción Art. 1116 CCCN) requiere revisión administrativa", () => {
      const purchaseDate = new Date("2026-11-10T12:00:00-03:00");
      const evalDate = new Date("2026-11-14T12:00:00-03:00");

      const res = evaluateRevocationRequest({
        purchaseDate,
        eventStartDateIso: eventDate,
        serviceConsumed: true,
        currentDate: evalDate,
      });

      expect(res.status).toBe("requires_manual_evaluation");
      expect(res.exceptionApplies).toBe(true);
      expect(res.legalBasis).toContain("CCCN Art. 1116");
    });

    it("solicitud de arrepentimiento fuera de plazo legal de 10 días no se descarta: se registra para evaluación administrativa", () => {
      const purchaseDate = new Date("2026-11-01T12:00:00-03:00");
      const evalDate = new Date("2026-11-20T12:00:00-03:00");

      const res = evaluateRevocationRequest({
        purchaseDate,
        eventStartDateIso: eventDate,
        serviceConsumed: false,
        currentDate: evalDate,
      });

      expect(res.isWithinStatutoryPeriod).toBe(false);
      expect(res.status).toBe("requires_manual_evaluation");
      expect(res.message).toContain("superado el plazo legal de 10 días");
    });

    it("solicitud legal con evento iniciado no es bloqueada automáticamente y queda registrada", () => {
      const purchaseDate = new Date("2026-11-28T12:00:00-03:00");
      const eventStart = "2026-11-30";
      const evalDate = new Date("2026-12-02T12:00:00-03:00");

      const res = evaluateRevocationRequest({
        purchaseDate,
        eventStartDateIso: eventStart,
        serviceConsumed: false,
        currentDate: evalDate,
      });

      expect(res.isWithinStatutoryPeriod).toBe(true);
      expect(res.status).toBe("pending_review");
    });
  });
});
