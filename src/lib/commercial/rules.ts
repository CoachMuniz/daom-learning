/**
 * DAOM Learning — Motor de Reglas Comerciales
 * Canario: DAOM-FORMACION-SHEET-01
 *
 * Implementa las reglas comerciales estrictas (H027-D):
 * 1. Monedas independientes (ARS para AR, USD para INT). No auto-conversión.
 * 2. Mismo precio base para Presencial y Streaming.
 * 3. Cambio de modalidad:
 *    - Presencial -> Streaming:
 *        * >= 7 días antes del inicio: 0% recargo.
 *        * < 7 días antes del inicio: 25% de recargo sobre precio base.
 *    - Streaming -> Presencial:
 *        * 0% diferencia automática de precio (mismo precio base).
 *        * Sujeto a disponibilidad de cupos en sede y autorización administrativa.
 *    - Evento iniciado o pasado: no elegible.
 * 4. On Demand:
 *    - Compra antes de la fecha del evento: precio base (igual a Streaming).
 *    - Compra el día del evento o posterior: +35% de recargo sobre precio base.
 * 5. On Demand no acredita asistencia presencial ni streaming en vivo ni emite certificado de asistencia.
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
  const eventDate = new Date(eventStartDateIso + "T00:00:00-03:00");
  const refTime = referenceDate.getTime();
  const eventTime = eventDate.getTime();
  const diffMs = eventTime - refTime;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calcula el recargo aplicable a una solicitud de cambio de modalidad.
 * Reglas comerciales oficiales (H027-D):
 * 1. Presencial y Streaming comparten exactamente el mismo precio base.
 * 2. Cambio Presencial -> Streaming:
 *    - >= 7 días: sin recargo (0%).
 *    - < 7 días: 25% de recargo sobre el precio base.
 * 3. Cambio Streaming -> Presencial:
 *    - 0% diferencia automática de precio (mismo precio base).
 *    - Sujeto a disponibilidad de cupos presenciales y autorización administrativa en sede.
 * 4. Evento iniciado o pasado: no elegible.
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
      reason: "Streaming y Presencial tienen el mismo precio base (0% diferencia de precio). El cambio está sujeto a disponibilidad de cupo presencial en la sede y confirmación administrativa.",
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
      reason: "El evento ya ha iniciado o finalizado. No se admiten cambios de modalidad posteriores a la fecha de inicio.",
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
    };
  }

  // Menos de 7 días: 25% de recargo
  const surchargePct = 25;
  const surchargeAmt = Math.round(basePrice * 0.25 * 100) / 100;
  return {
    isEligible: true,
    daysUntilEvent: days,
    surchargePercentage: surchargePct,
    surchargeAmount: surchargeAmt,
    priceDifference: 0,
    totalWithFee: basePrice + surchargeAmt,
    requiresApproval: false,
    reason: `Solicitud realizada a ${days} días del evento (menos de 7 días). Aplica recargo reglamentario del 25%.`,
  };
}

/**
 * Calcula el precio para On Demand según la fecha de compra:
 * - Antes del evento: precio base.
 * - El día del evento o después: +35% adicional.
 */
export function calculateOnDemandPrice(
  basePrice: number,
  eventStartDateIso?: string | null,
  purchaseDate: Date = new Date()
): OnDemandPricingResult {
  if (!eventStartDateIso) {
    return {
      basePrice,
      surchargePercentage: 0,
      surchargeAmount: 0,
      finalPrice: basePrice,
      isLatePurchase: false,
    };
  }

  const days = getDaysUntilEvent(eventStartDateIso, purchaseDate);

  // Si days <= 0, significa que la compra se efectúa el día del evento o posteriormente
  if (days <= 0) {
    const surchargePct = 35;
    const surchargeAmt = Math.round(basePrice * 0.35 * 100) / 100;
    return {
      basePrice,
      surchargePercentage: surchargePct,
      surchargeAmount: surchargeAmt,
      finalPrice: basePrice + surchargeAmt,
      isLatePurchase: true,
    };
  }

  return {
    basePrice,
    surchargePercentage: 0,
    surchargeAmount: 0,
    finalPrice: basePrice,
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
