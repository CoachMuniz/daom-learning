import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  User,
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
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getUserEnrollments,
  getUserMaterialEntitlements,
  getUserCertificates,
  getUserAttendance,
} from "@/lib/db/repository";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ParticipantePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/participante");
  }

  const enrollments = await getUserEnrollments(user.id);
  const materials = await getUserMaterialEntitlements(user.id);
  const certificates = await getUserCertificates(user.id);
  const attendances = await getUserAttendance(user.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Encabezado del Perfil */}
      <div className="bg-white rounded-xl border border-daom-neutral-200 p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-daom-blue text-white font-extrabold text-2xl flex items-center justify-center shrink-0">
            {user.full_name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <span className="text-xs font-mono text-daom-neutral-400 uppercase">
              ID: {user.id}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
              {user.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-daom-neutral-500">{user.email} • País: {user.profile?.country || "AR"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/catalogo"
            className="inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold text-daom-blue bg-daom-blue-soft hover:bg-blue-100 rounded-md min-h-[44px] transition-colors"
          >
            Explorar más capacitaciones
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

      {/* SECCIÓN 1: MIS CAPACITACIONES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-daom-neutral-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-daom-blue" />
            <span>Mis Capacitaciones e Inscripciones</span>
          </h2>
          <span className="text-xs text-daom-neutral-500 font-medium">
            {enrollments.length} registradas
          </span>
        </div>

        {enrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrollments.map((enr) => {
              const statusVariant =
                enr.status === "confirmada"
                  ? "success"
                  : enr.status === "pendiente_pago"
                  ? "warning"
                  : "neutral";

              return (
                <div
                  key={enr.id}
                  className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-daom-neutral-400 uppercase">
                        {enr.id}
                      </span>
                      <h3 className="text-lg font-bold text-daom-neutral-900 leading-tight">
                        {enr.training?.titulo || enr.capacitacion_id}
                      </h3>
                      <p className="text-xs text-daom-neutral-500 capitalize">
                        Modalidad: <span className="font-semibold text-daom-neutral-800">{enr.modality_id}</span>
                      </p>
                    </div>
                    <StatusBadge label={enr.status.replace("_", " ").toUpperCase()} variant={statusVariant} />
                  </div>

                  <div className="text-xs text-daom-neutral-600 space-y-1.5 pt-2 border-t border-daom-neutral-100">
                    <p>
                      Monto total: <strong className="text-daom-neutral-900">${enr.amount_total.toLocaleString()} {enr.currency}</strong>
                    </p>
                    <p>
                      Acreditado: <span className={enr.amount_paid > 0 ? "text-[#16794A] font-bold" : "text-daom-neutral-500"}>${enr.amount_paid.toLocaleString()} {enr.currency}</span>
                    </p>
                    {enr.edition?.fecha_inicio && (
                      <p className="flex items-center gap-1.5 pt-1 text-daom-neutral-700">
                        <Calendar className="w-3.5 h-3.5 text-daom-blue" />
                        <span>Fecha de inicio: {enr.edition.fecha_inicio}</span>
                      </p>
                    )}
                  </div>

                  {enr.status === "pendiente_pago" && (
                    <div className="bg-[#FFF7DF] p-3 rounded border border-[#F2DE9C] text-xs text-[#8A5A00]">
                      Inscripción registrada. Para completar el pago y habilitar los materiales, comunicate con nuestro bot
                      o por WhatsApp (+54 11 3039-3030) indicando tu código <strong>{enr.id}</strong>.
                    </div>
                  )}

                  {enr.status === "confirmada" && (
                    <div className="bg-[#EAF7F0] p-3 rounded border border-[#A6E1C4] text-xs text-[#16794A] flex items-center justify-between">
                      <span className="font-semibold">✓ Inscripción confirmada y habilitada</span>
                      <Link
                        href="#materiales"
                        className="font-bold underline hover:text-[#13633c]"
                      >
                        Ver materiales
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-daom-neutral-200 p-8 text-center text-sm text-daom-neutral-600">
            Todavía no tenés inscripciones activas. Podés consultar el{" "}
            <Link href="/catalogo" className="text-daom-blue font-bold underline">
              catálogo oficial de capacitaciones
            </Link>{" "}
            para elegir una formación.
          </div>
        )}
      </section>

      {/* SECCIÓN 2: MATERIALES COMPLEMENTARIOS (ARCHIVOS ZIP PROTEGIDOS) */}
      <section id="materiales" className="space-y-4">
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
            No tenés archivos de material complementario autorizados para descarga. El acceso se habilita automáticamente
            en cuanto tu pago es confirmado por el sistema.
          </div>
        )}
      </section>

      {/* SECCIÓN 3: CERTIFICADOS Y ASISTENCIAS */}
      <section className="space-y-4">
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
            Aún no se registran certificados emitidos a tu nombre. Los certificados electrónicos se cargan una vez
            finalizada la jornada y validada tu asistencia presencial o en streaming.
          </div>
        )}
      </section>
    </div>
  );
}
