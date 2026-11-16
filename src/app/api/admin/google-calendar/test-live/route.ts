import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Autenticación por sesión ADMIN o clave BOT
  const authHeader = request.headers.get("authorization");
  const secretKey = process.env.BOT_API_SECRET_KEY || "daom_bot_integration_key_secret_2026_secure";
  const user = await getCurrentUser();

  const isBotAuth = authHeader && authHeader.replace("Bearer ", "").trim() === secretKey;
  const isAdminUser = user && (user.role === "ADMIN" || user.role === "STAFF");

  if (!isBotAuth && !isAdminUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const db = getDatabase();

    // 1. Comprobar registros de Google Calendar en site_configs
    const configs = await db.query<{ clave: string; valor: string; synced_at: string }>(
      `SELECT clave, valor, synced_at FROM site_configs WHERE clave LIKE 'GOOGLE_CALENDAR_%'`
    );

    const tokenRow = configs.find((c) => c.clave === "GOOGLE_CALENDAR_REFRESH_TOKEN");
    const accountRow = configs.find((c) => c.clave === "GOOGLE_CALENDAR_AUTHORIZED_ACCOUNT");

    const hasStoredToken = Boolean(tokenRow?.valor && tokenRow.valor.length > 10);
    const hasEnvToken = Boolean(process.env.GOOGLE_CALENDAR_REFRESH_TOKEN);
    const effectiveToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || tokenRow?.valor;

    if (!effectiveToken) {
      return NextResponse.json({
        success: false,
        step: "token_verification",
        hasStoredToken,
        hasEnvToken,
        account: accountRow?.valor || null,
        message: "No se encontró refresh token almacenado ni en base de datos ni en variables de entorno.",
      });
    }

    // 2. Obtener Access Token real contra Google OAuth2
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        step: "credentials_check",
        message: "GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados en Render.",
      });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: effectiveToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.json({
        success: false,
        step: "google_token_exchange",
        error: tokenData.error,
        error_description: tokenData.error_description,
        status: tokenRes.status,
      });
    }

    const accessToken = tokenData.access_token;

    // 3. Crear evento temporal en Google Calendar con Google Meet (conferenceDataVersion=1)
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 120 * 60 * 1000).toISOString();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    const createRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "Prueba Temporal DAOM Learning — Verificación Meet",
          description: "Evento temporal de prueba automática para verificar la generación de salas Google Meet y la conectividad de Google Calendar API.",
          start: { dateTime: startTime, timeZone: "America/Argentina/Buenos_Aires" },
          end: { dateTime: endTime, timeZone: "America/Argentina/Buenos_Aires" },
          conferenceData: {
            createRequest: {
              requestId: `daom_test_${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    );

    const eventData = await createRes.json();
    if (!createRes.ok || !eventData.id) {
      return NextResponse.json({
        success: false,
        step: "calendar_create_event",
        status: createRes.status,
        error: eventData,
      });
    }

    const eventId = eventData.id;
    const meetUrl = eventData.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri || null;
    const htmlLink = eventData.htmlLink;

    // 4. Eliminar inmediatamente el evento temporal para no dejar basura en el calendario
    const deleteRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const isDeleted = deleteRes.status === 204 || deleteRes.ok;

    return NextResponse.json({
      success: true,
      tokenCheck: {
        hasStoredToken,
        hasEnvToken,
        tokenLength: effectiveToken.length,
        authorizedAccount: accountRow?.valor || null,
        tokenSavedAt: tokenRow?.synced_at || null,
      },
      liveTestResults: {
        googleCalendarApiConnected: true,
        generatedEventId: eventId,
        generatedMeetUrl: meetUrl,
        eventHtmlLink: htmlLink,
        eventCleanedUp: isDeleted,
        deleteStatus: deleteRes.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
