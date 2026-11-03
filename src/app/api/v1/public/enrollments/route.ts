import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getTrainingById,
  getPricesForEdition,
  findOrCreateParticipant,
  getUserEnrollmentForTraining,
  createEnrollment,
} from "@/lib/db/repository";
import {
  calculateEffectivePrice,
  calculateOnDemandPrice,
  getPaymentGatewayForMarket,
} from "@/lib/commercial/rules";
import type { ModalityId } from "@/lib/types";

export const dynamic = "force-dynamic";

const PublicEnrollmentSchema = z.object({
  capacitacionId: z.string().min(1, "El ID de capacitación es requerido"),
  ofertaId: z.string().optional().nullable(),
  modalityId: z.enum(["presencial", "streaming", "on_demand"]),
  market: z.enum(["AR", "INT"]).default("AR"),
  participant: z.object({
    fullName: z.string().min(2, "El nombre completo debe tener al menos 2 caracteres"),
    email: z.string().email("El correo electrónico no es válido"),
    phone: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    documentId: z.string().optional().nullable(),
  }),
  notes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = PublicEnrollmentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          issues: parsed.error.issues,
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 400 }
      );
    }

    const { capacitacionId, ofertaId, modalityId, market, participant, notes } = parsed.data;

    // 1. Validar que la capacitación exista y esté publicada y verificada
    const training = await getTrainingById(capacitacionId, false);
    if (!training) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: `Capacitación no encontrada o no habilitada para inscripción: ${capacitacionId}`,
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 404 }
      );
    }

    // 2. Resolver edición
    const edition = ofertaId
      ? training.ediciones?.find((e) => e.oferta_id === ofertaId)
      : training.ediciones?.[0];

    const targetOfertaId = edition?.oferta_id || ofertaId || null;

    // 3. Cálculo de precio en servidor (NUNCA confiar en lo enviado por el cliente)
    let amountTotal = 0;
    const currency = market === "AR" ? "ARS" : "USD";
    const provider = getPaymentGatewayForMarket(market);

    if (targetOfertaId) {
      const prices = await getPricesForEdition(targetOfertaId, true);
      const matchedPrice = prices.find(
        (p) =>
          p.mercado === market ||
          (market === "AR" && ((p.mercado as string) === "ARGENTINA" || p.moneda === "ARS")) ||
          (market === "INT" && ((p.mercado as string) === "INTERNACIONAL" || p.moneda === "USD"))
      );

      if (matchedPrice) {
        // Calcular precio efectivo con promociones vigentes
        const effectiveCalc = calculateEffectivePrice(matchedPrice);
        amountTotal = effectiveCalc.effectivePrice;
      }
    }

    // Si es On Demand, aplicar regla de cálculo según fecha del evento si corresponde
    if (modalityId === "on_demand" && amountTotal > 0 && edition?.fecha_inicio) {
      const onDemandCalc = calculateOnDemandPrice(amountTotal, edition.fecha_inicio);
      amountTotal = onDemandCalc.finalPrice;
    }

    // 4. Crear o vincular participante seguro (sin exigir contraseña obligatoria)
    const user = await findOrCreateParticipant({
      email: participant.email,
      fullName: participant.fullName,
      phone: participant.phone || undefined,
      country: participant.country || (market === "AR" ? "AR" : "INT"),
      documentId: participant.documentId || undefined,
    });

    // 5. Prevenir inscripciones duplicadas
    const existingEnrollment = await getUserEnrollmentForTraining(
      user.id,
      training.capacitacion_id,
      targetOfertaId
    );

    let enrollment = existingEnrollment;

    if (existingEnrollment) {
      if (existingEnrollment.status === "confirmada") {
        return NextResponse.json(
          {
            success: true,
            alreadyConfirmed: true,
            message: "Ya posees una inscripción confirmada para esta capacitación.",
            enrollment: {
              id: existingEnrollment.id,
              capacitacion_id: existingEnrollment.capacitacion_id,
              modality_id: existingEnrollment.modality_id,
              amount_total: existingEnrollment.amount_total,
              currency: existingEnrollment.currency,
              status: existingEnrollment.status,
            },
            canary: "DAOM-FORMACION-SHEET-01",
          },
          { status: 200 }
        );
      }
      // Si ya tiene una pendiente_pago, reusamos el registro para evitar duplicar
      enrollment = existingEnrollment;
    } else {
      // Crear nueva inscripción
      enrollment = await createEnrollment({
        userId: user.id,
        capacitacionId: training.capacitacion_id,
        ofertaId: targetOfertaId,
        modalityId: modalityId as ModalityId,
        currency,
        amountTotal,
        paymentMethod: provider,
        notes: notes || null,
      });
    }

    // 6. Generación de Checkout seguro
    // Aprovecha credenciales activas de Mercado Pago si están configuradas en entorno.
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.daom-weightlifting.com";
    const checkoutSessionId = `CHK-${enrollment.id}-${Date.now()}`;
    const internalCheckoutUrl = `${siteUrl}/capacitaciones/checkout?enrollment_id=${enrollment.id}&provider=${provider}&session_id=${checkoutSessionId}`;

    let mercadopagoPreferenceId: string | null = null;
    let mercadopagoInitPoint: string | null = null;

    const mpToken =
      process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN ||
      process.env.MERCADO_PAGO_CHECKOUT_PRO_CLEAN_TEST_ACCESS_TOKEN ||
      process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (provider === "mercadopago" && mpToken && enrollment.amount_total > 0) {
      try {
        const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mpToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: [
              {
                id: training.capacitacion_id,
                title: `DAOM Learning: ${training.titulo}`,
                description: `Modalidad: ${modalityId}`,
                quantity: 1,
                unit_price: Number(enrollment.amount_total),
                currency_id: currency,
              },
            ],
            payer: {
              name: participant.fullName,
              email: participant.email,
            },
            external_reference: enrollment.id,
            back_urls: {
              success: `${siteUrl}/capacitaciones/confirmacion?enrollment_id=${enrollment.id}&status=approved`,
              pending: `${siteUrl}/capacitaciones/confirmacion?enrollment_id=${enrollment.id}&status=pending`,
              failure: `${siteUrl}/capacitaciones/confirmacion?enrollment_id=${enrollment.id}&status=failure`,
            },
            auto_return: "approved",
          }),
        });
        if (mpRes.ok) {
          const prefData = await mpRes.json();
          mercadopagoPreferenceId = prefData.id || null;
          mercadopagoInitPoint = prefData.sandbox_init_point || prefData.init_point || null;
        }
      } catch {
        // Fallback al flujo interno en caso de error de red
      }
    }

    const checkoutUrl = mercadopagoInitPoint || internalCheckoutUrl;

    return NextResponse.json(
      {
        success: true,
        message: "Inscripción iniciada con éxito. Procedé al checkout para confirmar tu vacante.",
        enrollment: {
          id: enrollment.id,
          capacitacion_id: enrollment.capacitacion_id,
          oferta_id: enrollment.oferta_id,
          modality_id: enrollment.modality_id,
          amount_total: enrollment.amount_total,
          currency: enrollment.currency,
          status: enrollment.status,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
          },
        },
        checkout: {
          provider,
          checkoutUrl,
          internalCheckoutUrl,
          mercadopagoPreferenceId,
          sessionId: checkoutSessionId,
          amount: enrollment.amount_total,
          currency: enrollment.currency,
        },
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: existingEnrollment ? 200 : 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Error al procesar la inscripción",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 500 }
    );
  }
}
