import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Términos y Condiciones | DAOM Learning",
  description: "Términos y condiciones de uso y contratación de DAOM Learning.",
};

export default function TerminosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="bg-[#FFF7DF] border border-[#F2DE9C] p-4 rounded-lg flex items-center gap-3 text-[#8A5A00]">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p className="text-xs sm:text-sm font-medium">
          <strong>Aviso Legal Importante:</strong> El presente documento es un borrador operativo estructurado conforme
          a las reglas de DAOM Weightlifting, actualmente identificado como <em>pendiente de validación legal definitiva</em>.
        </p>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-mono text-daom-neutral-400">Canario: DAOM-FORMACION-SHEET-01</span>
        <h1 className="text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
          Términos y Condiciones de Uso y Contratación
        </h1>
        <p className="text-xs text-daom-neutral-500">Última actualización preliminar: Noviembre 2026</p>
      </div>

      <div className="prose prose-slate max-w-none text-sm text-daom-neutral-700 leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">1. Objeto del Servicio</h2>
          <p>
            DAOM Learning es la plataforma de formación y perfeccionamiento técnico de DAOM Weightlifting. El acceso
            a los cursos, seminarios, clínicas, workshops y material didáctico está sujeto a los presentes términos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">2. Modalidades y Asistencia</h2>
          <p>
            Las actividades formativas pueden brindarse en modalidad Presencial (en la sede deportiva de Club DAOM),
            Streaming en vivo o formato On Demand grabado. La inscripción On Demand da derecho exclusivo al acceso a
            la grabación y material didáctico; no acredita asistencia presencial ni virtual en vivo para certificación.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">3. Propiedad Intelectual y Material Complementario</h2>
          <p>
            Todo el material didáctico distribuido en formato digital (incluyendo archivos comprimidos ZIP, diapositivas,
            manuales y grabaciones) es propiedad exclusiva de DAOM Weightlifting. Queda terminantemente prohibida su
            reproducción, distribución pública, reventa o cesión a terceros sin autorización expresa por escrito.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">4. Jurisdicción y Ley Aplicable</h2>
          <p>
            Cualquier controversia derivada de la interpretación o ejecución de este contrato se regirá por la
            legislación de la República Argentina, con competencia de los tribunales ordinarios de la Ciudad Autónoma
            de Buenos Aires.
          </p>
        </section>
      </div>
    </div>
  );
}
