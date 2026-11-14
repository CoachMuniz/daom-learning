"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, FileText, Loader2, X } from "lucide-react";
import type { Enrollment } from "@/lib/types";

interface EnrollmentListProps {
  initialEnrollments: Enrollment[];
}

export function EnrollmentAdminList({ initialEnrollments }: EnrollmentListProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialEnrollments);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [paymentsDetail, setPaymentsDetail] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal para confirmar pago pendiente
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetEnrollment, setTargetEnrollment] = useState<Enrollment | null>(null);
  const [confirmAmount, setConfirmAmount] = useState<number>(0);
  const [confirmMethod, setConfirmMethod] = useState<"transferencia" | "efectivo" | "mercadopago_presencial">("transferencia");
  const [confirmReference, setConfirmReference] = useState("");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const openConfirmModal = (enr: Enrollment) => {
    setTargetEnrollment(enr);
    setConfirmAmount(enr.amount_total - enr.amount_paid > 0 ? enr.amount_total - enr.amount_paid : enr.amount_total);
    setConfirmReference("");
    setConfirmNotes("");
    setConfirmError(null);
    setConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEnrollment) return;
    setConfirming(true);
    setConfirmError(null);

    try {
      const res = await fetch("/api/admin/inscripciones/confirmar-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: targetEnrollment.id,
          amount: Number(confirmAmount),
          paymentMethod: confirmMethod,
          paymentReference: confirmReference.trim() || undefined,
          notes: confirmNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setConfirmError(data.message || data.error || "Error al confirmar el pago.");
      } else {
        // Actualizar lista local
        setEnrollments((prev) =>
          prev.map((item) =>
            item.id === targetEnrollment.id
              ? { ...item, status: "confirmada", amount_paid: confirmAmount }
              : item
          )
        );
        setConfirmModalOpen(false);
        setTargetEnrollment(null);
      }
    } catch (err: any) {
      setConfirmError(err.message || "Error de conexión.");
    } finally {
      setConfirming(false);
    }
  };

  const openDetail = async (enr: Enrollment) => {
    setSelectedEnrollment(enr);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/inscripciones/${enr.id}`);
      if (res.ok) {
        const data = await res.json();
        setPaymentsDetail(data.payments || []);
      }
    } catch (err) {
      console.error("Error al cargar comprobantes:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
      <div className="p-6 border-b border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-daom-blue" />
            <span>Registro y Control de Inscripciones y Pagos</span>
          </h2>
          <p className="text-xs text-daom-neutral-500">
            Seguimiento de cobros presenciales, acreditación de transferencias bancarias y habilitación de materiales complementarios.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
            <tr>
              <th className="p-3">ID Inscripción</th>
              <th className="p-3">Participante</th>
              <th className="p-3">Capacitación</th>
              <th className="p-3">Modalidad</th>
              <th className="p-3">Arancel / Cobrado</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Medio de Pago</th>
              <th className="p-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-daom-neutral-100">
            {enrollments.map((e) => {
              const isPaid = e.status === "confirmada";
              return (
                <tr key={e.id} className="hover:bg-daom-neutral-50/50">
                  <td className="p-3 font-mono font-bold text-daom-neutral-800">
                    <button
                      onClick={() => openDetail(e)}
                      className="text-daom-blue hover:underline"
                    >
                      {e.id}
                    </button>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-daom-neutral-900">{e.user?.full_name || "Desconocido"}</p>
                    <p className="text-[11px] text-daom-neutral-500 font-mono">{e.user?.email}</p>
                  </td>
                  <td className="p-3 font-medium text-daom-neutral-800">{e.capacitacion_id}</td>
                  <td className="p-3 uppercase text-daom-neutral-600">{e.modality_id}</td>
                  <td className="p-3 font-mono">
                    <p className="font-bold text-daom-neutral-900">
                      {e.currency} ${Number(e.amount_total).toLocaleString("es-AR")}
                    </p>
                    <p className="text-[11px] text-daom-neutral-500">
                      Cobrado: ${Number(e.amount_paid).toLocaleString("es-AR")}
                    </p>
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
                      <span>{e.status}</span>
                    </span>
                  </td>
                  <td className="p-3 text-daom-neutral-600 uppercase text-[11px]">
                    {e.payment_method || "N/A"}
                  </td>
                  <td className="p-3 text-right">
                    {e.status === "pendiente_pago" ? (
                      <button
                        onClick={() => openConfirmModal(e)}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold shadow-sm"
                      >
                        Acreditar Pago
                      </button>
                    ) : (
                      <button
                        onClick={() => openDetail(e)}
                        className="px-2.5 py-1 bg-daom-neutral-100 hover:bg-daom-neutral-200 text-daom-neutral-800 rounded text-[11px] font-semibold"
                      >
                        Comprobante
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle de Inscripción y Comprobantes */}
      {selectedEnrollment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-daom-neutral-200">
            <div className="flex items-center justify-between border-b border-daom-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-daom-neutral-900 text-base">
                  Comprobante y Estado de Inscripción
                </h3>
                <p className="text-xs font-mono text-daom-neutral-500">{selectedEnrollment.id}</p>
              </div>
              <button
                onClick={() => setSelectedEnrollment(null)}
                className="text-daom-neutral-400 hover:text-daom-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-daom-neutral-50 p-3 rounded-lg">
                <div>
                  <span className="text-daom-neutral-500 block">Participante:</span>
                  <span className="font-bold text-daom-neutral-900">{selectedEnrollment.user?.full_name}</span>
                </div>
                <div>
                  <span className="text-daom-neutral-500 block">Email:</span>
                  <span className="font-mono text-daom-neutral-900">{selectedEnrollment.user?.email}</span>
                </div>
                <div>
                  <span className="text-daom-neutral-500 block">Capacitación:</span>
                  <span className="font-bold text-daom-neutral-900">{selectedEnrollment.capacitacion_id}</span>
                </div>
                <div>
                  <span className="text-daom-neutral-500 block">Modalidad:</span>
                  <span className="font-bold uppercase text-daom-neutral-900">{selectedEnrollment.modality_id}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="font-bold text-daom-neutral-900 block mb-1">
                  Registros de Pagos y Acreditación:
                </span>
                {loadingDetail ? (
                  <p className="text-daom-neutral-400">Cargando registros...</p>
                ) : paymentsDetail.length === 0 ? (
                  <p className="text-daom-neutral-500 italic bg-daom-neutral-50 p-2.5 rounded">
                    Sin registros de pago asentados aún.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {paymentsDetail.map((p) => (
                      <div key={p.id} className="p-2.5 border rounded-lg bg-daom-neutral-50 font-mono text-[11px] space-y-0.5">
                        <div className="flex justify-between font-bold">
                          <span>{p.id}</span>
                          <span className={p.status === "approved" ? "text-emerald-700 uppercase" : "text-amber-700 uppercase"}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-daom-neutral-700">
                          {p.currency} ${Number(p.amount).toLocaleString("es-AR")} • Proveedor: {p.provider}
                        </p>
                        <p className="text-daom-neutral-500 text-[10px]">
                          Ref: {p.external_payment_id || "N/A"} • Fecha: {new Date(p.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-daom-neutral-200 flex justify-end">
              <button
                onClick={() => setSelectedEnrollment(null)}
                className="px-4 py-2 bg-daom-neutral-200 hover:bg-daom-neutral-300 rounded-lg text-xs font-semibold text-daom-neutral-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Confirmar Pago Pendiente */}
      {confirmModalOpen && targetEnrollment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmSubmit}
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-daom-neutral-200"
          >
            <div className="flex items-center justify-between border-b border-daom-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-daom-neutral-900 text-base">
                  Acreditar Pago de Inscripción
                </h3>
                <p className="text-xs font-mono text-daom-neutral-500">{targetEnrollment.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="text-daom-neutral-400 hover:text-daom-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {confirmError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">
                {confirmError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-daom-neutral-500 block">Participante:</span>
                <span className="font-bold text-daom-neutral-900">
                  {targetEnrollment.user?.full_name} ({targetEnrollment.user?.email})
                </span>
              </div>

              <div>
                <label className="block font-bold text-daom-neutral-700 mb-1">
                  Medio de Pago Verificado
                </label>
                <select
                  value={confirmMethod}
                  onChange={(e) => setConfirmMethod(e.target.value as any)}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900"
                  required
                >
                  <option value="transferencia">Transferencia bancaria (Extracto verificado)</option>
                  <option value="efectivo">Efectivo presencial</option>
                  <option value="mercadopago_presencial">Mercado Pago presencial / Point</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-daom-neutral-700 mb-1">
                  Importe Acreditado ({targetEnrollment.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={confirmAmount}
                  onChange={(e) => setConfirmAmount(Number(e.target.value))}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-daom-neutral-700 mb-1">
                  Referencia de Transferencia / Comprobante
                </label>
                <input
                  type="text"
                  placeholder="Ej: TRF-091240-BANCO"
                  value={confirmReference}
                  onChange={(e) => setConfirmReference(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-daom-neutral-700 mb-1">
                  Observaciones de Auditoría
                </label>
                <textarea
                  rows={2}
                  placeholder="Motivo o verificación del ingreso en cuenta..."
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-daom-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 bg-daom-neutral-200 hover:bg-daom-neutral-300 rounded-lg text-xs font-semibold text-daom-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={confirming}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {confirming ? "Confirmando..." : "Confirmar y Habilitar Materiales"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
