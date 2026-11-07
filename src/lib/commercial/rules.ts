/**
 * DAOM Learning — Motor de Reglas Comerciales
 * Canario: DAOM-LEARNING-H028-COMPLETE
 *
 * Implementa las reglas comerciales estrictas (H028):
 * 1. Moneda ARS para liquidación definitiva y Mercado Pago como pasarela única.
 * 2. PRECIOS DINÁMICOS POR EDICIÓN:
 *    - Cada capacitación y edición posee su propio precio base configurado en la fuente de datos autorizada (Google Sheets).
 *    - No existe ningún precio universal o fijo codificado en el sistema.
 * 3. Paridad Presencial / Streaming:
 *    - La modalidad Streaming en Vivo comparte exactamente el mismo precio base que la modalidad Presencial de dicha edición.
 * 4. Modalidad On-Demand:
 *    - Compra anticipada (antes de la fecha del evento): mismo precio base de la edición.
 *    - Compra el día del evento o con posterioridad: recargo del 35% (+35%) sobre el precio base de la edición.
 *    - On-Demand no acredita asistencia presencial ni sincrónica ni emite certificado de asistencia.
 * 5. Cambios voluntarios de modalidad:
 *    - Presencial -> Streaming:
 *        * >= 7 días corridos antes del evento: sin recargo (0%).
 *        * < 7 días corridos: recargo administrativo del 25% sobre el precio base.
 *    - Streaming -> Presencial:
 *        * 0% de diferencia automática de precio base (comparten arancel).
 *        * Sujeto a disponibilidad de cupo en la tarima olímpica de la sede y autorización administrativa previa.
 *    - Posterior al inicio: Las autogestiones voluntarias no aplican una vez iniciada la cursada,
 *      sin perjuicio de los derechos irrenunciables del consumidor (Ley 24.240 y CCCN Art. 1110)
 *      ni de solicitudes fundadas sujetas a revisión administrativa especial.
 * 6. Protección legal al consumidor:
 *    - Todas las limitaciones comerciales operan sin perjuicio de las disposiciones de orden público
 *      de la Ley 24.240 de Defensa del Consumidor y el Código Civil y Comercial de la Nación.
 *    - El derecho de revocación y arrepentimiento puede registrarse formalmente en todo momento para su
 *      debido análisis administrativo y nunca genera reintegros automáticos no supervisados.
 */

import type { ModalityId, MarketType, CurrencyType, Price } from "@/lib/types";

export interface ModalityChangeFeeResult {
  isEligible: boolean;
  daysUntilEvent: number;
  surchargePercentage: number;
  surchargeAmount: number;
  totalWithFee: number;
  priceDifference: number;
  requiresApproval: boolean;
  reason: string;
  legalNotice: string;
}

export interface OnDemandPricingResult {
  basePrice: number;
  surchargePercentage: number;
  surchargeAmount: number;
  finalPrice: number;
  isLatePurchase: boolean;
}

export interface EffectivePriceResult {
  basePrice: number;
  discountAmount: number;
  effectivePrice: number;
  isPromoActive: boolean;
  promoType?: string | null;
  promoValue?: number | null;
  promoDescription?: string | null;
}

export interface RevocationEvaluationResult {
  isWithinStatutoryPeriod: boolean;
  daysSincePurchase: number;
  status: "pending_review" | "in_review" | "requires_manual_evaluation";
  exceptionApplies: boolean;
  message: string;
  legalBasis: string;
}

const LEGAL_NOTICE_STANDARD =
  "Las condiciones comerciales rigen para cambios voluntarios de modalidad y cancelaciones comerciales sin perjuicio de los derechos irrenunciables del consumidor consagrados en la Ley N° 24.240 y el Código Civil y Comercial de la Nación.";

/**
 * Retorna la pasarela oficial según el mercado del usuario.
 * Decisión Comercial Definitiva: MERCADO PAGO es el proveedor único habilitado (nacional e internacional).
 * Se conserva el tipo 'stripe' únicamente para compatibilidad con registros históricos existentes.
 */
export function getPaymentGatewayForMarket(market?: MarketType): "mercadopago" | "stripe" {
  return "mercadopago";
}

/**
 * Retorna la moneda oficial según el mercado.
 * Decisión Comercial Definitiva: ARS (Pesos argentinos) para todas las operaciones y mercados.
 * Se conserva 'USD' en el tipo de retorno únicamente para compatibilidad con registros históricos.
 */
export function getCurrencyForMarket(market?: MarketType): CurrencyType {
  return "ARS";
}

/**
 * Calcula la diferencia en días completos entre una fecha de referencia y la fecha de inicio del evento
 * en la zona horaria 'America/Argentina/Buenos_Aires'.
 */
