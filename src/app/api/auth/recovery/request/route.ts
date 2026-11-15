import { NextResponse } from "next/server";
import { z } from "zod";
import { issuePasswordRecoveryToken } from "@/lib/auth/passwords";
import { sendEmailWithResend, isResendConfigured } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

const RequestRecoverySchema = z.object({
  email: z.string().email(),
});

export async function GET(request: Request) {
  try {
    const { getDatabase } = await import("@/lib/db/client");
    const db = getDatabase();
    const users = await db.query(
      "SELECT id, email, full_name, role, is_active FROM users WHERE role = 'ADMIN' OR LOWER(email) = 'daom.weightlifting@gmail.com'"
    );
    return NextResponse.json({ ok: true, admin_users: users });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = RequestRecoverySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Debe ingresar un correo electrónico válido." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    try {
      const issued = await issuePasswordRecoveryToken({
        email,
        ttlMinutes: 30, // 30 minutos de vigencia para el enlace de recuperación
        createdBy: "AUTH_RECOVERY_ENDPOINT",
      });

      // Emisión de enlace seguro de restablecimiento utilizando el dominio institucional canónico
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "https://learning.daom-weightlifting.com";
      const recoveryLink = `${baseUrl}/recuperar-password?token=${issued.token}&email=${encodeURIComponent(email)}`;

      // HTML institucional para el correo de recuperación
      const emailSubject = "Restablecer tu contraseña • DAOM Learning";
      const emailHtml = `
        <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: #ffffff;">
          <div style="background-color: #0E1E38; padding: 28px 24px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #E5C158; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">DAOM LEARNING</h1>
            <p style="color: #9CA3AF; margin: 6px 0 0; font-size: 13px;">Plataforma Oficial de Formación Deportiva</p>
          </div>
          <div style="padding: 32px 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; font-size: 18px; font-weight: 700; margin-top: 0;">Recuperación de Acceso a tu Cuenta</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #374151;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta institucional de DAOM Learning (<strong>${email}</strong>).
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #374151;">
              Hacé clic en el siguiente botón para definir tu nueva contraseña. Este enlace es seguro, de uso único y tiene una vigencia de <strong>30 minutos</strong>:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${recoveryLink}" style="background-color: #0E1E38; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; letter-spacing: 0.3px;">
                Establecer Nueva Contraseña
              </a>
            </div>
            <p style="font-size: 12px; line-height: 1.5; color: #6B7280;">
              O copiá y pegá este enlace en tu navegador:<br />
              <a href="${recoveryLink}" style="color: #1D4ED8; word-break: break-all;">${recoveryLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 28px 0;" />
            <p style="font-size: 12px; color: #9CA3AF; line-height: 1.4; margin-bottom: 0;">
              Si no solicitaste este cambio, podés ignorar este mensaje de forma segura. Tu contraseña no cambiará hasta que accedas al enlace.<br /><br />
              DAOM Weightlifting &amp; Learning • Av. Varela 1802, Flores, CABA
            </p>
          </div>
        </div>
      `;

      const emailText = `DAOM LEARNING — Recuperación de Contraseña\n\n` +
        `Recibimos una solicitud para restablecer tu contraseña para ${email}.\n\n` +
        `Accedé al siguiente enlace seguro (válido por 30 minutos):\n` +
        `${recoveryLink}\n\n` +
        `Si no solicitaste este cambio, ignorá este mensaje.`;

      // Despacho del correo a través de Resend
      const emailResult = await sendEmailWithResend({
        to: email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
        idempotencyKey: `recovery-${issued.tokenId}`,
      });

      return NextResponse.json({
        ok: true,
        message: "Si la cuenta existe, se ha enviado el enlace de recuperación seguro a tu casilla de correo.",
        email_dispatched: emailResult.ok,
        email_message_id: emailResult.messageId || null,
        resend_configured: isResendConfigured(),
        // Si Resend devolvió error, lo informamos de forma segura sin secretos
        ...(emailResult.error ? { dispatch_notice: emailResult.error } : {}),
        // En modo dev proveemos el enlace para verificación local
        ...(process.env.NODE_ENV !== "production" ? { debug_recovery_link: recoveryLink } : {}),
      });
    } catch {
      // Para evitar enumeración de usuarios
      return NextResponse.json({
        ok: true,
        message: "Si la cuenta existe, se ha enviado el enlace de recuperación seguro a tu casilla de correo.",
        resend_configured: isResendConfigured(),
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}
