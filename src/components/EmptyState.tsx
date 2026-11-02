import React from "react";
import Link from "next/link";
import { CalendarClock, Bell, Mail, ArrowRight, ShieldCheck } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  showContactCTA?: boolean;
}

export function EmptyState({
  title = "Próximas Ediciones en Preparación",
  description = "Actualmente nuestro equipo docente y técnico se encuentra validando las fechas, contenidos y cupos de las próximas capacitaciones oficiales de DAOM Weightlifting.",
  showContactCTA = true,
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-daom-neutral-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-card">
      <div className="w-16 h-16 rounded-full bg-daom-blue-soft text-daom-blue flex items-center justify-center mx-auto mb-6">
        <CalendarClock className="w-8 h-8" aria-hidden="true" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-[#EFF6FF] text-[#175CD3] border border-[#B2CCF8] mb-3">
        <ShieldCheck className="w-3.5 h-3.5" />
        Control Editorial Riguroso
      </span>

      <h3 className="text-2xl font-bold text-daom-neutral-900 tracking-tight mb-3">
        {title}
      </h3>

      <p className="text-sm sm:text-base text-daom-neutral-600 leading-relaxed mb-8">
        {description}
      </p>

      {showContactCTA && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/contacto"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-daom-blue hover:bg-daom-blue-dark rounded-md min-h-[44px] transition-colors shadow-sm"
          >
            <Bell className="w-4 h-4" />
            <span>Notificarme de Nuevas Fechas</span>
          </Link>
          <Link
            href="/institucional"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-daom-neutral-700 border border-daom-neutral-300 hover:bg-daom-neutral-50 rounded-md min-h-[44px] transition-colors"
          >
            <span>Capacitaciones para Instituciones</span>
            <ArrowRight className="w-4 h-4 text-daom-blue" />
          </Link>
        </div>
      )}
    </div>
  );
}
