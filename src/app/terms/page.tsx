import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import {
  ShieldCheck,
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Video,
  Award,
  BookOpen,
  QrCode,
  Users,
  Clock,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Términos y Condiciones de Contratación | DAOM Learning",
  description:
    "Términos y condiciones de contratación de DAOM Learning. Marco académico, aranceles, inscripciones, becas, presentismo por QR y código, Google Meet, certificaciones y revocación (Ley 24.240).",
};

export default function TermsPage() {
  const lastUpdated = "16 de Noviembre de 2026";

  return (
    <main className="min-h-screen bg-daom-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navegación de retorno */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-daom-blue hover:underline gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a DAOM Learning
          </Link>
          <span className="text-xs text-daom-neutral-500 font-medium font-mono">
            DAOM Learning • Marco Contractual Oficial
          </span>
        </div>

        {/* Encabezado Principal */}
        <div className="bg-white rounded-2xl shadow-card border border-daom-neutral-200 p-8 sm:p-10 mb-8">
          <div className="flex items-center gap-3 text-daom-blue mb-3">
            <FileText className="w-8 h-8 text-daom-blue" />
            <span className="text-xs font-bold tracking-widest uppercase bg-blue-50 px-2.5 py-1 rounded text-daom-blue border border-blue-100">
              Marco Contractual y Normativo
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-daom-neutral-900 tracking-tight">
            Términos y Condiciones de Contratación — DAOM Learning
          </h1>
          <p className="mt-3 text-sm text-daom-neutral-600 leading-relaxed">
            Las presentes condiciones regulan los derechos y obligaciones entre el participante o alumno y <strong>DAOM Learning</strong> (plataforma académica oficial de <strong>DAOM Weightlifting</strong>), conforme a la Ley Nacional de Defensa del Consumidor N° 24.240, el Código Civil y Comercial de la Nación y la reglamentación académica aprobada.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-daom-neutral-500 pt-4 border-t border-daom-neutral-100">
            <div>
              <strong>Última actualización:</strong> {lastUpdated}
            </div>
            <div>•</div>
            <div>
              <strong>Sede deportiva:</strong> Club DAOM, Av. Varela 1802, Flores, CABA
            </div>
            <div>•</div>
            <div>
              <strong>Contacto:</strong> <code>daom.weightlifting@gmail.com</code>
            </div>
          </div>
        </div>

        {/* Contenido de los Términos */}
        <div className="bg-white rounded-2xl shadow-card border border-daom-neutral-200 p-8 sm:p-10 space-y-10 text-daom-neutral-700 text-sm leading-relaxed">
          
          {/* Sección 1 */}
          <section id="partes">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">1</span>
              Partes e Identificación Institucional
            </h2>
            <p>
              El presente contrato de formación y perfeccionamiento deportivo rige entre el adquirente o alumno (en adelante, el &ldquo;Usuario&rdquo; o &ldquo;Alumno&rdquo;) y el <strong>Área de Weightlifting de Club DAOM (DAOM Weightlifting)</strong>, en el marco institucional de <strong>Deportes y Olimpismo Metropolitano Asociación Civil</strong> (Club DAOM, fundado el 12 de octubre de 1927).
            </p>
            <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200 space-y-1.5 text-xs mt-3">
              <p><strong>Sede deportiva e instalaciones:</strong> Av. Varela 1802, Flores, CABA (C1406ELH), República Argentina.</p>
              <p><strong>Canal oficial de atención:</strong> <a href="mailto:daom.weightlifting@gmail.com" className="text-daom-blue font-semibold hover:underline">daom.weightlifting@gmail.com</a></p>
              <p><strong>Línea de WhatsApp oficial:</strong> +54 11 3039-3030</p>
            </div>
          </section>

          {/* Sección 2 */}
          <section id="arquitectura-academica">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">2</span>
              Arquitectura Académica: Capacitaciones, Jornadas y Encuentros
            </h2>
            <p className="mb-3">
              DAOM Learning implementa un modelo de estructuración académica modular con las siguientes categorías:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1 uppercase tracking-wide text-daom-blue">Capacitaciones</h3>
                <p className="text-xs text-daom-neutral-600">
                  Programas integrales (seminarios, clínicas, cursos de entrenadores o workshops) catalogados y sincronizados institucionalmente.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1 uppercase tracking-wide text-daom-blue">Jornadas</h3>
                <p className="text-xs text-daom-neutral-600">
                  Unidades temáticas con cupo y arancel independiente. Pueden cursarse por separado o adquirirse como paquete completo.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1 uppercase tracking-wide text-daom-blue">Encuentros</h3>
                <p className="text-xs text-daom-neutral-600">
                  Sesiones sincrónicas (presencial o streaming) con duración horaria exacta, sala interactiva y sistema de presentismo.
                </p>
              </div>
            </div>
          </section>

          {/* Sección 3 */}
          <section id="modalidades">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">3</span>
              Modalidades de Cursada y Streaming Oficial (Google Meet)
            </h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1">A. Modalidad Presencial</h3>
                <p className="text-xs text-daom-neutral-600">
                  Práctica deportiva directa sobre la tarima olímpica de Club DAOM. Cupo limitado para asegurar el ratio docente-alumno. Requiere asistencia obligatoria y acreditación en la recepción de la sede.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1">B. Modalidad Streaming en Vivo (Google Calendar + Google Meet)</h3>
                <p className="text-xs text-daom-neutral-600">
                  Transmisión sincrónica en alta definición. Por principio de seguridad, <strong>DAOM Learning NO distribuye enlaces públicos de Google Meet</strong>. El acceso se instrumenta exclusivamente mediante una invitación individual de Google Calendar enviada a la cuenta de correo del alumno con inscripción confirmada.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1">C. Modalidad On-Demand (Grabado)</h3>
                <p className="text-xs text-daom-neutral-600">
                  Grabación completa en alta calidad y recursos didácticos alojados en la plataforma privada. Cursada a ritmo propio. Otorga derecho a los materiales y a la certificación por completitud, pero no computa horas sincrónicas de presentismo.
                </p>
              </div>
            </div>
          </section>

          {/* Sección 4 */}
          <section id="aranceles-pagos">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">4</span>
              Aranceles, Medios de Pago y Cobranzas
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed mb-2">
              Los pagos en pesos argentinos (ARS) se procesan íntegramente a través de la pasarela oficial <strong>Mercado Pago Checkout Pro</strong>, admitiendo tarjetas de crédito, débito y dinero en cuenta.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-daom-neutral-600">
              <li>La vacante no se considera confirmada hasta la efectiva aprobación del cobro por la pasarela o la emisión de la constancia de beca al 100%.</li>
              <li>Los precios publicados en el catálogo general (Google Sheets) son la única fuente oficial de verdad y se expresan con impuestos incluidos cuando corresponda.</li>
              <li>DAOM no almacena números de tarjeta ni datos bancarios bajo ninguna circunstancia.</li>
            </ul>
          </section>

          {/* Sección 5 */}
          <section id="becas">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">5</span>
              Régimen Institucional de Becas
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed mb-2">
              DAOM Weightlifting contempla un programa de becas de perfeccionamiento para atletas, entrenadores o casos de mérito deportivo aprobados por la Dirección:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-daom-neutral-600">
              <li><strong>Inmutabilidad estricta:</strong> Por política institucional definitiva, el porcentaje de beca otorgado a una inscripción es inmutable: no puede modificarse, recalcularse ni otorgarse de manera duplicada.</li>
              <li><strong>Becas al 100%:</strong> Habilitan de forma automática la confirmación de la inscripción, el acceso al Campus y la invitación individual al streaming sin saldo pendiente.</li>
              <li><strong>Becas Parciales (1% al 99%):</strong> Requieren el abono del arancel diferencial remanente antes del inicio de la actividad para validar el ingreso.</li>
              <li><strong>No retroactividad:</strong> No se otorgan becas retroactivas sobre inscripciones con arancel previamente cobrado y acreditado al 100%.</li>
            </ul>
          </section>

          {/* Sección 6 */}
          <section id="cupos-espera">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">6</span>
              Cupos Independientes y Lista de Espera de 24 Horas
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed mb-2">
              Para garantizar calidad formativa y seguridad edilicia, los cupos son estrictos y no admiten sobreventa:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-daom-neutral-600">
              <li>Al completarse el cupo de una jornada, los interesados podrán anotarse en la <strong>Lista de Espera oficial</strong>.</li>
              <li>Al producirse una vacante (por cancelación o baja), el sistema la asignará al primer postulante de la lista con una <strong>reserva temporal exclusiva de veinticuatro (24) horas corridas</strong>.</li>
              <li>Si el postulante no efectiviza su pago en dicho plazo, la reserva expira automáticamente y la vacante se traslada al siguiente postulante de la cola.</li>
            </ul>
          </section>

          {/* Sección 7 */}
          <section id="presentismo">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">7</span>
              Sistema de Presentismo mediante Código o QR
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed mb-2">
              Para certificar horas cátedra, cada encuentro cuenta con un sistema de presentismo oficial:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-daom-neutral-600">
              <li>El alumno debe acreditar su asistencia escaneando el código QR proyectado por el docente o ingresando el código alfanumérico fijo de 6 caracteres provisto en clase.</li>
              <li><strong>Ventana de validez:</strong> El código permanece activo durante la sesión y caduca a las <strong>23:59:59 del día posterior</strong> a la fecha del encuentro (huso horario <code>America/Argentina/Buenos_Aires</code>).</li>
              <li><strong>Idempotencia:</strong> Los registros son unívocos por alumno y encuentro. No es posible duplicar asistencias ni registrar asistencia en encuentros que no pertenezcan a la jornada inscripta.</li>
            </ul>
          </section>

          {/* Sección 8 */}
          <section id="certificados">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">8</span>
              Certificados Oficiales y Acreditación de Horas
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed mb-2">
              Los diplomas y certificados emitidos por DAOM Learning cuentan con respaldo institucional y cálculo dinámico de horas:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-daom-neutral-600">
              <li>Las horas certificadas reflejan de manera matemática las horas efectivas asistidas en los encuentros acreditados.</li>
              <li>Todo certificado incorpora un código identificador único y un hash criptográfico SHA-256 para validación pública e histórica de autenticidad.</li>
              <li>Si el alumno realiza una recuperación académica formalmente autorizada para subsanar una inasistencia, el certificado emitirá una nueva versión numerada auditable.</li>
            </ul>
          </section>

          {/* Sección 9 */}
          <section id="cambios-arrepentimiento">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">9</span>
              Cambios de Modalidad y Derecho de Revocación (Ley 24.240)
            </h2>
            <div className="space-y-3">
              <div className="p-3.5 bg-green-50 border border-green-200 rounded-lg text-green-950 text-xs">
                <span className="font-bold block mb-0.5">Cambios solicitados con 7 o más días corridos de anticipación:</span>
                Sin recargo administrativo (0%). Se ajustan únicamente diferencias de arancel base de existir, sujeto a disponibilidad de cupo en la modalidad de destino.
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 text-xs">
                <span className="font-bold block mb-0.5">Cambios con menos de 7 días corridos de anticipación:</span>
                Aplica un arancel administrativo del 25% sobre el total abonado por reserva de vacante e insumos comprometidos.
              </div>
              <p className="text-xs text-daom-neutral-600">
                <strong>Derecho legal de revocación (Botón de Arrepentimiento):</strong> Conforme al Art. 34 de la Ley 24.240 y Art. 1110 del CCCN, el alumno podrá revocar la compra dentro de los <strong>diez (10) días corridos</strong> desde la contratación sin penalidad económica, mediante solicitud formal a <code>daom.weightlifting@gmail.com</code>, con excepción de cursos ya dictados o materiales didácticos íntegramente accedidos (Art. 1116 CCCN).
              </p>
            </div>
          </section>

          {/* Sección 10 */}
          <section id="propiedad-intelectual">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">10</span>
              Propiedad Intelectual y Material Didáctico
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed">
              Todos los manuales, presentaciones, protocolos biomecánicos, videos pedagógicos y materiales descargables son propiedad intelectual exclusiva de <strong>DAOM Weightlifting</strong>. Se otorgan bajo licencia personal de uso educativo intransferible. Queda prohibida su reproducción, reventa, sublicencia, difusión pública o cesión a terceros sin autorización previa expresa por escrito.
            </p>
          </section>

          {/* Sección 11 */}
          <section id="jurisdiccion">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">11</span>
              Ley Aplicable y Jurisdicción
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed">
              Para la resolución de cualquier divergencia derivada de la interpretación o ejecución de este contrato, las partes se someten a la legislación aplicable de la República Argentina y a los tribunales ordinarios competentes de la Ciudad Autónoma de Buenos Aires, con renuncia a cualquier otro fuero o jurisdicción.
            </p>
          </section>

        </div>

        {/* Footer info page */}
        <div className="mt-8 text-center text-xs text-daom-neutral-500 space-y-1">
          <p>DAOM Learning • Área Oficial de Weightlifting del Club DAOM</p>
          <p>Av. Varela 1802, Flores, CABA | Contacto institucional: daom.weightlifting@gmail.com</p>
        </div>
      </div>
    </main>
  );
}
