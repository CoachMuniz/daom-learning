import { cookies } from "next/headers";
import { signSessionToken, verifySessionToken, type SessionPayload } from "./jwt";
import { findUserById } from "@/lib/db/repository";
import type { User } from "@/lib/types";

export const SESSION_COOKIE_NAME = "daom_learning_session";

export async function createSession(user: {
  id: string;
  email: string;
  role: "ADMIN" | "PARTICIPANT" | "STAFF";
  full_name: string;
}): Promise<string> {
  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
  });

  try {
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });
  } catch {}

  return token;
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession();
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user || !user.is_active) return null;
  return user;
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {}
}
