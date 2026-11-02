"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export function AdminSyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/sync/sheets", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Fallo en la sincronización.");
      }
      setMessage(`Sincronización completada: ${data.report?.recordsSynced ?? 0} registros sincronizados.`);
      router.refresh();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
      {message && (
        <span className="text-xs font-medium text-daom-neutral-700 bg-daom-neutral-100 px-3 py-1.5 rounded border border-daom-neutral-200">
          {message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-daom-blue hover:bg-daom-blue-dark disabled:opacity-50 rounded-md min-h-[44px] transition-colors shadow-sm"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        <span>{syncing ? "Sincronizando planilla..." : "Sincronizar Catálogo Ahora"}</span>
      </button>
    </div>
  );
}
