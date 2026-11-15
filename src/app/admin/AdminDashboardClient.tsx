"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  FileText,
  CreditCard,
  Award,
  Settings,
  Activity,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Video,
} from "lucide-react";
import type {
  Training,
  Enrollment,
  AuditLog,
  EditorialControl,
  SyncRun,
} from "@/lib/types";

// Componentes modulares
import { ManualEnrollmentManager } from "./ManualEnrollmentManager";
import { EnrollmentAdminList } from "./EnrollmentAdminList";
import { ParticipantAdminManager } from "./ParticipantAdminManager";
import { ScholarshipAdminManager } from "./ScholarshipAdminManager";
import { PaymentsAdminView } from "./PaymentsAdminView";
import { ConfigurationAdminView } from "./ConfigurationAdminView";
import { TrainingsAdminView } from "./TrainingsAdminView";
import { AuditAdminView } from "./AuditAdminView";
import { AdminSyncButton } from "./AdminSyncButton";
import { BecarModal } from "./BecarModal";

export type AdminTab =
  | "inicio"
  | "capacitaciones"
  | "participantes"
  | "inscripciones"
  | "pagos"
  | "becas"
  | "configuracion"
  | "auditoria";

interface AdminDashboardClientProps {
  user: any;
  trainings: Training[];
  enrollments: Enrollment[];
  auditLogs: AuditLog[];
  editorialControls: EditorialControl[];
  syncRuns: SyncRun[];
}

