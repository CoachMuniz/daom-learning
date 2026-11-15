"use client";

import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  CreditCard,
  MessageSquare,
  ShieldAlert,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface TrainingEdition {
  oferta_id: string;
  nombre_edicion: string;
  modalidades: string;
  fecha_inicio?: string | null;
  whatsapp_group_url?: string | null;
  precios?: Array<{
    precio_id: string;
    mercado: string;
    moneda: string;
    precio_base: number;
    promocion_tipo?: string | null;
    promocion_valor?: number | null;
  }>;
}

interface Training {
  capacitacion_id: string;
  titulo: string;
  subtitulo?: string | null;
  tipo: string;
  ediciones?: TrainingEdition[];
}

interface Participant {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string | null;
  documentId?: string | null;
  country: string;
}

export function ManualEnrollmentManager() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(true);

  // Selecciones
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [selectedOfertaId, setSelectedOfertaId] = useState("");
  const [selectedModality, setSelectedModality] = useState<"presencial" | "streaming" | "on_demand">("presencial");
  const [market, setMarket] = useState<"AR" | "INT">("AR");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");

  // Participante
  const [participantMode, setParticipantMode] = useState<"search" | "new">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // Formulario nuevo participante
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDocumentId, setNewDocumentId] = useState("");
  const [newCountry, setNewCountry] = useState("AR");

  // Arancel y Pago
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [overrideAmount, setOverrideAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia" | "mercadopago_presencial" | "pendiente">("efectivo");
  const [paymentStatus, setPaymentStatus] = useState<"acreditado" | "declarado" | "pendiente">("acreditado");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  // Estado de envío
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar capacitaciones disponibles
  useEffect(() => {
    async function loadTrainings() {
      try {
        setLoadingTrainings(true);
        const res = await fetch("/api/admin/capacitaciones");
        if (res.ok) {
          const data = await res.json();
          setTrainings(data.trainings || []);
          if (data.trainings && data.trainings.length > 0) {
            setSelectedTrainingId(data.trainings[0].capacitacion_id);
            if (data.trainings[0].ediciones && data.trainings[0].ediciones.length > 0) {
              setSelectedOfertaId(data.trainings[0].ediciones[0].oferta_id);
            }
          }
        }
      } catch (err) {
        console.error("Error al cargar capacitaciones:", err);
      } finally {
        setLoadingTrainings(false);
      }
    }
    loadTrainings();
  }, []);

  // Buscar participantes con debounce
  useEffect(() => {
    if (participantMode !== "search") return;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/admin/participantes?q=${encodeURIComponent(searchQuery)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.participants || []);
        }
      } catch (e) {
        console.error("Error buscando participantes:", e);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, participantMode]);

  // Selección actual de capacitación y edición
  const selectedTraining = trainings.find((t) => t.capacitacion_id === selectedTrainingId);
  const selectedEdition = selectedTraining?.ediciones?.find((e) => e.oferta_id === selectedOfertaId) || selectedTraining?.ediciones?.[0];

  // Cálculo de precio vigente de referencia
  const activePriceObj = selectedEdition?.precios?.find(
    (p) => (p.mercado === market || (market === "AR" && p.mercado === "ARGENTINA")) && p.moneda === currency
  );

  let calculatedBase = activePriceObj ? Number(activePriceObj.precio_base) : 0;
  if (activePriceObj?.promocion_tipo === "porcentaje" && activePriceObj.promocion_valor) {
    calculatedBase = calculatedBase * (1 - activePriceObj.promocion_valor / 100);
  }

  // Actualizar monto recibido sugerido al cambiar arancel
  useEffect(() => {
    const finalCalculated = overrideAmount ? Number(overrideAmount) : calculatedBase;
    if (paymentStatus === "acreditado") {
      setAmountReceived(finalCalculated > 0 ? finalCalculated : 0);
    }
  }, [calculatedBase, overrideAmount, paymentStatus]);

  // Manejo de cambio en método de pago
  const handlePaymentMethodChange = (method: "efectivo" | "transferencia" | "mercadopago_presencial" | "pendiente") => {
    setPaymentMethod(method);
    if (method === "pendiente") {
      setPaymentStatus("pendiente");
      setAmountReceived(0);
    } else if (method === "transferencia") {
      setPaymentStatus("declarado"); // Por defecto para transferencias: requiere confirmación
    } else {
      setPaymentStatus("acreditado");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessResult(null);

    if (participantMode === "search" && !selectedParticipant) {
      setErrorMessage("Por favor seleccione un participante de la lista o registre uno nuevo.");
      return;
    }

    if (participantMode === "new" && (!newEmail.trim() || !newFullName.trim())) {
      setErrorMessage("Debe indicar al menos el correo electrónico y el nombre completo del nuevo participante.");
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        capacitacionId: selectedTrainingId,
        ofertaId: selectedEdition?.oferta_id || undefined,
        modalityId: selectedModality,
        market,
        currency,
        overrideAmount: overrideAmount ? Number(overrideAmount) : undefined,
        paymentMethod,
        paymentStatus,
        amountReceived: Number(amountReceived) || 0,
        paymentReference: paymentReference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (participantMode === "search" && selectedParticipant) {
        payload.userId = selectedParticipant.id;
      } else {
        payload.newParticipant = {
          email: newEmail.trim().toLowerCase(),
          fullName: newFullName.trim(),
          phone: newPhone.trim() || undefined,
          documentId: newDocumentId.trim() || undefined,
          country: newCountry,
        };
      }

      const res = await fetch("/api/admin/inscripciones/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || data.error || "Ocurrió un error al registrar la inscripción manual.");
      } else {
        setSuccessResult(data);
        // Limpiar formulario parcial
        setNotes("");
        setPaymentReference("");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error de red al procesar la inscripción.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
      {/* Cabecera del Módulo */}
      <div className="p-6 bg-gradient-to-r from-daom-navy-dark via-daom-navy to-daom-navy-light text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-daom-gold uppercase tracking-wider mb-1">
            <UserPlus className="w-4 h-4" />
            <span>Módulo Administrativo</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Inscripciones → Nueva inscripción manual
          </h2>
          <p className="text-xs text-daom-neutral-300 mt-1 max-w-2xl">
            Inscripción directa de participantes sin pasar por Jerkson ni generar cobros duplicados en pasarelas. Admite cobros en efectivo, transferencias bancarias y Mercado Pago presencial.
          </p>
        </div>
      </div>

      {/* Mensajes de Resultado */}
      {errorMessage && (
        <div className="m-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error en la operación</p>
            <p className="text-xs mt-0.5 text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {successResult && (
        <div className="m-6 p-5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-sm space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-base">{successResult.message}</p>
              <p className="text-xs font-mono">
                Inscripción: <strong>{successResult.enrollment.id}</strong> • Estado:{" "}
                <span className="uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D]">
                  {successResult.enrollment.status}
                </span>
              </p>
              <p className="text-xs text-[#166534]">
                Participante: <strong>{successResult.enrollment.participant.fullName}</strong> ({successResult.enrollment.participant.email})
              </p>
              {successResult.enrollment.edition.whatsapp_group_url && (
                <p className="text-xs flex items-center gap-1.5 mt-2 text-[#15803D]">
                  <MessageSquare className="w-4 h-4" />
                  <span>Grupo de WhatsApp asignado: </span>
                  <a
                    href={successResult.enrollment.edition.whatsapp_group_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono underline font-bold"
                  >
                    {successResult.enrollment.edition.whatsapp_group_url}
                  </a>
                </p>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-[#DCFCE7] flex items-center justify-between text-xs">
            <span>Material complementario: {successResult.enrollment.status === "confirmada" ? "Habilitado de inmediato" : "Pendiente de pago"}</span>
            <button
              onClick={() => setSuccessResult(null)}
              className="text-xs text-[#166534] font-bold hover:underline"
            >
              Registrar otra inscripción
            </button>
          </div>
        </div>
      )}

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
        {/* PASO 1: SELECCIONAR CAPACITACIÓN Y MODALIDAD */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-daom-neutral-700 flex items-center gap-2 border-b border-daom-neutral-200 pb-2">
            <span className="w-5 h-5 rounded-full bg-daom-blue text-white flex items-center justify-center text-xs">1</span>
            <span>Capacitación, Edición y Modalidad</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                Capacitación <span className="text-daom-red">*</span>
              </label>
              {loadingTrainings ? (
                <div className="p-2 border rounded text-xs text-daom-neutral-400">Cargando catálogo...</div>
              ) : (
                <select
                  value={selectedTrainingId}
                  onChange={(e) => {
                    setSelectedTrainingId(e.target.value);
                    const tr = trainings.find((t) => t.capacitacion_id === e.target.value);
                    if (tr?.ediciones && tr.ediciones.length > 0) {
                      setSelectedOfertaId(tr.ediciones[0].oferta_id);
                    }
                  }}
                  className="w-full text-xs font-medium border border-daom-neutral-300 rounded-lg p-2.5 bg-white text-daom-neutral-900 focus:outline-none focus:ring-2 focus:ring-daom-blue"
                  required
                >
                  {trainings.map((t) => (
                    <option key={t.capacitacion_id} value={t.capacitacion_id}>
                      [{t.capacitacion_id}] {t.titulo}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                Edición de Calendario
              </label>
              <select
                value={selectedOfertaId}
                onChange={(e) => setSelectedOfertaId(e.target.value)}
                className="w-full text-xs font-medium border border-daom-neutral-300 rounded-lg p-2.5 bg-white text-daom-neutral-900 focus:outline-none focus:ring-2 focus:ring-daom-blue"
              >
                {selectedTraining?.ediciones?.map((ed) => (
                  <option key={ed.oferta_id} value={ed.oferta_id}>
                    {ed.nombre_edicion} {ed.fecha_inicio ? `(${ed.fecha_inicio})` : ""}
                  </option>
                )) || <option value="">Sin ediciones asignadas</option>}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                Modalidad del Participante <span className="text-daom-red">*</span>
              </label>
              <select
                value={selectedModality}
                onChange={(e) => setSelectedModality(e.target.value as any)}
                className="w-full text-xs font-medium border border-daom-neutral-300 rounded-lg p-2.5 bg-white text-daom-neutral-900 focus:outline-none focus:ring-2 focus:ring-daom-blue"
                required
              >
                <option value="presencial">Presencial (Sede Club DAOM)</option>
                <option value="streaming">Streaming en Vivo (Google Meet)</option>
                <option value="on_demand">On Demand (Grabación + ZIP)</option>
              </select>
            </div>
          </div>

          {/* Banner de Enlace de WhatsApp Configurado */}
          <div className="bg-daom-neutral-50 rounded-lg p-3 border border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-daom-neutral-700">Enlace WhatsApp de la Capacitación:</span>
              <span className="font-mono text-daom-neutral-600 truncate max-w-md">
                {selectedEdition?.whatsapp_group_url || "No configurado aún"}
              </span>
            </div>
            <a
              href="#whatsapp-manager"
              className="text-daom-blue font-semibold hover:underline flex-shrink-0"
            >
              Configurar / Actualizar Enlace
            </a>
          </div>
        </div>

        {/* PASO 2: PARTICIPANTE (BUSCAR O REGISTRAR NUEVO) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-daom-neutral-200 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-daom-neutral-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-daom-blue text-white flex items-center justify-center text-xs">2</span>
              <span>Identificación del Participante</span>
            </h3>

            <div className="inline-flex rounded-lg border border-daom-neutral-200 p-0.5 bg-daom-neutral-100 text-xs">
              <button
                type="button"
                onClick={() => setParticipantMode("search")}
                className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                  participantMode === "search" ? "bg-white text-daom-neutral-900 shadow-sm" : "text-daom-neutral-500 hover:text-daom-neutral-900"
                }`}
              >
                Buscar Existente
              </button>
              <button
                type="button"
                onClick={() => {
                  setParticipantMode("new");
                  setSelectedParticipant(null);
                }}
                className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                  participantMode === "new" ? "bg-white text-daom-neutral-900 shadow-sm" : "text-daom-neutral-500 hover:text-daom-neutral-900"
                }`}
              >
                Registrar Nuevo
              </button>
            </div>
          </div>

          {participantMode === "search" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-daom-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email, DNI o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2.5 border border-daom-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-daom-blue text-daom-neutral-900"
                />
              </div>

              {searching && <p className="text-xs text-daom-neutral-400">Buscando participantes...</p>}

              {/* Lista de Resultados */}
              {searchResults.length > 0 && !selectedParticipant && (
                <div className="border border-daom-neutral-200 rounded-lg divide-y divide-daom-neutral-100 max-h-48 overflow-y-auto">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedParticipant(p)}
                      className="p-2.5 hover:bg-daom-blue/5 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <p className="font-bold text-daom-neutral-900">{p.fullName}</p>
                        <p className="text-daom-neutral-500 font-mono">{p.email} • {p.phone || "Sin tel"} • DNI: {p.documentId || "S/D"}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-daom-blue uppercase px-2 py-0.5 rounded bg-daom-blue/10">
                        Seleccionar
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Participante Seleccionado */}
              {selectedParticipant && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-blue-950">
                        {selectedParticipant.fullName}{" "}
                        <span className="font-mono font-normal text-blue-700">({selectedParticipant.email})</span>
                      </p>
                      <p className="text-blue-800 text-[11px]">
                        ID: {selectedParticipant.id} • DNI: {selectedParticipant.documentId || "No informado"} • Tel: {selectedParticipant.phone || "No informado"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedParticipant(null)}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Modo Registro de Nuevo Participante */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-daom-neutral-50 border border-daom-neutral-200 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                  Correo Electrónico <span className="text-daom-red">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alumno@ejemplo.com"
                  className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900"
                  required={participantMode === "new"}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                  Nombre Completo <span className="text-daom-red">*</span>
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ej: Marcos Maidana"
                  className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900"
                  required={participantMode === "new"}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+54 11 1234-5678"
                  className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                  DNI / Identificación
                </label>
                <input
                  type="text"
                  value={newDocumentId}
                  onChange={(e) => setNewDocumentId(e.target.value)}
                  placeholder="Documento nacional"
                  className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* PASO 3: ARANCEL, MEDIO DE PAGO Y ACREDITACIÓN */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-daom-neutral-700 flex items-center gap-2 border-b border-daom-neutral-200 pb-2">
            <span className="w-5 h-5 rounded-full bg-daom-blue text-white flex items-center justify-center text-xs">3</span>
            <span>Arancel, Medio de Pago y Verificación</span>
          </h3>

          {/* Arancel de Referencia */}
          <div className="p-4 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <span className="text-xs text-daom-neutral-500 font-semibold block">Precio Vigente de Catálogo</span>
              <p className="text-2xl font-black text-daom-neutral-900">
                {currency} ${calculatedBase > 0 ? calculatedBase.toLocaleString("es-AR") : "No fijado"}
              </p>
              {activePriceObj?.promocion_valor && (
                <span className="text-[11px] text-emerald-700 font-semibold">
                  (Incluye bonificación del {activePriceObj.promocion_valor}%)
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                Moneda y Mercado
              </label>
              <div className="flex gap-2">
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value as any)}
                  className="text-xs p-2 border rounded-md bg-white text-daom-neutral-900"
                >
                  <option value="AR">Nacional (AR)</option>
                  <option value="INT">Internacional (INT)</option>
                </select>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="text-xs p-2 border rounded-md bg-white text-daom-neutral-900"
                >
                  <option value="ARS">ARS ($)</option>
                  <option value="USD">USD (u$s)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                Modificar Arancel Manualmente (Opcional)
              </label>
              <input
                type="number"
                step="any"
                placeholder={calculatedBase.toString()}
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                className="w-full text-xs p-2 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900"
              />
            </div>
          </div>

          {/* Medios de Pago y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                Medio de Pago <span className="text-daom-red">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => handlePaymentMethodChange(e.target.value as any)}
                className="w-full text-xs font-medium border border-daom-neutral-300 rounded-lg p-2.5 bg-white text-daom-neutral-900"
                required
              >
                <option value="efectivo">Efectivo presencial</option>
                <option value="transferencia">Transferencia bancaria</option>
                <option value="mercadopago_presencial">Mercado Pago presencial / QR</option>
                <option value="pendiente">Pago pendiente de definición</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                Estado del Cobro <span className="text-daom-red">*</span>
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full text-xs font-medium border border-daom-neutral-300 rounded-lg p-2.5 bg-white text-daom-neutral-900"
                required
              >
                <option value="acreditado">Pago Acreditado (Confirmado)</option>
                <option value="declarado">Pago Declarado (Pendiente de verificación)</option>
                <option value="pendiente">Pendiente de Pago</option>
              </select>
              <span className="text-[10px] text-daom-neutral-400 mt-1 block leading-tight">
                Transferencias con comprobante deben cargarse como <em>Declarado</em> hasta verificar el extracto.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                Importe Recibido ({currency})
              </label>
              <input
                type="number"
                step="any"
                value={amountReceived}
                onChange={(e) => setAmountReceived(Number(e.target.value))}
                className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
                N° de Comprobante / Referencia
              </label>
              <input
                type="text"
                placeholder="Ej: TRANSF-892147 / RECIBO-0012"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-daom-neutral-700 mb-1">
              Observaciones Administrativas / Auditoría
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalle complementario, datos del responsable o aclaraciones sobre el cobro..."
              className="w-full text-xs p-2.5 border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-900"
            />
          </div>
        </div>

        {/* Botón de Confirmación de Operación */}
        <div className="pt-4 border-t border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-daom-neutral-500 font-mono">
            Operación auditada con identificador del administrador y prevención de doble acreditación.
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-daom-navy hover:bg-daom-navy-dark text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-daom-gold" />
                <span>Confirmar Inscripción Manual</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
