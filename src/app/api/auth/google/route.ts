import { NextResponse } from "next/server";
import {
  isGoogleOAuthConfigured,
  generateOAuthState,
  buildGoogleAuthUrl,
  getPublicBaseUrl,
  resolveSafeRedirectUrl,
  CANONICAL_LEARNING_URL,
} from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectPath = searchParams.get("redirect") || "/participante";

  const baseUrl = getPublicBaseUrl(request);
  const callbackUrl = `${baseUrl}/api/auth/google/callback`;

  const acceptHeader = request.headers.get("accept") || "";
  const wantsHtml = acceptHeader.includes("text/html");
  const wantsJson = acceptHeader.includes("application/json") || !wantsHtml;

  // Auditoría: Verificar si Google OAuth está configurado en el entorno
  if (!isGoogleOAuthConfigured()) {
    const errorDetails = {
      service: "Google OAuth 2.0 (DAOM Learning)",
      configured: false,
      status: "PENDING_CONFIGURATION",
      canary: "DAOM-LEARNING-H031-COMPLETE",
      required_environment_variables: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      instructions:
        "Configurar credenciales OAuth 2.0 en Google Cloud Console para DAOM Learning Staging/Producción.",
      authorized_origins: [baseUrl, CANONICAL_LEARNING_URL, "https://daom-learning.onrender.com"],
      authorized_redirect_uri: callbackUrl,
    };

    if (wantsHtml) {
      return NextResponse.redirect(
        resolveSafeRedirectUrl(`/login?error=google_oauth_pending_configuration`, request, baseUrl)
      );
    }

    return NextResponse.json(errorDetails, { status: 503 });
  }

  try {
    const state = generateOAuthState(redirectPath, baseUrl);
    const authUrl = buildGoogleAuthUrl(callbackUrl, state);

    if (wantsJson) {
      return NextResponse.json({ success: true, authUrl, canary: "DAOM-LEARNING-H031-COMPLETE" }, { status: 200 });
    }

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, canary: "DAOM-LEARNING-H031-COMPLETE" },
      { status: 500 }
    );
  }
}
