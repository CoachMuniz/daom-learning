"use client";

import React, { useState } from "react";
import {
  Activity,
  History,
  FileCode,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Radio,
  Clock,
  Layers,
} from "lucide-react";
import type { AuditLog, EditorialControl, SyncRun } from "@/lib/types";

interface AuditAdminProps {
  auditLogs: AuditLog[];
  editorialControls: EditorialControl[];
  syncRuns: SyncRun[];
}

export function AuditAdminView({
  auditLogs,
  editorialControls,
  syncRuns,
}: AuditAdminProps) {
  const [subTab, setSubTab] = useState<"logs" | "editorial" | "syncs">("logs");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = auditLogs.filter((l) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.action?.toLowerCase().includes(term) ||
      l.entity_type?.toLowerCase().includes(term) ||
      l.entity_id?.toLowerCase().includes(term) ||
      l.user_id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Selector de Subpestañas */}
      <div className="flex border-b border-daom-neutral-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setSubTab("logs")}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            subTab === "logs"
              ? "border-daom-blue text-daom-blue"
              : "border-transparent text-daom-neutral-500 hover:text-daom-neutral-900"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Registro de Auditoría ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setSubTab("editorial")}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            subTab === "editorial"
              ? "border-daom-blue text-daom-blue"
              : "border-transparent text-daom-neutral-500 hover:text-daom-neutral-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Control Editorial de Planilla ({editorialControls.length})</span>
        </button>

        <button
          onClick={() => setSubTab("syncs")}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            subTab === "syncs"
              ? "border-daom-blue text-daom-blue"
              : "border-transparent text-daom-neutral-500 hover:text-daom-neutral-900"
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Historial de Sincronización ({syncRuns.length})</span>
        </button>
      </div>

      {/* SUBPESTAÑA 1: REGISTRO DE AUDITORÍA OPERATIVO */}
      {subTab === "logs" && (
        <div className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
          <div className="p-5 border-b border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-daom-neutral-900 text-base">
                Eventos de Auditoría y Trazabilidad Administrativa
              </h3>
              <p className="text-xs text-daom-neutral-500">
                Registro inmutable de acciones realizadas en DAOM Learning. Los detalles técnicos son desplegables.
              </p>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por acción o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-daom-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-daom-blue"
              />
              <Search className="w-3.5 h-3.5 text-daom-neutral-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
                <tr>
                  <th className="p-3">Fecha / Hora</th>
                  <th className="p-3">Acción en Español</th>
                  <th className="p-3">Tipo de Entidad</th>
                  <th className="p-3">Identificador</th>
                  <th className="p-3 text-right">Detalles Técnicos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-daom-neutral-100">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  let detailsString = "{}";
                  if (log.details) {
                    detailsString =
                      typeof log.details === "object"
                        ? JSON.stringify(log.details, null, 2)
                        : String(log.details);
                  }

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-daom-neutral-50/50">
                        <td className="p-3 text-daom-neutral-500 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString("es-AR", {
                            timeZone: "America/Argentina/Buenos_Aires",
                          })}
                        </td>
                        <td className="p-3 font-bold text-daom-neutral-900">
                          {log.action}
                        </td>
                        <td className="p-3 uppercase text-daom-neutral-600 text-[11px]">
                          {log.entity_type}
                        </td>
                        <td className="p-3 font-mono text-daom-neutral-800">
                          {log.entity_id}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 text-daom-blue hover:underline font-semibold"
                          >
                            <span>{isExpanded ? "Ocultar" : "Ver JSON"}</span>
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="p-4 bg-daom-neutral-900 text-daom-neutral-200">
                            <pre className="font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {detailsString}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBPESTAÑA 2: CONTROL EDITORIAL DE PLANILLA */}
      {subTab === "editorial" && (
        <div className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
          <div className="p-5 border-b border-daom-neutral-200">
            <h3 className="font-bold text-daom-neutral-900 text-base">
              Observaciones de Control Editorial (Pestaña Google Sheets)
            </h3>
            <p className="text-xs text-daom-neutral-500">
              Notas técnicas que justifican por qué cada capacitación se mantiene en borrador o pendiente de publicación.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
                <tr>
                  <th className="p-3">Registro</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Estado Verificación</th>
                  <th className="p-3">Observaciones de la Revisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-daom-neutral-100">
                {editorialControls.map((ec) => (
                  <tr key={ec.registro_id} className="hover:bg-daom-neutral-50/50">
                    <td className="p-3 font-mono font-bold text-daom-neutral-800">
                      {ec.registro_id}
                    </td>
                    <td className="p-3 text-daom-neutral-600">{ec.tipo_registro}</td>
                    <td className="p-3 font-semibold text-daom-neutral-800">
                      {ec.estado_verificacion}
                    </td>
                    <td className="p-3 text-daom-neutral-700 max-w-xl">
                      {ec.observaciones || "Sin observaciones."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBPESTAÑA 3: HISTORIAL DE SINCRONIZACIONES */}
      {subTab === "syncs" && (
        <div className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
          <div className="p-5 border-b border-daom-neutral-200">
            <h3 className="font-bold text-daom-neutral-900 text-base">
              Historial de Sincronizaciones con Google Sheets
            </h3>
            <p className="text-xs text-daom-neutral-500">
              Auditoría de ejecuciones automáticas y manuales del catálogo.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
                <tr>
                  <th className="p-3">ID Sincronización</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Sincronizados</th>
                  <th className="p-3">Duración</th>
                  <th className="p-3">Iniciado Por</th>
                  <th className="p-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-daom-neutral-100">
                {syncRuns.map((sr) => (
                  <tr key={sr.id} className="hover:bg-daom-neutral-50/50">
                    <td className="p-3 font-mono font-bold text-daom-neutral-800">
                      {sr.id}
                    </td>
                    <td className="p-3 font-bold text-emerald-700 uppercase">
                      {sr.status}
                    </td>
                    <td className="p-3 font-mono">
                      {sr.records_synced} registros
                    </td>
                    <td className="p-3 text-daom-neutral-600 font-mono">
                      {sr.duration_ms} ms
                    </td>
                    <td className="p-3 text-daom-neutral-700">
                      {sr.triggered_by}
                    </td>
                    <td className="p-3 text-daom-neutral-500 font-mono">
                      {new Date(sr.started_at).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
