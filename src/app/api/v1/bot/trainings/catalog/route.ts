import { NextResponse } from "next/server";
import { validateBotRequest } from "@/lib/bot/auth";
import { getPublishedTrainings } from "@/lib/db/repository";

export async function GET(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const trainings = await getPublishedTrainings();

    return NextResponse.json(
      {
        success: true,
        count: trainings.length,
        trainings,
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
