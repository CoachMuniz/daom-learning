import { describe, it, expect, beforeEach } from "vitest";
import {
  issuePasswordRecoveryToken,
  verifyRecoveryToken,
  resetPasswordWithRecoveryToken,
  verifyPassword,
} from "../src/lib/auth/passwords";
import { createUser, findUserByEmail, findUserById } from "../src/lib/db/repository";
import { INSTITUTIONAL_LEARNING_URL, CANONICAL_LEARNING_URL, resolveSafeRedirectUrl } from "../src/lib/auth/google";
import { POST as requestRecoveryPost } from "../src/app/api/auth/recovery/request/route";
import { POST as resetRecoveryPost } from "../src/app/api/auth/recovery/reset/route";

describe("DAOM Learning — Campus de Alumnos, Autenticación y Recuperación (DAOM-LEARNING-CAMPUS-01)", () => {
  const testEmail = `campus_test_${Date.now()}@daom-weightlifting.com`;
  let createdUserId = "";

  beforeEach(async () => {
    const existing = await findUserByEmail(testEmail);
    if (!existing) {
      const user = await createUser({
        email: testEmail,
        passwordHash: "$2a$10$dummyHash12345678901234567890",
        fullName: "Alumno Campus Test",
        role: "PARTICIPANT",
        country: "AR",
        phone: "+5491100001111",
      });
      createdUserId = user.id;
    } else {
      createdUserId = existing.id;
    }
  });

  describe("1. Dominio Institucional Canónico", () => {
    it("utiliza learning.daom-weightlifting.com como dominio canónico", () => {
      expect(INSTITUTIONAL_LEARNING_URL).toBe("https://learning.daom-weightlifting.com");
      expect(CANONICAL_LEARNING_URL).toBe("https://learning.daom-weightlifting.com");
    });

    it("resuelve rutas seguras hacia el dominio institucional o rutas relativas autorizadas", () => {
      const campusRedirect = resolveSafeRedirectUrl("/campus");
      expect(campusRedirect).toContain("/campus");

      const institutionalRedirect = resolveSafeRedirectUrl("https://learning.daom-weightlifting.com/campus");
      expect(institutionalRedirect).toBe("https://learning.daom-weightlifting.com/campus");
    });
  });

  describe("2. Emisión y Verificación de Tokens de Recuperación", () => {
    it("emite un token temporal de recuperación criptográfico válido", async () => {
      const issued = await issuePasswordRecoveryToken({
        userId: createdUserId,
        ttlMinutes: 20,
        createdBy: "TEST_SUITE",
      });

      expect(issued.token).toBeDefined();
      expect(issued.token.startsWith("DAOM-REC-")).toBe(true);
      expect(issued.userId).toBe(createdUserId);
      expect(issued.email).toBe(testEmail);

      const check = await verifyRecoveryToken(issued.token);
      expect(check.valid).toBe(true);
      expect(check.user?.id).toBe(createdUserId);
    });

    it("rechaza tokens manipulados o inexistentes", async () => {
      const check = await verifyRecoveryToken("DAOM-REC-INVENTADO_O_FALSO");
      expect(check.valid).toBe(false);
      expect(check.error).toContain("inválido");
    });
  });

  describe("3. Restablecimiento Seguro de Contraseña", () => {
    it("consume el token y actualiza la contraseña de forma atómica e irreversible", async () => {
      const issued = await issuePasswordRecoveryToken({
        email: testEmail,
        ttlMinutes: 15,
      });

      const newPlainPassword = "NuevaClaveSuperSegura2026!";
      const resetResult = await resetPasswordWithRecoveryToken({
        recoveryToken: issued.token,
        newPassword: newPlainPassword,
        email: testEmail,
      });

      expect(resetResult.ok).toBe(true);

      // Verificar que el hash se actualizó en la DB y el login con nueva clave funciona
      const refreshedUser = await findUserById(createdUserId);
      expect(refreshedUser).toBeDefined();
      const match = await verifyPassword(newPlainPassword, refreshedUser!.password_hash);
      expect(match).toBe(true);

      // Intentar reutilizar el token debe ser rechazado
      const reuseCheck = await verifyRecoveryToken(issued.token);
      expect(reuseCheck.valid).toBe(false);
      expect(reuseCheck.error).toContain("ya fue utilizado");
    });

    it("rechaza cambio de contraseña si es menor a 8 caracteres", async () => {
      const issued = await issuePasswordRecoveryToken({
        email: testEmail,
      });

      const resetResult = await resetPasswordWithRecoveryToken({
        recoveryToken: issued.token,
        newPassword: "corta",
        email: testEmail,
      });

      expect(resetResult.ok).toBe(false);
      if (!resetResult.ok) {
        expect(resetResult.status).toBe(400);
        expect(resetResult.error).toContain("8 caracteres");
      }
    });
  });

  describe("4. Endpoints API de Recuperación", () => {
    it("POST /api/auth/recovery/request responde con éxito para cualquier correo válido", async () => {
      const req = new Request("http://localhost:3000/api/auth/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });

      const res = await requestRecoveryPost(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("POST /api/auth/recovery/reset valida entradas con Zod", async () => {
      const req = new Request("http://localhost:3000/api/auth/recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "", newPassword: "123" }),
      });

      const res = await resetRecoveryPost(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toBe("VALIDATION_ERROR");
    });
  });
});
