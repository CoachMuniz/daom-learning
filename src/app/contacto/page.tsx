import React from "react";
import { Mail, Phone, MapPin, MessageCircle, Send, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Contacto | DAOM Learning",
  description: "Canales oficiales de consulta, WhatsApp y formulario de atención de DAOM Learning.",
};

export default function ContactoPage({
  searchParams,
}: {
  searchParams?: { enviado?: string };
}) {
  const isEnviado = searchParams?.enviado === "1";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Encabezado */}
      <div className="max-w-2xl space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-daom-blue uppercase tracking-wider">
          <Phone className="w-4 h-4" />
          <span>Atención al Alumno</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-daom-neutral-900 tracking-tight">
          Contactate con DAOM Learning
        </h1>
        <p className="text-base text-daom-neutral-600 leading-relaxed">
          Estamos a tu disposición para asesorarte sobre inscripciones, temarios, modalidades y requisitos técnicos.
        </p>
      </div>

      {isEnviado && (
        <div className="bg-[#EAF7F0] border border-[#A6E1C4] rounded-lg p-5 flex items-center gap-3 text-[#16794A]">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div>
            <h3 className="font-bold text-sm">¡Mensaje enviado correctamente!</h3>
            <p className="text-xs">Nuestro equipo de coordinación académica se contactará a la brevedad.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Canales Directos */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-daom-neutral-200 p-6 shadow-card space-y-6">
            <h2 className="text-lg font-bold text-daom-neutral-900 border-b border-daom-neutral-100 pb-3">
              Canales Directos
            </h2>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-daom-neutral-500 uppercase tracking-wider">
                Atención Inmediata
              </span>
              <a
                href="https://wa.me/5491130393030"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-[#EAF7F0] border border-[#A6E1C4] text-[#16794A] hover:bg-[#d5f0e1] transition-colors"
              >
                <MessageCircle className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-bold text-sm">WhatsApp Oficial</p>
                  <p className="text-xs">+54 11 3039-3030</p>
                </div>
              </a>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-daom-neutral-500 uppercase tracking-wider">
                Correo Electrónico
              </span>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-daom-neutral-50 border border-daom-neutral-200 text-daom-neutral-800">
                <Mail className="w-5 h-5 text-daom-blue shrink-0" />
                <a
                  href="mailto:capacitaciones@daom-weightlifting.com"
                  className="text-xs sm:text-sm font-semibold hover:text-daom-blue truncate"
                >
                  capacitaciones@daom-weightlifting.com
                </a>
              </div>
            </div>

            {/* Sede */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-daom-neutral-500 uppercase tracking-wider">
                Sede Deportiva
              </span>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-daom-neutral-50 border border-daom-neutral-200 text-daom-neutral-800">
                <MapPin className="w-5 h-5 text-daom-blue shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold">Club DAOM</p>
                  <p className="text-daom-neutral-600">Avenida Varela 1800, Flores, CABA, Argentina</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario Web */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-daom-neutral-200 p-6 sm:p-8 shadow-card space-y-6">
            <h2 className="text-xl font-bold text-daom-neutral-900 border-b border-daom-neutral-100 pb-3">
              Envianos un Mensaje
            </h2>

            <form action="/api/contacto/enviar" method="POST" className="space-y-5">
              <input type="hidden" name="tipo_consulta" value="web_contacto" />
              <input type="text" name="website_url" className="hidden" tabIndex={-1} autoComplete="off" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="nombre" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    required
                    placeholder="Tu nombre y apellido"
                    className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="tu@email.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="telefono" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    placeholder="+54 9 11 ..."
                    className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tipo_consulta" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                    Tema de la Consulta
                  </label>
                  <select
                    id="tipo_consulta"
                    name="tipo_consulta"
                    className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px] bg-white"
                  >
                    <option value="inscripciones">Inscripciones y Vacantes</option>
                    <option value="modalidades">Modalidades de Cursada</option>
                    <option value="materiales">Materiales y Certificados</option>
                    <option value="pagos">Pagos y Facturación</option>
                    <option value="otro">Otras Consultas</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mensaje" className="block text-xs font-bold text-daom-neutral-800 uppercase">
                  Mensaje *
                </label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  rows={5}
                  required
                  placeholder="Escribí aquí tu consulta o duda sobre las capacitaciones..."
                  className="w-full px-3.5 py-2.5 text-sm border border-daom-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-daom-blue min-h-[44px]"
                ></textarea>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-bold text-white bg-daom-blue hover:bg-daom-blue-dark rounded-md min-h-[44px] transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Consulta</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
