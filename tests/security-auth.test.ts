import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/auth/passwords";
import { signSessionToken, verifySessionToken } from "../src/lib/auth/jwt";

describe("Seguridad y Autenticación", () => {
  it("hashea y verifica contraseñas de forma segura con bcrypt", async () => {
    const raw = "SuperSecretPassword2026!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

    const valid = await verifyPassword(raw, hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("WrongPassword", hash);
    expect(invalid).toBe(false);
  });

  it("firma y valida tokens JWT de sesión con expiración y payload tipado", async () => {
    const payload = {
      userId: "USR-TEST-123",
      email: "test@daom-weightlifting.com",
      role: "PARTICIPANT" as const,
      fullName: "Atleta de Prueba",
    };

    const token = await signSessionToken(payload, "1h");
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.role).toBe("PARTICIPANT");
  });

  it("rechaza tokens JWT alterados o manipulados", async () => {
    const payload = {
      userId: "USR-TAMPER",
      email: "tamper@daom-weightlifting.com",
      role: "ADMIN" as const,
      fullName: "Intruso",
    };

    const token = await signSessionToken(payload, "1h");
    const tampered = token.substring(0, token.length - 4) + "XXXX";

    const verified = await verifySessionToken(tampered);
    expect(verified).toBeNull();
  });
});
