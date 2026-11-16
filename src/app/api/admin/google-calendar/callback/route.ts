import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/auth/google";
import { exchangeCalendarCodeForRefreshToken } from "@/lib/calendar/googleCalendar";
import { recordAuditLog } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = getPublicBaseUrl(request);
  const redirectUri = `${baseUrl}/api/admin/google-calendar/callback`;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/admin?tab=config&calendar_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/admin?tab=config&calendar_error=missing_code`);
  }

  try {
    const { email } = await exchangeCalendarCodeForRefreshToken(code, redirectUri);

    await recordAuditLog({
      action: "GOOGLE_CALENDAR_AUTHORIZED",
      entityType: "system",
      entityId: "google_calendar",
      details: { authorizedAccount: email },
    });

    return NextResponse.redirect(`${baseUrl}/admin?tab=config&calendar_authorized=true&account=${encodeURIComponent(email || "")}`);
  } catch (err: any) {
    console.error("[Google Calendar OAuth Callback Error]", err);
    return NextResponse.redirect(`${baseUrl}/admin?tab=config&calendar_error=${encodeURIComponent(err.message)}`);
  }
}
