import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getPublicBaseUrl } from "@/lib/auth/google";
import { getGoogleCalendarAuthUrl, isGoogleCalendarConfigured } from "@/lib/calendar/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 1. Verificar sesión administrativa activa
  const session = await getCurrentSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return NextResponse.json({ error: "Acceso no autorizado" }, { status: 401 });
  }

  const baseUrl = getPublicBaseUrl(request);
  const redirectUri = `${baseUrl}/api/admin/google-calendar/callback`;

  try {
    const authUrl = getGoogleCalendarAuthUrl(redirectUri);
    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri,
      isConfigured: isGoogleCalendarConfigured(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
