import React from "react";
import Link from "next/link";
import { Search, Filter, BookOpen } from "lucide-react";
import { getPublishedTrainings } from "@/lib/db/repository";
import { TrainingCard } from "@/components/TrainingCard";
import { EmptyState } from "@/components/EmptyState";

export const revalidate = 60;

interface CatalogoPageProps {
  searchParams?: {
    tipo?: string;
    q?: string;
  };
}

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const selectedTipo = searchParams?.tipo || "todos";
  const searchQuery = searchParams?.q || "";

  const allTrainings = await getPublishedTrainings({
    tipo: selectedTipo !== "todos" ? selectedTipo : undefined,
    search: searchQuery,
  });

  const categories = [
    { id: "todos", label: "Todas las capacitaciones" },
    { id: "seminario", label: "Seminarios" },
    { id: "clinica", label: "Clínicas" },
    { id: "workshop", label: "Workshops" },
    { id: "tutorial", label: "Tutoriales" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Encabezado */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-daom-blue uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>Oferta Académica Oficial</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-daom-neutral-900 tracking-tight">
          Catálogo de Capacitaciones
        </h1>
        <p className="text-base text-daom-neutral-600 max-w-2xl leading-relaxed">
          Seminarios técnicos, clínicas deportivas, workshops y tutoriales estructurados según la metodología
          oficial de DAOM Weightlifting.
        </p>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-lg border border-daom-neutral-200 p-4 shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Pestañas de categorías */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtrar por tipo de capacitación">
          {categories.map((cat) => {
            const isActive = selectedTipo === cat.id;
            return (
              <Link
                key={cat.id}
                href={`/catalogo?tipo=${cat.id}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors min-h-[44px] flex items-center ${
                  isActive
                    ? "bg-daom-blue text-white shadow-sm"
                    : "text-daom-neutral-700 hover:bg-daom-blue-soft hover:text-daom-blue"
                }`}
                role="tab"
                aria-selected={isActive}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        {/* Buscador de texto */}
        <form method="GET" action="/catalogo" className="relative min-w-[240px]">
          <input type="hidden" name="tipo" value={selectedTipo} />
          <div className="relative">
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Buscar por tema o título..."
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
            />
            <Search className="w-4 h-4 text-daom-neutral-400 absolute left-3 top-3.5" aria-hidden="true" />
          </div>
        </form>
      </div>

      {/* Listado de Capacitaciones */}
      <div>
        {allTrainings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTrainings.map((training) => (
              <TrainingCard key={training.capacitacion_id} training={training} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={searchQuery ? "Sin resultados para tu búsqueda" : "Próximas Ediciones en Preparación"}
            description={
              searchQuery
                ? `No encontramos capacitaciones publicadas que coincidan con "${searchQuery}". Probá utilizando términos más generales o consultá nuestro cronograma.`
                : "Actualmente las capacitaciones de esta categoría se encuentran en proceso de validación editorial en Google Sheets. Podés dejarnos tu consulta para recibir la fecha de apertura de inscripciones."
            }
          />
        )}
      </div>
    </div>
  );
}
