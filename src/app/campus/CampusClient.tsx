"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Download,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  LogOut,
  ExternalLink,
  CreditCard,
  Play,
  Video,
  Search,
  Filter,
  User as UserIcon,
  ChevronRight,
  BookOpen,
  HelpCircle,
  FileText,
  Lock,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import type { Enrollment, MaterialEntitlement, Certificate, AttendanceRecord } from "@/lib/types";

interface CampusClientProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    profile?: {
      country?: string | null;
      phone?: string | null;
      document_id?: string | null;
    } | null;
  };
  enrollments: Enrollment[];
  materials: MaterialEntitlement[];
  certificates: Certificate[];
  attendances: AttendanceRecord[];
}

export function CampusClient({
  user,
  enrollments,
  materials,
  certificates,
  attendances,
}: CampusClientProps) {
  const [activeTab, setActiveTab] = useState<"proximas" | "en_curso" | "finalizadas">("proximas");
  const [searchTerm, setSearchTerm] = useState("");

  // Clasificación cronológica de capacitaciones
  // Proximas: fecha_inicio futura o no iniciada
  // En curso: fecha_inicio <= hoy <= fecha_fin
  // Finalizadas: fecha_fin < hoy o fecha_inicio < hoy (si no tiene fin)
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const categorizedEnrollments = useMemo(() => {
    return enrollments.map((enr) => {
      const startDate = enr.edition?.fecha_inicio || "";
      const endDate = enr.edition?.fecha_fin || startDate;

      let category: "proximas" | "en_curso" | "finalizadas" = "proximas";

      if (endDate && endDate < todayStr) {
        category = "finalizadas";
      } else if (startDate && startDate <= todayStr && (!endDate || endDate >= todayStr)) {
        category = "en_curso";
      } else {
        category = "proximas";
      }

      return {
        ...enr,
        academicCategory: category,
      };
    });
  }, [enrollments, todayStr]);

  // Filtrado por buscador y pestaña
  const filteredEnrollments = useMemo(() => {
    return categorizedEnrollments.filter((enr) => {
      const matchesTab = enr.academicCategory === activeTab;
      const title = (enr.training?.titulo || enr.capacitacion_id || "").toLowerCase();
      const code = (enr.capacitacion_id || "").toLowerCase();
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || title.includes(query) || code.includes(query);
      return matchesTab && matchesSearch;
    });
  }, [categorizedEnrollments, activeTab, searchTerm]);

  const counts = useMemo(() => {
    return {
      proximas: categorizedEnrollments.filter((e) => e.academicCategory === "proximas").length,
      en_curso: categorizedEnrollments.filter((e) => e.academicCategory === "en_curso").length,
      finalizadas: categorizedEnrollments.filter((e) => e.academicCategory === "finalizadas").length,
    };
  }, [categorizedEnrollments]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Encabezado del Campus / Biblioteca Académica */}
      <div className="bg-white rounded-xl border border-daom-neutral-200 p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-daom-blue text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-sm">
            {user.full_name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-daom-neutral-400 uppercase">
                ID: {user.id}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-daom-blue-soft text-daom-blue uppercase tracking-wide">
                Campus DAOM
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
              {user.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-daom-neutral-500">
              {user.email} • País: {user.profile?.country || "AR"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/catalogo"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-daom-blue bg-daom-blue-soft hover:bg-blue-100 rounded-md min-h-[44px] transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Explorar capacitaciones</span>
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-daom-neutral-700 border border-daom-neutral-300 hover:bg-daom-neutral-50 rounded-md min-h-[44px] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </div>

      {/* Barra de Filtros, Pestañas y Búsqueda */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-daom-neutral-200 pb-4">
          {/* Pestañas de Navegación Académica */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab("proximas")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold tracking-wide transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "proximas"
                  ? "bg-daom-blue text-white shadow-sm"
                  : "bg-daom-neutral-100 text-daom-neutral-700 hover:bg-daom-neutral-200"
              }`}
            >
              PRÓXIMAS ({counts.proximas})
            </button>
            <button
              onClick={() => setActiveTab("en_curso")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold tracking-wide transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "en_curso"
                  ? "bg-daom-blue text-white shadow-sm"
                  : "bg-daom-neutral-100 text-daom-neutral-700 hover:bg-daom-neutral-200"
              }`}
            >
              EN CURSO ({counts.en_curso})
            </button>
            <button
              onClick={() => setActiveTab("finalizadas")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold tracking-wide transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "finalizadas"
                  ? "bg-daom-blue text-white shadow-sm"
                  : "bg-daom-neutral-100 text-daom-neutral-700 hover:bg-daom-neutral-200"
              }`}
            >
              FINALIZADAS ({counts.finalizadas})
            </button>
          </div>

          {/* Buscador en tiempo real */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar capacitación..."
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
            />
            <Search className="w-4 h-4 text-daom-neutral-400 absolute left-3 top-3.5" />
          </div>
        </div>

        {/* LISTA DE CAPACITACIONES EN LA PESTAÑA SELECCIONADA */}
        {filteredEnrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEnrollments.map((enr) => {
              const isPaid = enr.status === "confirmada";
              const isPending = enr.status === "pendiente_pago";

              return (
                <div
                  key={enr.id}
                  className="bg-white rounded-xl border border-daom-neutral-200 p-6 sm:p-7 shadow-card space-y-5 flex flex-col justify-between hover:border-daom-neutral-300 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-mono text-daom-neutral-400 uppercase">
                          {enr.id} • {enr.capacitacion_id}
                        </span>
                        <h2 className="text-lg sm:text-xl font-extrabold text-daom-neutral-900 leading-snug">
                          {enr.training?.titulo || enr.capacitacion_id}
                        </h2>
                      </div>
                      <StatusBadge
                        label={enr.status.replace("_", " ").toUpperCase()}
                        variant={isPaid ? "success" : isPending ? "warning" : "neutral"}
                      />
                    </div>

                    <div className="text-xs text-daom-neutral-600 space-y-1.5 pt-2 border-t border-daom-neutral-100">
                      <p className="flex items-center justify-between">
                        <span>Modalidad contratada:</span>
                        <strong className="text-daom-neutral-900 capitalize">{enr.modality_id}</strong>
                      </p>
                      <p className="flex items-center justify-between">
                        <span>Monto total:</span>
                        <strong className="text-daom-neutral-900">
                          ${enr.amount_total.toLocaleString()} {enr.currency}
                        </strong>
                      </p>
                      {enr.edition?.fecha_inicio && (
                        <p className="flex items-center gap-1.5 pt-1 text-daom-neutral-700">
                          <Calendar className="w-3.5 h-3.5 text-daom-blue" />
                          <span>
                            Fecha: {enr.edition.fecha_inicio}
                            {enr.edition.hora_inicio ? ` • ${enr.edition.hora_inicio} hs` : ""}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* ALERTA DE PAGO PENDIENTE CON BOTÓN DE PAGO */}
                    {isPending && (
                      <div className="bg-[#FFF7DF] p-4 rounded-lg border border-[#F2DE9C] text-xs text-[#8A5A00] space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-[#8A5A00] mt-0.5" />
                          <span>
                            Inscripción iniciada con vacante reservada temporalmente. Para confirmar tu lugar y acceder a los contenidos académicos, completá el pago a través de Mercado Pago.
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                          <a
                            href={`/api/inscripciones/${enr.id}/reintentar`}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#009EE3] hover:bg-[#0081BA] rounded-md transition-colors shadow-sm min-h-[44px]"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Pagar ahora con Mercado Pago</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* GRUPO DE WHATSAPP OFICIAL (SOLO CONFIRMADOS) */}
                    {isPaid && enr.edition?.whatsapp_group_url && (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-900 flex items-center justify-between gap-2">
                        <span className="font-semibold">Grupo oficial de WhatsApp de la capacitación:</span>
                        <a
                          href={enr.edition.whatsapp_group_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold underline text-emerald-800 hover:text-emerald-900 whitespace-nowrap"
                        >
                          Unirse al grupo
                        </a>
                      </div>
                    )}

                    {/* BLOQUE PEDAGÓGICO: ANTES DEL SEMINARIO */}
                    <div className="bg-daom-neutral-50 rounded-lg p-4 border border-daom-neutral-200 space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-daom-neutral-800 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-daom-blue" />
                        <span>Antes del Seminario</span>
                      </h3>
                      <p className="text-xs text-daom-neutral-600">
                        {isPaid
                          ? "Videos introductorios y material preparatorio para aprovechar la jornada al máximo."
                          : "Contenido habilitado tras la confirmación del pago."}
                      </p>
                      {isPaid ? (
                        <div className="pt-2 flex flex-wrap gap-2">
                          <a
                            href="#materiales"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-daom-neutral-300 text-xs font-semibold text-daom-neutral-700 hover:text-daom-blue transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-daom-blue" />
                            <span>Descargar material preparatorio</span>
                          </a>
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center gap-1.5 text-xs text-daom-neutral-400">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Material bloqueado (pago pendiente)</span>
                        </div>
                      )}
                    </div>

                    {/* BLOQUE PEDAGÓGICO: DESPUÉS DEL SEMINARIO */}
                    <div className="bg-daom-neutral-50 rounded-lg p-4 border border-daom-neutral-200 space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-daom-neutral-800 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-daom-blue" />
                        <span>Después del Seminario</span>
                      </h3>
                      <p className="text-xs text-daom-neutral-600">
                        Grabaciones de la jornada, archivos complementarios y certificado oficial de participación.
                      </p>
                      <div className="pt-2 flex flex-wrap gap-2 text-xs">
                        <a
                          href="#grabaciones"
                          className="inline-flex items-center gap-1.5 text-daom-blue hover:underline font-semibold"
                        >
                          <span>Ver grabaciones masterizadas</span>
                        </a>
                        <span className="text-daom-neutral-300">•</span>
                        <a
                          href="#certificados"
                          className="inline-flex items-center gap-1.5 text-daom-blue hover:underline font-semibold"
                        >
                          <span>Certificados emitidos</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-daom-neutral-200 p-10 text-center space-y-4">
            <GraduationCap className="w-12 h-12 text-daom-neutral-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-daom-neutral-900">
                No hay capacitaciones en esta sección
              </h3>
              <p className="text-xs text-daom-neutral-600 max-w-md mx-auto">
                No tenés capacitaciones {activeTab.replace("_", " ")} en tu biblioteca académica permanente.
              </p>
            </div>
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-daom-blue hover:bg-daom-blue-dark rounded-md transition-colors shadow-sm min-h-[44px]"
            >
              Explorar capacitaciones disponibles
            </Link>
          </div>
        )}
      </div>

      {/* SECCIÓN ON-DEMAND Y REPRODUCCIONES VIMEO */}
      <section id="grabaciones" className="space-y-4 pt-6 border-t border-daom-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-daom-neutral-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-daom-blue" />
              <span>Grabaciones y Clases en Video (Vimeo)</span>
            </h2>
            <p className="text-xs text-daom-neutral-500">
              Reproducción protegida de eventos finalizados y transmisiones grabadas. Publicadas exclusivamente por el equipo técnico.
            </p>
          </div>
        </div>

        {(() => {
          const eligibleEnrollments = enrollments.filter(
            (e) => e.status === "confirmada" && (e.modality_id === "on_demand" || e.modality_id === "streaming")
          );

          if (eligibleEnrollments.length === 0) {
            return (
              <div className="bg-white rounded-lg border border-daom-neutral-200 p-8 text-center text-sm text-daom-neutral-600">
                No contás con grabaciones activas. Las grabaciones se habilitan para inscripciones confirmadas en modalidad Streaming u On-Demand una vez masterizada la edición.
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {eligibleEnrollments.map((enr) => {
                const videoUrl = enr.edition?.vimeo_url || enr.training?.video_url;
                const vimeoId = enr.edition?.vimeo_video_id;

                let embedUrl: string | null = null;
                if (vimeoId) {
                  embedUrl = `https://player.vimeo.com/video/${vimeoId}?dnt=1&app_id=122963`;
                } else if (videoUrl && videoUrl.includes("vimeo.com/")) {
                  const idMatch = videoUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
                  if (idMatch && idMatch[1]) {
                    embedUrl = `https://player.vimeo.com/video/${idMatch[1]}?dnt=1&app_id=122963`;
                  }
                }

                return (
                  <div
                    key={`video-${enr.id}`}
                    className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-daom-neutral-400">
                          {enr.capacitacion_id}
                        </span>
                        <StatusBadge
                          label={embedUrl ? "DISPONIBLE" : "EN PROCESAMIENTO"}
                          variant={embedUrl ? "success" : "warning"}
                        />
                      </div>
                      <h3 className="text-base font-bold text-daom-neutral-900">
                        {enr.training?.titulo || "Capacitación DAOM"}
                      </h3>
                      <p className="text-xs text-daom-neutral-500">
                        Modalidad: <span className="capitalize font-semibold text-daom-neutral-700">{enr.modality_id}</span>
                      </p>
                    </div>

                    {embedUrl ? (
                      <div className="relative aspect-video w-full rounded-md overflow-hidden bg-black border border-daom-neutral-200">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full border-0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                          title={enr.training?.titulo || "Clase DAOM"}
                        />
                      </div>
                    ) : (
                      <div className="bg-[#FFF7DF] p-4 rounded-lg border border-[#F2DE9C] text-xs text-[#8A5A00] space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <Clock className="w-4 h-4 shrink-0 text-[#8A5A00]" />
                          <span>Grabación en edición técnica</span>
                        </p>
                        <p>
                          La filmación de esta jornada está siendo procesada y masterizada por el equipo técnico. Estará disponible automáticamente en cuanto finalice el control de calidad.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* SECCIÓN MATERIALES COMPLEMENTARIOS (ZIP) */}
      <section id="materiales" className="space-y-4 pt-6 border-t border-daom-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-daom-neutral-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-daom-blue" />
              <span>Material Complementario (Archivos ZIP)</span>
            </h2>
            <p className="text-xs text-daom-neutral-500">
              Habilitados inmediatamente tras la acreditación de tu pago.
            </p>
          </div>
          <span className="text-xs text-daom-neutral-500 font-medium">
            {materials.length} habilitados
          </span>
        </div>

        {materials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded bg-daom-blue-soft text-daom-blue flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-daom-neutral-900 leading-snug">
                    {item.asset?.title || "Material Pedagógico ZIP"}
                  </h3>
                  <p className="text-xs text-daom-neutral-500 font-mono">
                    {item.asset?.file_name}
                  </p>
                  <p className="text-xs text-daom-neutral-600">
                    Descargas realizadas: <strong>{item.download_count}</strong>
                  </p>
                </div>

                <a
                  href={`/api/materiales/${item.material_asset_id}/download`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-daom-blue hover:bg-daom-blue-dark rounded-md min-h-[44px] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo ZIP</span>
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-daom-neutral-200 p-8 text-center text-sm text-daom-neutral-600">
            No tenés archivos de material complementario autorizados para descarga. El acceso se habilita automáticamente en cuanto tu pago es confirmado por el sistema.
          </div>
        )}
      </section>

      {/* SECCIÓN CERTIFICADOS Y ASISTENCIAS */}
      <section id="certificados" className="space-y-4 pt-6 border-t border-daom-neutral-200">
        <h2 className="text-xl font-extrabold text-daom-neutral-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-daom-blue" />
          <span>Certificados Oficiales de Participación</span>
        </h2>

        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-daom-neutral-400">
                    CÓDIGO: {cert.certificate_code}
                  </span>
                  <StatusBadge label="VERIFICADO" variant="success" />
                </div>
                <h3 className="text-base font-bold text-daom-neutral-900">{cert.title}</h3>
                <p className="text-xs text-daom-neutral-600">Fecha de emisión: {cert.issue_date}</p>
                <a
                  href={cert.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-daom-blue hover:underline pt-2"
                >
                  <span>Ver Certificado PDF</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-daom-neutral-200 p-8 text-center text-sm text-daom-neutral-600">
            Aún no se registran certificados emitidos a tu nombre. Los certificados se emiten tras finalizar la jornada y validar tu asistencia presencial o en streaming.
          </div>
        )}
      </section>
    </div>
  );
}
