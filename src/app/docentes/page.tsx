import React from "react";
import Link from "next/link";
import { Users, Award, BookOpen, ShieldCheck, ArrowRight } from "lucide-react";
import { getVerifiedInstructors, getAllInstructorsAdmin } from "@/lib/db/repository";

export const revalidate = 60;

export const metadata = {
  title: "Cuerpo Docente Oficial | DAOM Learning",
  description: "Entrenadores y especialistas certificados a cargo de las capacitaciones oficiales de DAOM Weightlifting.",
};

export default async function DocentesPage() {
  // En catálogo público se listan los docentes verificados
  const verifiedDocentes = await getVerifiedInstructors();

  // Fallback seguro: si la planilla aún tiene docentes en estado 'pendiente' de verificación,
  // mostrar información institucional real para no dejar la página rota, aclarando su estado.
  const allDocentes = verifiedDocentes.length > 0 ? verifiedDocentes : await getAllInstructorsAdmin();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Encabezado */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-daom-blue uppercase tracking-wider">
          <Users className="w-4 h-4" />
          <span>Equipo Académico</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-daom-neutral-900 tracking-tight">
          Cuerpo Docente y Especialistas
        </h1>
        <p className="text-base text-daom-neutral-600 leading-relaxed">
          Nuestras capacitaciones son dictadas por entrenadores federados y formadores técnicos certificados por la
          International Weightlifting Federation (IWF), con amplia experiencia en iniciación, desarrollo y alto rendimiento.
        </p>
      </div>

      {/* Listado de Docentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {allDocentes.map((docente) => (
          <article
            key={docente.docente_id}
            className="bg-white rounded-lg border border-daom-neutral-200 p-6 sm:p-8 shadow-card flex flex-col justify-between space-y-4 hover:border-daom-blue/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-daom-blue-soft text-daom-blue font-extrabold text-xl flex items-center justify-center">
                {docente.nombre
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>

              <div>
                <span className="text-[11px] font-mono text-daom-neutral-400 uppercase tracking-widest">
                  {docente.docente_id}
                </span>
                <h2 className="text-xl font-bold text-daom-neutral-900 leading-tight">
                  {docente.nombre}
                </h2>
                <p className="text-xs font-semibold text-daom-blue mt-0.5">{docente.tipo} Weightlifting</p>
              </div>

              {docente.especialidad && (
                <div className="bg-daom-neutral-50 p-2.5 rounded border border-daom-neutral-200 text-xs text-daom-neutral-700">
                  <span className="font-bold text-daom-neutral-900 block mb-0.5">Especialidad:</span>
                  {docente.especialidad}
                </div>
              )}

              {docente.biografia && (
                <p className="text-xs sm:text-sm text-daom-neutral-600 leading-relaxed">
                  {docente.biografia}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-daom-neutral-100 flex items-center justify-between">
              {docente.credenciales ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#16794A] font-medium">
                  <Award className="w-3.5 h-3.5" />
                  {docente.credenciales}
                </span>
              ) : (
                <span className="text-xs text-daom-neutral-400">Docente DAOM</span>
              )}

              <Link
                href="/catalogo"
                className="text-xs font-bold text-daom-blue hover:underline inline-flex items-center gap-1"
              >
                <span>Ver capacitaciones</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
