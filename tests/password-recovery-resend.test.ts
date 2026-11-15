import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST as requestRecoveryPost } from "../src/app/api/auth/recovery/request/route";
import { POST as resetRecoveryPost } from "../src/app/api/auth/recovery/reset/route";
import { issuePasswordRecoveryToken, verifyRecoveryToken, verifyPassword } from "../src/lib/auth/passwords";
import { findUserByEmail, findUserById } from "../src/lib/db/repository";
import * as resendModule from "../src/lib/email/resend";

describe("DAOM Learning — Corrección de Recuperación de Contraseña con Resend (DAOM-LEARNING-RECOVERY-02)", () => {
  const originalEnv = { ...process.env };
  const adminEmail = "daom.weightlifting@gmail.com";

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("1. La cuenta administrativa principal es daom.weightlifting@gmail.com con rol ADMIN", async () => {
    const admin = await findUserByEmail(adminEmail);
    expect(admin).toBeDefined();
    expect(admin?.email).toBe(adminEmail);
    expect(admin?.role).toBe("ADMIN");
  });

  it("2. Endpoint de recuperación genera token y despacha correo a través de Resend API", async () => {
    process.env.RESEND_API_KEY = "re_test_mock_secret_key_12345";
    process.env.EMAIL_FROM = "DAOM Learning <capacitaciones@daom-weightlifting.com>";

    const sendSpy = vi.spyOn(resendModule, "sendEmailWithResend").mockResolvedValue({
      ok: true,
      status: 200,
      messageId: "re_mock_msg_recovery_98765",
    });

    const req = new Request("http://localhost:3000/api/auth/recovery/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail }),
    });

    const res = await requestRecoveryPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.email_dispatched).toBe(true);
    expect(json.email_message_id).toBe("re_mock_msg_recovery_98765");
    expect(json.resend_configured).toBe(true);

    // Verificar que Resend fue invocado con el remitente y destinatario oficiales
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const callArgs = sendSpy.mock.calls[0][0];
    expect(callArgs.to).toBe(adminEmail);
    expect(callArgs.subject).toContain("Restablecer tu contraseña");
    expect(callArgs.html).toContain("learning.daom-weightlifting.com");
    expect(callArgs.html).toContain("Establecer Nueva Contraseña");
  });

  it("3. Si RESEND_API_KEY no está configurada, informa dispatch_notice sin romper la experiencia", async () => {
    delete process.env.RESEND_API_KEY;

    const req = new Request("http://localhost:3000/api/auth/recovery/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail }),
    });

    const res = await requestRecoveryPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.email_dispatched).toBe(false);
    expect(json.resend_configured).toBe(false);
    expect(json.dispatch_notice).toContain("RESEND_API_KEY no está configurada");
  });

  it("4. Ciclo completo de restablecimiento: token expira y se preserva el rol ADMIN de la cuenta", async () => {
    const issued = await issuePasswordRecoveryToken({
      email: adminEmail,
      ttlMinutes: 30,
    });

    expect(issued.token).toBeDefined();

    const newPass = "DaomDirector2026!MasterSecure";
    const resetReq = new Request("http://localhost:3000/api/auth/recovery/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: issued.token,
        newPassword: newPass,
        email: adminEmail,
      }),
    });

    const resetRes = await resetRecoveryPost(resetReq);
    expect(resetRes.status).toBe(200);
    const resetJson = await resetRes.json();
    expect(resetJson.ok).toBe(true);
    expect(resetJson.user.email).toBe(adminEmail);
    expect(resetJson.user.role).toBe("ADMIN"); // Estricta preservación de permisos

    // Validar en base de datos
    const updatedAdmin = await findUserByEmail(adminEmail);
    expect(updatedAdmin?.role).toBe("ADMIN");
    const valid = await verifyPassword(newPass, updatedAdmin!.password_hash);
    expect(valid).toBe(true);

    // Intentar reutilizar token debe fallar
    const reuseCheck = await verifyRecoveryToken(issued.token);
    expect(reuseCheck.valid).toBe(false);
    expect(reuseCheck.error).toContain("ya fue utilizado");
  });
});
