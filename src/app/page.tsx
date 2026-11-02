import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Award,
  Video,
  MapPin,
  PlayCircle,
  Users,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Sparkles,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { getPublishedTrainings, getVerifiedInstructors } from "@/lib/db/repository";
import { TrainingCard } from "@/components/TrainingCard";
import { EmptyState } from "@/components/EmptyState";

export const revalidate = 60; // ISR cada 60 segundos

export default async function HomePage() {
  const publishedTrainings = await getPublishedTrainings();
  const instructors = await getVerifiedInstructors();

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-b from-white via-daom-blue-soft/30 to-daom-neutral-50 border-b border-daom-neutral-200 pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-daom-blue-soft border border-blue-200 text-daom-blue text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-4 h-4 text-daom-blue" />
              <span>DAOM Weightlifting — División Académica</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-daom-neutral-900 leading-[1.1]">
              Formación técnica y pedagógica en{" "}
              <span className="text-daom-blue">Weightlifting</span>
            </h1>

            <p className="text-lg sm:text-xl text-daom-neutral-600 leading-relaxed">
              Capacitaciones oficiales y especializadas para entrenadores, preparadores físicos y atletas.
              Fundamentos biomecánicos, metodología pedagógica de enseñanza y planificación basada en evidencia.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/catalogo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-daom-blue hover:bg-daom-blue-dark rounded-md min-h-[44px] transition-colors shadow-sm"
              >
                <span>Explorar Capacitaciones</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/institucional"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium text-daom-neutral-800 bg-white border border-daom-neutral-300 hover:bg-daom-neutral-50 rounded-md min-h-[44px] transition-colors"
              >
                <span>Para Instituciones y Clubes</span>
              </Link>
            </div>

            {/* Microcredenciales */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-daom-neutral-200/80">
              <div className="flex items-center gap-2.5 text-xs text-daom-neutral-700">
                <CheckCircle2 className="w-4 h-4 text-[#16794A] shrink-0" />
                <span>Certificación oficial DAOM</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-daom-neutral-700">
                <CheckCircle2 className="w-4 h-4 text-[#16794A] shrink-0" />
                <span>Docentes certificados IWF</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-daom-neutral-700">
                <CheckCircle2 className="w-4 h-4 text-[#16794A] shrink-0" />
                <span>Material complementario ZIP incluido</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MODALIDADES DE APRENDIZAJE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
            Tres modalidades pensadas para tu desarrollo
          </h2>
          <p className="mt-2 text-sm sm:text-base text-daom-neutral-600">
            Elegí cómo cursar según tus tiempos, ubicación geográfica y objetivos de práctica deportiva.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Presencial */}
          <div className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card hover:border-daom-blue/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-daom-blue-soft text-daom-blue flex items-center justify-center mb-5">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-daom-neutral-900 mb-2">Presencial en Sede</h3>
            <p className="text-sm text-daom-neutral-600 leading-relaxed mb-4">
              Jornadas intensivas prácticas en el centro de entrenamiento de DAOM Weightlifting (Club DAOM, CABA).
              Corrección en plataforma, interacción directa y cupos reducidos.
            </p>
            <ul className="space-y-2 text-xs text-daom-neutral-700 font-medium pt-2 border-t border-daom-neutral-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16794A]" />
                Plataformas y material de halterofilia reglamentario
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16794A]" />
                Certificado de asistencia presencial
              </li>
            </ul>
          </div>

          {/* Streaming en Vivo */}
          <div className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card hover:border-daom-blue/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-daom-blue-soft text-daom-blue flex items-center justify-center mb-5">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-daom-neutral-900 mb-2">Streaming en Vivo</h3>
            <p className="text-sm text-daom-neutral-600 leading-relaxed mb-4">
              Transmisión interactiva en tiempo real. Participá desde cualquier punto del país o del exterior con
              canal directo de consultas con los docentes y certificado de asistencia.
            </p>
            <ul className="space-y-2 text-xs text-daom-neutral-700 font-medium pt-2 border-t border-daom-neutral-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16794A]" />
                Mismo precio base que presencial
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16794A]" />
                Acceso a la grabación completa del seminario
              </li>
            </ul>
          </div>

          {/* On Demand */}
          <div className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card hover:border-daom-blue/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-daom-blue-soft text-daom-blue flex items-center justify-center mb-5">
              <PlayCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-daom-neutral-900 mb-2">On Demand</h3>
            <p className="text-sm text-daom-neutral-600 leading-relaxed mb-4">
              Visualizá la grabación íntegra del seminario y los contenidos técnicos a tu propio ritmo con garantía
              mínima de 12 meses de disponibilidad.
            </p>
            <ul className="space-y-2 text-xs text-daom-neutral-700 font-medium pt-2 border-t border-daom-neutral-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16794A]" />
                Descarga inmediata del archivo ZIP de materiales
              </li>
              <li className="flex items-center gap-2 text-daom-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5 text-daom-neutral-400" />
                La compra On Demand no acredita asistencia
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. CATÁLOGO VERIFICADO DE CAPACITACIONES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-daom-blue uppercase tracking-wider">
              Oferta Académica
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight mt-1">
              Capacitaciones destacadas
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-daom-blue hover:text-daom-blue-dark"
          >
            <span>Ver todo el catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {publishedTrainings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedTrainings.map((training) => (
              <TrainingCard key={training.capacitacion_id} training={training} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Próximas Ediciones en Preparación"
            description="Nuestro catálogo se gestiona mediante control editorial riguroso sincronizado desde Google Sheets. Las fechas y cupos de la próxima cohorte de seminarios técnicos se publicarán en cuanto reciban validación editorial."
          />
        )}
      </section>

      {/* 4. PROPUESTA PEDAGÓGICA Y CUERPO DOCENTE */}
      <section className="bg-daom-neutral-100 border-y border-daom-neutral-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-daom-blue uppercase tracking-wider">
                Rigor Técnico y Práctico
              </span>
              <h2 className="text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
                Una metodología de enseñanza estructurada paso a paso
              </h2>
              <p className="text-sm sm:text-base text-daom-neutral-600 leading-relaxed">
                Nuestras capacitaciones no se limitan a la demostración de ejercicios. Analizamos la lógica de
                ejecución del Weightlifting, los principios mecánicos universales, la composición fásica y los
                métodos de enseñanza tradicional e invertido aplicables a atletas de todos los niveles.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-daom-blue text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-daom-neutral-900">Fundamentos Biomecánicos</h4>
                    <p className="text-xs text-daom-neutral-600">
                      Vectores de fuerza, trayectorias de barra y anatomía funcional del Snatch, Clean y Jerk.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-daom-blue text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-daom-neutral-900">Pedagogía y Corrección</h4>
                    <p className="text-xs text-daom-neutral-600">
                      Detección temprana de patrones de compensación, progresiones metodológicas y ejercicios correctivos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-daom-blue text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-daom-neutral-900">Planificación y Dosificación</h4>
                    <p className="text-xs text-daom-neutral-600">
                      Modelos contemporáneos de periodización (ATR, bloques, cargas acentuadas y protocolos VBT).
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/docentes"
                  className="inline-flex items-center gap-2 text-sm font-bold text-daom-blue hover:underline"
                >
                  <span>Conocer a los docentes y sus credenciales</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Docentes Destacados */}
            <div className="bg-white rounded-lg border border-daom-neutral-200 p-6 sm:p-8 shadow-card space-y-6">
              <h3 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-daom-blue" />
                <span>Equipo Docente Oficial</span>
              </h3>

              <div className="space-y-4">
                <div className="border-b border-daom-neutral-100 pb-4">
                  <h4 className="text-base font-bold text-daom-neutral-900">Abel Matías Muñiz</h4>
                  <p className="text-xs font-semibold text-daom-blue">
                    Director de Intelligent Weightlifting & Coordinador DAOM
                  </p>
                  <p className="text-xs text-daom-neutral-600 mt-1">
                    Entrenador certificado por la International Weightlifting Federation (IWF). Especialista en
                    biomecánica, metodología de enseñanza y periodización.
                  </p>
                </div>

                <div className="border-b border-daom-neutral-100 pb-4">
                  <h4 className="text-base font-bold text-daom-neutral-900">Brenda Vacotti</h4>
                  <p className="text-xs font-semibold text-daom-blue">
                    Entrenadora DAOM Weightlifting
                  </p>
                  <p className="text-xs text-daom-neutral-600 mt-1">
                    Entrenadora certificada por la IWF. Especialista en metodología de corrección técnica y pedagogía
                    infanto-juvenil y de adultos.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-daom-neutral-900">María Eugenia Cavero</h4>
                  <p className="text-xs font-semibold text-daom-blue">
                    Entrenadora DAOM Weightlifting
                  </p>
                  <p className="text-xs text-daom-neutral-600 mt-1">
                    Entrenadora certificada por la IWF. Formadora técnica y preparadora de atletas en levantamiento de pesas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CTA INSTITUCIONAL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-daom-blue to-daom-blue-dark rounded-xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-md">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ¿Buscás capacitar al staff técnico de tu club o box?
            </h2>
            <p className="text-daom-blue-soft text-sm sm:text-base leading-relaxed">
              Diseñamos workshops y clínicas intensivas a medida para gimnasios, federaciones, boxes de cross training
              y equipos deportivos de alto rendimiento.
            </p>
          </div>
          <Link
            href="/institucional"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-daom-blue bg-white hover:bg-daom-blue-soft rounded-md min-h-[44px] transition-colors shrink-0 shadow-sm"
          >
            Solicitar Presupuesto Institucional
          </Link>
        </div>
      </section>
    </div>
  );
}