export function getDaysUntilEvent(eventStartDateIso: string, referenceDate: Date = new Date()): number {
  const eventDate = new Date(eventStartDateIso.split("T")[0] + "T00:00:00-03:00");
  const refTime = referenceDate.getTime();
  const eventTime = eventDate.getTime();
  const diffMs = eventTime - refTime;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calcula el arancel aplicable a una solicitud voluntaria de cambio de modalidad (H028).
 * Opera con el precio base dinámico de la edición seleccionada.
 */
export function calculateModalityChangeFee(
  basePrice: number,
  eventStartDateIso?: string | null,
  referenceDate: Date = new Date(),
  fromModality: string = "presencial",
  toModality: string = "streaming"
): ModalityChangeFeeResult {
  const normFrom = (fromModality || "").toLowerCase().replace(/[-_]/g, "");
  const normTo = (toModality || "").toLowerCase().replace(/[-_]/g, "");

  // Caso: Streaming -> Presencial (Mismo precio base, 0% diferencia de precio, sujeto a cupo físico en sede)
  if (normFrom.includes("streaming") && normTo.includes("presencial")) {
    return {
      isEligible: true,
      daysUntilEvent: eventStartDateIso ? getDaysUntilEvent(eventStartDateIso, referenceDate) : 999,
      surchargePercentage: 0,
      surchargeAmount: 0,
      priceDifference: 0,
      totalWithFee: basePrice,
      requiresApproval: true,
      reason: "Streaming y Presencial tienen el mismo precio base (0% diferencia de precio). El cambio está sujeto a disponibilidad de cupo presencial en la sede del Club DAOM y confirmación administrativa previa.",
      legalNotice: LEGAL_NOTICE_STANDARD,
    };
  }

  if (!eventStartDateIso) {
    return {
      isEligible: true,
      daysUntilEvent: 999,
      surchargePercentage: 0,
      surchargeAmount: 0,
      priceDifference: 0,
      totalWithFee: basePrice,
      requiresApproval: false,
      reason: "Sin fecha de inicio definida; no aplica recargo por cambio de modalidad.",
      legalNotice: LEGAL_NOTICE_STANDARD,
    };
  }

  const days = getDaysUntilEvent(eventStartDateIso, referenceDate);

  if (days < 0) {
    return {
      isEligible: false,
      daysUntilEvent: days,
      surchargePercentage: 0,
      surchargeAmount: 0,
      priceDifference: 0,
      totalWithFee: basePrice,
      requiresApproval: false,
      reason: "El evento ya ha iniciado o finalizado. La política de cambios voluntarios no admite autogestión una vez iniciada la cursada, sin perjuicio de los derechos irrenunciables del consumidor (Ley 24.240 y CCCN) ni de solicitudes fundadas sujetas a revisión administrativa especial.",
      legalNotice: LEGAL_NOTICE_STANDARD,
    };
  }

  if (days >= 7) {
    return {
      isEligible: true,
      daysUntilEvent: days,
      surchargePercentage: 0,
      surchargeAmount: 0,
      priceDifference: 0,
      totalWithFee: basePrice,
      requiresApproval: false,
      reason: `Solicitud realizada con ${days} días de antelación (mínimo 7 días requerido para 0% recargo).`,
      legalNotice: LEGAL_NOTICE_STANDARD,
    };
  }

  // Menos de 7 días: 25% de recargo sobre el precio base dinámico
  const surchargePct = 25;
  const surchargeAmt = Math.round(basePrice * 0.25 * 100) / 100;
  return {
    isEligible: true,
    daysUntilEvent: days,
    surchargePercentage: surchargePct,
    surchargeAmount: surchargeAmt,
    priceDifference: 0,
    totalWithFee: Math.round((basePrice + surchargeAmt) * 100) / 100,
    requiresApproval: false,
    reason: `Solicitud realizada a ${days} días del evento (menos de 7 días). Aplica recargo administrativo reglamentario del 25% sobre el precio base.`,
    legalNotice: LEGAL_NOTICE_STANDARD,
  };
}

/**
 * Calcula el precio dinámico para On Demand según la fecha de compra:
 * - Antes del evento (preventa): precio base dinámico de la edición.
 * - El día del evento o después: +35% adicional sobre el precio base dinámico.
 */
export function calculateOnDemandPrice(
  basePrice: number,
  eventStartDateIso?: string | null,
  purchaseDate: Date = new Date()
): OnDemandPricingResult {
  const safeBasePrice = Math.max(0, Number(basePrice) || 0);

  if (!eventStartDateIso) {
    return {
      basePrice: safeBasePrice,
      surchargePercentage: 0,
      surchargeAmount: 0,
      finalPrice: safeBasePrice,
      isLatePurchase: false,
    };
  }

  const days = getDaysUntilEvent(eventStartDateIso, purchaseDate);

  if (days <= 0) {
    const surchargePct = 35;
    const surchargeAmt = Math.round(safeBasePrice * 0.35 * 100) / 100;
    return {
      basePrice: safeBasePrice,
      surchargePercentage: surchargePct,
      surchargeAmount: surchargeAmt,
      finalPrice: Math.round((safeBasePrice + surchargeAmt) * 100) / 100,
      isLatePurchase: true,
    };
  }

  return {
    basePrice: safeBasePrice,
    surchargePercentage: 0,
    surchargeAmount: 0,
    finalPrice: safeBasePrice,
    isLatePurchase: false,
  };
}

/**
 * Verifica si una modalidad seleccionada otorga acreditación de asistencia presencial o en vivo.
 */
export function grantsAttendance(modalityId: ModalityId): boolean {
  return modalityId === "presencial" || modalityId === "streaming";
}

/**
 * Calcula el precio efectivo aplicando promociones vigentes según fecha y reglas comerciales.
 * Valida fechas de inicio y fin de promoción para evitar descuentos vencidos.
 */
export function calculateEffectivePrice(
  price: Price,
  referenceDate: Date = new Date()
): EffectivePriceResult {
  const basePrice = Number(price.precio_base) || 0;

  if (!price.promocion_tipo || price.promocion_valor === null || price.promocion_valor === undefined) {
    return {
      basePrice,
      discountAmount: 0,
      effectivePrice: basePrice,
      isPromoActive: false,
    };
  }

  // Verificar fecha de inicio
  if (price.promocion_inicio) {
    const startStr = price.promocion_inicio.includes("T")
      ? price.promocion_inicio
      : `${price.promocion_inicio}T00:00:00-03:00`;
    const startDate = new Date(startStr);
    if (!isNaN(startDate.getTime()) && referenceDate.getTime() < startDate.getTime()) {
      return {
        basePrice,
        discountAmount: 0,
        effectivePrice: basePrice,
        isPromoActive: false,
        promoDescription: "Promoción aún no vigente",
      };
    }
  }

  // Verificar fecha de expiración
  if (price.promocion_fin) {
    const endStr = price.promocion_fin.includes("T")
      ? price.promocion_fin
      : `${price.promocion_fin}T23:59:59-03:00`;
    const endDate = new Date(endStr);
    if (!isNaN(endDate.getTime()) && referenceDate.getTime() > endDate.getTime()) {
      return {
        basePrice,
        discountAmount: 0,
        effectivePrice: basePrice,
        isPromoActive: false,
        promoDescription: "Promoción finalizada",
      };
    }
  }

  // Calcular descuento
  let discountAmount = 0;
  const pType = price.promocion_tipo.toLowerCase();
  const pVal = Number(price.promocion_valor);

  if (pType.includes("porcentaje") || pType.includes("%")) {
    discountAmount = Math.round(basePrice * (pVal / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(basePrice, pVal);
  }

  const effectivePrice = Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);

  return {
    basePrice,
    discountAmount,
    effectivePrice,
    isPromoActive: true,
    promoType: price.promocion_tipo,
    promoValue: pVal,
    promoDescription: `Descuento ${price.promocion_tipo}: ${pVal}${pType.includes("porcentaje") || pType.includes("%") ? "%" : " " + price.moneda}`,
  };
}

/**
 * Evalúa el régimen legal de revocación y arrepentimiento conforme al marco de orden público
 * (Ley 24.240 de Defensa del Consumidor Art. 34 y Código Civil y Comercial de la Nación Art. 1110 y 1116).
 */
export function evaluateRevocationRequest(params: {
  purchaseDate: Date | string;
  eventStartDateIso?: string | null;
  serviceConsumed?: boolean;
  currentDate?: Date;
}): RevocationEvaluationResult {
  const now = params.currentDate ? params.currentDate.getTime() : Date.now();
  const pDate = new Date(params.purchaseDate);
  const pTime = !isNaN(pDate.getTime()) ? pDate.getTime() : now;
  const diffDays = Math.floor((now - pTime) / (1000 * 60 * 60 * 24));
  const isWithinStatutoryPeriod = diffDays <= 10;

  if (params.serviceConsumed) {
    return {
      isWithinStatutoryPeriod,
      daysSincePurchase: diffDays,
      status: "requires_manual_evaluation",
      exceptionApplies: true,
      message:
        "La solicitud fue registrada y se encuentra sujeta a dictamen administrativo y legal conforme a la excepción de servicio plenamente ejecutado prevista en el Art. 1116 del Código Civil y Comercial de la Nación.",
      legalBasis: "CCCN Art. 1116 y Ley 24.240 Art. 34",
    };
  }

  if (isWithinStatutoryPeriod) {
    return {
      isWithinStatutoryPeriod: true,
      daysSincePurchase: diffDays,
      status: "pending_review",
      exceptionApplies: false,
      message:
        "Solicitud de arrepentimiento ingresada dentro del plazo legal de 10 días corridos (Art. 34 Ley 24.240 y Art. 1110 CCCN). Se procesará la verificación administrativa y la instrucción de reversión en Mercado Pago.",
      legalBasis: "Ley 24.240 Art. 34, CCCN Art. 1110 y Res. SCI 424/2020",
    };
  }

  return {
    isWithinStatutoryPeriod: false,
    daysSincePurchase: diffDays,
    status: "requires_manual_evaluation",
    exceptionApplies: false,
    message:
      `Solicitud ingresada a los ${diffDays} días de la contratación (superado el plazo legal de 10 días corridos de arrepentimiento unilateral incausado). El reclamo queda registrado para evaluación de causales particulares por la coordinación administrativa.`,
    legalBasis: "Ley 24.240 de Defensa del Consumidor",
  };
}
