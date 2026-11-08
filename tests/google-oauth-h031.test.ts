import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isGoogleOAuthConfigured,
  generateOAuthState,
  verifyOAuthState,
  buildGoogleAuthUrl,
  resolveSafeRedirectUrl,
  createAccountLinkingToken,
  verifyAccountLinkingToken,
  CANONICAL_LEARNING_URL,
  CANONICAL_SITE_URL,
} from "../src/lib/auth/google";

describe("H031 — Google OAuth 2.0 y OpenID Connect (DAOM Learning)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Detección y Configuración de Credenciales", () => {
    it("detecta ausencia de credenciales en el entorno de forma segura", () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      expect(isGoogleOAuthConfigured()).toBe(false);
    });

    it("detecta credenciales completas en el entorno", () => {
      process.env.GOOGLE_CLIENT_ID = "daom-client-id-test.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "GOCSPX-secret-test-2026";
      expect(isGoogleOAuthConfigured()).toBe(true);
    });

    it("lanza error descriptivo al construir auth URL sin GOOGLE_CLIENT_ID", () => {
      delete process.env.GOOGLE_CLIENT_ID;
      expect(() => buildGoogleAuthUrl("https://example.com/callback", "dummy_state")).toThrow(
        "GOOGLE_CLIENT_ID no está configurado"
      );
    });
  });

  describe("2. Parámetro State Criptográfico y Protección CSRF", () => {
    it("genera state firmado con HMAC verificable", () => {
      const state = generateOAuthState("/participante/mis-capacitaciones");
      expect(state).toBeDefined();
      expect(state.includes(".")).toBe(true);

      const check = verifyOAuthState(state);
      expect(check.valid).toBe(true);
      expect(check.redirectPath).toBe("/participante/mis-capacitaciones");
    });

    it("rechaza state manipulado o falsificado", () => {
      const state = generateOAuthState("/admin");
      const [payload, sig] = state.split(".");
      const alteredSig = sig.slice(0, -4) + "XXXX";
      const tampered = `${payload}.${alteredSig}`;

      const check = verifyOAuthState(tampered);
      expect(check.valid).toBe(false);
      expect(check.redirectPath).toBe("/participante");
    });

    it("rechaza state expirado (máximo 15 minutos)", () => {
      const state = generateOAuthState("/participante");
      // Simular expiración pasando maxAgeMs = -1
      const check = verifyOAuthState(state, -1);
      expect(check.valid).toBe(false);
    });
  });

  describe("3. Construcción de URL de Autorización Google", () => {
    it("construye URL oficial con todos los parámetros OpenID Connect requeridos", () => {
      process.env.GOOGLE_CLIENT_ID = "123456789-test.apps.googleusercontent.com";
      const redirectUri = "https://daom-learning.onrender.com/api/auth/google/callback";
      const state = "signed_state_token_123";

      const urlStr = buildGoogleAuthUrl(redirectUri, state);
      const url = new URL(urlStr);

      expect(url.origin).toBe("https://accounts.google.com");
      expect(url.pathname).toBe("/o/oauth2/v2/auth");
      expect(url.searchParams.get("client_id")).toBe("123456789-test.apps.googleusercontent.com");
      expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("scope")).toBe("openid email profile");
      expect(url.searchParams.get("state")).toBe(state);
      expect(url.searchParams.get("prompt")).toBe("select_account");
    });
  });

  describe("4. Prevención de Redirecciones Abiertas (Open Redirect Protection)", () => {
    it("permite rutas relativas seguras", () => {
      const safe = resolveSafeRedirectUrl("/participante/cursos");
      expect(safe).toContain("/participante/cursos");
    });

    it("rechaza URLs relativas al protocolo (//evil.com)", () => {
      const dangerous = resolveSafeRedirectUrl("//evil.com");
      expect(dangerous).not.toContain("//evil.com");
      expect(dangerous).toContain("/participante");
    });

    it("rechaza URLs absolutas externas maliciosas", () => {
      const hackerUrl = resolveSafeRedirectUrl("https://hacker.com/steal-session");
      expect(hackerUrl).not.toContain("hacker.com");
      expect(hackerUrl).toContain("/participante");
    });

    it("permite redirecciones a dominios oficiales autorizados de DAOM", () => {
      const officialSite = resolveSafeRedirectUrl(`${CANONICAL_SITE_URL}/mi-daom`);
      expect(officialSite).toBe(`${CANONICAL_SITE_URL}/mi-daom`);

      const officialLearning = resolveSafeRedirectUrl(`${CANONICAL_LEARNING_URL}/participante`);
      expect(officialLearning).toBe(`${CANONICAL_LEARNING_URL}/participante`);
    });
  });

  describe("5. Token Criptográfico de Vinculación de Cuentas", () => {
    it("genera y valida un token de vinculación válido", async () => {
      const payload = {
        email: "alumno@daom-test.com",
        googleSub: "google-sub-987654321",
        googleEmail: "alumno@daom-test.com",
        fullName: "Alumno DAOM Test",
        redirectPath: "/participante",
      };

      const token = await createAccountLinkingToken(payload);
      expect(typeof token).toBe("string");

      const verified = await verifyAccountLinkingToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.email).toBe(payload.email);
      expect(verified?.googleSub).toBe(payload.googleSub);
      expect(verified?.googleEmail).toBe(payload.googleEmail);
      expect(verified?.fullName).toBe(payload.fullName);
    });

    it("rechaza un token de vinculación manipulado", async () => {
      const payload = {
        email: "victim@daom-test.com",
        googleSub: "sub-123",
        googleEmail: "victim@daom-test.com",
        fullName: "Víctima",
      };

      const token = await createAccountLinkingToken(payload);
      const tampered = token.slice(0, -6) + "XXXXXX";

      const verified = await verifyAccountLinkingToken(tampered);
      expect(verified).toBeNull();
    });
  });
});
