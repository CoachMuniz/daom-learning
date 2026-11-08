/**
 * DAOM Learning — Módulo Oficial de Autenticación Federada con Google OAuth 2.0 y OpenID Connect
 * Canario: DAOM-LEARNING-H031-COMPLETE
 *
 * Implementa flujo estándar OAuth 2.0 Authorization Code con validación CSRF por State firmado,
 * prevención de redirecciones abiertas, canje seguro de tokens, obtención de UserInfo v3
 * y generación de tokens criptográficos para vinculación de cuentas institucionales.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const CANONICAL_LEARNING_URL = "https://daom-learning.onrender.com";
export const CANONICAL_SITE_URL = "https://www.daom-weightlifting.com";

const DEFAULT_SECRET = "super_secret_jwt_key_at_least_32_characters_long_daom_2026";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

function getOAuthSigningSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID;
}

function getGoogleClientSecret(): string | undefined {
  return process.env.GOOGLE_CLIENT_SECRET;
}

export function isLocalhost(host: string): boolean {
  const cleaned = host.toLowerCase().split(":")[0];
  return cleaned === "localhost" || cleaned === "127.0.0.1" || cleaned === "0.0.0.0";
}

export function getPublicBaseUrl(request?: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const host = forwardedHost || request.headers.get("host") || "";

    if (host) {
      if (isLocalhost(host)) {
        const proto = forwardedProto || "http";
        return `${proto}://${host}`;
      }
      const proto = forwardedProto || "https";
      return `${proto}://${host}`;
    }
  }

  return CANONICAL_LEARNING_URL;
}

export function resolveSafeRedirectUrl(
  targetPath: string | null | undefined,
  request?: Request,
  baseUrlHint?: string
): string {
  const base = baseUrlHint || getPublicBaseUrl(request);
  const defaultPath = "/participante";

  if (!targetPath || typeof targetPath !== "string") {
    return `${base}${defaultPath}`;
  }

  const trimmed = targetPath.trim();

  // Validar ruta relativa segura: debe empezar con '/', no con '//' (evita protocol-relative redirect)
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return `${base}${trimmed}`;
  }

  // Si es URL absoluta, validar que pertenezca al dominio de DAOM Learning o DAOM Web
  try {
    const parsed = new URL(trimmed);
    const parsedOrigin = parsed.origin.toLowerCase();
    const allowedOrigins = [
      new URL(base).origin.toLowerCase(),
      new URL(CANONICAL_LEARNING_URL).origin.toLowerCase(),
      new URL(CANONICAL_SITE_URL).origin.toLowerCase(),
    ];

    if (allowedOrigins.includes(parsedOrigin)) {
      return parsed.toString();
    }
  } catch {}

  return `${base}${defaultPath}`;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Genera un parámetro `state` firmado con HMAC para prevenir ataques CSRF
 * y preservar la ruta de redirección post-autenticación.
 */
export function generateOAuthState(redirectPath = "/participante", origin?: string): string {
  const nonce = randomBytes(16).toString("hex");
  const timestamp = Date.now().toString();
  const payload = Buffer.from(
    JSON.stringify({ nonce, timestamp, redirectPath, origin: origin || null })
  ).toString("base64url");
  const signature = createHmac("sha256", getOAuthSigningSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Valida la autenticidad, integridad y vigencia del parámetro `state` (máximo 15 minutos).
 */
export function verifyOAuthState(
  state: string,
  maxAgeMs = 15 * 60 * 1000
): { valid: boolean; redirectPath: string; origin?: string } {
  if (!state || typeof state !== "string") {
    return { valid: false, redirectPath: "/participante" };
  }

  const parts = state.split(".");
  if (parts.length !== 2) return { valid: false, redirectPath: "/participante" };

  const [payloadStr, signature] = parts;
  const expectedSig = createHmac("sha256", getOAuthSigningSecret()).update(payloadStr).digest("base64url");

  if (signature.length !== expectedSig.length) return { valid: false, redirectPath: "/participante" };
  const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  if (!isValid) return { valid: false, redirectPath: "/participante" };

  try {
    const data = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf8"));
    const age = Date.now() - Number(data.timestamp);
    if (age < 0 || age > maxAgeMs) {
      return { valid: false, redirectPath: "/participante" };
    }
    return {
      valid: true,
      redirectPath: data.redirectPath || "/participante",
      origin: data.origin || undefined,
    };
  } catch {
    return { valid: false, redirectPath: "/participante" };
  }
}

/**
 * Construye la URL oficial de autorización de Google Accounts con scopes mínimos necesarios.
 */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID no está configurado en las variables de entorno.");
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

/**
 * Canjea el código de autorización por tokens de Google OAuth 2.0
 */
export async function exchangeGoogleCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; idToken?: string }> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("Credenciales de Google OAuth 2.0 no configuradas en el entorno.");
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Error HTTP ${res.status} al canjear código con Google`);
  }

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
  };
}

/**
 * Consulta la información del participante a través del endpoint UserInfo v3 de Google
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status} al consultar perfil con Google UserInfo`);
  }

  const data = await res.json();
  return {
    sub: data.sub,
    email: data.email,
    email_verified: Boolean(data.email_verified),
    name: data.name,
    given_name: data.given_name,
    family_name: data.family_name,
    picture: data.picture,
  };
}

export interface LinkingTokenPayload {
  email: string;
  googleSub: string;
  googleEmail: string;
  fullName: string;
  redirectPath?: string;
}

/**
 * Genera un token firmado para vincular de forma segura una cuenta tradicional existente con Google
 * tras verificar las credenciales tradicionales (vigencia 15 min).
 */
export async function createAccountLinkingToken(payload: LinkingTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("daom-learning-linking")
    .sign(getJwtSecret());
}

/**
 * Valida un token de vinculación de cuenta
 */
export async function verifyAccountLinkingToken(token: string): Promise<LinkingTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: "daom-learning-linking",
    });
    return {
      email: payload.email as string,
      googleSub: payload.googleSub as string,
      googleEmail: payload.googleEmail as string,
      fullName: (payload.fullName as string) || "",
      redirectPath: (payload.redirectPath as string) || "/participante",
    };
  } catch {
    return null;
  }
}
