import React from "react";
import { AlertTriangle, Lock } from "lucide-react";

export const metadata = {
  title: "Política de Privacidad | DAOM Learning",
  description: "Tratamiento y protección de datos personales de los participantes de DAOM Learning.",
};

export default function PrivacidadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="bg-[#FFF7DF] border border-[#F2DE9C] p-4 rounded-lg flex items-center gap-3 text-[#8A5A00]">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p className="text-xs sm:text-sm font-medium">
          <strong>Aviso de Revisión:</strong> Borrador informativo pendiente de dictamen jurídico definitivo conforme
          a la Ley 25.326 de Protección de Datos Personales (Argentina).
        </p>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-mono text-daom-neutral-400">Canario: DAOM-FORMACION-SHEET-01</span>
        <h1 className="text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
          Política de Protección de Datos Personales
        </h1>
        <p className="text-xs text-daom-neutral-500">Versión preliminar: Noviembre 2026</p>
      </div>

      <div className="prose prose-slate max-w-none text-sm text-daom-neutral-700 leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">1. Recolección de Información</h2>
          <p>
            DAOM Learning recopila datos estrictamente necesarios para la gestión académica y operativa de las
            capacitaciones: nombre y apellido, dirección de correo electrónico, documento de identidad, número de
            teléfono y país de residencia.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">2. Seguridad de Pagos</h2>
          <p>
            No almacenamos números de tarjetas de crédito o débito ni claves bancarias en nuestros servidores. Las
            transacciones son procesadas de extremo a extremo por pasarelas seguras certificadas (Mercado Pago y Stripe).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-daom-neutral-900">3. Ejercicio de Derechos ARCO</h2>
          <p>
            El titular de los datos personales tiene la facultad de ejercer el derecho de acceso, rectificación,
            actualización y supresión de sus datos de forma gratuita mediante comunicación dirigida a
            capacitaciones@daom-weightlifting.com.
          </p>
        </section>
      </div>
    </div>
  );
}
