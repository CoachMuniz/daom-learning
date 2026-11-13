import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createEnrollment,
  getTrainingById,
  getPricesForEdition,
  getUserEnrollmentForTraining,
  findUserById,
} from "@/lib/db/repository";
import {
  calculateEffectivePrice,
  calculateOnDemandPrice,
  getPaymentGatewayForMarket,
  findMatchingPrice,
} from "@/lib/commercial/rules";
import { getMercadoPagoAccessToken } from "@/lib/payments/mercadopago";
import type { ModalityId } from "@/lib/types";

export const dynamic = "force-dynamic";

const CreateEnrollmentSchema = z.object({
  capacitacionId: z.string().min(1),
  ofertaId: z.string().optional(),
  modalityId: z.enum(["presencial", "streaming", "on_demand"]),
  market: z.enum(["AR", "INT"]).default("AR"),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      {
        error: "UNAUTHENTICATED",
        message: "Debe iniciar sesión para inscribirse a una capacitación.",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 401 }
    );
  }

  try {
    const json = await request.json();
    const parsed = CreateEnrollmentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const { capacitacionId, ofertaId, modalityId, market, notes } = parsed.data;

    // 1. Obtener capacitación
    const training = await getTrainingById(capacitacionId, true);
    if (!training) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Capacitación no encontrada: ${capacitacionId}` },
        { status: 404 }
      );
    }

    // 2. Obtener usuario actual
    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND", message: "Usuario de sesión no encontrado en base de datos." },
        { status: 404 }
      );
    }

    // 3. Resolver edición
    const edition = ofertaId
      ? training.ediciones?.find((e) => e.oferta_id === ofertaId)
      : training.ediciones?.[0];
    const targetOfertaId = edition?.oferta_id || ofertaId || null;

    // 4. Calcular precio efectivo y validar arancel
    let amount = 0;
    const currency = "ARS";

    let candidatePrices: any[] = [];
    if (targetOfertaId) {
      candidatePrices = await getPricesForEdition(targetOfertaId, false);
    }
    if ((!candidatePrices || candidatePrices.length === 0) && training.ediciones && training.ediciones.length > 0) {
      for (const ed of training.ediciones) {
        if (ed.precios && ed.precios.length > 0) {
          candidatePrices = ed.precios;
          break;
        }
      }
    }

    if (candidatePrices && candidatePrices.length > 0) {
      const matched = findMatchingPrice(candidatePrices, market, "ARS");
      if (matched) {
        const effective = calculateEffectivePrice(matched);
        amount = effective.effectivePrice;
      }
    }

    // Si es On Demand, aplicar recargo del 35% si es posterior a la fecha de inicio
    if (modalityId === "on_demand" && amount > 0 && edition?.fecha_inicio) {
      const onDemandCalc = calculateOnDemandPrice(amount, edition.fecha_inicio);
      amount = onDemandCalc.finalPrice;
    }

    // Validación estricta de precio comercial válido (H028)
    if (!amount || amount <= 0 || isNaN(amount)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EDITION_PRICE",
          message: "La edición seleccionada no posee un arancel comercial configurado o válido en el catálogo oficial.",
        },
        { status: 422 }
      );
    }

    // 5. Verificar si ya existe inscripción activa o pendiente para evitar duplicados
    let enrollment = await getUserEnrollmentForTraining(user.id, capacitacionId, targetOfertaId);

    if (enrollment && enrollment.status === "confirmada") {
      return NextResponse.json(
        {
          success: true,
          message: "Ya contás con una inscripción confirmada para esta capacitación.",
          enrollment: {
            id: enrollment.id,
            capacitacion_id: enrollment.capacitacion_id,
            modality_id: enrollment.modality_id,
            amount_total: enrollment.amount_total,
            currency: enrollment.currency,
            status: enrollment.status,
          },
          alreadyConfirmed: true,
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 200 }
      );
    }

    if (!enrollment) {
      enrollment = await createEnrollment({
        userId: user.id,
        capacitacionId,
        ofertaId: targetOfertaId,
        modalityId: modalityId as ModalityId,
        currency,
        amountTotal: amount,
        paymentMethod: "mercadopago",
        notes: notes || null,
      });
    }

    // 6. Generar preferencia de Mercado Pago Checkout Pro
    const provider = getPaymentGatewayForMarket(market);
    const mpToken = getMercadoPagoAccessToken();

    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      (process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : "https://daom-learning.onrender.com");

    const checkoutSessionId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const internalCheckoutUrl = `${siteUrl}/capacitaciones/checkout?enrollment_id=${enrollment.id}&session_id=${checkoutSessionId}`;

    let mercadopagoPreferenceId: string | null = null;
    let mercadopagoInitPoint: string | null = null;
    let mercadopagoSandboxInitPoint: string | null = null;

    if (provider === "mercadopago" && mpToken && enrollment.amount_total > 0) {
      try {
        const nameParts = (user.full_name || "Participante DAOM").trim().split(/\s+/);
        const firstName = nameParts[0] || "Participante";
        const lastName = nameParts.slice(1).join(" ") || "DAOM";

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
                title: `DAOM Learning: ${training.titulo}`.slice(0, 255),
                description: `Modalidad: ${modalityId} - DAOM Weightlifting`.slice(0, 255),
                category_id: "learnings",
                quantity: 1,
                unit_price: Number(enrollment.amount_total),
                currency_id: currency,
              },
            ],
            payer: {
              name: firstName,
              surname: lastName,
              email: user.email,
              ...(user.profile?.phone
                ? {
                    phone: {
                      area_code: "",
                      number: user.profile.phone,
                    },
                  }
                : {}),
            },
            statement_descriptor: "DAOM LEARNING",
            binary_mode: true,
            external_reference: enrollment.id,
            notification_url: `${siteUrl}/api/v1/webhooks/mercadopago`,
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
          mercadopagoInitPoint = prefData.init_point || null;
          mercadopagoSandboxInitPoint = prefData.sandbox_init_point || null;
        }
      } catch (mpError) {
        // Fallback al flujo interno en caso de error o timeout de red
      }
    }

    const isSandboxToken = mpToken?.startsWith("TEST-");
    const checkoutUrl =
      (isSandboxToken && mercadopagoSandboxInitPoint)
        ? mercadopagoSandboxInitPoint
        : (mercadopagoInitPoint || mercadopagoSandboxInitPoint || internalCheckoutUrl);

    return NextResponse.json(
      {
        success: true,
        message: "Inscripción iniciada con éxito. Redirigiendo a Mercado Pago para confirmar tu vacante.",
        enrollment: {
          id: enrollment.id,
          capacitacion_id: enrollment.capacitacion_id,
          oferta_id: enrollment.oferta_id,
          modality_id: enrollment.modality_id,
          amount_total: enrollment.amount_total,
          currency: enrollment.currency,
          status: enrollment.status,
        },
        checkout: {
          provider,
          checkoutUrl,
          internalCheckoutUrl,
          mercadopagoPreferenceId,
          mercadopagoInitPoint,
          mercadopagoSandboxInitPoint,
          sessionId: checkoutSessionId,
          amount: enrollment.amount_total,
          currency: enrollment.currency,
        },
        canary: "DAOM-FORMACION-SHEET-01",
        canary_security: "DAOM-MERCADOPAGO-MCP-01",
        canary_mp_only: "DAOM-LEARNING-MP-ONLY-01",
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
