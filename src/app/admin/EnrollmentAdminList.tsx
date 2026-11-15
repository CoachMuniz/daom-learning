"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  X,
  Edit2,
  Trash2,
  Ban,
  Check,
} from "lucide-react";
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

  // Modal para editar / corregir inscripción
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [editModality, setEditModality] = useState<"presencial" | "streaming" | "on_demand">("presencial");
  const [editStatus, setEditStatus] = useState<string>("pendiente_pago");
  const [editAmountPaid, setEditAmountPaid] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal para cancelar / eliminar inscripción
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<"cancel" | "delete">("cancel");
  const [actionTarget, setActionTarget] = useState<Enrollment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openConfirmModal = (enr: Enrollment) => {
    setTargetEnrollment(enr);
    setConfirmAmount(enr.amount_total - enr.amount_paid > 0 ? enr.amount_total - enr.amount_paid : enr.amount_total);
    setConfirmReference("");
    setConfirmNotes("");
    setConfirmError(null);
    setConfirmModalOpen(true);
  };

  const openEditModal = (enr: Enrollment) => {
    setEditingEnrollment(enr);
    setEditModality(enr.modality_id as any);
    setEditStatus(enr.status);
    setEditAmountPaid(enr.amount_paid);
    setEditNotes(enr.notes || "");
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnrollment) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/admin/inscripciones/${editingEnrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modalityId: editModality,
          status: editStatus,
          amountPaid: editAmountPaid,
          notes: editNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.message || data.error || "Error al actualizar inscripción");
      } else {
        setEnrollments((prev) =>
          prev.map((item) => (item.id === editingEnrollment.id ? { ...item, ...data.enrollment } : item))
        );
        setEditModalOpen(false);
        setEditingEnrollment(null);
      }
    } catch (err: any) {
      setEditError(err.message || "Error al guardar cambios");
    } finally {
      setSavingEdit(false);
    }
  };

  const openActionConfirm = (enr: Enrollment, type: "cancel" | "delete") => {
    setActionTarget(enr);
    setActionType(type);
    setActionError(null);
    setActionConfirmOpen(true);
  };

  const handleActionExecute = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (actionType === "delete") {
        const res = await fetch(`/api/admin/inscripciones/${actionTarget.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
          setActionError(data.message || "No se pudo eliminar la inscripción.");
        } else {
          setEnrollments((prev) => prev.filter((i) => i.id !== actionTarget.id));
          setActionConfirmOpen(false);
          setActionTarget(null);
        }
      } else {
        // Cancelar
        const res = await fetch(`/api/admin/inscripciones/${actionTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelada" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setActionError(data.message || "No se pudo cancelar la inscripción.");
        } else {
          setEnrollments((prev) =>
            prev.map((i) => (i.id === actionTarget.id ? { ...i, status: "cancelada" } : i))
          );
          setActionConfirmOpen(false);
          setActionTarget(null);
        }
      }
    } catch (err: any) {
      setActionError(err.message || "Error de red.");
    } finally {
      setActionLoading(false);
    }
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
            Seguimiento de cobros presenciales, acreditación de transferencias bancarias, edición y cancelación controlada.
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
              <th className="p-3 text-right">Acciones</th>
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
                  <td className="p-3 uppercase text-daom-neutral-600">
                    {e.modality_id === "streaming" ? "STREAMING (MEET)" : e.modality_id}
                  </td>
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
                          : e.status === "cancelada"
                          ? "bg-rose-100 text-rose-800"
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
                    <div className="inline-flex items-center gap-1">
                      {e.status === "pendiente_pago" && (
                        <button
                          onClick={() => openConfirmModal(e)}
                          className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold shadow-sm"
                          title="Acreditar Pago"
                        >
                          Acreditar
                        </button>
                      )}
                      <button
                        onClick={() => openDetail(e)}
                        className="px-2 py-1 bg-daom-neutral-100 hover:bg-daom-neutral-200 text-daom-neutral-800 rounded text-[11px] font-semibold"
                        title="Ver Comprobante"
                      >
                        Comprobante
                      </button>
                      <button
                        onClick={() => openEditModal(e)}
                        className="p-1 hover:bg-daom-neutral-200 rounded text-daom-neutral-600 hover:text-daom-neutral-900"
                        title="Editar Inscripción"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {e.status !== "cancelada" && (
                        <button
                          onClick={() => openActionConfirm(e, "cancel")}
                          className="p-1 hover:bg-amber-100 rounded text-amber-600 hover:text-amber-800"
                          title="Cancelar Inscripción"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openActionConfirm(e, "delete")}
                        className="p-1 hover:bg-rose-100 rounded text-rose-500 hover:text-rose-700"
                        title="Eliminar Inscripción"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                        {p.external_payment_id && (
                          <p className="text-daom-neutral-500">Ref: {p.external_payment_id}</p>
                        )}
                        <p className="text-[10px] text-daom-neutral-400">{new Date(p.created_at).toLocaleString("es-AR")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-daom-neutral-200 flex justify-end">
              <button
                onClick={() => setSelectedEnrollment(null)}
                className="px-4 py-2 bg-daom-neutral-100 hover:bg-daom-neutral-200 rounded-lg text-xs font-semibold text-daom-neutral-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Inscripción */}
      {editModalOpen && editingEnrollment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-daom-neutral-200"
          >
            <div className="flex items-center justify-between border-b border-daom-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-daom-neutral-900 text-base">Editar Inscripción</h3>
                <p className="text-xs font-mono text-daom-neutral-500">{editingEnrollment.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-daom-neutral-400 hover:text-daom-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                {editError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-daom-neutral-700 mb-1">Modalidad</label>
                <select
                  value={editModality}
                  onChange={(e) => setEditModality(e.target.value as any)}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900"
                >
                  <option value="presencial">Presencial (Sede Club DAOM)</option>
                  <option value="streaming">Streaming en Vivo (Google Meet)</option>
                  <option value="on_demand">On Demand (Grabación + ZIP)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-daom-neutral-700 mb-1">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900"
                >
                  <option value="pendiente_pago">Pendiente de Pago</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="reembolsada">Reembolsada</option>
                  <option value="en_espera">En Espera</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-daom-neutral-700 mb-1">Monto Cobrado ({editingEnrollment.currency})</label>
                <input
                  type="number"
                  step="any"
                  value={editAmountPaid}
                  onChange={(e) => setEditAmountPaid(Number(e.target.value))}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-daom-neutral-700 mb-1">Notas Administrativas</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-daom-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-daom-neutral-200 hover:bg-daom-neutral-300 rounded-lg text-xs font-semibold text-daom-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-4 py-2 bg-daom-blue hover:bg-daom-blue/90 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {savingEdit ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Confirmación de Acción (Cancelar / Eliminar) */}
      {actionConfirmOpen && actionTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-daom-neutral-200">
            <h3 className="font-bold text-daom-neutral-900 text-base flex items-center gap-2">
              <AlertCircle className={actionType === "delete" ? "text-rose-600" : "text-amber-600"} />
              <span>{actionType === "delete" ? "Eliminar Inscripción" : "Cancelar Inscripción"}</span>
            </h3>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                {actionError}
              </div>
            )}

            <p className="text-xs text-daom-neutral-600">
              {actionType === "delete"
                ? `¿Estás seguro de que deseas eliminar permanentemente la inscripción ${actionTarget.id}? Si posee pagos aprobados, la operación será cancelada de forma segura para preservar la contabilidad.`
                : `¿Estás seguro de que deseas cambiar el estado a "cancelada" para la inscripción ${actionTarget.id}?`}
            </p>

            <div className="pt-3 border-t border-daom-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionConfirmOpen(false)}
                className="px-4 py-2 bg-daom-neutral-200 hover:bg-daom-neutral-300 rounded-lg text-xs font-semibold text-daom-neutral-800"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleActionExecute}
                disabled={actionLoading}
                className={`px-4 py-2 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                  actionType === "delete" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {actionLoading ? "Procesando..." : actionType === "delete" ? "Sí, Eliminar" : "Sí, Cancelar"}
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
                  Acreditar Pago Manual
                </h3>
                <p className="text-xs font-mono text-daom-neutral-500">
                  Inscripción: {targetEnrollment.id}
                </p>
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
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{confirmError}</span>
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
