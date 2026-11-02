import { NextResponse } from "next/server";
import { validateBotRequest, checkIdempotency } from "@/lib/bot/auth";
import { MaterialAuthorizeSchema } from "@/lib/bot/schemas";
import { autoGrantMaterialForEnrollment, recordIntegrationEvent, findUserById } from "@/lib/db/repository";

export async function POST(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const json = await request.json();
    const parsed = MaterialAuthorizeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const { idempotency_key, user_id, training_id, enrollment_id } = parsed.data;

    const idempotency = await checkIdempotency(idempotency_key);
    if (idempotency.isDuplicate) return idempotency.response!;

    const user = await findUserById(user_id);
    if (!user) {
      return NextResponse.json({ error: "NOT_FOUND", message: `Usuario no encontrado: ${user_id}` }, { status: 404 });
    }

    await autoGrantMaterialForEnrollment(user_id, training_id, enrollment_id);

    const event = await recordIntegrationEvent({
      idempotencyKey: idempotency_key,
      eventType: "materials.authorized",
      source: "bot",
      payload: parsed.data,
      status: "processed",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Autorización de descarga para material ZIP concedida con éxito.",
        user_id,
        training_id,
        event_id: event.id,
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