export function AdminDashboardClient({
  user,
  trainings,
  enrollments: initialEnrollments,
  auditLogs,
  editorialControls,
  syncRuns,
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("inicio");
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialEnrollments);

  // Modal para Becar
  const [becarModalOpen, setBecarModalOpen] = useState(false);
  const [becarTargetEnrollment, setBecarTargetEnrollment] = useState<Enrollment | null>(null);

  // Métricas para el Dashboard Inicio
  const activeEnrollments = enrollments.filter((e) => e.status === "confirmada");
  const pendingEnrollments = enrollments.filter((e) => e.status === "pendiente_pago");
  const pendingPayments = enrollments.filter(
    (e) => e.status === "pendiente_pago" || e.amount_paid < e.amount_total
  );

  // Manejo de Becar desde participante
  const handleBecarParticipant = (p: any) => {
    // Buscar si el participante tiene una inscripción activa o pendiente
    const enr = enrollments.find((e) => e.user_id === p.id);
    if (enr) {
      setBecarTargetEnrollment(enr);
      setBecarModalOpen(true);
    } else {
      alert(`El participante ${p.fullName} no posee inscripciones registradas para aplicar una beca. Por favor, crea una inscripción primero.`);
      setActiveTab("inscripciones");
    }
  };

  const handleBecarEnrollment = (enr: Enrollment) => {
    setBecarTargetEnrollment(enr);
    setBecarModalOpen(true);
  };

  const handleScholarshipSuccess = (scholarship: any) => {
    // Actualizar lista local de inscripciones
    setEnrollments((prev) =>
      prev.map((e) => {
        if (e.id === scholarship.enrollment_id) {
          if (scholarship.percentage === 100) {
            return { ...e, status: "confirmada" };
          }
        }
        return e;
      })
    );
  };

  return (
    <div className="space-y-8">
      {/* Barra de Navegación de Pestañas - Panel Administrativo 2.0 */}
      <nav className="bg-white rounded-2xl border border-daom-neutral-200 shadow-card p-2 flex flex-wrap gap-1.5 sticky top-4 z-40">
        <button
          onClick={() => setActiveTab("inicio")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "inicio"
              ? "bg-daom-neutral-900 text-white shadow-md"
              : "text-daom-neutral-600 hover:bg-daom-neutral-100 hover:text-daom-neutral-900"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Inicio</span>
        </button>

        <button
          onClick={() => setActiveTab("capacitaciones")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "capacitaciones"
              ? "bg-daom-neutral-900 text-white shadow-md"
              : "text-daom-neutral-600 hover:bg-daom-neutral-100 hover:text-daom-neutral-900"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Capacitaciones</span>
        </button>

        <button
          onClick={() => setActiveTab("participantes")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "participantes"
              ? "bg-daom-neutral-900 text-white shadow-md"
              : "text-daom-neutral-600 hover:bg-daom-neutral-100 hover:text-daom-neutral-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Participantes</span>
        </button>

        <button
          onClick={() => setActiveTab("inscripciones")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "inscripciones"
              ? "bg-daom-neutral-900 text-white shadow-md"
              : "text-daom-neutral-600 hover:bg-daom-neutral-100 hover:text-daom-neutral-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Inscripciones</span>
        </button>

        <button
          onClick={() => setActiveTab("pagos")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "pagos"
              ? "bg-daom-neutral-900 text-white shadow-md"
              : "text-daom-neutral-600 hover:bg-daom-neutral-100 hover:text-daom-neutral-900"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Pagos</span>
        </button>

        <button
          onClick={() => setActiveTab("becas")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "becas"
              ? "bg-amber-600 text-white shadow-md"
              : "text-amber-800 hover:bg-amber-50"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Becas</span>
        </button>

        <button
          onClick={() => setActiveTab("configuracion")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "configuracion"
              ? "bg-daom-neutral-900 text-white shadow-md"
              : "text-daom-neutral-600 hover:bg-daom-neutral-100 hover:text-daom-neutral-900"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </button>

        <button
          onClick={() => setActiveTab("auditoria")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "auditoria"
              ? "bg-daom-neutral-900 text-white shadow-md"
              : "text-daom-neutral-600 hover:bg-daom-neutral-100 hover:text-daom-neutral-900"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Auditoría</span>
        </button>
      </nav>

      {/* CONTENIDO DE CADA PESTAÑA */}

      {/* 1. SECCIÓN INICIO — DASHBOARD RESUMIDO */}
      {activeTab === "inicio" && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Tarjetas de Métricas Operativas Clave */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab("inscripciones")}
              className="bg-white p-5 rounded-2xl border border-daom-neutral-200 shadow-card space-y-2 cursor-pointer hover:border-daom-blue transition-all"
            >
              <div className="flex justify-between items-center text-daom-neutral-500">
                <span className="text-xs font-bold uppercase">Inscripciones Activas</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-daom-neutral-900">
                {activeEnrollments.length}
              </p>
              <p className="text-[11px] text-daom-neutral-400">Alumnos confirmados</p>
            </div>

            <div
              onClick={() => setActiveTab("pagos")}
              className="bg-white p-5 rounded-2xl border border-daom-neutral-200 shadow-card space-y-2 cursor-pointer hover:border-daom-blue transition-all"
            >
              <div className="flex justify-between items-center text-daom-neutral-500">
                <span className="text-xs font-bold uppercase">Pendientes de Pago</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-3xl font-extrabold text-amber-700">
                {pendingEnrollments.length}
              </p>
              <p className="text-[11px] text-daom-neutral-400">Esperando acreditación</p>
            </div>

            <div
              onClick={() => setActiveTab("becas")}
              className="bg-white p-5 rounded-2xl border border-daom-neutral-200 shadow-card space-y-2 cursor-pointer hover:border-amber-500 transition-all"
            >
              <div className="flex justify-between items-center text-daom-neutral-500">
                <span className="text-xs font-bold uppercase">Sistema de Becas</span>
                <Award className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-3xl font-extrabold text-purple-800">
                {enrollments.filter((e) => e.notes?.includes("Beca")).length}
              </p>
              <p className="text-[11px] text-daom-neutral-400">Bonificaciones activas</p>
            </div>

            <div
              onClick={() => setActiveTab("capacitaciones")}
              className="bg-white p-5 rounded-2xl border border-daom-neutral-200 shadow-card space-y-2 cursor-pointer hover:border-daom-blue transition-all"
            >
              <div className="flex justify-between items-center text-daom-neutral-500">
                <span className="text-xs font-bold uppercase">Capacitaciones</span>
                <GraduationCap className="w-4 h-4 text-daom-blue" />
              </div>
              <p className="text-3xl font-extrabold text-daom-neutral-900">
                {trainings.length}
              </p>
              <p className="text-[11px] text-daom-neutral-400">Catálogo oficial</p>
            </div>
          </div>

          {/* Accesos Rápidos Cotidianos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-daom-neutral-200 shadow-card space-y-4">
              <h3 className="font-bold text-daom-neutral-900 text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-daom-blue" />
                <span>Operaciones Rápidas</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab("inscripciones")}
                  className="p-4 rounded-xl bg-daom-neutral-50 hover:bg-daom-neutral-100 border border-daom-neutral-200 text-left transition-all"
                >
                  <p className="font-bold text-daom-neutral-900 text-xs">
                    + Inscripción Manual
                  </p>
                  <p className="text-[11px] text-daom-neutral-500 mt-1">
                    Registrar participante y cobro presencial o transferencia
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab("participantes")}
                  className="p-4 rounded-xl bg-daom-neutral-50 hover:bg-daom-neutral-100 border border-daom-neutral-200 text-left transition-all"
                >
                  <p className="font-bold text-daom-neutral-900 text-xs">
                    + Directorio de Alumnos
                  </p>
                  <p className="text-[11px] text-daom-neutral-500 mt-1">
                    Buscar o becar participantes directamente
                  </p>
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-daom-neutral-200 shadow-card space-y-4">
              <h3 className="font-bold text-daom-neutral-900 text-base flex items-center gap-2">
                <Video className="w-5 h-5 text-emerald-600" />
                <span>Streaming Oficial — Google Meet</span>
              </h3>
              <p className="text-xs text-daom-neutral-600 leading-relaxed">
                Todas las capacitaciones con modalidad virtual interactiva se transmiten mediante salas oficiales de <strong>Google Meet</strong>. Podés configurar los enlaces de cada edición desde la pestaña Configuración.
              </p>
              <button
                onClick={() => setActiveTab("configuracion")}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all"
              >
                Configurar Salas de Google Meet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN CAPACITACIONES */}
      {activeTab === "capacitaciones" && (
        <TrainingsAdminView
          trainings={trainings}
          onOpenSyncPlanilla={() => {}}
          onFilterEnrollmentsByCapacitacion={(capId) => {
            setActiveTab("inscripciones");
          }}
        />
      )}

      {/* 3. SECCIÓN PARTICIPANTES */}
      {activeTab === "participantes" && (
        <ParticipantAdminManager onBecarParticipant={handleBecarParticipant} />
      )}

      {/* 4. SECCIÓN INSCRIPCIONES */}
      {activeTab === "inscripciones" && (
        <div className="space-y-8 animate-in fade-in duration-150">
          <ManualEnrollmentManager />
          <EnrollmentAdminList
            initialEnrollments={enrollments}
            onBecarEnrollment={handleBecarEnrollment}
          />
        </div>
      )}

      {/* 5. SECCIÓN PAGOS */}
      {activeTab === "pagos" && (
        <PaymentsAdminView
          enrollments={enrollments}
          onConfirmPayment={(enr) => {
            setActiveTab("inscripciones");
          }}
          onViewComprobante={(enr) => {
            setActiveTab("inscripciones");
          }}
        />
      )}

      {/* 6. SECCIÓN BECAS */}
      {activeTab === "becas" && (
        <ScholarshipAdminManager
          onOpenBecarModal={() => {
            if (enrollments.length > 0) {
              setBecarTargetEnrollment(enrollments[0]);
              setBecarModalOpen(true);
            } else {
              alert("No hay inscripciones registradas para becar.");
            }
          }}
        />
      )}

      {/* 7. SECCIÓN CONFIGURACIÓN */}
      {activeTab === "configuracion" && (
        <ConfigurationAdminView trainings={trainings} />
      )}

      {/* 8. SECCIÓN AUDITORÍA */}
      {activeTab === "auditoria" && (
        <AuditAdminView
          auditLogs={auditLogs}
          editorialControls={editorialControls}
          syncRuns={syncRuns}
        />
      )}

      {/* MODAL GLOBAL PARA OTORGAR BECA */}
      <BecarModal
        isOpen={becarModalOpen}
        onClose={() => setBecarModalOpen(false)}
        onSuccess={handleScholarshipSuccess}
        enrollment={becarTargetEnrollment}
      />
    </div>
  );
}
