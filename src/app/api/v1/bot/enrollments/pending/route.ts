import { NextResponse } from "next/server";
import { validateBotRequest } from "@/lib/bot/auth";
import { getPendingEnrollments } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/**
 * Retorna las inscripciones que permanecen en estado 'pendiente_pago'.
 * Utilizado por el reconciliador de pagos para auditar y recuperar acreditaciones.
 */
export async function GET(request: Request) {
  const auth = validateBotRequest(request);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
    const enrollments = await getPendingEnrollments(limit);

    return NextResponse.json(
      {
        success: true,
        count: enrollments.length,
        enrollments: enrollments.map((e) => ({
          id: e.id,
          capacitacion_id: e.capacitacion_id,
          oferta_id: e.oferta_id,
          modality_id: e.modality_id,
          status: e.status,
          currency: e.currency,
          amount_total: e.amount_total,
          amount_paid: e.amount_paid,
          created_at: e.created_at,
          user: e.user ? { id: e.user.id, email: e.user.email, full_name: e.user.full_name } : null,
        })),
        canary: "DAOM-LEARNING-MP-WEBHOOK-RECOVERY-FINAL-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
