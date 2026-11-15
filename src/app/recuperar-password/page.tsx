"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

function RecuperarPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenParam = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [step, setStep] = useState<"request" | "reset">(tokenParam ? "reset" : "request");
  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tokenParam) {
      setToken(tokenParam);
      setStep("reset");
    }
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [tokenParam, emailParam]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al solicitar enlace de recuperación");
      }
      setMessage(
        "Si el correo se encuentra registrado, recibirás un enlace de acceso temporal para definir tu nueva contraseña. Por favor revisá tu bandeja de entrada y la carpeta de correo no deseado (Spam)."
      );
      if (data.debug_recovery_link) {
        console.log("[Recuperación Dev Link]", data.debug_recovery_link);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage("La contraseña debe tener un mínimo de 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          email: email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al restablecer contraseña");
      }
      setSuccess(true);
      setMessage("¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...");
      setTimeout(() => {
        router.push("/login?message=password_reset_success");
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar el cambio de contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-daom-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-daom-blue text-white flex items-center justify-center font-extrabold shadow-md">
            <KeyRound className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-daom-neutral-900 tracking-tight">
          {step === "reset" ? "Establecer nueva contraseña" : "Recuperar acceso a DAOM"}
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-daom-neutral-600">
          DAOM Learning • Portal Institucional Seguro
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-card rounded-xl border border-daom-neutral-200 sm:px-10">
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {step === "request" ? (
            <form onSubmit={handleRequestSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-daom-neutral-700">
                  Correo electrónico registrado
                </label>
                <div className="mt-1.5">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-daom-neutral-300 rounded-md shadow-sm placeholder-daom-neutral-400 focus:outline-none focus:ring-2 focus:ring-daom-blue focus:border-transparent text-sm"
                  />
                </div>
                <p className="mt-2 text-xs text-daom-neutral-500">
                  Te enviaremos un enlace temporal seguro para restablecer tu contraseña.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-daom-blue hover:bg-daom-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-daom-blue disabled:opacity-50 min-h-[44px] transition-colors"
              >
                {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-daom-blue hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Iniciar Sesión</span>
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              {email && (
                <div className="bg-daom-neutral-50 p-3 rounded border border-daom-neutral-200 text-xs text-daom-neutral-600">
                  Restableciendo contraseña para: <strong className="text-daom-neutral-900">{email}</strong>
                </div>
              )}

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-xs sm:text-sm font-semibold text-daom-neutral-700"
                >
                  Nueva Contraseña
                </label>
                <div className="mt-1.5">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-daom-neutral-300 rounded-md shadow-sm placeholder-daom-neutral-400 focus:outline-none focus:ring-2 focus:ring-daom-blue focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs sm:text-sm font-semibold text-daom-neutral-700"
                >
                  Confirmar Nueva Contraseña
                </label>
                <div className="mt-1.5">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetí tu nueva contraseña"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-daom-neutral-300 rounded-md shadow-sm placeholder-daom-neutral-400 focus:outline-none focus:ring-2 focus:ring-daom-blue focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-daom-blue hover:bg-daom-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-daom-blue disabled:opacity-50 min-h-[44px] transition-colors"
              >
                {loading ? "Actualizando contraseña..." : "Guardar nueva contraseña"}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-daom-blue hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Iniciar Sesión</span>
                </Link>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-daom-neutral-100 flex items-center justify-center gap-2 text-xs text-daom-neutral-400">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Encriptación criptográfica SHA-256 / bcrypt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecuperarPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-daom-neutral-500 text-sm">
          Cargando asistente de recuperación...
        </div>
      }
    >
      <RecuperarPasswordContent />
    </Suspense>
  );
}
