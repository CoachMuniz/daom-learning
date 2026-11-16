"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Trash2,
  Eye,
  Plus,
  Loader2,
  Users,
} from "lucide-react";
import type { Training } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { AcademicHierarchyManager } from "./AcademicHierarchyManager";

interface TrainingsAdminProps {
  trainings: Training[];
  onOpenSyncPlanilla: () => void;
  onFilterEnrollmentsByCapacitacion: (capacitacionId: string) => void;
}

export function TrainingsAdminView({
  trainings,
  onOpenSyncPlanilla,
  onFilterEnrollmentsByCapacitacion,
}: TrainingsAdminProps) {
  const [trainingList, setTrainingList] = useState<Training[]>(trainings);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedHierarchyCapId, setSelectedHierarchyCapId] = useState<string | null>(
    trainings[0]?.capacitacion_id || null
  );

  const handleDeleteOrArchive = async (capId: string) => {
    if (!confirm(`¿Deseas archivar o eliminar la capacitación ${capId}? Si posee alumnos inscritos, será archivada de forma segura para no romper su historial.`)) {
      return;
    }

    setActionLoading(capId);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/capacitaciones/${capId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message || "Error al procesar la capacitación.");
      } else {
        alert(data.message);
        setTrainingList((prev) => prev.filter((t) => t.capacitacion_id !== capId));
      }
    } catch (err: any) {
      setActionError(err.message || "Error de red.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Cabecera y Enlace a Planilla */}
      <div className="bg-white p-6 rounded-xl border border-daom-neutral-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-daom-neutral-900 text-base flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-daom-blue" />
            <span>Catálogo Editorial de Capacitaciones</span>
          </h3>
          <p className="text-xs text-daom-neutral-500">
            Google Sheets es la fuente única de verdad para el catálogo y ediciones académicas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://docs.google.com/spreadsheets/d/1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-daom-neutral-100 hover:bg-daom-neutral-200 text-daom-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Editar en Google Sheets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Tabla de Capacitaciones */}
      <div className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Título / Formación</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Ediciones</th>
                <th className="p-3">Estado Editorial</th>
                <th className="p-3">Verificación</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-daom-neutral-100">
              {trainingList.map((t) => {
                const isPublic = t.estado_editorial === "publicado" && t.verificacion === "verificado";
                return (
                  <tr key={t.capacitacion_id} className="hover:bg-daom-neutral-50/50">
                    <td className="p-3 font-mono font-bold text-daom-neutral-800">
                      {t.capacitacion_id}
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-daom-neutral-900">{t.titulo}</p>
                      {t.subtitulo && (
                        <p className="text-[11px] text-daom-neutral-500">{t.subtitulo}</p>
                      )}
                    </td>
                    <td className="p-3 uppercase font-medium text-daom-neutral-600">
                      {t.tipo}
                    </td>
                    <td className="p-3 text-daom-neutral-600">
                      {t.ediciones?.length || 0} edición(es)
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        label={t.estado_editorial}
                        variant={t.estado_editorial === "publicado" ? "success" : "neutral"}
                      />
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        label={t.verificacion}
                        variant={t.verificacion === "verificado" ? "success" : "warning"}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedHierarchyCapId(t.capacitacion_id)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                            selectedHierarchyCapId === t.capacitacion_id
                              ? "bg-daom-blue text-white"
                              : "bg-daom-neutral-100 hover:bg-daom-neutral-200 text-daom-neutral-800"
                          }`}
                          title="Gestionar Jornadas y Encuentros"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Jornadas</span>
                        </button>
                        <button
                          onClick={() => onFilterEnrollmentsByCapacitacion(t.capacitacion_id)}
                          className="px-2 py-1 bg-daom-neutral-100 hover:bg-daom-neutral-200 text-daom-neutral-800 rounded text-[11px] font-semibold flex items-center gap-1"
                          title="Ver participantes de esta capacitación"
                        >
                          <Users className="w-3 h-3 text-daom-blue" />
                          <span>Alumnos</span>
                        </button>
                        <button
                          onClick={() => handleDeleteOrArchive(t.capacitacion_id)}
                          disabled={actionLoading === t.capacitacion_id}
                          className="p-1 hover:bg-rose-100 rounded text-rose-500 hover:text-rose-700 disabled:opacity-50"
                          title="Archivar o Eliminar Capacitación"
                        >
                          {actionLoading === t.capacitacion_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Visual de Jornadas y Encuentros para la Capacitación Seleccionada */}
      {selectedHierarchyCapId && (
        <AcademicHierarchyManager capacitacionId={selectedHierarchyCapId} />
      )}
    </div>
  );
}
