"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Edit2,
  Trash2,
  Power,
  ShieldCheck,
  AlertTriangle,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface Participant {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  documentId: string | null;
  country: string;
  isActive?: number | boolean;
}

export function ParticipantAdminManager() {
  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal para editar participante
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDoc, setEditDoc] = useState("");
  const [editCountry, setEditCountry] = useState("AR");
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal para desactivar / reactivar / eliminar
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<"toggle-active" | "delete">("toggle-active");
  const [actionTarget, setActionTarget] = useState<Participant | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchParticipants = async (searchQuery: string = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/participantes?q=${encodeURIComponent(searchQuery)}&limit=30`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error al cargar participantes.");
      } else {
        setParticipants(data.participants || []);
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParticipants(query);
  };

  const openEditModal = (p: Participant) => {
    setEditingParticipant(p);
    setEditName(p.fullName);
    setEditPhone(p.phone || "");
    setEditDoc(p.documentId || "");
    setEditCountry(p.country || "AR");
    setEditActive(p.isActive !== 0 && p.isActive !== false);
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/admin/participantes/${editingParticipant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editName,
          phone: editPhone,
          documentId: editDoc,
          country: editCountry,
          isActive: editActive ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.message || "Error al actualizar participante.");
      } else {
        setParticipants((prev) =>
          prev.map((item) =>
            item.id === editingParticipant.id
              ? {
                  ...item,
                  fullName: editName,
                  phone: editPhone || null,
                  documentId: editDoc || null,
                  country: editCountry,
                  isActive: editActive ? 1 : 0,
                }
              : item
          )
        );
        setEditModalOpen(false);
        setEditingParticipant(null);
      }
    } catch (err: any) {
      setEditError(err.message || "Error de conexión.");
    } finally {
      setSavingEdit(false);
    }
  };

  const openActionModal = (p: Participant, type: "toggle-active" | "delete") => {
    setActionTarget(p);
    setActionType(type);
    setActionMsg(null);
    setActionConfirmOpen(true);
  };

  const handleActionExecute = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    setActionMsg(null);

    try {
      if (actionType === "delete") {
        const res = await fetch(`/api/admin/participantes/${actionTarget.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
          setActionMsg(`Error: ${data.message || "No se pudo eliminar el participante."}`);
        } else {
          setParticipants((prev) => prev.filter((item) => item.id !== actionTarget.id));
          setActionConfirmOpen(false);
          setActionTarget(null);
        }
      } else {
        // Toggle active
        const newStatus = actionTarget.isActive === 0 || actionTarget.isActive === false ? 1 : 0;
        const res = await fetch(`/api/admin/participantes/${actionTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: newStatus }),
        });
        const data = await res.json();
        if (!res.ok) {
          setActionMsg(`Error: ${data.message || "No se pudo actualizar el estado."}`);
        } else {
          setParticipants((prev) =>
            prev.map((item) => (item.id === actionTarget.id ? { ...item, isActive: newStatus } : item))
          );
          setActionConfirmOpen(false);
          setActionTarget(null);
        }
      }
    } catch (err: any) {
      setActionMsg(`Error: ${err.message || "Error de red."}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
      <div className="p-6 border-b border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-daom-blue" />
            <span>Gestión y Directorio de Participantes</span>
          </h2>
          <p className="text-xs text-daom-neutral-500">
            Búsqueda, edición de datos personales, desactivación/reactivación y eliminación de registros de prueba.
          </p>
        </div>

        {/* Formulario de Búsqueda Rápida */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, email o DNI..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-daom-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-daom-blue"
            />
            <Search className="w-3.5 h-3.5 text-daom-neutral-400 absolute left-2.5 top-2.5" />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-daom-neutral-800 hover:bg-daom-neutral-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Buscar"}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
            <tr>
              <th className="p-3">Participante</th>
              <th className="p-3">Contacto</th>
              <th className="p-3">DNI / Documento</th>
              <th className="p-3">País</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-daom-neutral-100">
            {participants.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-daom-neutral-500 italic">
                  {loading ? "Cargando participantes..." : "No se encontraron participantes registrados."}
                </td>
              </tr>
            ) : (
              participants.map((p) => {
                const isActive = p.isActive !== 0 && p.isActive !== false;
                const isAdmin = p.role === "ADMIN";
                return (
                  <tr key={p.id} className="hover:bg-daom-neutral-50/50">
                    <td className="p-3">
                      <p className="font-semibold text-daom-neutral-900">{p.fullName}</p>
                      <p className="text-[11px] text-daom-neutral-500 font-mono">{p.email}</p>
                    </td>
                    <td className="p-3 text-daom-neutral-600 font-mono text-[11px]">
                      {p.phone || "—"}
                    </td>
                    <td className="p-3 text-daom-neutral-600 font-mono text-[11px]">
                      {p.documentId || "—"}
                    </td>
                    <td className="p-3 text-daom-neutral-600 uppercase text-[11px]">
                      {p.country || "AR"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isAdmin ? "bg-purple-100 text-purple-800" : "bg-daom-neutral-100 text-daom-neutral-700"
                        }`}
                      >
                        {isAdmin && <ShieldCheck className="w-3 h-3" />}
                        <span>{p.role}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {!isAdmin && (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1 hover:bg-daom-neutral-200 rounded text-daom-neutral-600 hover:text-daom-neutral-900"
                            title="Editar Participante"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openActionModal(p, "toggle-active")}
                            className={`p-1 rounded ${
                              isActive
                                ? "hover:bg-amber-100 text-amber-600 hover:text-amber-800"
                                : "hover:bg-emerald-100 text-emerald-600 hover:text-emerald-800"
                            }`}
                            title={isActive ? "Desactivar Participante" : "Reactivar Participante"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openActionModal(p, "delete")}
                            className="p-1 hover:bg-rose-100 rounded text-rose-500 hover:text-rose-700"
                            title="Eliminar Participante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Edición de Participante */}
      {editModalOpen && editingParticipant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-daom-neutral-200"
          >
            <div className="flex items-center justify-between border-b border-daom-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-daom-neutral-900 text-base">Editar Participante</h3>
                <p className="text-xs font-mono text-daom-neutral-500">{editingParticipant.email}</p>
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
                <label className="block font-bold text-daom-neutral-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-daom-neutral-700 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white text-daom-neutral-900 font-mono"
                  placeholder="+54 9 11 2345-6789"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-daom-neutral-700 mb-1">DNI / Documento</label>
                  <input
                    type="text"
                    value={editDoc}
                    onChange={(e) => setEditDoc(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white text-daom-neutral-900 font-mono"
                    placeholder="Documento"
                  />
                </div>
                <div>
                  <label className="block font-bold text-daom-neutral-700 mb-1">País</label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value.toUpperCase())}
                    className="w-full p-2 border rounded-md bg-white text-daom-neutral-900 uppercase font-mono"
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded text-daom-blue focus:ring-daom-blue"
                />
                <label htmlFor="userActiveCheck" className="font-semibold text-daom-neutral-800">
                  Usuario Activo (permite acceso al campus)
                </label>
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

      {/* Modal de Acción (Desactivar / Eliminar) */}
      {actionConfirmOpen && actionTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-daom-neutral-200">
            <h3 className="font-bold text-daom-neutral-900 text-base flex items-center gap-2">
              <AlertTriangle className={actionType === "delete" ? "text-rose-600" : "text-amber-600"} />
              <span>
                {actionType === "delete"
                  ? "Eliminar Participante"
                  : actionTarget.isActive === 0 || actionTarget.isActive === false
                  ? "Reactivar Participante"
                  : "Desactivar Participante"}
              </span>
            </h3>

            {actionMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                {actionMsg}
              </div>
            )}

            <p className="text-xs text-daom-neutral-600">
              {actionType === "delete"
                ? `¿Estás seguro de que deseas eliminar permanentemente al participante ${actionTarget.fullName} (${actionTarget.email})? Si posee actividad operativa legítima (pagos o certificados), será archivado para no romper la trazabilidad.`
                : `¿Deseas cambiar el estado a ${
                    actionTarget.isActive === 0 || actionTarget.isActive === false ? "activo" : "inactivo"
                  } para ${actionTarget.fullName}?`}
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
                  actionType === "delete" ? "bg-rose-600 hover:bg-rose-700" : "bg-daom-blue hover:bg-daom-blue/90"
                }`}
              >
                {actionLoading ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
