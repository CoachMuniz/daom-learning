import { NextResponse } from "next/server";
import { z } from "zod";
import { issuePasswordRecoveryToken } from "@/lib/auth/passwords";

export const dynamic = "force-dynamic";

const RequestRecoverySchema = z.object({
  email: z.string().email(),
});

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
        ttlMinutes: 20,
        createdBy: "AUTH_RECOVERY_ENDPOINT",
      });

      // Emisión de enlace seguro de restablecimiento
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "https://learning.daom-weightlifting.com";
      const recoveryLink = `${baseUrl}/recuperar-password?token=${issued.token}&email=${encodeURIComponent(email)}`;

      // En un entorno con Jerkson / Resend configurado, se despacha el correo transaccional aquí.
      // Por seguridad general, respondemos ok: true sin filtrar si el usuario existe o no para evitar enumeración.
      return NextResponse.json({
        ok: true,
        message: "Si la cuenta existe, se ha generado el enlace de recuperación seguro.",
        // En modo dev o cuando se solicita explícitamente sin servidor SMTP, proveemos el enlace para testing
        ...(process.env.NODE_ENV !== "production" ? { debug_recovery_link: recoveryLink } : {}),
      });
    } catch {
      // Para evitar enumeración de usuarios
      return NextResponse.json({
        ok: true,
        message: "Si la cuenta existe, se ha generado el enlace de recuperación seguro.",
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}
