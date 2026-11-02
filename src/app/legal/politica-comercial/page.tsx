import React from "react";
import { AlertTriangle, DollarSign, CreditCard } from "lucide-react";

export const metadata = {
  title: "Política Comercial y Aranceles | DAOM Learning",
  description: "Estructura de precios, monedas independientes (ARS/USD) y condiciones de pago.",
};

export default function PoliticaComercialPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="bg-[#FFF7DF] border border-[#F2DE9C] p-4 rounded-lg flex items-center gap-3 text-[#8A5A00]">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p className="text-xs sm:text-sm font-medium">
          <strong>Aviso Comercial:</strong> Borrador de directivas comerciales. Las condiciones comerciales definitivas
          requieren validación legal por parte de los apoderados de DAOM Weightlifting.
        </p>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-mono text-daom-neutral-400">Canario: DAOM-FORMACION-SHEET-01</span>
        <h1 className="text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
          Política Comercial, Monedas y Aranceles
        </h1>
        <p className="text-xs text-daom-neutral-500">Documento de trabajo editorial y operativo</p>
      </div>

      <div className="prose prose-slate max-w-none text-sm text-daom-neutral-700 leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">1. Estructura de Mercados y Monedas Independientes</h2>
          <p>
            DAOM Learning opera con dos esquemas tarifarios no convertibles de forma automática:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Mercado Argentino (AR):</strong> Valores fijados en Pesos Argentinos (ARS), canalizados mediante Mercado Pago.</li>
            <li><strong>Mercado Internacional (INT):</strong> Valores fijados en Dólares Estadounidenses (USD), canalizados mediante Stripe.</li>
          </ul>
          <p className="text-xs text-daom-neutral-500 italic">
            No se efectúa conversión automática de divisas; cada mercado cuenta con su precio base independiente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">2. Equivalencia de Modalidad Presencial y Streaming</h2>
          <p>
            Para una misma oferta y mercado, las modalidades Presencial y Streaming en vivo comparten exactamente el
            mismo precio base de lista.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">3. Tarifas de la Modalidad On Demand</h2>
          <p>
            La adquisición de capacitaciones en modalidad On Demand adquiridas con anterioridad a la fecha del evento
            conserva el precio base de lista. Si la adquisición se produce a partir de la fecha de inicio del evento o
            con posterioridad, se aplicará un recargo reglamentario del 35% sobre dicho valor.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">4. Reembolsos y Cancelaciones</h2>
          <p>
            Las cancelaciones solicitadas con antelación suficiente están sujetas a evaluación caso por caso conforme a
            la normativa de defensa del consumidor aplicable en la República Argentina.
          </p>
        </section>
      </div>
    </div>
  );
}
