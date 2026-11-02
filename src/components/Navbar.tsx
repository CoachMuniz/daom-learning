"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, User as UserIcon, BookOpen, GraduationCap, HelpCircle, Phone, ShieldCheck } from "lucide-react";

interface NavbarProps {
  user?: {
    email: string;
    fullName: string;
    role: "ADMIN" | "PARTICIPANT" | "STAFF";
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-daom-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Oficial Intocable */}
          <Link href="/" className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-daom-blue rounded">
            <div className="relative w-44 h-12">
              <Image
                src="/assets/logos/daom-weightlifting-horizontal-azul.png"
                alt="DAOM Weightlifting — Formación"
                fill
                priority
                className="object-contain object-left"
                sizes="(max-width: 768px) 140px, 176px"
              />
            </div>
            <div className="hidden sm:block border-l border-daom-neutral-300 pl-3">
              <span className="text-xs uppercase tracking-wider font-extrabold text-daom-blue">
                Learning
              </span>
              <p className="text-[10px] text-daom-neutral-500 font-medium">Plataforma Académica</p>
            </div>
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2" aria-label="Navegación principal">
            <Link
              href="/"
              className="px-3 py-2 text-sm font-medium text-daom-neutral-700 hover:text-daom-blue hover:bg-daom-blue-soft rounded-md transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/catalogo"
              className="px-3 py-2 text-sm font-medium text-daom-neutral-700 hover:text-daom-blue hover:bg-daom-blue-soft rounded-md transition-colors"
            >
              Catálogo
            </Link>
            <Link
              href="/docentes"
              className="px-3 py-2 text-sm font-medium text-daom-neutral-700 hover:text-daom-blue hover:bg-daom-blue-soft rounded-md transition-colors"
            >
              Docentes
            </Link>
            <Link
              href="/faq"
              className="px-3 py-2 text-sm font-medium text-daom-neutral-700 hover:text-daom-blue hover:bg-daom-blue-soft rounded-md transition-colors"
            >
              Preguntas Frecuentes
            </Link>
            <Link
              href="/institucional"
              className="px-3 py-2 text-sm font-medium text-daom-neutral-700 hover:text-daom-blue hover:bg-daom-blue-soft rounded-md transition-colors"
            >
              Institucional
            </Link>
            <Link
              href="/contacto"
              className="px-3 py-2 text-sm font-medium text-daom-neutral-700 hover:text-daom-blue hover:bg-daom-blue-soft rounded-md transition-colors"
            >
              Contacto
            </Link>
          </nav>

          {/* Acciones de Usuario Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center gap-2">
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-daom-red-dark bg-daom-red-soft hover:bg-red-100 rounded-md transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Panel Admin
                  </Link>
                )}
                <Link
                  href="/participante"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-daom-blue border border-daom-neutral-300 hover:bg-daom-blue-soft rounded-md min-h-[44px] transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Mi Cuenta ({user.fullName.split(" ")[0]})</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-daom-neutral-700 hover:text-daom-blue rounded-md min-h-[44px] flex items-center"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/catalogo"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-daom-blue hover:bg-daom-blue-dark rounded-md min-h-[44px] transition-colors shadow-sm"
                >
                  Ver Capacitaciones
                </Link>
              </div>
            )}
          </div>

          {/* Botón Hamburger Mobile */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-daom-neutral-700 hover:text-daom-blue hover:bg-daom-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-daom-blue min-h-[44px] min-w-[44px]"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Abrir menú de navegación</span>
              {isOpen ? <X className="block h-6 w-6" aria-hidden="true" /> : <Menu className="block h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Mobile Desplegable */}
      {isOpen && (
        <div className="md:hidden border-b border-daom-neutral-200 bg-white px-4 pt-2 pb-6 space-y-2" id="mobile-menu">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-daom-neutral-800 hover:bg-daom-blue-soft hover:text-daom-blue"
          >
            <BookOpen className="w-5 h-5 text-daom-blue" />
            Inicio
          </Link>
          <Link
            href="/catalogo"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-daom-neutral-800 hover:bg-daom-blue-soft hover:text-daom-blue"
          >
            <GraduationCap className="w-5 h-5 text-daom-blue" />
            Catálogo de Capacitaciones
          </Link>
          <Link
            href="/docentes"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-daom-neutral-800 hover:bg-daom-blue-soft hover:text-daom-blue"
          >
            <UserIcon className="w-5 h-5 text-daom-blue" />
            Cuerpo Docente
          </Link>
          <Link
            href="/faq"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-daom-neutral-800 hover:bg-daom-blue-soft hover:text-daom-blue"
          >
            <HelpCircle className="w-5 h-5 text-daom-blue" />
            Preguntas Frecuentes
          </Link>
          <Link
            href="/institucional"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-daom-neutral-800 hover:bg-daom-blue-soft hover:text-daom-blue"
          >
            Institucional
          </Link>
          <Link
            href="/contacto"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-daom-neutral-800 hover:bg-daom-blue-soft hover:text-daom-blue"
          >
            <Phone className="w-5 h-5 text-daom-blue" />
            Contacto
          </Link>

          <div className="pt-4 border-t border-daom-neutral-200 space-y-2">
            {user ? (
              <>
                <Link
                  href="/participante"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center px-4 py-2.5 text-base font-semibold text-daom-blue border border-daom-blue rounded-md min-h-[44px]"
                >
                  Mi Cuenta ({user.fullName})
                </Link>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-base font-semibold text-daom-red-dark bg-daom-red-soft rounded-md min-h-[44px]"
                  >
                    Panel de Administración
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center px-4 py-2.5 text-base font-semibold text-daom-neutral-800 border border-daom-neutral-300 rounded-md min-h-[44px]"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/catalogo"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center px-4 py-2.5 text-base font-semibold text-white bg-daom-blue rounded-md min-h-[44px]"
                >
                  Ver Capacitaciones
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
