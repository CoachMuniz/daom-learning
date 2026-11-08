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

  if (oauthError) {
    console.warn("[Google OAuth Callback DAOM Learning] Error reportado por Google:", oauthError);
    return NextResponse.redirect(
      resolveSafeRedirectUrl(`/login?error=oauth_${encodeURIComponent(oauthError)}`, request, originHint)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      resolveSafeRedirectUrl("/login?error=missing_oauth_parameters", request, originHint)
    );
  }

  // 1. Validar estado CSRF
  if (!stateCheck.valid) {
    return NextResponse.redirect(
      resolveSafeRedirectUrl("/login?error=invalid_oauth_state", request, originHint)
    );
  }

  try {
    const callbackUrl = `${baseUrl}/api/auth/google/callback`;

    // 2. Canjear código por tokens de Google
    const { accessToken } = await exchangeGoogleCodeForTokens(code, callbackUrl);

    // 3. Obtener información del perfil
    const userInfo = await fetchGoogleUserInfo(accessToken);

    // 4. Regla de seguridad: el correo debe estar estrictamente verificado en Google
    if (!userInfo.email_verified || !userInfo.email) {
      return NextResponse.redirect(
        resolveSafeRedirectUrl("/login?error=unverified_google_email", request, baseUrl)
      );
    }

    const email = userInfo.email.toLowerCase().trim();

    // 5. Verificar si la identidad de Google ya está vinculada
    const existingIdentity = await findIdentityByProvider("google", userInfo.sub);

    if (existingIdentity) {
      const user = await findUserById(existingIdentity.user_id);
      if (user && user.is_active) {
        await touchUserIdentityLogin(existingIdentity.id);
        const sessionToken = await createSession(user);
        await recordAuditLog({
          userId: user.id,
          action: "AUTH_LOGIN_SUCCESS",
          entityType: "user",
          entityId: user.id,
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
    }

    // 6. Verificar si existe un usuario institucional con este correo
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      // Si el usuario existente tiene contraseña configurada, requerir confirmación segura antes de vincular
      if (existingUser.password_hash && existingUser.password_hash.trim().length > 0) {
        const linkToken = await createAccountLinkingToken({
          email: existingUser.email,
          googleSub: userInfo.sub,
          googleEmail: email,
          fullName: userInfo.name || existingUser.full_name,
          redirectPath: stateCheck.redirectPath || "/participante",
        });

        return NextResponse.redirect(
          resolveSafeRedirectUrl(
            `/login?link_pending=true&token=${encodeURIComponent(linkToken)}&email=${encodeURIComponent(existingUser.email)}`,
            request,
            baseUrl
          )
        );
      }

      // Si no tiene contraseña tradicional (ej: cuenta creada previamente sin clave), vincular directamente
      await linkUserIdentity({
        userId: existingUser.id,
        provider: "google",
        providerSubject: userInfo.sub,
        providerEmail: email,
      });

      const sessionToken = await createSession(existingUser);
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

    // 7. Usuario nuevo: Registrar en DAOM Learning con rol PARTICIPANT (nunca ADMIN automático)
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
      resolveSafeRedirectUrl(`/login?error=oauth_processing_failed`, request, baseUrl)
    );
  }
}
