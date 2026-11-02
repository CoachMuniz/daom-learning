"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, MapPin, Video, PlayCircle, CheckCircle2, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";

function InscribirForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const capacitacionId = searchParams.get("capacitacion") || "SEM-SQUATS";

  const [modality, setModality] = useState<"presencial" | "streaming" | "on_demand">("presencial");
  const [market, setMarket] = useState<"AR" | "INT">("AR");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/inscripciones/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacitacionId,
          modalityId: modality,
          market,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al iniciar la inscripción.");
      }

      router.push("/participante");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-daom-blue-soft text-daom-blue flex items-center justify-center mx-auto">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
          Iniciar Inscripción
        </h1>
        <p className="text-xs sm:text-sm text-daom-neutral-600">
          Capacitación seleccionada: <strong className="text-daom-blue font-bold">{capacitacionId}</strong>
        </p>
      </div>

      {error && (
        <div className="bg-[#FFF1F0] border border-[#FBC5C2] p-4 rounded-lg flex items-center gap-2.5 text-[#B42318] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleEnroll} className="bg-white p-6 sm:p-8 rounded-lg border border-daom-neutral-200 shadow-card space-y-6">
        {/* Selección de Mercado */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-daom-neutral-800 uppercase">
            Mercado y Moneda de Pago
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMarket("AR")}
              className={`p-3 rounded-lg border text-left text-xs transition-colors min-h-[44px] ${
                market === "AR"
                  ? "border-daom-blue bg-daom-blue-soft text-daom-blue font-bold ring-1 ring-daom-blue"
                  : "border-daom-neutral-200 text-daom-neutral-700 hover:bg-daom-neutral-50"
              }`}
            >
              <span className="block font-bold">Argentina (ARS)</span>
              <span className="text-[11px] text-daom-neutral-500">Mercado Pago</span>
            </button>
            <button
              type="button"
              onClick={() => setMarket("INT")}
              className={`p-3 rounded-lg border text-left text-xs transition-colors min-h-[44px] ${
                market === "INT"
                  ? "border-daom-blue bg-daom-blue-soft text-daom-blue font-bold ring-1 ring-daom-blue"
                  : "border-daom-neutral-200 text-daom-neutral-700 hover:bg-daom-neutral-50"
              }`}
            >
              <span className="block font-bold">Internacional (USD)</span>
              <span className="text-[11px] text-daom-neutral-500">Stripe</span>
            </button>
          </div>
        </div>

        {/* Selección de Modalidad */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-daom-neutral-800 uppercase">
            Modalidad de Cursada
          </label>
          <div className="space-y-2.5">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                modality === "presencial"
                  ? "border-daom-blue bg-daom-blue-soft/50 ring-1 ring-daom-blue"
                  : "border-daom-neutral-200 hover:bg-daom-neutral-50"
              }`}
            >
              <input
                type="radio"
                name="modality"
                value="presencial"
                checked={modality === "presencial"}
                onChange={() => setModality("presencial")}
                className="mt-1"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-daom-neutral-900 block">Presencial en Club DAOM</span>
                <p className="text-daom-neutral-600">Práctica presencial en plataforma, corrección directa y certificado.</p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                modality === "streaming"
                  ? "border-daom-blue bg-daom-blue-soft/50 ring-1 ring-daom-blue"
                  : "border-daom-neutral-200 hover:bg-daom-neutral-50"
              }`}
            >
              <input
                type="radio"
                name="modality"
                value="streaming"
                checked={modality === "streaming"}
                onChange={() => setModality("streaming")}
                className="mt-1"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-daom-neutral-900 block">Streaming en Vivo</span>
                <p className="text-daom-neutral-600">Transmisión interactiva en tiempo real y certificado de asistencia.</p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                modality === "on_demand"
                  ? "border-daom-blue bg-daom-blue-soft/50 ring-1 ring-daom-blue"
                  : "border-daom-neutral-200 hover:bg-daom-neutral-50"
              }`}
            >
              <input
                type="radio"
                name="modality"
                value="on_demand"
                checked={modality === "on_demand"}
                onChange={() => setModality("on_demand")}
                className="mt-1"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-daom-neutral-900 block">On Demand (Grabación)</span>
                <p className="text-daom-neutral-600">
                  Acceso a la grabación por 12 meses y archivo ZIP. (No acredita asistencia presencial ni virtual).
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Observaciones */}
        <div className="space-y-1.5">
          <label htmlFor="notes" className="block text-xs font-bold text-daom-neutral-800 uppercase">
            Comentarios o Aclaraciones (Opcional)
          </label>
          <textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Si tenés alguna consulta o aclaración técnica..."
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-daom-blue hover:bg-daom-blue-dark disabled:opacity-50 rounded-md min-h-[44px] transition-colors shadow-sm"
        >
          <span>{loading ? "Procesando inscripción..." : "Confirmar e Iniciar Inscripción"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function InscribirPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-daom-neutral-500">Cargando formulario de inscripción...</div>}>
      <InscribirForm />
    </Suspense>
  );
}
