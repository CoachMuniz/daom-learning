import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getEnrollmentById, getTrainingById, findUserById } from "@/lib/db/repository";
import { getPaymentGatewayForMarket } from "@/lib/commercial/rules";
import { getMercadoPagoAccessToken } from "@/lib/payments/mercadopago";

export const dynamic = "force-dynamic";

/**
 * Endpoint para reintentar el pago de una inscripción en estado pendiente_pago.
 * Genera o reutiliza la preferencia de Mercado Pago y redirige al Checkout Pro.
 * Canario: DAOM-LEARNING-RETRY-MP-01
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  const enrollmentId = params.id;

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : "https://daom-learning.onrender.com");

  if (!session) {
    return NextResponse.redirect(`${siteUrl}/login?redirect=/participante`);
  }

  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment) {
    return NextResponse.redirect(`${siteUrl}/participante?error=ENROLLMENT_NOT_FOUND`);
  }

  // Verificar pertenencia o permiso
  if (enrollment.user_id !== session.userId && session.role !== "ADMIN") {
    return NextResponse.redirect(`${siteUrl}/participante?error=FORBIDDEN`);
  }

  // Si ya está confirmada, no hace falta pagar
  if (enrollment.status === "confirmada") {
    return NextResponse.redirect(`${siteUrl}/participante?message=ALREADY_PAID`);
  }

  const training = await getTrainingById(enrollment.capacitacion_id, false);
  const trainingTitle = training?.titulo || enrollment.capacitacion_id;
  const user = await findUserById(enrollment.user_id);

  const mpToken = getMercadoPagoAccessToken();

  if (!mpToken || enrollment.amount_total <= 0) {
    return NextResponse.redirect(
      `${siteUrl}/capacitaciones/checkout?enrollment_id=${enrollment.id}&session_id=chk_${Date.now()}`
    );
  }

  try {
    const nameParts = (user?.full_name || "Participante DAOM").trim().split(/\s+/);
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
            id: enrollment.capacitacion_id,
            title: `DAOM Learning: ${trainingTitle}`.slice(0, 255),
            description: `Modalidad: ${enrollment.modality_id} - DAOM Weightlifting`.slice(0, 255),
            category_id: "learnings",
            quantity: 1,
            unit_price: Number(enrollment.amount_total),
            currency_id: enrollment.currency || "ARS",
          },
        ],
        payer: {
          name: firstName,
          surname: lastName,
          email: user?.email || session.email,
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
      const isSandboxToken = mpToken.startsWith("TEST-");
      const targetUrl =
        (isSandboxToken && prefData.sandbox_init_point)
          ? prefData.sandbox_init_point
          : (prefData.init_point || prefData.sandbox_init_point);

      if (targetUrl) {
        return NextResponse.redirect(targetUrl);
      }
    }
  } catch (err) {
    // Error al llamar a Mercado Pago, fallback a la pantalla interna
  }

  return NextResponse.redirect(
    `${siteUrl}/capacitaciones/checkout?enrollment_id=${enrollment.id}&session_id=chk_${Date.now()}`
  );
}
