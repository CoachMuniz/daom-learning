import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  updateEditionGoogleMeetUrl,
  updateTrainingGoogleMeetUrl,
  recordAuditLog,
} from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Acceso exclusivo para administradores.", canary: "DAOM-FORMACION-SHEET-01" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { capacitacionId, ofertaId, googleMeetUrl } = body;

    if (!capacitacionId && !ofertaId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Se requiere capacitacionId o ofertaId." },
        { status: 400 }
      );
    }

    if (googleMeetUrl && !googleMeetUrl.includes("meet.google.com") && !googleMeetUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "El enlace debe ser una URL válida de Google Meet (ej: https://meet.google.com/...)." },
        { status: 400 }
      );
    }

    if (ofertaId) {
      await updateEditionGoogleMeetUrl(ofertaId, googleMeetUrl);
    } else if (capacitacionId) {
      await updateTrainingGoogleMeetUrl(capacitacionId, googleMeetUrl);
    }

    await recordAuditLog({
      action: "GOOGLE_MEET_CONFIGURED",
      entityType: "training_edition",
      entityId: ofertaId || capacitacionId,
      details: { googleMeetUrl, updatedBy: session.email },
    });

    return NextResponse.json({
      success: true,
      message: "Enlace de Google Meet actualizado correctamente.",
      canary: "DAOM-FORMACION-SHEET-01",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
