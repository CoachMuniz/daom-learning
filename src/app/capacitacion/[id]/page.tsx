import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Calendar,
  Users,
  Award,
  Package,
  BookOpen,
  MapPin,
  Video,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { getTrainingById } from "@/lib/db/repository";
import { getCurrentUser } from "@/lib/auth/session";
import { StatusBadge } from "@/components/StatusBadge";
import type { Metadata } from "next";

export const revalidate = 60;

interface TrainingDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: TrainingDetailPageProps): Promise<Metadata> {
  const training = await getTrainingById(params.id, false);
  if (!training) {
    return { title: "Capacitación no encontrada" };
  }
  return {
    title: `${training.titulo} — ${training.tipo.toUpperCase()}`,
    description: training.descripcion || training.subtitulo || "Capacitación oficial de DAOM Weightlifting.",
  };
}

export default async function TrainingDetailPage({ params }: TrainingDetailPageProps) {
  // Solo se publican registros con estado_editorial = 'publicado' y verificacion = 'verificado'
  const training = await getTrainingById(params.id, false);

  if (!training) {
    notFound();
  }

  const user = await getCurrentUser();
  const nextEdition = training.ediciones && training.ediciones.length > 0 ? training.ediciones[0] : null;
  const priceAr = nextEdition?.precios?.find((p) => p.mercado === "AR");
  const priceInt = nextEdition?.precios?.find((p) => p.mercado === "INT");

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: training.titulo,
    description: training.descripcion || training.subtitulo,
    provider: {
      "@type": "Organization",
      name: "DAOM Weightlifting",
      sameAs: "https://www.daom-weightlifting.com",
    },
    educationalCredentialAwarded: training.certificado || "Certificado electrónico de participación DAOM",
    timeRequired: training.duracion || "PT10H",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />

      {/* Encabezado y Hero de la Capacitación */}
      <div className="bg-white rounded-xl border border-daom-neutral-200 p-6 sm:p-10 shadow-card">
        <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-daom-blue text-white">
              {training.tipo}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-daom-neutral-100 text-daom-neutral-700 border border-daom-neutral-200">
              <ShieldCheck className="w-3.5 h-3.5 text-daom-blue" />
              Contenido Oficial Verificado
            </span>
            {training.duracion && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-daom-neutral-100 text-daom-neutral-700">
                <Clock className="w-3.5 h-3.5 text-daom-blue" />
                {training.duracion}
              </span>
            )}
          </div>

          <span className="text-xs font-mono text-daom-neutral-400 uppercase tracking-widest">
            Código: {training.capacitacion_id}
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-daom-neutral-900 tracking-tight">
            {training.titulo}
          </h1>

          {training.subtitulo && (
            <p className="text-lg sm:text-xl font-medium text-daom-neutral-700 leading-relaxed">
              {training.subtitulo}
            </p>
          )}

          {training.descripcion && (
            <p className="text-base text-daom-neutral-600 leading-relaxed pt-2">
              {training.descripcion}
            </p>
          )}
        </div>
      </div>

      {/* Cuadrícula de Contenido y Barra Lateral de Inscripción */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
        {/* Columna Principal: Programa, Objetivos, Metodología */}
        <div className="lg:col-span-2 space-y-10">
          {/* Programa Detallado */}
          {training.programa && (
            <section className="bg-white rounded-lg border border-daom-neutral-200 p-6 sm:p-8 shadow-card space-y-4">
              <h2 className="text-xl font-extrabold text-daom-neutral-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-daom-blue" />
                <span>Programa y Temario Académico</span>
              </h2>
              <div className="text-sm sm:text-base text-daom-neutral-700 leading-relaxed space-y-3">
                {training.programa.split(";").map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-daom-blue shrink-0 mt-1" />
                    <span>{item.trim()}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Destinatarios y Metodología */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {training.destinatarios && (
              <section className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card space-y-2">
                <h3 className="text-base font-bold text-daom-neutral-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-daom-blue" />
                  <span>Destinatarios</span>
                </h3>
                <p className="text-sm text-daom-neutral-600 leading-relaxed">
                  {training.destinatarios}
                </p>
              </section>
            )}

            {training.metodologia && (
              <section className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card space-y-2">
                <h3 className="text-base font-bold text-daom-neutral-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-daom-blue" />
                  <span>Metodología</span>
                </h3>
                <p className="text-sm text-daom-neutral-600 leading-relaxed">
                  {training.metodologia}
                </p>
              </section>
            )}
          </div>

          {/* Materiales y Certificación */}
          <section className="bg-daom-blue-soft/50 rounded-lg border border-blue-200 p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-bold text-daom-blue flex items-center gap-2">
              <Package className="w-5 h-5 text-daom-blue" />
              <span>Material Complementario y Certificación</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-daom-neutral-700">
              <div className="bg-white p-4 rounded-md border border-blue-100 space-y-1.5">
                <span className="font-bold text-daom-neutral-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#16794A]" />
                  Archivo ZIP Incluido
                </span>
                <p className="text-xs text-daom-neutral-600">
                  {training.materiales ||
                    "Archivo ZIP con material pedagógico complementario, tablas de referencia y guías metodológicas."}
                </p>
                <p className="text-[11px] font-semibold text-daom-blue">
                  ✓ Descarga habilitada inmediatamente tras confirmación de pago.
                </p>
              </div>

              <div className="bg-white p-4 rounded-md border border-blue-100 space-y-1.5">
                <span className="font-bold text-daom-neutral-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-daom-blue" />
                  Certificación Electrónica
                </span>
                <p className="text-xs text-daom-neutral-600">
                  {training.certificado ||
                    "Certificado emitido electrónicamente con validación institucional de asistencia."}
                </p>
                <p className="text-[11px] text-daom-neutral-500">
                  * La compra exclusiva On Demand no acredita asistencia presencial ni virtual.
                </p>
              </div>
            </div>
          </section>

          {/* Cuerpo Docente Asociado */}
          {training.docentes && training.docentes.length > 0 && (
            <section className="bg-white rounded-lg border border-daom-neutral-200 p-6 sm:p-8 shadow-card space-y-4">
              <h2 className="text-xl font-extrabold text-daom-neutral-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-daom-blue" />
                <span>Docentes a Cargo</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {training.docentes.map((docente) => (
                  <div key={docente.docente_id} className="border-l-2 border-daom-blue pl-4 space-y-1">
                    <h4 className="text-base font-bold text-daom-neutral-900">{docente.nombre}</h4>
                    <p className="text-xs font-semibold text-daom-blue">{docente.especialidad}</p>
                    {docente.biografia && (
                      <p className="text-xs text-daom-neutral-600 line-clamp-3 mt-1 leading-relaxed">
                        {docente.biografia}
                      </p>
                    )}
                    {docente.credenciales && (
                      <span className="inline-block text-[11px] text-[#16794A] font-medium pt-1">
                        ✓ {docente.credenciales}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Columna Lateral: Ficha de Inscripción y Ediciones */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border-2 border-daom-blue p-6 sm:p-8 shadow-md sticky top-28 space-y-6">
            <h3 className="text-xl font-extrabold text-daom-neutral-900">
              Inscripción y Modalidades
            </h3>

            {/* Modalidades disponibles */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-daom-neutral-500">
                Modalidades Disponibles
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded bg-daom-neutral-50 border border-daom-neutral-200">
                  <MapPin className="w-4 h-4 text-daom-blue" />
                  <div>
                    <span className="font-bold text-daom-neutral-800">Presencial</span>
                    <p className="text-daom-neutral-500 text-[11px]">Sede Club DAOM, Flores, CABA</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded bg-daom-neutral-50 border border-daom-neutral-200">
                  <Video className="w-4 h-4 text-daom-blue" />
                  <div>
                    <span className="font-bold text-daom-neutral-800">Streaming en Vivo</span>
                    <p className="text-daom-neutral-500 text-[11px]">En directo con preguntas en tiempo real</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded bg-daom-neutral-50 border border-daom-neutral-200">
                  <PlayCircle className="w-4 h-4 text-daom-blue" />
                  <div>
                    <span className="font-bold text-daom-neutral-800">On Demand</span>
                    <p className="text-daom-neutral-500 text-[11px]">Grabación completa garantizada por 12 meses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Precios oficiales */}
            <div className="pt-4 border-t border-daom-neutral-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-daom-neutral-500">
                Aranceles Oficiales
              </span>
              {priceAr ? (
                <div className="space-y-1">
                  <p className="text-2xl font-black text-daom-neutral-900">
                    ${priceAr.precio_base.toLocaleString("es-AR")} <span className="text-sm font-semibold text-daom-neutral-500">ARS</span>
                  </p>
                  <p className="text-xs text-daom-neutral-500">
                    Procesamiento oficial y seguro mediante Mercado Pago (ARS) para participantes nacionales e internacionales.
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium text-daom-neutral-600">
                  Valores y promociones para la próxima edición en definición editorial.
                </p>
              )}
            </div>

            {/* Botón de acción */}
            <div className="pt-2">
              {user ? (
                <Link
                  href={`/participante/inscribir?capacitacion=${training.capacitacion_id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-daom-blue hover:bg-daom-blue-dark rounded-md min-h-[44px] transition-colors shadow-sm"
                >
                  <span>Iniciar Inscripción</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href={`/login?redirect=/capacitacion/${training.capacitacion_id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-daom-blue hover:bg-daom-blue-dark rounded-md min-h-[44px] transition-colors shadow-sm"
                >
                  <span>Iniciar Sesión para Inscribirme</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <p className="text-[11px] text-daom-neutral-500 leading-normal text-center">
              El acceso al archivo ZIP de material pedagógico se otorga automáticamente tras la confirmación de pago.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
