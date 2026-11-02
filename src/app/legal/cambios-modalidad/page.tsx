import React from "react";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Reglamento de Cambios de Modalidad | DAOM Learning",
  description: "Condiciones, plazos y recargos aplicables para solicitar cambio de modalidad de cursada.",
};

export default function CambiosModalidadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="bg-[#FFF7DF] border border-[#F2DE9C] p-4 rounded-lg flex items-center gap-3 text-[#8A5A00]">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p className="text-xs sm:text-sm font-medium">
          <strong>Aviso Operativo:</strong> Reglas reglamentarias aplicadas por el sistema de gestión de DAOM Learning,
          identificadas como borrador sujeto a revisión de las autoridades de DAOM Weightlifting.
        </p>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-mono text-daom-neutral-400">Canario: DAOM-FORMACION-SHEET-01</span>
        <h1 className="text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
          Reglamento de Cambios de Modalidad
        </h1>
        <p className="text-xs text-daom-neutral-500">Procedimiento oficial de solicitud y recargos aplicables</p>
      </div>

      <div className="prose prose-slate max-w-none text-sm text-daom-neutral-700 leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">1. Principio General</h2>
          <p>
            El participante debidamente inscripto y con pago acreditado puede solicitar el traspaso de su vacante
            entre las modalidades Presencial, Streaming en vivo o On Demand, sujeto a disponibilidad efectiva de
            cupos en la sede o sala virtual.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-daom-neutral-900">2. Escala de Recargos Reglamentarios</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
            <div className="p-4 rounded-lg bg-daom-neutral-50 border border-daom-neutral-200 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16794A]">
                Con 7 o más días de antelación
              </span>
              <p className="text-2xl font-black text-daom-neutral-900">0% Recargo</p>
              <p className="text-xs text-daom-neutral-600">
                La solicitud no devenga arancel administrativo ni penalidad económica alguna.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-daom-neutral-50 border border-daom-neutral-200 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-daom-red-dark">
                Con menos de 7 días de antelación
              </span>
              <p className="text-2xl font-black text-daom-red-dark">25% Recargo</p>
              <p className="text-xs text-daom-neutral-600">
                Aplica un recargo administrativo del 25% calculado sobre el precio base de la capacitación.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">3. Procedimiento de Solicitud</h2>
          <p>
            Los cambios de modalidad no se ejecutan automáticamente: la plataforma registra la solicitud con el
            recargo liquidado para que el componente responsable (soporte académico / bot de atención) confirme la
            vacante y procese la actualización definitiva.
          </p>
        </section>
      </div>
    </div>
  );
}
