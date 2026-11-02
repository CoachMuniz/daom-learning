"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error no controlado en la aplicación:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-[#FFF1F0] text-[#B42318] flex items-center justify-center mx-auto">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <span className="text-xs font-mono text-daom-neutral-400">Canario: DAOM-FORMACION-SHEET-01</span>

      <h1 className="text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
        Se produjo un error inesperado
      </h1>

      <p className="text-sm text-daom-neutral-600 leading-relaxed">
        Nuestro equipo de sistemas ya fue notificado. Podés reintentar la acción o volver a la página de inicio.
      </p>

      <div className="pt-4 flex items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-daom-blue rounded-md hover:bg-daom-blue-dark min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-daom-neutral-700 border border-daom-neutral-300 rounded-md hover:bg-daom-neutral-50 min-h-[44px]"
        >
          <Home className="w-4 h-4" />
          <span>Inicio</span>
        </Link>
      </div>
    </div>
  );
}
