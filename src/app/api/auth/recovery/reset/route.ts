import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithRecoveryToken } from "@/lib/auth/passwords";

export const dynamic = "force-dynamic";

const ResetPasswordSchema = z.object({
  token: z.string().min(1, "El token de recuperación es obligatorio"),
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = ResetPasswordSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Datos incompletos",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { token, newPassword, email } = parsed.data;

    const result = await resetPasswordWithRecoveryToken({
      recoveryToken: token,
      newPassword,
      email,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "RECOVERY_FAILED", message: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Contraseña actualizada exitosamente. Ya podés iniciar sesión.",
      user: result.user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Error al restablecer contraseña" },
      { status: 500 }
    );
  }
}
