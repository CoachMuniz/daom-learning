import { SignJWT, jwtVerify } from "jose";

const DEFAULT_SECRET = "super_secret_jwt_key_at_least_32_characters_long_daom_2026";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "PARTICIPANT" | "STAFF";
  fullName: string;
}

export async function signSessionToken(payload: SessionPayload, expiresIn = "7d"): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer("daom-learning")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: "daom-learning",
    });
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as "ADMIN" | "PARTICIPANT" | "STAFF",
      fullName: payload.fullName as string,
    };
  } catch {
    return null;
  }
}
