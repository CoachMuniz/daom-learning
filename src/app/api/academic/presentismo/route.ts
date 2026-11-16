import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  recordEncuentroAttendance,
  getAttendancesForEncuentro,
} from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Acceso exclusivo para administradores.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const encuentroId = url.searchParams.get("encuentroId");
    if (!encuentroId) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "encuentroId es requerido." }, { status: 400 });
    }

    const attendances = await getAttendancesForEncuentro(encuentroId);
    return NextResponse.json({ success: true, count: attendances.length, attendances });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Debe iniciar sesión para registrar asistencia.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { encuentroId, enrollmentId, method, providedCodeOrToken, userId, notes } = body;

    const isAdmin = session.role === "ADMIN" || session.role === "STAFF";
    const targetUserId = isAdmin && userId ? userId : session.userId;

    const result = await recordEncuentroAttendance({
      encuentroId,
      userId: targetUserId,
      enrollmentId,
      method: method || "code",
      providedCodeOrToken,
      verifiedBy: isAdmin ? session.email : "self",
      notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: "ATTENDANCE_FAILED", message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      attendance: result.attendance,
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
