import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Users,
  GraduationCap,
  Download,
  Clock,
  ExternalLink,
  Activity,
  FileSpreadsheet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getAllTrainingsAdmin,
  getAllInstructorsAdmin,
  getAllEditorialControls,
  getAllEnrollmentsAdmin,
  getRecentSyncRuns,
  getAuditLogs,
} from "@/lib/db/repository";
import { StatusBadge } from "@/components/StatusBadge";
import { AdminSyncButton } from "./AdminSyncButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Panel de Administración | DAOM Learning",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login?redirect=/admin");
  }

  const trainings = await getAllTrainingsAdmin();
  const instructors = await getAllInstructorsAdmin();
  const editorialControls = await getAllEditorialControls();
  const enrollments = await getAllEnrollmentsAdmin();
  const syncRuns = await getRecentSyncRuns(5);
  const auditLogs = await getAuditLogs(15);

  const publishedCount = trainings.filter(
    (t) => t.estado_editorial === "publicado" && t.verificacion === "verificado"
  ).length;
  const draftCount = trainings.length - publishedCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Encabezado y Acción de Sincronización */}
      <div className="bg-white rounded-xl border border-daom-neutral-200 p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-daom-red-dark uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Consola de Control y Auditoría Editorial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
            Administración — DAOM Learning
          </h1>
          <p className="text-xs sm:text-sm text-daom-neutral-500 font-mono">
            Canario: DAOM-FORMACION-SHEET-01 • Fuente: Google Sheets ID 1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4
          </p>
        </div>

        <AdminSyncButton />
      </div>

      {/* Tarjetas de Métricas de Control */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-lg border border-daom-neutral-200 shadow-card space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-daom-neutral-500">
            Capacitaciones Totales
          </span>
          <p className="text-3xl font-black text-daom-neutral-900">{trainings.length}</p>
          <p className="text-xs text-daom-neutral-500">
            {publishedCount} publicadas • {draftCount} en borrador
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-daom-neutral-200 shadow-card space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-daom-neutral-500">
            Cuerpo Docente
          </span>
          <p className="text-3xl font-black text-daom-neutral-900">{instructors.length}</p>
          <p className="text-xs text-daom-neutral-500">Entrenadores federados IWF</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-daom-neutral-200 shadow-card space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-daom-neutral-500">
            Inscripciones Registradas
          </span>
          <p className="text-3xl font-black text-daom-blue">{enrollments.length}</p>
          <p className="text-xs text-daom-neutral-500">
            {enrollments.filter((e) => e.status === "confirmada").length} confirmadas
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-daom-neutral-200 shadow-card space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-daom-neutral-500">
            Última Sincronización
          </span>
          <p className="text-base font-bold text-daom-neutral-900 truncate">
            {syncRuns[0]?.status === "success" ? (
              <span className="text-[#16794A]">Exitosa ({syncRuns[0].records_synced} reg)</span>
            ) : syncRuns[0]?.status ? (
              <span className="text-[#B42318]">{syncRuns[0].status}</span>
            ) : (
              "Pendiente"
            )}
          </p>
          <p className="text-[11px] text-daom-neutral-400">
            {syncRuns[0]?.completed_at ? new Date(syncRuns[0].completed_at).toLocaleTimeString() : "N/D"}
          </p>
        </div>
      </div>

      {/* SECCIÓN: CATÁLOGO SINCRONIZADO Y ESTADOS EDITORIALES */}
      <section className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
        <div className="p-6 border-b border-daom-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-daom-blue" />
              <span>Catálogo Editorial Sincronizado (Google Sheets)</span>
            </h2>
            <p className="text-xs text-daom-neutral-500">
              Control independiente de estado editorial (publicado/borrador) y verificación (verificado/pendiente).
            </p>
          </div>
          <a
            href="https://docs.google.com/spreadsheets/d/1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-daom-blue hover:underline"
          >
            <span>Abrir Planilla Google Sheets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Título</th>
                <th className="p-3">Estado Editorial</th>
                <th className="p-3">Verificación</th>
                <th className="p-3">Docentes</th>
                <th className="p-3">Visibilidad Pública</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-daom-neutral-100">
              {trainings.map((t) => {
                const isPublic = t.estado_editorial === "publicado" && t.verificacion === "verificado";
                return (
                  <tr key={t.capacitacion_id} className="hover:bg-daom-neutral-50/50">
                    <td className="p-3 font-mono font-bold text-daom-neutral-800">{t.capacitacion_id}</td>
                    <td className="p-3 uppercase text-daom-neutral-500">{t.tipo}</td>
                    <td className="p-3 font-semibold text-daom-neutral-900">{t.titulo}</td>
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
                    <td className="p-3 text-daom-neutral-600">
                      {t.docentes?.map((d) => d.nombre.split(" ")[0]).join(", ") || "—"}
                    </td>
                    <td className="p-3">
                      {isPublic ? (
                        <span className="inline-flex items-center gap-1 text-[#16794A] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#8A5A00] font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Oculto (borrador/pendiente)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECCIÓN: OBSERVACIONES DE CONTROL EDITORIAL */}
      <section className="bg-white rounded-xl border border-daom-neutral-200 shadow-card overflow-hidden">
        <div className="p-6 border-b border-daom-neutral-200">
          <h2 className="text-lg font-bold text-daom-neutral-900">
            Observaciones de Auditoría Editorial (Pestaña "Control editorial")
          </h2>
          <p className="text-xs text-daom-neutral-500">
            Notas de revisión técnica que fundamentan por qué cada capacitación se mantiene en borrador o pendiente.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
              <tr>
                <th className="p-3">Registro</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Observaciones de la Revisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-daom-neutral-100">
              {editorialControls.map((ec) => (
                <tr key={ec.registro_id} className="hover:bg-daom-neutral-50/50">
                  <td className="p-3 font-mono font-bold text-daom-neutral-800">{ec.registro_id}</td>
                  <td className="p-3 text-daom-neutral-500">{ec.tipo_registro}</td>
                  <td className="p-3">
                    <StatusBadge
                      label={ec.estado_verificacion}
                      variant={ec.estado_verificacion === "verificado" ? "success" : "warning"}
                    />
                  </td>
                  <td className="p-3 text-daom-neutral-700 leading-relaxed max-w-xl">
                    {ec.observaciones || "Sin observaciones."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECCIÓN: AUDITORÍA RECIENTE */}
      <section className="bg-white rounded-xl border border-daom-neutral-200 shadow-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-daom-blue" />
          <span>Registro de Auditoría y Eventos Operativos</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-daom-neutral-50 text-daom-neutral-700 font-bold border-b border-daom-neutral-200">
              <tr>
                <th className="p-2.5">Fecha / Hora</th>
                <th className="p-2.5">Acción</th>
                <th className="p-2.5">Entidad</th>
                <th className="p-2.5">ID Entidad</th>
                <th className="p-2.5">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-daom-neutral-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-daom-neutral-50/50">
                  <td className="p-2.5 text-daom-neutral-500 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-2.5 font-bold text-daom-neutral-800">{log.action}</td>
                  <td className="p-2.5 text-daom-neutral-500">{log.entity_type}</td>
                  <td className="p-2.5 font-mono text-daom-neutral-700">{log.entity_id}</td>
                  <td className="p-2.5 text-daom-neutral-600 truncate max-w-xs">{log.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
