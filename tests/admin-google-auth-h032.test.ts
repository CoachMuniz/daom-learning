import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as googleCallbackRoute } from "../src/app/api/auth/google/callback/route";
import { POST as linkAccountRoute } from "../src/app/api/auth/link-account/route";
import { POST as syncSheetsRoute } from "../src/app/api/sync/sheets/route";
import { generateOAuthState, createAccountLinkingToken } from "../src/lib/auth/google";
import {
  createUser,
  findIdentityByProvider,
  findUserByEmail,
  linkUserIdentity,
} from "../src/lib/db/repository";
import { hashPassword } from "../src/lib/auth/passwords";
import { SESSION_COOKIE_NAME } from "../src/lib/auth/session";

describe("H032 — Google Login para Administradores en DAOM Learning", () => {
  const originalEnv = { ...process.env };
  const nonce = Date.now();

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: "daom-learning-admin-test.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "secret-daom-learning-test",
    };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("1. Caso A: Administrador vinculado con Google ingresa a /admin y conserva rol ADMIN", async () => {
    const adminEmail = `learning_admin_${nonce}@daom-weightlifting.com`;
    const admin = await createUser({
      email: adminEmail,
      passwordHash: await hashPassword("AdminLearning2026!"),
      fullName: "Admin Learning",
      role: "ADMIN",
    });

    const googleSub = `gsub_learning_admin_${nonce}`;
    await linkUserIdentity({
      userId: admin.id,
      provider: "google",
      providerSubject: googleSub,
      providerEmail: adminEmail,
    });

    const googleModule = await import("../src/lib/auth/google");
    vi.spyOn(googleModule, "exchangeGoogleCodeForTokens").mockResolvedValue({
      accessToken: "fake_admin_token",
    });
    vi.spyOn(googleModule, "fetchGoogleUserInfo").mockResolvedValue({
      sub: googleSub,
      email: adminEmail,
      email_verified: true,
      name: "Admin Learning",
    });

    const state = generateOAuthState("/admin");
    const req = new Request(
      `http://localhost:3000/api/auth/google/callback?code=admin_code&state=${state}`
    );

    const res = await googleCallbackRoute(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin");
    expect(res.cookies.get(SESSION_COOKIE_NAME)?.value).toBeTruthy();
  });

  it("2. Caso B: Administrador o STAFF existente NO vinculado exige verificación de contraseña (jamás vincula automáticamente por correo, incluso sin clave previa)", async () => {
    const staffEmail = `learning_staff_${nonce}@daom-weightlifting.com`;
    const staffPassword = "StaffPassword2026!";
    const staff = await createUser({
      email: staffEmail,
      passwordHash: await hashPassword(staffPassword),
      fullName: "Staff Learning",
      role: "STAFF",
    });

    const googleSub = `gsub_learning_staff_${nonce}`;
    const googleModule = await import("../src/lib/auth/google");
    vi.spyOn(googleModule, "exchangeGoogleCodeForTokens").mockResolvedValue({
      accessToken: "fake_staff_token",
    });
    vi.spyOn(googleModule, "fetchGoogleUserInfo").mockResolvedValue({
      sub: googleSub,
      email: staffEmail,
      email_verified: true,
      name: "Staff Learning",
    });

    const state = generateOAuthState("/admin");
    const req = new Request(
      `http://localhost:3000/api/auth/google/callback?code=staff_code&state=${state}`
    );

    const res = await googleCallbackRoute(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";

    // No debe auto-vincular
    expect(await findIdentityByProvider("google", googleSub)).toBeNull();
    expect(location).toContain("/login?link_pending=true");
    expect(location).toContain("redirect=%2Fadmin");

    const urlObj = new URL(location);
    const linkToken = urlObj.searchParams.get("token")!;

    // Verificar vinculación con contraseña correcta
    const linkReq = new Request("http://localhost:3000/api/auth/link-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: linkToken, password: staffPassword }),
    });
    const linkRes = await linkAccountRoute(linkReq);
    expect(linkRes.status).toBe(200);
    const linkJson = await linkRes.json();
    expect(linkJson.success).toBe(true);
    expect(linkJson.user.role).toBe("STAFF");
    expect(linkJson.redirectUrl).toBe("/admin");

    const linked = await findIdentityByProvider("google", googleSub);
    expect(linked?.user_id).toBe(staff.id);
  });

  it("3. Caso C: Usuario PARTICIPANT (existente o nuevo) que intenta ingresar a /admin con Google recibe error=unauthorized_admin y nunca obtiene rol ADMIN", async () => {
    const studentEmail = `student_try_admin_${nonce}@gmail.com`;
    const studentSub = `gsub_student_try_admin_${nonce}`;

    const googleModule = await import("../src/lib/auth/google");
    vi.spyOn(googleModule, "exchangeGoogleCodeForTokens").mockResolvedValue({
      accessToken: "fake_student_token",
    });
    vi.spyOn(googleModule, "fetchGoogleUserInfo").mockResolvedValue({
      sub: studentSub,
      email: studentEmail,
      email_verified: true,
      name: "Alumno Intento Admin",
    });

    const state = generateOAuthState("/admin");
    const req = new Request(
      `http://localhost:3000/api/auth/google/callback?code=student_code&state=${state}`
    );

    const res = await googleCallbackRoute(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/login?redirect=/admin&error=unauthorized_admin");

    const createdUser = await findUserByEmail(studentEmail);
    expect(createdUser?.role).toBe("PARTICIPANT");
  });

  it("4. Protección de permisos granulares: STAFF y PARTICIPANT no pueden ejecutar mutaciones exclusivas de ADMIN (/api/sync/sheets)", async () => {
    const req = new Request("http://localhost:3000/api/sync/sheets", {
      method: "POST",
    });
    const res = await syncSheetsRoute(req);
    expect(res.status).toBe(401);
  });

  it("5. Usuario PARTICIPANT que vincula cuenta con redirect=/admin recibe 403 UNAUTHORIZED_ADMIN", async () => {
    const email = `part_link_admin_${nonce}@daom.com`;
    const password = "ParticipantPass2026!";
    await createUser({
      email,
      passwordHash: await hashPassword(password),
      fullName: "Alumno Vinculando en Admin",
      role: "PARTICIPANT",
    });

    const linkToken = await createAccountLinkingToken({
      email,
      googleSub: `gsub_part_admin_${nonce}`,
      googleEmail: email,
      fullName: "Alumno Vinculando en Admin",
      redirectPath: "/admin",
    });

    const linkReq = new Request("http://localhost:3000/api/auth/link-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: linkToken, password }),
    });
    const linkRes = await linkAccountRoute(linkReq);
    expect(linkRes.status).toBe(403);
    const linkJson = await linkRes.json();
    expect(linkJson.error).toBe("UNAUTHORIZED_ADMIN");
    expect(linkJson.message).toBe(
      "Tu cuenta está identificada, pero no tiene permisos para acceder a este panel"
    );
  });
});
