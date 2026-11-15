"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Loader2,
  FileText,
  DollarSign,
  UserCheck,
  Building2,
} from "lucide-react";

interface Scholarship {
  id: string;
  enrollment_id: string;
  user_id: string;
  capacitacion_id: string;
  percentage: number;
  original_amount: number;
  discounted_amount: number;
  remaining_amount: number;
  currency: string;
  granted_by: string;
  reason?: string | null;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
  training?: {
    titulo: string;
  };
}

interface ScholarshipAdminProps {
  onOpenBecarModal?: () => void;
}

export function ScholarshipAdminManager({ onOpenBecarModal }: ScholarshipAdminProps) {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCapacitacion, setFilterCapacitacion] = useState("todas");

  const fetchScholarships = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/becas");
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error al cargar el registro de becas");
      } else {
        setScholarships(data.scholarships || []);
      }
    } catch (err: any) {
      setError(err.message || "Error de red al consultar becas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholarships();
  }, []);

  const filtered = scholarships.filter((s) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      s.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.enrollment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCap =
      filterCapacitacion === "todas" || s.capacitacion_id === filterCapacitacion;

    return matchesSearch && matchesCap;
  });

  const uniqueCapacitaciones = Array.from(
    new Set(scholarships.map((s) => s.capacitacion_id))
  );

  const totalBonificado = scholarships.reduce(
    (acc, curr) => acc + Number(curr.discounted_amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Cabecera y Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-daom-neutral-200 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-700">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-daom-neutral-500 uppercase">
                Becas Concedidas
              </p>
              <p className="text-2xl font-extrabold text-daom-neutral-900">
                {scholarships.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-daom-neutral-200 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-700">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-daom-neutral-500 uppercase">
                Total Bonificado
              </p>
              <p className="text-2xl font-extrabold text-emerald-800 font-mono">
                ${totalBonificado.toLocaleString("es-AR")} ARS
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-daom-neutral-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-daom-neutral-500 uppercase">
              Regla Institucional
            </p>
            <p className="text-xs font-bold text-daom-neutral-800 mt-1">
              Inmutabilidad Definitiva (1% a 100%)
            </p>
            <p className="text-[11px] text-daom-neutral-500">
              No editable tras su confirmación
            </p>
          </div>
          {onOpenBecarModal && (
            <button
              onClick={onOpenBecarModal}
              className="px-3.5 py-2 bg-daom-blue hover:bg-daom-blue/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Otorgar Beca</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla con Búsqueda y Filtros */}
      <div className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-daom-neutral-900 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <span>Registro de Becas Otorgadas</span>
            </h3>
            <p className="text-xs text-daom-neutral-500">
              Trazabilidad completa con arancel original, porcentaje, importe bonificado y saldo pendiente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-daom-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-daom-blue"
              />
              <Search className="w-3.5 h-3.5 text-daom-neutral-400 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={filterCapacitacion}
              onChange={(e) => setFilterCapacitacion(e.target.value)}
              className="py-1.5 px-3 text-xs border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-800"
            >
              <option value="todas">Todas las capacitaciones</option>
              {uniqueCapacitaciones.map((cap) => (
                <option key={cap} value={cap}>
                  {cap}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
              <tr>
                <th className="p-3">ID Beca</th>
                <th className="p-3">Participante</th>
                <th className="p-3">Capacitación</th>
                <th className="p-3 text-center">Porcentaje</th>
                <th className="p-3">Arancel Original</th>
                <th className="p-3">Bonificación</th>
                <th className="p-3">Saldo Restante</th>
                <th className="p-3">Otorgado Por</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-daom-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-daom-neutral-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-daom-blue" />
                    Cargando registro de becas...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-daom-neutral-500 italic">
                    No se registran becas concedidas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const isFull = Number(s.percentage) === 100;
                  return (
                    <tr key={s.id} className="hover:bg-daom-neutral-50/50">
                      <td className="p-3 font-mono font-bold text-daom-neutral-800">
                        {s.id}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-daom-neutral-900">
                          {s.user?.full_name || "Desconocido"}
                        </p>
                        <p className="text-[11px] text-daom-neutral-500 font-mono">
                          {s.user?.email}
                        </p>
                      </td>
                      <td className="p-3 font-medium text-daom-neutral-800">
                        {s.capacitacion_id}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                            isFull
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {s.percentage}% {isFull ? "(TOTAL)" : ""}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-daom-neutral-600">
                        ${Number(s.original_amount).toLocaleString("es-AR")}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        -${Number(s.discounted_amount).toLocaleString("es-AR")}
                      </td>
                      <td className="p-3 font-mono font-bold text-daom-neutral-900">
                        {s.remaining_amount === 0 ? (
                          <span className="text-purple-700">$0 (Saldado)</span>
                        ) : (
                          `$${Number(s.remaining_amount).toLocaleString("es-AR")}`
                        )}
                      </td>
                      <td className="p-3 text-daom-neutral-600 text-[11px]">
                        {s.granted_by}
                      </td>
                      <td className="p-3 text-daom-neutral-500 font-mono text-[11px]">
                        {new Date(s.created_at).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
