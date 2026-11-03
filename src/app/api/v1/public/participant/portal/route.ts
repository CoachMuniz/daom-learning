import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findUserByEmail,
  getUserEnrollments,
  getUserMaterialEntitlements,
  getUserCertificates,
  getUserAttendance,
} from "@/lib/db/repository";
import { verifySessionToken } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

const ParticipantPortalSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    // 1. Verificación de autorización Server-to-Server o Bearer Token
    const authHeader = request.headers.get("authorization") || "";
    const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("x-learning-secret") || "";
    const configuredKey = process.env.BOT_API_SECRET_KEY || "daom_bot_integration_key_secret_2026_secure";

    let isAuthorized = false;
    let authenticatedEmailFromToken: string | null = null;

    if (apiKeyHeader === configuredKey) {
      isAuthorized = true;
    } else if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token === configuredKey) {
        isAuthorized = true;
      } else {
        const payload = await verifySessionToken(token);
        if (payload) {
          isAuthorized = true;
          authenticatedEmailFromToken = payload.email;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Credencial inválida o faltante para acceder al área de participantes",
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 401 }
      );
    }

    const json = await request.json();
    const parsed = ParticipantPortalSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          issues: parsed.error.issues,
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 400 }
      );
    }

    const email = authenticatedEmailFromToken || parsed.data.email;

    // 2. Buscar participante
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          participant: null,
          enrollments: [],
          materials: [],
          certificates: [],
          attendance: [],
          canary: "DAOM-FORMACION-SHEET-01",
        },
        { status: 200 }
      );
    }

    // 3. Obtener capacitaciones, inscripciones, materiales y certificados
    const enrollments = await getUserEnrollments(user.id);
    const materials = await getUserMaterialEntitlements(user.id);
    const certificates = await getUserCertificates(user.id);
    const attendance = await getUserAttendance(user.id);

    return NextResponse.json(
      {
        success: true,
        participant: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          country: user.profile?.country || "AR",
          phone: user.profile?.phone || null,
        },
        enrollments,
        materials,
        certificates,
        attendance,
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Error al consultar información de participante",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 500 }
    );
  }
}
