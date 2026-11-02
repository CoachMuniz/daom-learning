import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Mail, MapPin, ExternalLink, ShieldAlert } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-daom-neutral-200 mt-20" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Pie de página
      </h2>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Columna 1: Identidad Institucional y Logos Oficiales */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col gap-3">
              <div className="relative w-48 h-12">
                <Image
                  src="/assets/logos/daom-weightlifting-horizontal-azul.png"
                  alt="DAOM Weightlifting"
                  fill
                  className="object-contain object-left"
                  sizes="192px"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-daom-neutral-500 font-medium">Sede Deportiva:</span>
                <div className="relative w-24 h-8">
                  <Image
                    src="/assets/logos/club-daom.png"
                    alt="Club DAOM"
                    fill
                    className="object-contain object-left"
                    sizes="96px"
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-daom-neutral-600 leading-relaxed max-w-sm">
              División de Formación y Capacitación de DAOM Weightlifting. Especialización técnica, biomecánica y
              metodología de enseñanza en Levantamiento Olímpico de Pesas.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-daom-neutral-100 text-[11px] font-mono text-daom-neutral-600 border border-daom-neutral-200">
                <ShieldAlert className="w-3 h-3 text-daom-blue" />
                Canario de Control: DAOM-FORMACION-SHEET-01
              </span>
            </div>
          </div>

          {/* Columna 2: Capacitaciones */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-daom-neutral-900 mb-4">
              Capacitaciones
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/catalogo?tipo=seminario" className="text-daom-neutral-600 hover:text-daom-blue">
                  Seminarios Técnicos
                </Link>
              </li>
              <li>
                <Link href="/catalogo?tipo=clinica" className="text-daom-neutral-600 hover:text-daom-blue">
                  Clínicas Deportivas
                </Link>
              </li>
              <li>
                <Link href="/catalogo?tipo=workshop" className="text-daom-neutral-600 hover:text-daom-blue">
                  Workshops & Talleres
                </Link>
              </li>
              <li>
                <Link href="/catalogo?tipo=tutorial" className="text-daom-neutral-600 hover:text-daom-blue">
                  Tutoriales Digitales
                </Link>
              </li>
              <li>
                <Link href="/docentes" className="text-daom-neutral-600 hover:text-daom-blue">
                  Cuerpo Docente
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Información y Ayuda */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-daom-neutral-900 mb-4">
              Información
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/faq" className="text-daom-neutral-600 hover:text-daom-blue">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link href="/institucional" className="text-daom-neutral-600 hover:text-daom-blue">
                  Formación para Instituciones
                </Link>
              </li>
              <li>
                <Link href="/legal/politica-comercial" className="text-daom-neutral-600 hover:text-daom-blue">
                  Política Comercial y Precios
                </Link>
              </li>
              <li>
                <Link href="/legal/cambios-modalidad" className="text-daom-neutral-600 hover:text-daom-blue">
                  Cambios de Modalidad
                </Link>
              </li>
              <li>
                <Link href="/participante" className="text-daom-neutral-600 hover:text-daom-blue">
                  Área de Participante
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Contacto y Sede */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-daom-neutral-900 mb-4">
              Contacto y Sede
            </h3>
            <ul className="space-y-3 text-sm text-daom-neutral-600">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-daom-blue shrink-0 mt-0.5" />
                <span>Club DAOM, Av. Varela 1800, Flores, CABA, Argentina</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-daom-blue shrink-0" />
                <a href="mailto:capacitaciones@daom-weightlifting.com" className="hover:text-daom-blue">
                  capacitaciones@daom-weightlifting.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#16794A] shrink-0" />
                <a
                  href="https://wa.me/5491130393030"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#16794A] hover:underline"
                >
                  WhatsApp: +54 11 3039-3030
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra Legal Inferior */}
        <div className="mt-12 pt-8 border-t border-daom-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-daom-neutral-500">
          <p>© {new Date().getFullYear()} DAOM Weightlifting. Todos los derechos reservados.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/legal/terminos" className="hover:text-daom-blue">
              Términos y Condiciones
            </Link>
            <span className="text-daom-neutral-300">•</span>
            <Link href="/legal/privacidad" className="hover:text-daom-blue">
              Privacidad de Datos
            </Link>
            <span className="text-daom-neutral-300">•</span>
            <span className="text-daom-neutral-400">Zona horaria: America/Argentina/Buenos_Aires</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
