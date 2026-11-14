import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getDatabase } from "@/lib/db/client";

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export function hashRecoveryToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

export interface IssuedRecoveryToken {
  tokenId: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  ttlMinutes: number;
}

/**
 * Emite un token temporal de recuperación de contraseña de un solo uso.
 * Soporta administradores y alumnos, preserva identidades y registra auditoría.
 */
export async function issuePasswordRecoveryToken(params: {
  userId?: string;
  email?: string;
  ttlMinutes?: number;
  createdBy?: string;
}): Promise<IssuedRecoveryToken> {
  const db = getDatabase();
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : null;
  const targetUserId = params.userId ? params.userId.trim() : null;

  let user: any = null;
  if (targetUserId) {
    user = await db.get<any>(
      `SELECT id, email, full_name, role, is_active FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
      [targetUserId]
    );
  } else if (cleanEmail) {
    user = await db.get<any>(
      `SELECT id, email, full_name, role, is_active FROM users WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1`,
      [cleanEmail]
    );
  }

  if (!user) {
    throw new Error(
      targetUserId
        ? `El usuario '${targetUserId}' no existe o no se encuentra activo.`
        : `El usuario con correo '${cleanEmail}' no existe o no se encuentra activo.`
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const ttlMinutes = Math.max(1, Math.min(60, Number(params.ttlMinutes ?? 15)));
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

  // Revocar tokens no utilizados previos del usuario
  await db.run(
    `UPDATE password_recovery_tokens SET revoked_at = ? WHERE user_id = ? AND used_at IS NULL AND revoked_at IS NULL`,
    [nowIso, user.id]
  );

  const tokenId = `REC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const rawToken = `DAOM-REC-${crypto.randomBytes(24).toString("base64url")}`;
  const tokenHash = hashRecoveryToken(rawToken);
  const createdBy = params.createdBy || (user.role === "ADMIN" ? "LOCAL_ADMIN_CLI" : "AUTH_RECOVERY_API");

  await db.run(
    `INSERT INTO password_recovery_tokens
      (token_id, user_id, token_hash, expires_at, used_at, revoked_at, created_by, created_at)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`,
    [tokenId, user.id, tokenHash, expiresAt, createdBy, nowIso]
  );

  return {
    tokenId,
    userId: user.id,
    email: user.email,
    token: rawToken,
    expiresAt,
    ttlMinutes,
  };
}

/**
 * Valida un token temporal de recuperación sin consumirlo.
 */
export async function verifyRecoveryToken(rawToken: string): Promise<{
  valid: boolean;
  error?: string;
  tokenRow?: any;
  user?: any;
}> {
  const clean = String(rawToken || "").trim();
  if (!clean) {
    return { valid: false, error: "Token no proporcionado" };
  }

  const db = getDatabase();
  const tokenHash = hashRecoveryToken(clean);
  const tokenRow = await db.get<any>(
    `SELECT * FROM password_recovery_tokens WHERE token_hash = ? LIMIT 1`,
    [tokenHash]
  );

  if (!tokenRow) {
    return { valid: false, error: "El token de recuperación es inválido." };
  }

  if (tokenRow.used_at || tokenRow.revoked_at) {
    return { valid: false, error: "El token de recuperación ya fue utilizado o fue revocado." };
  }

  const expiresAtMs = new Date(tokenRow.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return { valid: false, error: "El token de recuperación ha expirado. Solicitá uno nuevo." };
  }

  const user = await db.get<any>(
    `SELECT id, email, full_name, role, is_active FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
    [tokenRow.user_id]
  );

  if (!user) {
    return { valid: false, error: "La cuenta asociada al token no se encuentra disponible." };
  }

  return { valid: true, tokenRow, user };
}

/**
 * Consume un token de recuperación y actualiza la contraseña del usuario de forma atómica.
 */
export async function resetPasswordWithRecoveryToken(params: {
  recoveryToken: string;
  newPassword: string;
  email?: string;
}): Promise<
  | { ok: true; user: { id: string; email: string; full_name: string; role: string }; tokenId: string }
  | { ok: false; status: 400 | 401 | 403 | 404; error: string }
> {
  const newPassword = String(params.newPassword || "");
  if (newPassword.length < 8) {
    return {
      ok: false,
      status: 400,
      error: "La nueva contraseña debe tener al menos 8 caracteres.",
    };
  }

  const check = await verifyRecoveryToken(params.recoveryToken);
  if (!check.valid || !check.tokenRow || !check.user) {
    return {
      ok: false,
      status: 401,
      error: check.error || "Token inválido.",
    };
  }

  const user = check.user;
  const tokenRow = check.tokenRow;

  if (params.email && params.email.trim().toLowerCase() !== String(user.email).toLowerCase()) {
    return {
      ok: false,
      status: 403,
      error: "El correo electrónico no coincide con la cuenta del token de recuperación.",
    };
  }

  const db = getDatabase();
  const nowIso = new Date().toISOString();

  // Consumo atómico de un solo uso
  const consumeRes = await db.run(
    `UPDATE password_recovery_tokens
     SET used_at = ?
     WHERE token_id = ? AND used_at IS NULL AND revoked_at IS NULL`,
    [nowIso, tokenRow.token_id]
  );

  if (consumeRes.changes !== 1) {
    return {
      ok: false,
      status: 401,
      error: "El token de recuperación ya fue utilizado o no pudo ser procesado.",
    };
  }

  const newHash = await hashPassword(newPassword);

  await db.run(
    `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
    [newHash, nowIso, user.id]
  );

  return {
    ok: true,
    tokenId: tokenRow.token_id,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
  };
}
