import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail } from "@/lib/db/repository";
import { hashPassword } from "@/lib/auth/passwords";
import { createSession } from "@/lib/auth/session";

const RegisterSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  fullName: z.string().min(2, "El nombre completo es requerido"),
  phone: z.string().optional(),
  country: z.string().default("AR"),
  documentId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const { email, password, fullName, phone, country, documentId } = parsed.data;

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        {
          error: "EMAIL_EXISTS",
          message: "Ya existe una cuenta registrada con este correo electrónico.",
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      email,
      passwordHash,
      fullName,
      phone,
      country,
      documentId,
      role: "PARTICIPANT",
    });

    await createSession(user);

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
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
