import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAccountLinkingToken } from "@/lib/auth/google";
import { findUserByEmail, linkUserIdentity, recordAuditLog } from "@/lib/db/repository";
import { verifyPassword } from "@/lib/auth/passwords";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const LinkAccountSchema = z.object({
  token: z.string().min(1, "El token de vinculación es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

function isAdminRedirect(redirectPath?: string | null): boolean {
  if (!redirectPath || typeof redirectPath !== "string") return false;
  const trimmed = redirectPath.trim();
  return trimmed === "/admin" || trimmed.startsWith("/admin/") || trimmed.startsWith("/admin?");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = LinkAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          issues: parsed.error.issues,
          canary: "DAOM-LEARNING-H031-COMPLETE",
        },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // 1. Validar el token criptográfico de vinculación
    const payload = await verifyAccountLinkingToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          error: "INVALID_LINK_TOKEN",
          message:
            "El token de vinculación ha expirado o es inválido. Por favor intentá iniciar sesión con Google nuevamente.",
          canary: "DAOM-LEARNING-H031-COMPLETE",
        },
        { status: 400 }
      );
    }

    // 2. Buscar al usuario institucional existente
    const user = await findUserByEmail(payload.email);
    if (!user) {
      return NextResponse.json(
        {
          error: "USER_NOT_FOUND",
          message: "No se encontró el perfil institucional asociado al correo.",
          canary: "DAOM-LEARNING-H031-COMPLETE",
        },
        { status: 404 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        {
          error: "ACCOUNT_INACTIVE",
          message: "Esta cuenta institucional se encuentra deshabilitada.",
          canary: "DAOM-LEARNING-H031-COMPLETE",
        },
        { status: 403 }
      );
    }

    // 3. Verificar que la contraseña ingresada sea la correcta (Prueba segura de titularidad)
    const isPasswordValid =
      Boolean(user.password_hash && user.password_hash.trim().length > 0) &&
      (await verifyPassword(password, user.password_hash));

    if (!isPasswordValid) {
      await recordAuditLog({
        userId: user.id,
        action: "AUTH_LINK_FAILED_BAD_PASSWORD",
        entityType: "user",
        entityId: user.id,
        details: { email: user.email, provider: "google" },
      });

      return NextResponse.json(
        {
          error: "INVALID_PASSWORD",
          message: "Contraseña incorrecta. Verificá tus credenciales para confirmar la vinculación.",
          canary: "DAOM-LEARNING-H031-COMPLETE",
        },
        { status: 401 }
      );
    }

    // 4. Vincular la identidad externa de Google de forma definitiva
    try {
      await linkUserIdentity({
        userId: user.id,
        provider: "google",
        providerSubject: payload.googleSub,
        providerEmail: payload.googleEmail,
      });
    } catch (linkErr: any) {
      return NextResponse.json(
        {
          error: "IDENTITY_CONFLICT",
          message: linkErr.message || "Esta cuenta externa ya está vinculada a otro perfil institucional.",
          canary: "DAOM-LEARNING-H031-COMPLETE",
        },
        { status: 409 }
      );
    }

    // 5. Iniciar sesión institucional y registrar auditoría
    const sessionToken = await createSession(user);

    await recordAuditLog({
      userId: user.id,
      action: "AUTH_LINK_GOOGLE_SUCCESS",
      entityType: "user",
      entityId: user.id,
      details: { email: user.email, role: user.role, sub: payload.googleSub },
    });

    // Si la intención era acceder al panel /admin pero el usuario vinculado es PARTICIPANT, denegar acceso a /admin
    const targetRedirect = payload.redirectPath || "/participante";
    if (isAdminRedirect(targetRedirect) && user.role !== "ADMIN" && user.role !== "STAFF") {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED_ADMIN",
          message: "Tu cuenta está identificada, pero no tiene permisos para acceder a este panel",
          canary: "DAOM-H032-ADMIN-GOOGLE-AUTH-COMPLETE",
        },
        { status: 403 }
      );
    }

    const res = NextResponse.json(
      {
        success: true,
        message: "Cuenta vinculada exitosamente con Google.",
        redirectUrl: targetRedirect,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
        canary: "DAOM-LEARNING-H031-COMPLETE",
        adminCanary: "DAOM-H032-ADMIN-GOOGLE-AUTH-COMPLETE",
      },
      { status: 200 }
    );

    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: err.message,
        canary: "DAOM-LEARNING-H031-COMPLETE",
      },
      { status: 500 }
    );
  }
}
