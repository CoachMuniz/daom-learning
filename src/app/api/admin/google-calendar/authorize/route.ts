import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicBaseUrl } from "@/lib/auth/google";
import { getGoogleCalendarAuthUrl, isGoogleCalendarConfigured } from "@/lib/calendar/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseUrl = getPublicBaseUrl(request);
  const acceptHeader = request.headers.get("accept") || "";
  const wantsHtml = acceptHeader.includes("text/html");
  const wantsJson = searchParams.get("format") === "json" || (acceptHeader.includes("application/json") && !wantsHtml);

  // 1. Verificar sesión administrativa activa utilizando el mismo mecanismo que /admin
  const user = await getCurrentUser();

  // Si no está autenticado o no posee rol administrativo:
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    if (wantsHtml) {
      // Si el navegador navega directamente hacia la URL, redirigir a login preservando la intención
      return NextResponse.redirect(`${baseUrl}/login?redirect=/api/admin/google-calendar/authorize`);
    }
    return NextResponse.json(
      {
        error: "Acceso no autorizado",
        message: "Se requiere iniciar sesión con una cuenta administrativa (ADMIN o STAFF) para autorizar Google Calendar.",
      },
      { status: 401 }
    );
  }

  const redirectUri = `${baseUrl}/api/admin/google-calendar/callback`;

  try {
    const authUrl = getGoogleCalendarAuthUrl(redirectUri);

    // Si la llamada requiere JSON explícito (ej: fetch desde un botón del panel admin)
    if (wantsJson) {
      const configured = await isGoogleCalendarConfigured();
      return NextResponse.json({
        success: true,
        authUrl,
        redirectUri,
        isConfigured: configured,
      });
    }

    // Por defecto, o si ingresa desde la barra de direcciones del navegador: Redirigir directamente a Google
    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    if (wantsHtml) {
      return NextResponse.redirect(`${baseUrl}/admin?tab=config&calendar_error=${encodeURIComponent(err.message)}`);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
