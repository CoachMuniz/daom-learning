import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { joinWaitlist, offerSeatFromWaitlist } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Debe iniciar sesión para unirse a la lista de espera." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jornadaId, isPackageWait, action } = body;

    if (action === "offer_seat") {
      // Acción reservada a ADMIN/STAFF o proceso interno
      if (session.role !== "ADMIN" && session.role !== "STAFF") {
        return NextResponse.json({ error: "UNAUTHORIZED", message: "Permisos insuficientes." }, { status: 403 });
      }
      const offered = await offerSeatFromWaitlist(jornadaId);
      return NextResponse.json({ success: true, offered });
    }

    if (!jornadaId) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "jornadaId es requerido." }, { status: 400 });
    }

    const entry = await joinWaitlist({
      jornadaId,
      userId: session.userId,
      isPackageWait: Boolean(isPackageWait),
    });

    return NextResponse.json({
      success: true,
      entry,
      message: "Te has unido exitosamente a la lista de espera. Si se libera un lugar, tendrás 24 horas reservadas para inscribirte.",
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
