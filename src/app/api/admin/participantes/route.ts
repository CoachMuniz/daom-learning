import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { searchParticipants } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Acceso exclusivo para administradores autorizados.",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const limitParam = parseInt(url.searchParams.get("limit") || "20", 10);
    const limit = isNaN(limitParam) ? 20 : Math.min(limitParam, 50);

    const participants = await searchParticipants(q, limit);

    return NextResponse.json(
      {
        success: true,
        count: participants.length,
        participants: participants.map((p) => ({
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          role: p.role,
          phone: p.profile?.phone || null,
          documentId: p.profile?.document_id || null,
          country: p.profile?.country || "AR",
        })),
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
