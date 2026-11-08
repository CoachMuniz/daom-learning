import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as googleInitRoute } from "../src/app/api/auth/google/route";
import { GET as googleCallbackRoute } from "../src/app/api/auth/google/callback/route";
import { POST as linkAccountRoute } from "../src/app/api/auth/link-account/route";
import { generateOAuthState, createAccountLinkingToken } from "../src/lib/auth/google";
import { createUser, findIdentityByProvider, findUserByEmail } from "../src/lib/db/repository";
import { hashPassword } from "../src/lib/auth/passwords";

describe("H031 — Rutas API de Autenticación, Google Callback y Vinculación", () => {
  const originalEnv = { ...process.env };
  const nonce = Date.now();

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("1. GET /api/auth/google (Iniciación del Flujo)", () => {
    it("devuelve 503 con instrucciones cuando las credenciales no están configuradas", async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const req = new Request("http://localhost:3000/api/auth/google?redirect=/participante", {
        headers: { Accept: "application/json" },
      });

      const res = await googleInitRoute(req);
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.status).toBe("PENDING_CONFIGURATION");
      expect(json.canary).toBe("DAOM-LEARNING-H031-COMPLETE");
    });

    it("devuelve 200 y authUrl con state firmado cuando está configurado", async () => {
      process.env.GOOGLE_CLIENT_ID = "daom-test.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "secret-test";

      const req = new Request("http://localhost:3000/api/auth/google?redirect=/participante/cursos", {
        headers: { Accept: "application/json" },
      });

      const res = await googleInitRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.authUrl).toContain("accounts.google.com");
      expect(json.authUrl).toContain("daom-test.apps.googleusercontent.com");
      expect(json.authUrl).toContain("state=");
    });
  });

  describe("2. GET /api/auth/google/callback (Validación y Seguridad)", () => {
    it("redirige con error si el usuario cancela en Google (error=access_denied)", async () => {
      const req = new Request("http://localhost:3000/api/auth/google/callback?error=access_denied");
      const res = await googleCallbackRoute(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      expect(location).toContain("/login?error=oauth_access_denied");
    });

    it("redirige con error si faltan code o state", async () => {
      const req = new Request("http://localhost:3000/api/auth/google/callback");
      const res = await googleCallbackRoute(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      expect(location).toContain("missing_oauth_parameters");
    });

    it("redirige con error si el state fue manipulado (Anti-CSRF)", async () => {
      const validState = generateOAuthState("/participante");
      const tampered = validState.slice(0, -5) + "XXXXX";

      const req = new Request(
        `http://localhost:3000/api/auth/google/callback?code=fake_code&state=${tampered}`
      );
      const res = await googleCallbackRoute(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      expect(location).toContain("invalid_oauth_state");
    });

    it("rechaza usuarios de Google con correo no verificado (email_verified=false)", async () => {
      process.env.GOOGLE_CLIENT_ID = "daom-test.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "secret-test";

      // Mockear intercambio de código y userinfo de Google
      const googleModule = await import("../src/lib/auth/google");
      vi.spyOn(googleModule, "exchangeGoogleCodeForTokens").mockResolvedValue({
        accessToken: "fake_access_token",
      });
      vi.spyOn(googleModule, "fetchGoogleUserInfo").mockResolvedValue({
        sub: "sub_unverified_123",
        email: "unverified@gmail.com",
        email_verified: false, // NO VERIFICADO
      });

      const validState = generateOAuthState("/participante");
      const req = new Request(
        `http://localhost:3000/api/auth/google/callback?code=mock_code&state=${validState}`
      );

      const res = await googleCallbackRoute(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      expect(location).toContain("unverified_google_email");
    });

    it("requiere vinculación segura por contraseña si el correo coincide con una cuenta existente que tiene clave", async () => {
      process.env.GOOGLE_CLIENT_ID = "daom-test.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "secret-test";

      const existingEmail = `existing_pwd_${nonce}@daom-test.com`;
      const passHash = await hashPassword("PasswordOriginal2026!");
      await createUser({
        email: existingEmail,
        passwordHash: passHash,
        fullName: "Alumno Existente con Clave",
        role: "PARTICIPANT",
      });

      const googleModule = await import("../src/lib/auth/google");
      vi.spyOn(googleModule, "exchangeGoogleCodeForTokens").mockResolvedValue({
        accessToken: "fake_token",
      });
      vi.spyOn(googleModule, "fetchGoogleUserInfo").mockResolvedValue({
        sub: `gsub_pwd_test_${nonce}`,
        email: existingEmail,
        email_verified: true,
        name: "Alumno Existente con Clave",
      });

      const validState = generateOAuthState("/participante");
      const req = new Request(
        `http://localhost:3000/api/auth/google/callback?code=mock_code&state=${validState}`
      );

      const res = await googleCallbackRoute(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";

      // Debe redirigir a login con link_pending=true y el token criptográfico
      expect(location).toContain("link_pending=true");
      expect(location).toContain("token=");
      expect(location).toContain(encodeURIComponent(existingEmail));
    });

    it("crea un nuevo alumno y establece sesión si no existía cuenta previa", async () => {
      process.env.GOOGLE_CLIENT_ID = "daom-test.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "secret-test";

      const newGoogleEmail = `brand_new_${nonce}@daom-federated.com`;
      const googleSub = `gsub_brand_new_${nonce}`;

      const googleModule = await import("../src/lib/auth/google");
      vi.spyOn(googleModule, "exchangeGoogleCodeForTokens").mockResolvedValue({
        accessToken: "fake_token",
      });
      vi.spyOn(googleModule, "fetchGoogleUserInfo").mockResolvedValue({
        sub: googleSub,
        email: newGoogleEmail,
        email_verified: true,
        name: "Nuevo Atleta Google",
      });

      const validState = generateOAuthState("/participante/dashboard");
      const req = new Request(
        `http://localhost:3000/api/auth/google/callback?code=mock_code&state=${validState}`
      );

      const res = await googleCallbackRoute(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      expect(location).toContain("/participante/dashboard");

      // Verificar que el usuario fue creado en la base de datos
      const user = await findUserByEmail(newGoogleEmail);
      expect(user).not.toBeNull();
      expect(user?.role).toBe("PARTICIPANT");

      // Verificar que la identidad fue vinculada
      const identity = await findIdentityByProvider("google", googleSub);
      expect(identity).not.toBeNull();
      expect(identity?.user_id).toBe(user?.id);
    });
  });

  describe("3. POST /api/auth/link-account (Confirmación de Vinculación con Contraseña)", () => {
    it("rechaza token de vinculación inválido o expirado", async () => {
      const req = new Request("http://localhost:3000/api/auth/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid_token_xyz", password: "Password123!" }),
      });

      const res = await linkAccountRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("INVALID_LINK_TOKEN");
    });

    it("rechaza contraseña incorrecta al intentar vincular", async () => {
      const email = `link_fail_pwd_${nonce}@daom-test.com`;
      const correctPass = "CorrectPassword2026!";
      await createUser({
        email,
        passwordHash: await hashPassword(correctPass),
        fullName: "Link Test User",
        role: "PARTICIPANT",
      });

      const token = await createAccountLinkingToken({
        email,
        googleSub: `gsub_fail_${nonce}`,
        googleEmail: email,
        fullName: "Link Test User",
      });

      const req = new Request("http://localhost:3000/api/auth/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: "WrongPasswordEntered" }),
      });

      const res = await linkAccountRoute(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe("INVALID_PASSWORD");
    });

    it("vincula la identidad de Google exitosamente cuando la contraseña es correcta", async () => {
      const email = `link_success_${nonce}@daom-test.com`;
      const correctPass = "CorrectPassword2026!";
      const user = await createUser({
        email,
        passwordHash: await hashPassword(correctPass),
        fullName: "Link Success User",
        role: "PARTICIPANT",
      });

      const googleSub = `gsub_success_${nonce}`;
      const token = await createAccountLinkingToken({
        email,
        googleSub,
        googleEmail: email,
        fullName: "Link Success User",
        redirectPath: "/participante/certificados",
      });

      const req = new Request("http://localhost:3000/api/auth/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: correctPass }),
      });

      const res = await linkAccountRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.redirectUrl).toBe("/participante/certificados");

      // Verificar que la identidad externa quedó vinculada
      const identity = await findIdentityByProvider("google", googleSub);
      expect(identity).not.toBeNull();
      expect(identity?.user_id).toBe(user.id);
    });
  });
});
