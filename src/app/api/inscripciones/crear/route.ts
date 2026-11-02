import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { createEnrollment, getTrainingById, getPricesForEdition } from "@/lib/db/repository";
import { calculateOnDemandPrice } from "@/lib/commercial/rules";
import type { ModalityId } from "@/lib/types";

const CreateEnrollmentSchema = z.object({
  capacitacionId: z.string().min(1),
  ofertaId: z.string().optional(),
  modalityId: z.enum(["presencial", "streaming", "on_demand"]),
  market: z.enum(["AR", "INT"]).default("AR"),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      {
        error: "UNAUTHENTICATED",
        message: "Debe iniciar sesión para inscribirse a una capacitación.",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 401 }
    );
  }

  try {
    const json = await request.json();
    const parsed = CreateEnrollmentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    const { capacitacionId, ofertaId, modalityId, market, notes } = parsed.data;

    const training = await getTrainingById(capacitacionId, true);
    if (!training) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Capacitación no encontrada: ${capacitacionId}` },
        { status: 404 }
      );
    }

    let amount = 0;
    const currency = market === "AR" ? "ARS" : "USD";

    // Si hay ofertaId, buscar precios de la oferta
    if (ofertaId) {
      const prices = await getPricesForEdition(ofertaId, false);
      const matchedPrice = prices.find((p) => p.mercado === market);
      if (matchedPrice) {
        amount = Number(matchedPrice.precio_base);
      }
    }

    // Si es On Demand, aplicar regla de cálculo de fecha si corresponde
    if (modalityId === "on_demand" && amount > 0) {
      const edition = training.ediciones?.find((e) => e.oferta_id === ofertaId);
      const onDemandCalc = calculateOnDemandPrice(amount, edition?.fecha_inicio);
      amount = onDemandCalc.finalPrice;
    }

    const enrollment = await createEnrollment({
      userId: session.userId,
      capacitacionId,
      ofertaId: ofertaId || null,
      modalityId: modalityId as ModalityId,
      currency,
      amountTotal: amount,
      paymentMethod: market === "AR" ? "mercadopago" : "stripe",
      notes: notes || null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Inscripción iniciada con éxito. Pendiente de pago.",
        enrollment: {
          id: enrollment.id,
          capacitacion_id: enrollment.capacitacion_id,
          modality_id: enrollment.modality_id,
          amount_total: enrollment.amount_total,
          currency: enrollment.currency,
          status: enrollment.status,
        },
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
