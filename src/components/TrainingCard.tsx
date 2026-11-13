import { findMatchingPrice } from '@/lib/commercial/rules';
import React from "react";
import Link from "next/link";
import { Clock, Users, Calendar, ArrowRight, ShieldCheck } from "lucide-react";
import type { Training } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface TrainingCardProps {
  training: Training;
}

export function TrainingCard({ training }: TrainingCardProps) {
  const nextEdition = training.ediciones && training.ediciones.length > 0 ? training.ediciones[0] : null;
  const priceAr = nextEdition?.precios ? findMatchingPrice(nextEdition.precios, "AR", "ARS") : undefined;
  const priceInt = nextEdition?.precios ? findMatchingPrice(nextEdition.precios, "INT", "USD") : undefined;

  return (
    <article className="flex flex-col bg-white rounded-lg border border-daom-neutral-200 overflow-hidden shadow-card hover:shadow-md transition-shadow">
      {/* Cabecera visual de tarjeta */}
      <div className="relative h-44 bg-gradient-to-br from-daom-blue to-daom-blue-dark flex flex-col justify-between p-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white border border-white/30">
            {training.tipo}
          </span>
          {training.destacada === "SI" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-daom-red text-white">
              Destacada
            </span>
          )}
        </div>

        <div>
          <span className="text-[11px] font-mono tracking-wider text-daom-blue-soft uppercase">
            {training.capacitacion_id}
          </span>
          <h3 className="text-xl font-bold tracking-tight text-white leading-tight mt-0.5 line-clamp-1">
            {training.titulo}
          </h3>
        </div>
      </div>

      {/* Cuerpo de tarjeta */}
      <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {training.subtitulo && (
            <p className="text-sm font-medium text-daom-neutral-800 line-clamp-2">
              {training.subtitulo}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-daom-neutral-600 pt-1">
            {training.duracion && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-daom-blue" />
                {training.duracion}
              </span>
            )}

            {training.docentes && training.docentes.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-daom-blue" />
                {training.docentes.map((d) => d.nombre.split(" ")[0]).join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Información de edición o estado de cupos */}
        <div className="pt-3 border-t border-daom-neutral-100 flex items-center justify-between">
          <div>
            {priceAr ? (
              <div>
                <span className="text-xs text-daom-neutral-500">Desde</span>
                <p className="text-base font-bold text-daom-neutral-900">
                  ${priceAr.precio_base.toLocaleString("es-AR")} <span className="text-xs font-normal text-daom-neutral-500">ARS</span>
                </p>
              </div>
            ) : nextEdition?.fecha_inicio ? (
              <div className="flex items-center gap-1.5 text-xs text-daom-neutral-700">
                <Calendar className="w-3.5 h-3.5 text-daom-blue" />
                <span>{nextEdition.fecha_inicio}</span>
              </div>
            ) : (
              <span className="text-xs font-medium text-daom-neutral-500">Próxima edición en preparación</span>
            )}
          </div>

          <Link
            href={`/capacitacion/${training.capacitacion_id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-daom-blue bg-daom-blue-soft hover:bg-blue-100 rounded-md min-h-[44px] transition-colors"
          >
            <span>Ver Programa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
