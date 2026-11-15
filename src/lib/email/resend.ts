/**
 * DAOM Learning — Adaptador de Email Transaccional (Resend API)
 * Canario: DAOM-LEARNING-EMAIL-RESEND-01
 *
 * Despacho oficial y seguro de correos transaccionales (recuperación de contraseña, notificaciones académicas)
 * utilizando Resend API con dominio institucional verificado @daom-weightlifting.com.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  status?: number;
  error?: string;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
}

export async function sendEmailWithResend(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    const msg = "RESEND_API_KEY no está configurada en las variables de entorno de Render / DAOM Learning.";
    console.warn(`[Resend Email] ${msg}`);
    return {
      ok: false,
      status: 0,
      error: msg,
    };
  }

  // Remitente de DAOM Learning
  // Si EMAIL_FROM está definido y no es un dominio sin verificar que falle, o si se desea usar el fallback oficial:
  // Resend requiere un dominio verificado para usar direcciones como @daom-weightlifting.com.
  // Mientras el dominio institucional esté pendiente de verificación DNS en https://resend.com/domains,
  // se utiliza "DAOM Learning <onboarding@resend.dev>", el cual permite enviar correos directamente
  // a la cuenta titular registrada en Resend (daom.weightlifting@gmail.com).
  let fromEmail = process.env.EMAIL_FROM || "DAOM Learning <onboarding@resend.dev>";
  if (fromEmail.includes("daom-weightlifting.com")) {
    // Si todavía no está verificado en Resend para evitar el error 403 validation_error
    fromEmail = "DAOM Learning <onboarding@resend.dev>";
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (params.idempotencyKey) {
    headers["Idempotency-Key"] = params.idempotencyKey;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to.trim().toLowerCase()],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[Resend Email Error] HTTP ${res.status}: ${errText.slice(0, 200)}`);
      return {
        ok: false,
        status: res.status,
        error: `Error de Resend (${res.status}): ${errText.slice(0, 150)}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    console.log(`[Resend Email Success] ID: ${data?.id} enviado a ${params.to}`);
    return {
      ok: true,
      status: res.status,
      messageId: data?.id,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    const errorMsg = isTimeout
      ? "Timeout de conexión contactando Resend API (>15000ms)"
      : `Excepción contactando Resend: ${err?.message || String(err)}`;
    console.error(`[Resend Email Exception] ${errorMsg}`);
    return {
      ok: false,
      status: isTimeout ? 408 : 500,
      error: errorMsg,
    };
  }
}

/**
 * Consulta el estado remoto del correo en Resend API
 */
export async function queryResendDeliveryStatus(emailId: string): Promise<{
  ok: boolean;
  status?: string;
  data?: any;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY no configurada." };
  }

  try {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(emailId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `Resend error (${res.status}): ${errText.slice(0, 150)}` };
    }

    const data = await res.json();
    return {
      ok: true,
      status: data?.last_event || "sent",
      data,
    };
  } catch (err: any) {
    return { ok: false, error: `Error consultando Resend: ${err?.message || String(err)}` };
  }
}
