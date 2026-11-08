import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { resolveSafeRedirectUrl } from "@/lib/auth/google";

export async function POST(request: Request) {
  await destroySession();
  const accept = request?.headers?.get("accept") || "";
  const contentType = request?.headers?.get("content-type") || "";
  const isHtmlFormSubmit =
    accept.includes("text/html") && !contentType.includes("application/json");

  if (isHtmlFormSubmit && request) {
    const res = NextResponse.redirect(resolveSafeRedirectUrl("/login", request), {
      status: 303,
    });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  const res = NextResponse.json({
    success: true,
    message: "Sesión cerrada correctamente.",
  });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
