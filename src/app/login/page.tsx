"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/participante";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al iniciar sesión.");
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-daom-blue-soft text-daom-blue flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
          Acceso al Área de Alumnos
        </h1>
        <p className="text-xs sm:text-sm text-daom-neutral-600">
          Iniciá sesión para acceder a tus capacitaciones, materiales ZIP y certificados.
        </p>
      </div>

      {error && (
        <div className="bg-[#FFF1F0] border border-[#FBC5C2] p-4 rounded-lg flex items-center gap-2.5 text-[#B42318] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-lg border border-daom-neutral-200 shadow-card space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-bold text-daom-neutral-800 uppercase">
            Correo Electrónico
          </label>
          <div className="relative">
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
            />
            <Mail className="w-4 h-4 text-daom-neutral-400 absolute left-3 top-3.5" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-bold text-daom-neutral-800 uppercase">
              Contraseña
            </label>
          </div>
          <div className="relative">
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
            />
            <Lock className="w-4 h-4 text-daom-neutral-400 absolute left-3 top-3.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-daom-blue hover:bg-daom-blue-dark disabled:opacity-50 rounded-md min-h-[44px] transition-colors shadow-sm"
        >
          <span>{loading ? "Accediendo..." : "Ingresar"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="pt-2 text-center text-xs text-daom-neutral-600">
          ¿No tenés cuenta aún?{" "}
          <Link href={`/registro?redirect=${encodeURIComponent(redirectUrl)}`} className="font-bold text-daom-blue hover:underline">
            Registrate acá
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-daom-neutral-500">Cargando formulario...</div>}>
      <LoginForm />
    </Suspense>
  );
}
