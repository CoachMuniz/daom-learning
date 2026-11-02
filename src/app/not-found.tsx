import React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-daom-blue-soft text-daom-blue flex items-center justify-center mx-auto">
        <AlertCircle className="w-8 h-8" />
      </div>

      <span className="text-xs font-mono text-daom-neutral-400 uppercase">Error 404</span>

      <h1 className="text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
        Página no encontrada
      </h1>

      <p className="text-sm sm:text-base text-daom-neutral-600 leading-relaxed">
        La capacitación, recurso o página a la que intentás acceder no existe o fue retirada temporalmente del catálogo.
      </p>

      <div className="pt-4 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-daom-neutral-700 border border-daom-neutral-300 rounded-md hover:bg-daom-neutral-50 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-daom-blue rounded-md hover:bg-daom-blue-dark min-h-[44px]"
        >
          <BookOpen className="w-4 h-4" />
          <span>Explorar Catálogo</span>
        </Link>
      </div>
    </div>
  );
}
