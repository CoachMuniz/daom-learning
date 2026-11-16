"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Calendar,
  Clock,
  Video,
  MapPin,
  QrCode,
  Key,
  Users,
  CheckCircle2,
  Plus,
  Loader2,
  X,
  AlertCircle,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { Jornada, Encuentro } from "@/lib/types";

interface AcademicHierarchyProps {
  capacitacionId: string;
}

export function AcademicHierarchyManager({ capacitacionId }: AcademicHierarchyProps) {
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEncuentro, setSelectedEncuentro] = useState<Encuentro | null>(null);
  const [showPresentismoModal, setShowPresentismoModal] = useState(false);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);

  // Form nueva jornada
  const [newJornadaOpen, setNewJornadaOpen] = useState(false);
  const [jornadaNombre, setJornadaNombre] = useState("");
  const [jornadaModalidad, setJornadaModalidad] = useState<any>("presencial");
  const [jornadaPrecio, setJornadaPrecio] = useState<number>(0);
  const [savingJor, setSavingJor] = useState(false);

  // Form nuevo encuentro
  const [targetJornadaId, setTargetJornadaId] = useState<string | null>(null);
  const [encNombre, setEncNombre] = useState("");
  const [encFecha, setEncFecha] = useState("");
  const [encHoraInicio, setEncHoraInicio] = useState("09:00");
  const [encHoraFin, setEncHoraFin] = useState("13:00");
  const [encModalidad, setEncModalidad] = useState<any>("presencial");
  const [encUbicacion, setEncUbicacion] = useState("");
  const [savingEnc, setSavingEnc] = useState(false);

  const fetchJornadas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/academic/jornadas?capacitacionId=${capacitacionId}`);
      const data = await res.json();
      if (data.success) {
        setJornadas(data.jornadas || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJornadas();
  }, [capacitacionId]);

  const handleCreateJornada = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingJor(true);
    try {
      const res = await fetch("/api/academic/jornadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacitacionId,
          nombre: jornadaNombre,
          modalidad: jornadaModalidad,
          precioIndividual: Number(jornadaPrecio),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setJornadaNombre("");
        setNewJornadaOpen(false);
        fetchJornadas();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingJor(false);
    }
  };

  const handleCreateEncuentro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetJornadaId) return;
    setSavingEnc(true);
    try {
      const res = await fetch("/api/academic/jornadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_encuentro",
          jornadaId: targetJornadaId,
          capacitacionId,
          nombre: encNombre,
          fecha: encFecha,
          horaInicio: encHoraInicio,
          horaFin: encHoraFin,
          modalidad: encModalidad,
          ubicacionFisica: encUbicacion || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTargetJornadaId(null);
        setEncNombre("");
        fetchJornadas();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEnc(false);
    }
  };

  const openPresentismo = async (enc: Encuentro) => {
    setSelectedEncuentro(enc);
    setShowPresentismoModal(true);
    setLoadingAtt(true);
    try {
      const res = await fetch(`/api/academic/presentismo?encuentroId=${enc.id}`);
      const data = await res.json();
      if (data.success) {
        setAttendances(data.attendances || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAtt(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-daom-neutral-200 shadow-card p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-daom-neutral-200">
        <div>
          <h3 className="font-extrabold text-daom-neutral-900 text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-daom-blue" />
            <span>Arquitectura Académica: Jornadas y Encuentros</span>
          </h3>
          <p className="text-xs text-daom-neutral-500">
            Estructura jerárquica para venta individual o por paquete, fechas, enlaces de Google Meet y códigos de presentismo.
          </p>
        </div>

        <button
          onClick={() => setNewJornadaOpen(true)}
          className="px-3.5 py-2 bg-daom-blue hover:bg-daom-blue/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nueva Jornada</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-daom-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-daom-blue" />
          Cargando estructura académica...
        </div>
      ) : jornadas.length === 0 ? (
        <div className="p-8 text-center text-daom-neutral-500 bg-daom-neutral-50 rounded-xl border border-dashed border-daom-neutral-300">
          No se registran jornadas configuradas aún para esta capacitación.
        </div>
      ) : (
        <div className="space-y-4">
          {jornadas.map((j) => (
            <div
              key={j.id}
              className="border border-daom-neutral-200 rounded-xl overflow-hidden bg-daom-neutral-50/50"
            >
              {/* Cabecera Jornada */}
              <div className="p-4 bg-white border-b border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-daom-blue bg-blue-50 px-2 py-0.5 rounded">
                      {j.id}
                    </span>
                    <h4 className="font-bold text-daom-neutral-900 text-sm">{j.nombre}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-daom-neutral-100 rounded text-daom-neutral-700">
                      {j.modalidad}
                    </span>
                  </div>
                  {j.descripcion && (
                    <p className="text-xs text-daom-neutral-500">{j.descripcion}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    Precio: ${Number(j.precio_individual).toLocaleString("es-AR")} ARS
                  </span>
                  <button
                    onClick={() => {
                      setTargetJornadaId(j.id);
                      setEncFecha("2026-11-29");
                    }}
                    className="px-2.5 py-1.5 bg-daom-neutral-100 hover:bg-daom-neutral-200 text-daom-neutral-800 rounded-lg text-[11px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Encuentro</span>
                  </button>
                </div>
              </div>

              {/* Lista de Encuentros */}
              <div className="p-4 space-y-2">
                {!j.encuentros || j.encuentros.length === 0 ? (
                  <p className="text-xs text-daom-neutral-400 italic">
                    Sin encuentros programados. Presioná "+ Encuentro" para definir fecha, horario y Meet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {j.encuentros.map((enc) => (
                      <div
                        key={enc.id}
                        className="p-3.5 bg-white border border-daom-neutral-200 rounded-xl space-y-2.5 shadow-sm"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-mono text-[10px] text-daom-neutral-400 block">
                              {enc.id}
                            </span>
                            <h5 className="font-bold text-daom-neutral-900 text-xs">
                              {enc.nombre}
                            </h5>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                            {enc.duracion_horas}h
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-daom-neutral-600 font-mono">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-daom-blue" />
                            <span>{enc.fecha}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-daom-blue" />
                            <span>{enc.hora_inicio} a {enc.hora_fin}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-daom-neutral-100 flex items-center justify-between">
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Key className="w-3.5 h-3.5 text-daom-neutral-400" />
                            <span className="font-bold text-daom-neutral-800">CÓDIGO:</span>
                            <span className="bg-daom-neutral-100 px-1.5 py-0.5 rounded text-daom-blue font-extrabold">
                              {enc.attendance_code}
                            </span>
                          </div>

                          <button
                            onClick={() => openPresentismo(enc)}
                            className="px-2 py-1 bg-daom-neutral-900 hover:bg-black text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>QR / Asistencia</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE PRESENTISMO (QR + CÓDIGO + ASISTENCIA) */}
      {showPresentismoModal && selectedEncuentro && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-daom-neutral-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-extrabold text-daom-neutral-900 text-base">
                  Presentismo y Acreditación de Asistencia
                </h4>
                <p className="text-xs text-daom-neutral-500 font-mono">
                  {selectedEncuentro.nombre}
                </p>
              </div>
              <button
                onClick={() => setShowPresentismoModal(false)}
                className="text-daom-neutral-400 hover:text-daom-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Display de Código y QR */}
            <div className="p-6 bg-daom-neutral-900 text-white rounded-2xl text-center space-y-3">
              <p className="text-xs text-daom-neutral-400 uppercase tracking-widest font-semibold">
                Código Alfanumérico Fijo
              </p>
              <p className="text-4xl font-mono font-black tracking-widest text-amber-400">
                {selectedEncuentro.attendance_code}
              </p>
              <div className="pt-2 text-[11px] text-daom-neutral-400 leading-relaxed max-w-xs mx-auto">
                Mostrá este código o el QR durante la clase. Los alumnos pueden ingresarlo desde su campus para validar asistencia sin salir del streaming.
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                Válido hasta: {new Date(selectedEncuentro.attendance_valid_until).toLocaleString("es-AR")}
              </div>
            </div>

            {/* Lista de Alumnos Presentes */}
            <div>
              <h5 className="font-bold text-daom-neutral-900 text-xs mb-2">
                Alumnos Acreditados ({attendances.length}):
              </h5>
              <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                {loadingAtt ? (
                  <p className="text-daom-neutral-400">Cargando...</p>
                ) : attendances.length === 0 ? (
                  <p className="text-daom-neutral-400 italic">Sin acreditaciones registradas aún.</p>
                ) : (
                  attendances.map((att) => (
                    <div
                      key={att.id}
                      className="p-2 rounded bg-daom-neutral-50 border flex justify-between items-center"
                    >
                      <span className="font-semibold text-daom-neutral-800">
                        {att.user?.full_name || att.user_id}
                      </span>
                      <span className="text-[10px] font-mono text-daom-neutral-500 uppercase">
                        Vía {att.method} • {new Date(att.attended_at).toLocaleTimeString("es-AR")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                onClick={() => setShowPresentismoModal(false)}
                className="px-4 py-2 bg-daom-neutral-100 hover:bg-daom-neutral-200 rounded-lg text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR JORNADA */}
      {newJornadaOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateJornada}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 text-xs"
          >
            <h4 className="font-bold text-daom-neutral-900 text-base">Nueva Jornada Académica</h4>
            <div>
              <label className="font-bold block mb-1">Nombre de la Jornada</label>
              <input
                type="text"
                placeholder="Ej: Jornada 1: Teoría y Fundamentos"
                value={jornadaNombre}
                onChange={(e) => setJornadaNombre(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Modalidad</label>
              <select
                value={jornadaModalidad}
                onChange={(e) => setJornadaModalidad(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white"
              >
                <option value="presencial">Presencial (Sede Club DAOM)</option>
                <option value="streaming">Streaming Google Meet</option>
                <option value="hibrida">Híbrida (Mixta)</option>
                <option value="on_demand">On Demand</option>
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Precio Individual (ARS)</label>
              <input
                type="number"
                value={jornadaPrecio}
                onChange={(e) => setJornadaPrecio(Number(e.target.value))}
                className="w-full p-2 border rounded-lg font-mono"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => setNewJornadaOpen(false)}
                className="px-3 py-1.5 bg-daom-neutral-100 rounded-lg font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingJor}
                className="px-4 py-1.5 bg-daom-blue text-white rounded-lg font-bold"
              >
                {savingJor ? "Guardando..." : "Crear Jornada"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CREAR ENCUENTRO */}
      {targetJornadaId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEncuentro}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 text-xs"
          >
            <h4 className="font-bold text-daom-neutral-900 text-base">Nuevo Encuentro Académico</h4>
            <div>
              <label className="font-bold block mb-1">Nombre del Encuentro</label>
              <input
                type="text"
                placeholder="Ej: Módulo Práctico en Tarima"
                value={encNombre}
                onChange={(e) => setEncNombre(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold block mb-1">Fecha</label>
                <input
                  type="date"
                  value={encFecha}
                  onChange={(e) => setEncFecha(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Inicio</label>
                <input
                  type="time"
                  value={encHoraInicio}
                  onChange={(e) => setEncHoraInicio(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Fin</label>
                <input
                  type="time"
                  value={encHoraFin}
                  onChange={(e) => setEncHoraFin(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono"
                  required
                />
              </div>
            </div>
            <div>
              <label className="font-bold block mb-1">Modalidad</label>
              <select
                value={encModalidad}
                onChange={(e) => setEncModalidad(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white"
              >
                <option value="presencial">Presencial (Club DAOM)</option>
                <option value="streaming">Streaming Google Meet (Calendar)</option>
              </select>
            </div>
            <div className="pt-2 flex justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => setTargetJornadaId(null)}
                className="px-3 py-1.5 bg-daom-neutral-100 rounded-lg font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEnc}
                className="px-4 py-1.5 bg-daom-blue text-white rounded-lg font-bold"
              >
                {savingEnc ? "Guardando..." : "Crear Encuentro"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
