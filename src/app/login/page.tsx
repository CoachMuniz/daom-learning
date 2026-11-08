"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/participante";
  const linkPending = searchParams.get("link_pending") === "true";
  const linkToken = searchParams.get("token") || "";
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState(false);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam) {
      if (errParam === "google_oauth_pending_configuration") {
        setError(
          "El inicio de sesión con Google requiere credenciales activas en Google Cloud Console. Podés ingresar con tu correo y contraseña habituales."
        );
      } else if (errParam === "unverified_google_email") {
        setError(
          "Tu cuenta de Google no tiene el correo electrónico verificado. Por favor verificalo en Google o ingresá con contraseña."
        );
      } else if (errParam === "invalid_oauth_state" || errParam === "missing_oauth_parameters") {
        setError("La sesión de autenticación expiró o es inválida. Por favor intentá nuevamente.");
      } else if (errParam.includes("access_denied")) {
        setError("Se canceló el inicio de sesión con Google.");
      } else {
        setError(`Error al iniciar sesión: ${errParam.replace(/_/g, " ")}`);
      }
    }
  }, [searchParams]);

  // Manejo de inicio de sesión tradicional (correo y contraseña)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
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

  // Manejo de vinculación segura de cuenta Google con perfil existente
  async function handleLinkAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLinkingLoading(true);

    try {
      const res = await fetch("/api/auth/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: linkToken,
          password: linkPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al vincular la cuenta.");
      }

      setSuccess("¡Cuenta vinculada exitosamente! Redirigiendo a tu espacio...");
      setTimeout(() => {
        router.push(data.redirectUrl || redirectUrl);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLinkingLoading(false);
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
          Iniciá sesión para acceder a tus capacitaciones, materiales ZIP y certificados oficiales.
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

      {success && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-center gap-2.5 text-emerald-800 text-xs leading-relaxed"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Caso: Vinculación Segura de Cuenta Existente */}
      {linkPending && linkToken ? (
        <div className="bg-white p-6 sm:p-8 rounded-lg border border-daom-blue-soft shadow-card space-y-5">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-daom-blue mt-0.5" />
            <div>
              <p className="font-bold">Cuenta Institucional Existente</p>
              <p className="text-neutral-700 mt-1">
                Detectamos una cuenta registrada con el correo <strong>{initialEmail}</strong>.
                Para vincularla con Google y proteger tus datos, confirmá tu contraseña actual.
              </p>
            </div>
          </div>

          <form onSubmit={handleLinkAccount} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="link-password" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                Contraseña de tu cuenta DAOM
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="link-password"
                  required
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                />
                <Lock className="w-4 h-4 text-daom-neutral-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={linkingLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-daom-blue hover:bg-daom-blue-dark disabled:opacity-50 rounded-md min-h-[44px] transition-colors shadow-sm"
            >
              {linkingLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando y vinculando...</span>
                </>
              ) : (
                <>
                  <span>Verificar y Vincular Cuenta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
                className="text-xs text-daom-neutral-500 hover:text-daom-blue underline"
              >
                Cancelar y volver al acceso tradicional
              </Link>
            </div>
          </form>
        </div>
      ) : (
        /* Caso: Flujo Normal de Inicio de Sesión */
        <div className="bg-white p-6 sm:p-8 rounded-lg border border-daom-neutral-200 shadow-card space-y-6">
          {/* ACCIÓN PRINCIPAL: CONTINUAR CON GOOGLE */}
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

          {/* SEPARADOR: O ingresá con tu correo */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-daom-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-daom-neutral-500 font-semibold tracking-wider">
                O ingresá con tu correo
              </span>
            </div>
          </div>

          {/* ACCESO ALTERNATIVO: CORREO Y CONTRASEÑA */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Accediendo...</span>
                </>
              ) : (
                <>
                  <span>Ingresar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* ACCIONES ADICIONALES */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-daom-neutral-600">
              <div>
                ¿No tenés cuenta aún?{" "}
                <Link
                  href={`/registro?redirect=${encodeURIComponent(redirectUrl)}`}
                  className="font-bold text-daom-blue hover:underline"
                >
                  Registrarse
                </Link>
              </div>
              <div>
                <a
                  href="https://wa.me/5491100000000?text=Hola,%20necesito%20ayuda%20para%20recuperar%20mi%20contraseña%20en%20DAOM%20Learning"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-daom-neutral-500 hover:text-daom-blue hover:underline"
                >
                  Recuperar contraseña
                </a>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-daom-neutral-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-daom-blue" />
          <span>Cargando formulario de acceso...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
