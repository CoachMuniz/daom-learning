"use client";

import React, { useState } from "react";
import { Award, X, AlertCircle, CheckCircle2, DollarSign, Loader2 } from "lucide-react";
import type { Enrollment } from "@/lib/types";

interface BecarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (scholarship: any) => void;
  enrollment: Enrollment | null;
}

export function BecarModal({ isOpen, onClose, onSuccess, enrollment }: BecarModalProps) {
  const [percentage, setPercentage] = useState<number>(50);
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !enrollment) return null;

  const originalAmount = Number(enrollment.amount_total);
  const pct = Math.min(100, Math.max(1, Number(percentage) || 0));
  const discountedAmount = Math.round((originalAmount * pct) / 100);
  const remainingAmount = Math.max(0, originalAmount - discountedAmount);
  const isFull = pct === 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/becas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          percentage: pct,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Error al otorgar la beca.");
      } else {
        onSuccess(data.scholarship);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Error de red al procesar la beca.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-daom-neutral-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-daom-neutral-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-daom-neutral-900 text-lg">
                Otorgar Beca Institucional
              </h3>
              <p className="text-xs text-daom-neutral-500 font-mono">
                Inscripción: {enrollment.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-daom-neutral-400 hover:text-daom-neutral-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Datos del Participante y Capacitación */}
          <div className="bg-daom-neutral-50 p-3.5 rounded-xl border border-daom-neutral-200 grid grid-cols-2 gap-3">
            <div>
              <span className="text-daom-neutral-500 block font-semibold">Participante:</span>
              <span className="font-bold text-daom-neutral-900">
                {enrollment.user?.full_name}
              </span>
              <span className="block text-[11px] text-daom-neutral-500 font-mono">
                {enrollment.user?.email}
              </span>
            </div>
            <div>
              <span className="text-daom-neutral-500 block font-semibold">Capacitación:</span>
              <span className="font-bold text-daom-neutral-900">
                {enrollment.capacitacion_id}
              </span>
              <span className="block uppercase text-[11px] text-daom-neutral-600 font-mono">
                {enrollment.modality_id}
              </span>
            </div>
          </div>

          {/* Selector de Porcentaje */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-bold text-daom-neutral-800">
                Porcentaje de Beca a Bonificar (1 % a 100 %)
              </label>
              <span className="font-mono font-extrabold text-sm text-daom-blue bg-blue-50 px-2 py-0.5 rounded">
                {pct}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              className="w-full accent-daom-blue cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-daom-neutral-400 mt-1">
              <span>1% (Mínima)</span>
              <span>25%</span>
              <span>50% (Media Beca)</span>
              <span>75%</span>
              <span>100% (Beca Completa)</span>
            </div>
          </div>

          {/* Desglose Económico */}
          <div className="p-4 bg-daom-neutral-900 text-white rounded-xl space-y-2">
            <div className="flex justify-between text-daom-neutral-400">
              <span>Arancel base:</span>
              <span className="font-mono">${originalAmount.toLocaleString("es-AR")} {enrollment.currency}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>Bonificación ({pct}%):</span>
              <span className="font-mono">-${discountedAmount.toLocaleString("es-AR")} {enrollment.currency}</span>
            </div>
            <div className="border-t border-daom-neutral-700 pt-2 flex justify-between text-base font-bold text-white">
              <span>Saldo Exigible al Alumno:</span>
              <span className="font-mono text-amber-400">
                {remainingAmount === 0 ? "TOTALMENTE BONIFICADO ($0)" : `$${remainingAmount.toLocaleString("es-AR")} ${enrollment.currency}`}
              </span>
            </div>
          </div>

          {/* Alerta de Regla Institucional */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px] leading-relaxed">
            <strong>AVISO DE INMUTABILIDAD DEFINITIVA:</strong> Una vez otorgada la beca, su porcentaje quedará asentado en el servidor y <strong>no podrá modificarse ni renegociarse</strong>. {isFull ? "Al ser del 100%, la inscripción quedará confirmada de inmediato y se habilitarán los materiales." : "El alumno deberá abonar el saldo restante antes de habilitar los materiales."}
          </div>

          {/* Motivo o Justificación */}
          <div>
            <label className="block font-bold text-daom-neutral-700 mb-1">
              Motivo o Justificación Administrativa (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Beca deportiva federativa / Convenio institucional..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-white text-daom-neutral-900 focus:outline-none focus:ring-1 focus:ring-daom-blue"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-daom-neutral-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-daom-neutral-100 hover:bg-daom-neutral-200 rounded-lg text-xs font-semibold text-daom-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-daom-blue hover:bg-daom-blue/90 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando Beca...</span>
                </>
              ) : (
                <>
                  <Award className="w-3.5 h-3.5" />
                  <span>Confirmar Beca Inmutable</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
