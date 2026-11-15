import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { grantScholarship, getAllScholarshipsAdmin } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Acceso denegado. Exclusivo para administradores.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const capacitacionId = url.searchParams.get("capacitacionId") || undefined;
    const userId = url.searchParams.get("userId") || undefined;

    const scholarships = await getAllScholarshipsAdmin({ capacitacionId, userId });

    return NextResponse.json({
      success: true,
      count: scholarships.length,
      scholarships,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  // Regla: Solo ADMIN puede otorgar becas
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Solo administradores con rol ADMIN pueden otorgar becas.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { enrollmentId, percentage, reason } = body;

    if (!enrollmentId || percentage === undefined) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "enrollmentId y percentage son requeridos." },
        { status: 400 }
      );
    }

    const scholarship = await grantScholarship({
      enrollmentId,
      percentage: Number(percentage),
      grantedBy: session.email || session.userId,
      reason,
    });

    return NextResponse.json({
      success: true,
      scholarship,
      message: `Beca del ${scholarship.percentage}% otorgada con éxito.`,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "SCHOLARSHIP_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 400 }
    );
  }
}
