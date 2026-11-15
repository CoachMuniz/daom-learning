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

  // Remitente oficial de DAOM Learning
  // Si DOMAIN o EMAIL_FROM están definidos se respetan, por defecto capacitaciones@daom-weightlifting.com
  const fromEmail = process.env.EMAIL_FROM || "DAOM Learning <capacitaciones@daom-weightlifting.com>";

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
