import React from "react";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getAllTrainingsAdmin,
  getAllInstructorsAdmin,
  getAllEditorialControls,
  getAllEnrollmentsAdmin,
  getRecentSyncRuns,
  getAuditLogs,
} from "@/lib/db/repository";
import { AdminSyncButton } from "./AdminSyncButton";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Panel de Administración 2.0 | DAOM Learning",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // Conservar roles ADMIN, STAFF y PARTICIPANT.
  // PARTICIPANT nunca puede acceder al panel administrativo.
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    redirect("/login?redirect=/admin&error=unauthorized_admin");
  }

  const isFullAdmin = user.role === "ADMIN";
  const trainings = await getAllTrainingsAdmin();
  const editorialControls = await getAllEditorialControls();
  const enrollments = await getAllEnrollmentsAdmin();
  const syncRuns = await getRecentSyncRuns(10);
  const auditLogs = isFullAdmin ? await getAuditLogs(50) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Encabezado Institucional y Sincronización */}
      <div className="bg-white rounded-2xl border border-daom-neutral-200 p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-daom-red-dark uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Panel de Gestión Integral ({user.role})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
            Consola Administrativa 2.0 — DAOM Learning
          </h1>
          <p className="text-xs sm:text-sm text-daom-neutral-500 font-mono">
            Plataforma Académica Oficial • Google Meet Streaming Habilitado
          </p>
        </div>

        {isFullAdmin && <AdminSyncButton />}
      </div>

      {/* Navegación Modular y Vistas Especializadas */}
      <AdminDashboardClient
        user={user}
        trainings={trainings}
        enrollments={enrollments}
        auditLogs={auditLogs}
        editorialControls={editorialControls}
        syncRuns={syncRuns}
      />
    </div>
  );
}
