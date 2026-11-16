"use client";

import React, { useState, useEffect } from "react";
import {
  Video,
  MessageSquare,
  Globe,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  Loader2,
  Calendar,
} from "lucide-react";
import type { Training } from "@/lib/types";

interface ConfigAdminProps {
  trainings: Training[];
}

export function ConfigurationAdminView({ trainings }: ConfigAdminProps) {
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>(
    trainings[0]?.capacitacion_id || ""
  );
  const [googleMeetUrl, setGoogleMeetUrl] = useState<string>("");
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState<string>("");
  const [savingMeet, setSavingMeet] = useState(false);
  const [savingWa, setSavingWa] = useState(false);
  const [msgMeet, setMsgMeet] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [msgWa, setMsgWa] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedTraining = trainings.find((t) => t.capacitacion_id === selectedTrainingId);

  const handleSaveMeet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainingId) return;
    setSavingMeet(true);
    setMsgMeet(null);

    try {
      const res = await fetch("/api/admin/capacitaciones/google-meet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacitacionId: selectedTrainingId,
          googleMeetUrl: googleMeetUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgMeet({ type: "error", text: data.message || "Error al actualizar Google Meet" });
      } else {
        setMsgMeet({ type: "success", text: "Enlace de Google Meet actualizado correctamente." });
      }
    } catch (err: any) {
      setMsgMeet({ type: "error", text: err.message || "Error de red" });
    } finally {
      setSavingMeet(false);
    }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainingId) return;
    setSavingWa(true);
    setMsgWa(null);

    try {
      const res = await fetch("/api/admin/capacitaciones/whatsapp-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacitacionId: selectedTrainingId,
          whatsappGroupUrl: whatsappGroupUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgWa({ type: "error", text: data.message || "Error al actualizar grupo de WhatsApp" });
      } else {
        setMsgWa({ type: "success", text: "Grupo de WhatsApp actualizado correctamente." });
      }
    } catch (err: any) {
      setMsgWa({ type: "error", text: err.message || "Error de red" });
    } finally {
      setSavingWa(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Capacitación para Configuración */}
      <div className="bg-white p-5 rounded-xl border border-daom-neutral-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-daom-neutral-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-daom-blue" />
            <span>Configuración de Canales y Streaming en Vivo</span>
          </h3>
          <p className="text-xs text-daom-neutral-500">
            Administración centralizada de salas de Google Meet y grupos de WhatsApp por capacitación.
          </p>
        </div>

        <select
          value={selectedTrainingId}
          onChange={(e) => {
            setSelectedTrainingId(e.target.value);
            setMsgMeet(null);
            setMsgWa(null);
          }}
          className="p-2 border border-daom-neutral-300 rounded-lg text-xs bg-white text-daom-neutral-900 font-semibold"
        >
          {trainings.map((t) => (
            <option key={t.capacitacion_id} value={t.capacitacion_id}>
              {t.capacitacion_id} — {t.titulo}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulario Google Meet */}
        <form
          onSubmit={handleSaveMeet}
          className="bg-white p-6 rounded-xl border border-daom-neutral-200 shadow-card space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-daom-neutral-200">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-daom-neutral-900 text-sm">
                Sala de Transmisión Oficial — Google Meet
              </h4>
              <p className="text-[11px] text-daom-neutral-500">
                Plataforma oficial de streaming interactivo para DAOM Learning.
              </p>
            </div>
          </div>

          {msgMeet && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                msgMeet.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {msgMeet.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{msgMeet.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
              Enlace de Google Meet (https://meet.google.com/...)
            </label>
            <input
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={googleMeetUrl}
              onChange={(e) => setGoogleMeetUrl(e.target.value)}
              className="w-full p-2.5 text-xs font-mono border rounded-lg bg-white text-daom-neutral-900 focus:outline-none focus:ring-1 focus:ring-daom-blue"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingMeet}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {savingMeet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Guardar Google Meet</span>
            </button>
          </div>
        </form>

        {/* Formulario WhatsApp */}
        <form
          onSubmit={handleSaveWhatsApp}
          className="bg-white p-6 rounded-xl border border-daom-neutral-200 shadow-card space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-daom-neutral-200">
            <div className="p-2.5 bg-green-50 rounded-lg text-green-700">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-daom-neutral-900 text-sm">
                Grupo de Alumnos — WhatsApp
              </h4>
              <p className="text-[11px] text-daom-neutral-500">
                Canal directo de acompañamiento y avisos para la capacitación.
              </p>
            </div>
          </div>

          {msgWa && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                msgWa.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {msgWa.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{msgWa.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
              Enlace de Invitación de WhatsApp (https://chat.whatsapp.com/...)
            </label>
            <input
              type="url"
              placeholder="https://chat.whatsapp.com/..."
              value={whatsappGroupUrl}
              onChange={(e) => setWhatsappGroupUrl(e.target.value)}
              className="w-full p-2.5 text-xs font-mono border rounded-lg bg-white text-daom-neutral-900 focus:outline-none focus:ring-1 focus:ring-daom-blue"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingWa}
              className="px-4 py-2 bg-daom-blue hover:bg-daom-blue/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {savingWa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Guardar Grupo WhatsApp</span>
            </button>
          </div>
        </form>
      </div>

      {/* Parámetros Institucionales e Integraciones */}
      <div className="bg-white p-6 rounded-xl border border-daom-neutral-200 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-daom-neutral-200">
          <div>
            <h4 className="font-bold text-daom-neutral-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-daom-blue" />
              <span>Conexión Institucional — Google Calendar API</span>
            </h4>
            <p className="text-[11px] text-daom-neutral-500">
              Permite invitar automáticamente por streaming a los alumnos a su calendario de Google e incorporar Google Meet a las sesiones.
            </p>
          </div>
          <div>
            <a
              href="/api/admin/google-calendar/authorize"
              className="px-4 py-2 bg-daom-blue hover:bg-daom-blue/90 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Vincular Google Calendar con daom.weightlifting@gmail.com</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-daom-neutral-50 border rounded-lg space-y-1">
            <span className="text-daom-neutral-500 block">Canario del Sistema:</span>
            <span className="font-bold text-daom-neutral-800">DAOM-FORMACION-SHEET-01</span>
          </div>
          <div className="p-3 bg-daom-neutral-50 border rounded-lg space-y-1">
            <span className="text-daom-neutral-500 block">Fuente Editorial:</span>
            <span className="font-bold text-daom-neutral-800">Google Sheets ID: 1LlUzvMb...</span>
          </div>
          <div className="p-3 bg-daom-neutral-50 border rounded-lg space-y-1">
            <span className="text-daom-neutral-500 block">Integración Comunicaciones:</span>
            <span className="font-bold text-daom-neutral-800">Jerkson Bot (Idempotente)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
