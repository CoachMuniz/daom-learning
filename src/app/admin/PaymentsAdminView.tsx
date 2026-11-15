"use client";

import React, { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  FileText,
  User,
  Calendar,
} from "lucide-react";
import type { Enrollment } from "@/lib/types";

interface PaymentsAdminProps {
  enrollments: Enrollment[];
  onConfirmPayment: (enrollment: Enrollment) => void;
  onViewComprobante: (enrollment: Enrollment) => void;
}

export function PaymentsAdminView({
  enrollments,
  onConfirmPayment,
  onViewComprobante,
}: PaymentsAdminProps) {
  const [filterStatus, setFilterStatus] = useState<"todos" | "acreditados" | "pendientes">("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = enrollments.filter((e) => {
    const isPaid = e.status === "confirmada" || e.amount_paid >= e.amount_total;
    if (filterStatus === "acreditados" && !isPaid) return false;
    if (filterStatus === "pendientes" && isPaid) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchName = e.user?.full_name?.toLowerCase().includes(term);
      const matchEmail = e.user?.email?.toLowerCase().includes(term);
      const matchCap = e.capacitacion_id?.toLowerCase().includes(term);
      const matchId = e.id?.toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchCap && !matchId) return false;
    }
    return true;
  });

  const totalRecaudado = enrollments.reduce((acc, curr) => acc + Number(curr.amount_paid || 0), 0);
  const totalPendiente = enrollments
    .filter((e) => e.status === "pendiente_pago")
    .reduce((acc, curr) => acc + Math.max(0, Number(curr.amount_total || 0) - Number(curr.amount_paid || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Tarjetas Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-daom-neutral-200 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-daom-neutral-500 uppercase">
                Total Cobrado y Acreditado
              </p>
              <p className="text-2xl font-extrabold text-emerald-800 font-mono">
                ${totalRecaudado.toLocaleString("es-AR")} ARS
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-daom-neutral-200 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-700">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-daom-neutral-500 uppercase">
                Saldo Pendiente por Cobrar
              </p>
              <p className="text-2xl font-extrabold text-amber-800 font-mono">
                ${totalPendiente.toLocaleString("es-AR")} ARS
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-daom-neutral-200 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-daom-blue">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-daom-neutral-500 uppercase">
                Medios Habilitados
              </p>
              <p className="text-xs font-bold text-daom-neutral-900 mt-1">
                Mercado Pago • Transferencia • Efectivo
              </p>
              <p className="text-[11px] text-daom-neutral-500">
                Acreditación manual y conciliación
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla con Búsqueda y Filtros */}
      <div className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-daom-neutral-900 text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-daom-blue" />
              <span>Control y Gestión de Operaciones Financieras</span>
            </h3>
            <p className="text-xs text-daom-neutral-500">
              Acreditación manual de transferencias bancarias, cobros en efectivo y seguimiento contable.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por alumno o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-daom-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-daom-blue"
              />
              <Search className="w-3.5 h-3.5 text-daom-neutral-400 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="py-1.5 px-3 text-xs border border-daom-neutral-300 rounded-lg bg-white text-daom-neutral-800"
            >
              <option value="todos">Todos los pagos</option>
              <option value="acreditados">Solo Acreditados</option>
              <option value="pendientes">Solo Pendientes</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
              <tr>
                <th className="p-3">ID Inscripción</th>
                <th className="p-3">Participante</th>
                <th className="p-3">Capacitación</th>
                <th className="p-3">Medio Registrado</th>
                <th className="p-3">Arancel Total</th>
                <th className="p-3">Acreditado</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-daom-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-daom-neutral-500 italic">
                    No se encontraron operaciones registradas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const isPaid = e.status === "confirmada" || e.amount_paid >= e.amount_total;
                  return (
                    <tr key={e.id} className="hover:bg-daom-neutral-50/50">
                      <td className="p-3 font-mono font-bold text-daom-neutral-800">
                        {e.id}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-daom-neutral-900">{e.user?.full_name}</p>
                        <p className="text-[11px] text-daom-neutral-500 font-mono">{e.user?.email}</p>
                      </td>
                      <td className="p-3 font-medium text-daom-neutral-800">{e.capacitacion_id}</td>
                      <td className="p-3 text-daom-neutral-600 uppercase text-[11px]">
                        {e.payment_method || "N/A"}
                      </td>
                      <td className="p-3 font-mono text-daom-neutral-700">
                        {e.currency} ${Number(e.amount_total).toLocaleString("es-AR")}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        ${Number(e.amount_paid).toLocaleString("es-AR")}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            isPaid
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : e.status === "pendiente_pago"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-daom-neutral-100 text-daom-neutral-600"
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>{isPaid ? "Acreditado" : "Pendiente"}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {!isPaid && (
                            <button
                              onClick={() => onConfirmPayment(e)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold shadow-sm"
                            >
                              Acreditar
                            </button>
                          )}
                          <button
                            onClick={() => onViewComprobante(e)}
                            className="px-2.5 py-1 bg-daom-neutral-100 hover:bg-daom-neutral-200 text-daom-neutral-800 rounded text-[11px] font-semibold"
                          >
                            Comprobante
                          </button>
                        </div>
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
