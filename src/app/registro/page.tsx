"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Mail, Lock, User, Phone, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/participante";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("AR");
  const [documentId, setDocumentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, phone, country, documentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al registrar la cuenta.");
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
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-20 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-daom-blue-soft text-daom-blue flex items-center justify-center mx-auto">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
          Crear Cuenta de Alumno
        </h1>
        <p className="text-xs sm:text-sm text-daom-neutral-600">
          Registrate para inscribirte en capacitaciones y acceder a todos tus materiales.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-[#FFF1F0] border border-[#FBC5C2] p-4 rounded-lg flex items-start gap-2.5 text-[#B42318] text-xs leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-lg border border-daom-neutral-200 shadow-card space-y-6">
        {/* ACCIÓN PRINCIPAL: REGISTRO CON GOOGLE */}
        <div className="space-y-2">
          <a
            href={`/api/auth/google?redirect=${encodeURIComponent(redirectUrl)}`}
            className="w-full min-h-[44px] px-4 py-3 bg-white border border-daom-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 text-neutral-800 rounded-md font-semibold text-sm inline-flex items-center justify-center gap-3 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-daom-blue"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar con Google</span>
          </a>
        </div>

        {/* SEPARADOR: O registrate con tu correo */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-daom-neutral-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-daom-neutral-500 font-semibold tracking-wider">
              O registrate con tu correo
            </span>
          </div>
        </div>

        {/* FORMULARIO TRADICIONAL */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="block text-xs font-bold text-daom-neutral-800 uppercase">
              Nombre y Apellido *
            </label>
            <div className="relative">
              <input
                type="text"
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
              />
              <User className="w-4 h-4 text-daom-neutral-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-bold text-daom-neutral-800 uppercase">
              Correo Electrónico *
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
            <label htmlFor="password" className="block text-xs font-bold text-daom-neutral-800 uppercase">
              Contraseña * (mínimo 8 caracteres)
            </label>
            <div className="relative">
              <input
                type="password"
                id="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
              />
              <Lock className="w-4 h-4 text-daom-neutral-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                Teléfono / WhatsApp
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 9 11 ..."
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                />
                <Phone className="w-4 h-4 text-daom-neutral-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="documentId" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                DNI / Documento
              </label>
              <input
                type="text"
                id="documentId"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Número de DNI"
                className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="country" className="block text-xs font-bold text-daom-neutral-800 uppercase">
              País de Residencia
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px] bg-white"
            >
              <option value="AR">Argentina (Mercado Pago / ARS)</option>
              <option value="CL">Chile</option>
              <option value="UY">Uruguay</option>
              <option value="BR">Brasil</option>
              <option value="CO">Colombia</option>
              <option value="MX">México</option>
              <option value="ES">España</option>
              <option value="OT">Otro País (Mercado Pago / ARS)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-daom-blue hover:bg-daom-blue-dark disabled:opacity-50 rounded-md min-h-[44px] transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creando cuenta...</span>
              </>
            ) : (
              <>
                <span>Crear Cuenta</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-2 text-center text-xs text-daom-neutral-600">
            ¿Ya tenés una cuenta?{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
              className="font-bold text-daom-blue hover:underline"
            >
              Iniciá sesión acá
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-daom-neutral-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-daom-blue" />
          <span>Cargando formulario de registro...</span>
        </div>
      }
    >
      <RegistroForm />
    </Suspense>
  );
}
