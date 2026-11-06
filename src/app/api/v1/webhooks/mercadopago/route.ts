import { NextResponse } from "next/server";
import { verifyMercadoPagoSignature } from "@/lib/security/webhooks";
import { verifyAndProcessEnrollmentPayment } from "@/lib/payments/mercadopago";

export const dynamic = "force-dynamic";

/**
 * Webhook oficial de Mercado Pago en DAOM Learning.
 * Canario: DAOM-LEARNING-MP-WEBHOOK-RECOVERY-FINAL-01
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const rawBody = await request.text();
    let json: any = {};
    try {
      json = JSON.parse(rawBody);
    } catch {}

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    // 1. Filtrado de tópicos: ignorar órdenes comerciales gracefully
    const rawTopic =
      json.type ||
      json.action ||
      url.searchParams.get("topic") ||
      url.searchParams.get("type") ||
      "";
    const topic = String(rawTopic).trim().toLowerCase();

    if (topic.includes("merchant_order") || topic.includes("order")) {
      return NextResponse.json(
        {
          received: true,
          ignored: true,
          topic: "merchant_order",
          message: "Orden comercial ignorada para evitar consultas erróneas a /v1/payments.",
        },
        { status: 200 }
      );
    }

    // 2. Extraer ID del recurso de pago
    const paymentId =
      json.data?.id ||
      json.id ||
      url.searchParams.get("data.id") ||
      url.searchParams.get("id");

    const cleanPaymentId = String(paymentId || "").trim().replace(/^MP-/, "");

    if (!cleanPaymentId || !/^\d+$/.test(cleanPaymentId)) {
      return NextResponse.json(
        { received: true, ignored: true, reason: "No payment id provided or non-numeric" },
        { status: 200 }
      );
    }

    // 3. Validación de firma HMAC si el secreto está configurado
    if (secret) {
      const xSignature = request.headers.get("x-signature");
      const xRequestId = request.headers.get("x-request-id");
      const dataId = cleanPaymentId;

      const sigCheck = verifyMercadoPagoSignature(xSignature, dataId, xRequestId, secret);
      if (!sigCheck.valid) {
        console.warn(`[Webhook Mercado Pago - Learning] Firma rechazada: ${sigCheck.reason}`);
        return NextResponse.json(
          { success: false, error: "UNAUTHORIZED_SIGNATURE", reason: sigCheck.reason },
          { status: 401 }
        );
      }
    }

    // 4. Procesar mediante consulta oficial Server-to-Server a Mercado Pago API
    const result = await verifyAndProcessEnrollmentPayment({
      paymentId: cleanPaymentId,
      source: "webhook",
    });

    return NextResponse.json(
      {
        success: result.success,
        processed: true,
        status: result.status,
        message: result.message,
        enrollment_id: result.enrollment_id,
        canary: "DAOM-MERCADOPAGO-MCP-01",
        canary_recovery: "DAOM-LEARNING-MP-WEBHOOK-RECOVERY-FINAL-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Webhook Mercado Pago - Learning] Error al procesar:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
