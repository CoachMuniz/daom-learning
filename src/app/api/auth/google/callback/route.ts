import { NextResponse } from "next/server";
import {
  verifyOAuthState,
  exchangeGoogleCodeForTokens,
  fetchGoogleUserInfo,
  getPublicBaseUrl,
  resolveSafeRedirectUrl,
  createAccountLinkingToken,
} from "@/lib/auth/google";
import {
  findIdentityByProvider,
  findUserById,
  findUserByEmail,
  linkUserIdentity,
  touchUserIdentityLogin,
  createUserWithIdentity,
  recordAuditLog,
} from "@/lib/db/repository";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function isAdminRedirect(redirectPath?: string | null): boolean {
  if (!redirectPath || typeof redirectPath !== "string") return false;
  const trimmed = redirectPath.trim();
  return trimmed === "/admin" || trimmed.startsWith("/admin/") || trimmed.startsWith("/admin?");
}

function isAuthorizedAdminRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "STAFF";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const stateCheck = state
    ? verifyOAuthState(state)
    : { valid: false, redirectPath: "/participante", origin: undefined };
  const originHint = stateCheck.valid ? stateCheck.origin : undefined;
  const baseUrl = originHint || getPublicBaseUrl(request);
  const isAdminFlow = isAdminRedirect(stateCheck.redirectPath);
  const errorRedirectParam = isAdminFlow ? "&redirect=%2Fadmin" : "";

  if (oauthError) {
    console.warn("[Google OAuth Callback DAOM Learning] Error reportado por Google:", oauthError);
    return NextResponse.redirect(
      resolveSafeRedirectUrl(
        `/login?error=oauth_${encodeURIComponent(oauthError)}${errorRedirectParam}`,
        request,
        originHint
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      resolveSafeRedirectUrl(
        `/login?error=missing_oauth_parameters${errorRedirectParam}`,
        request,
        originHint
      )
    );
  }

  // 1. Validar estado CSRF
  if (!stateCheck.valid) {
    return NextResponse.redirect(
      resolveSafeRedirectUrl(
        `/login?error=invalid_oauth_state${errorRedirectParam}`,
        request,
        originHint
      )
    );
  }

  try {
    const callbackUrl = `${baseUrl}/api/auth/google/callback`;

    // 2. Canjear código por tokens de Google
    const { accessToken } = await exchangeGoogleCodeForTokens(code, callbackUrl);

    // 3. Obtener información del perfil
    const userInfo = await fetchGoogleUserInfo(accessToken);

    // 4. Regla de seguridad: el correo debe estar estrictamente verificado en Google y sub presente
    if (!userInfo.email_verified || !userInfo.email || !userInfo.sub) {
      return NextResponse.redirect(
        resolveSafeRedirectUrl(
          `/login?error=unverified_google_email${errorRedirectParam}`,
          request,
          baseUrl
        )
      );
    }

    const email = userInfo.email.toLowerCase().trim();

    // 5. Caso A: Verificar si la identidad de Google ya está vinculada
    const existingIdentity = await findIdentityByProvider("google", userInfo.sub);

    if (existingIdentity) {
      const user = await findUserById(existingIdentity.user_id);
      if (!user || !user.is_active) {
        await recordAuditLog({
          userId: user?.id || null,
          action: "AUTH_LOGIN_DENIED_INACTIVE",
          entityType: "user",
          entityId: existingIdentity.user_id,
          details: { method: "google", sub: userInfo.sub, email },
        });
        return NextResponse.redirect(
          resolveSafeRedirectUrl(`/login?error=account_disabled${errorRedirectParam}`, request, baseUrl)
        );
      }

      await touchUserIdentityLogin(existingIdentity.id);
      const sessionToken = await createSession(user);

      // Si intenta acceder a /admin sin tener rol ADMIN o STAFF -> Denegar acceso administrativo (Caso C)
      if (isAdminFlow && !isAuthorizedAdminRole(user.role)) {
        await recordAuditLog({
          userId: user.id,
          action: "AUTH_ADMIN_ACCESS_DENIED",
          entityType: "user",
          entityId: user.id,
          details: { method: "google", role: user.role, sub: userInfo.sub, email },
        });

        const deniedRes = NextResponse.redirect(
          resolveSafeRedirectUrl("/login?redirect=/admin&error=unauthorized_admin", request, baseUrl)
        );
        deniedRes.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: sessionToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        return deniedRes;
      }

      await recordAuditLog({
        userId: user.id,
        action: isAdminFlow ? "AUTH_ADMIN_GOOGLE_LOGIN_SUCCESS" : "AUTH_LOGIN_SUCCESS",
        entityType: "user",
        entityId: user.id,
        details: { method: "google", role: user.role, sub: userInfo.sub, email },
      });

      const targetUrl = resolveSafeRedirectUrl(stateCheck.redirectPath || "/participante", request, baseUrl);
      const res = NextResponse.redirect(targetUrl);
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
    }

    // 6. Caso B: Verificar si existe un usuario institucional con este correo
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      if (!existingUser.is_active) {
        return NextResponse.redirect(
          resolveSafeRedirectUrl(`/login?error=account_disabled${errorRedirectParam}`, request, baseUrl)
        );
      }

      const isExistingAdminOrStaff = isAuthorizedAdminRole(existingUser.role);
      const hasPassword = Boolean(existingUser.password_hash && existingUser.password_hash.trim().length > 0);

      // Regla crítica H032: NUNCA vincular cuentas administrativas/staff ni cuentas con contraseña
      // automáticamente por coincidencia de correo. Exigir prueba segura de titularidad.
      if (isExistingAdminOrStaff || hasPassword) {
        const linkToken = await createAccountLinkingToken({
          email: existingUser.email,
          googleSub: userInfo.sub,
          googleEmail: email,
          fullName: userInfo.name || existingUser.full_name,
          redirectPath: stateCheck.redirectPath || "/participante",
        });

        await recordAuditLog({
          userId: existingUser.id,
          action: "AUTH_GOOGLE_LINK_REQUIRED",
          entityType: "user",
          entityId: existingUser.id,
          details: { role: existingUser.role, email: existingUser.email, sub: userInfo.sub },
        });

        const redirectQuery = stateCheck.redirectPath
          ? `&redirect=${encodeURIComponent(stateCheck.redirectPath)}`
          : "";

        return NextResponse.redirect(
          resolveSafeRedirectUrl(
            `/login?link_pending=true&token=${encodeURIComponent(linkToken)}&email=${encodeURIComponent(existingUser.email)}${redirectQuery}`,
            request,
            baseUrl
          )
        );
      }

      // Si es un PARTICIPANT sin contraseña tradicional (ej: inscripción invitada), vincular como PARTICIPANT
      await linkUserIdentity({
        userId: existingUser.id,
        provider: "google",
        providerSubject: userInfo.sub,
        providerEmail: email,
      });

      const sessionToken = await createSession(existingUser);

      if (isAdminFlow) {
        await recordAuditLog({
          userId: existingUser.id,
          action: "AUTH_ADMIN_ACCESS_DENIED",
          entityType: "user",
          entityId: existingUser.id,
          details: { method: "google", role: existingUser.role, sub: userInfo.sub, email },
        });
        const deniedRes = NextResponse.redirect(
          resolveSafeRedirectUrl("/login?redirect=/admin&error=unauthorized_admin", request, baseUrl)
        );
        deniedRes.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: sessionToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        return deniedRes;
      }

      await recordAuditLog({
        userId: existingUser.id,
        action: "AUTH_LINK_GOOGLE",
        entityType: "user",
        entityId: existingUser.id,
        details: { method: "google", sub: userInfo.sub, email },
      });

      const targetUrl = resolveSafeRedirectUrl(stateCheck.redirectPath || "/participante", request, baseUrl);
      const res = NextResponse.redirect(targetUrl);
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
    }

    // 7. Caso C: Usuario nuevo -> Registrar en DAOM Learning con rol PARTICIPANT (nunca ADMIN automático)
    const fullName =
      userInfo.name ||
      `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim() ||
      "Alumno DAOM";

    const newUser = await createUserWithIdentity({
      email,
      fullName,
      role: "PARTICIPANT",
      provider: "google",
      providerSubject: userInfo.sub,
      providerEmail: email,
    });

    const sessionToken = await createSession(newUser);

    if (isAdminFlow) {
      await recordAuditLog({
        userId: newUser.id,
        action: "AUTH_ADMIN_ACCESS_DENIED",
        entityType: "user",
        entityId: newUser.id,
        details: { method: "google", role: "PARTICIPANT", sub: userInfo.sub, email },
      });

      const deniedRes = NextResponse.redirect(
        resolveSafeRedirectUrl("/login?redirect=/admin&error=unauthorized_admin", request, baseUrl)
      );
      deniedRes.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return deniedRes;
    }

    await recordAuditLog({
      userId: newUser.id,
      action: "AUTH_REGISTER_SUCCESS",
      entityType: "user",
      entityId: newUser.id,
      details: { method: "google", sub: userInfo.sub, email },
    });

    const targetUrl = resolveSafeRedirectUrl(stateCheck.redirectPath || "/participante", request, baseUrl);
    const res = NextResponse.redirect(targetUrl);
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
    console.error("[Google OAuth Callback DAOM Learning] Error procesando autenticación:", err.message);
    return NextResponse.redirect(
      resolveSafeRedirectUrl(`/login?error=oauth_processing_failed${errorRedirectParam}`, request, baseUrl)
    );
  }
}
