import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, recordAuditLog } from "@/lib/db/repository";
import { verifyPassword } from "@/lib/auth/passwords";
import { createSession } from "@/lib/auth/session";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        {
          error: "INVALID_CREDENTIALS",
          message: "Credenciales de acceso incorrectas.",
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      await recordAuditLog({
        userId: user.id,
        action: "AUTH_LOGIN_FAILED",
        entityType: "user",
        entityId: user.id,
        details: { email },
      });
      return NextResponse.json(
        {
          error: "INVALID_CREDENTIALS",
          message: "Credenciales de acceso incorrectas.",
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 401 }
      );
    }

    await createSession(user);

    await recordAuditLog({
      userId: user.id,
      action: "AUTH_LOGIN_SUCCESS",
      entityType: "user",
      entityId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
