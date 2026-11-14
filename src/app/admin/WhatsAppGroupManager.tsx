"use client";

import React, { useState } from "react";
import { MessageSquare, Save, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface WhatsAppGroupManagerProps {
  trainings: Array<{
    capacitacion_id: string;
    titulo: string;
    ediciones?: Array<{
      oferta_id: string;
      nombre_edicion: string;
      whatsapp_group_url?: string | null;
    }>;
  }>;
}

export function WhatsAppGroupManager({ trainings }: WhatsAppGroupManagerProps) {
  const [selectedTrainingId, setSelectedTrainingId] = useState(
    trainings.length > 0 ? trainings[0].capacitacion_id : "SEM-BIOMECANICA"
  );
  const [selectedOfertaId, setSelectedOfertaId] = useState("");
  const [groupUrl, setGroupUrl] = useState(
    "https://chat.whatsapp.com/H2GeOaYVJx3HWU8ZSgKpsk?s=cl&p=a&iam=2"
  );
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedTraining = trainings.find((t) => t.capacitacion_id === selectedTrainingId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/capacitaciones/whatsapp-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacitacionId: selectedTrainingId,
          ofertaId: selectedOfertaId || undefined,
          whatsappGroupUrl: groupUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.message || data.error || "Error al actualizar enlace." });
      } else {
        setStatusMessage({
          type: "success",
          text: `Enlace oficial de WhatsApp guardado correctamente para ${selectedTrainingId}.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error de red al guardar enlace." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="whatsapp-manager" className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
      <div className="p-6 border-b border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <span>Grupos de WhatsApp Oficiales por Capacitación</span>
          </h2>
          <p className="text-xs text-daom-neutral-500">
            Administración de enlaces de invitación a grupos creados manualmente por DAOM. Jerkson enviará este enlace a los participantes una vez confirmado el pago.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-4">
        {statusMessage && (
          <div
            className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534]"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
              Capacitación
            </label>
            <select
              value={selectedTrainingId}
              onChange={(e) => {
                setSelectedTrainingId(e.target.value);
                const tr = trainings.find((t) => t.capacitacion_id === e.target.value);
                if (tr?.ediciones && tr.ediciones.length > 0) {
                  setSelectedOfertaId(tr.ediciones[0].oferta_id);
                  if (tr.ediciones[0].whatsapp_group_url) {
                    setGroupUrl(tr.ediciones[0].whatsapp_group_url);
                  }
                }
              }}
              className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900"
            >
              {trainings.map((t) => (
                <option key={t.capacitacion_id} value={t.capacitacion_id}>
                  [{t.capacitacion_id}] {t.titulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
              Edición (Opcional)
            </label>
            <select
              value={selectedOfertaId}
              onChange={(e) => {
                setSelectedOfertaId(e.target.value);
                const ed = selectedTraining?.ediciones?.find((ed) => ed.oferta_id === e.target.value);
                if (ed?.whatsapp_group_url) {
                  setGroupUrl(ed.whatsapp_group_url);
                }
              }}
              className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900"
            >
              <option value="">Aplicar a todas las ediciones</option>
              {selectedTraining?.ediciones?.map((ed) => (
                <option key={ed.oferta_id} value={ed.oferta_id}>
                  {ed.nombre_edicion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
              Enlace de Invitación (WhatsApp)
            </label>
            <input
              type="url"
              placeholder="https://chat.whatsapp.com/..."
              value={groupUrl}
              onChange={(e) => setGroupUrl(e.target.value)}
              className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-daom-neutral-500">
            Identificador inicial: <strong>SEM-BIOMECANICA</strong> • Enlace oficial preconfigurado.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Enlace</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
