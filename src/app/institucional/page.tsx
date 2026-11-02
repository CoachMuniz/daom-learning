import React from "react";
import Link from "next/link";
import { Building2, Award, Users, CheckCircle2, ShieldCheck, Mail, Phone, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Formación para Instituciones y Clubes | DAOM Learning",
  description:
    "Capacitaciones técnicas a medida, workshops y consultoría metodológica en Weightlifting para gimnasios, boxes de cross training y clubes deportivos.",
};

export default function InstitucionalPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      {/* Hero Institucional */}
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-daom-blue uppercase tracking-wider">
          <Building2 className="w-4 h-4" />
          <span>Alianzas y Capacitación Corporativa</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-daom-neutral-900 tracking-tight leading-tight">
          Capacitaciones exclusivas para instituciones deportivas
        </h1>
        <p className="text-base sm:text-lg text-daom-neutral-600 leading-relaxed">
          Diseñamos programas de formación in-company, workshops técnicos y asesoramiento biomecánico adaptado a las
          necesidades específicas de tu cuerpo técnico, preparadores físicos y atletas.
        </p>
      </div>

      {/* Pilares Institucionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-lg border border-daom-neutral-200 p-6 sm:p-8 shadow-card space-y-3">
          <div className="w-12 h-12 rounded bg-daom-blue-soft text-daom-blue flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-daom-neutral-900">Rigor Metodológico IWF</h3>
          <p className="text-sm text-daom-neutral-600 leading-relaxed">
            Docentes entrenadores certificados internacionalmente por la International Weightlifting Federation, con
            pedagogía probada para todos los niveles de aprendizaje.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-daom-neutral-200 p-6 sm:p-8 shadow-card space-y-3">
          <div className="w-12 h-12 rounded bg-daom-blue-soft text-daom-blue flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-daom-neutral-900">Adaptación al Contexto</h3>
          <p className="text-sm text-daom-neutral-600 leading-relaxed">
            Personalizamos el enfoque del curso según la disciplina principal de tu institución (rugby, fútbol,
            cross training, deportes de combate o iniciación deportiva).
          </p>
        </div>

        <div className="bg-white rounded-lg border border-daom-neutral-200 p-6 sm:p-8 shadow-card space-y-3">
          <div className="w-12 h-12 rounded bg-daom-blue-soft text-daom-blue flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-daom-neutral-900">Sede o In-House</h3>
          <p className="text-sm text-daom-neutral-600 leading-relaxed">
            Podemos dictar la capacitación en nuestras instalaciones reglamentarias en Club DAOM o trasladar a nuestro
            equipo técnico directamente a tu gimnasio o club.
          </p>
        </div>
      </div>

      {/* Formulario de Solicitud de Presupuesto Institucional */}
      <div className="bg-white rounded-xl border border-daom-neutral-200 p-6 sm:p-10 shadow-card">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-daom-neutral-900">
              Solicitud de Presupuesto Personalizado
            </h2>
            <p className="text-sm text-daom-neutral-600">
              Completá el formulario y nuestro equipo de coordinación académica se contactará para coordinar fecha,
              temario y propuesta económica.
            </p>
          </div>

          <form action="/api/contacto/enviar" method="POST" className="space-y-4">
            <input type="hidden" name="tipo_consulta" value="institucional" />
            {/* Honeypot anti-spam */}
            <input type="text" name="website_url" className="hidden" tabIndex={-1} autoComplete="off" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="nombre" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  required
                  placeholder="Tu nombre completo"
                  className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="institucion" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                  Institución / Club / Box *
                </label>
                <input
                  type="text"
                  id="institucion"
                  name="institucion"
                  required
                  placeholder="Nombre de la institución"
                  className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="contacto@institucion.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="telefono" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  required
                  placeholder="+54 9 11 ..."
                  className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mensaje" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                Detalle del Requerimiento *
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows={4}
                required
                placeholder="Indicar cantidad estimada de participantes, objetivos técnicos y fecha tentativa..."
                className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-daom-blue hover:bg-daom-blue-dark rounded-md min-h-[44px] transition-colors shadow-sm"
            >
              <span>Enviar Solicitud de Presupuesto</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
