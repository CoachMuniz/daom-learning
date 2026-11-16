import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import {
  ShieldCheck,
  ArrowLeft,
  FileText,
  Lock,
  UserCheck,
  Server,
  Eye,
  Trash2,
  Scale,
  Building,
  HelpCircle,
  ExternalLink,
  Cookie,
  AlertTriangle,
  Calendar,
  Video,
  Award,
  BookOpen,
  QrCode,
  Mail,
  GraduationCap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de Privacidad Oficial | DAOM Learning",
  description:
    "Política de Privacidad y Protección de Datos Personales de la Plataforma Académica DAOM Learning. Conforme a la Ley 25.326, Google OAuth, Google Calendar, Google Meet, pasarelas de pago y acreditación académica.",
};

export default function PrivacyPage() {
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
            DAOM Learning • Marco Legal & Privacidad
          </span>
        </div>

        {/* Encabezado Principal */}
        <div className="bg-white rounded-2xl shadow-card border border-daom-neutral-200 p-8 sm:p-10 mb-8">
          <div className="flex items-center gap-3 text-daom-blue mb-3">
            <ShieldCheck className="w-8 h-8 text-daom-red-dark" />
            <span className="text-xs font-bold tracking-widest uppercase bg-rose-50 px-2.5 py-1 rounded text-daom-red-dark border border-rose-100">
              Protección de Datos Personales • Ley 25.326
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-daom-neutral-900 tracking-tight">
            Política de Privacidad Oficial — DAOM Learning
          </h1>
          <p className="mt-3 text-sm text-daom-neutral-600 leading-relaxed">
            La presente Política de Privacidad regula el tratamiento, recopilación, uso, almacenamiento y protección de los datos personales en la plataforma académica oficial <strong>DAOM Learning</strong> (<code>https://learning.daom-weightlifting.com</code>), de conformidad con la Ley Nacional N° 25.326 de Protección de Datos Personales de la República Argentina y las normativas internacionales de los servicios integrados (Google OAuth 2.0, Google Calendar, Google Meet, Mercado Pago y Jerkson).
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-daom-neutral-500 pt-4 border-t border-daom-neutral-100">
            <div>
              <strong>Última actualización:</strong> {lastUpdated}
            </div>
            <div>•</div>
            <div>
              <strong>Marco normativo:</strong> Ley N° 25.326, Dec. 1558/2001 y Resoluciones AAIP
            </div>
            <div>•</div>
            <div>
              <strong>Canal institucional:</strong> <code>daom.weightlifting@gmail.com</code>
            </div>
          </div>
        </div>

        {/* Contenido Estructurado */}
        <div className="bg-white rounded-2xl shadow-card border border-daom-neutral-200 p-8 sm:p-10 space-y-10 text-daom-neutral-700 text-sm leading-relaxed">
          
          {/* Sección 1 */}
          <section id="responsable">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">1</span>
              Responsable del Tratamiento e Identificación Institucional
            </h2>
            <p className="mb-3">
              El responsable del tratamiento de las bases de datos personales y registros académicos de DAOM Learning es el <strong>Área de Weightlifting de Club DAOM (DAOM Weightlifting)</strong>, en el marco de <strong>Deportes y Olimpismo Metropolitano Asociación Civil</strong> (Club DAOM, fundado el 12 de octubre de 1927).
            </p>
            <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200 space-y-2 text-xs">
              <p><strong>Sede deportiva e institucional:</strong> Av. Varela 1802, Flores, Ciudad Autónoma de Buenos Aires (C1406ELH), República Argentina.</p>
              <p><strong>Canal oficial de privacidad y datos:</strong> <a href="mailto:daom.weightlifting@gmail.com" className="text-daom-blue font-semibold hover:underline">daom.weightlifting@gmail.com</a></p>
              <p><strong>Línea de comunicación y WhatsApp oficial:</strong> +54 11 3039-3030</p>
              <p className="text-daom-neutral-500 italic">
                * Los datos de personería jurídica y legajo institucional de la Asociación Civil se encuentran a disposición para verificación administrativa en sede y registro legal.
              </p>
            </div>
          </section>

          {/* Sección 2 */}
          <section id="finalidad">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">2</span>
              Alcance de la Plataforma Académica DAOM Learning
            </h2>
            <p className="mb-3">
              DAOM Learning es el entorno formativo especializado en halterofilia, preparación física y biomecánica deportiva de DAOM Weightlifting. El tratamiento de datos dentro de esta plataforma tiene como finalidades exclusivas:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-daom-neutral-600">
              <li>Gestionar inscripciones a cursos, seminarios, clínicas, jornadas y workshops.</li>
              <li>Administrar cupos independientes, reservas y asignación de vacantes en lista de espera.</li>
              <li>Otorgar becas institucionales (totales o parciales) aprobadas por la Dirección de DAOM Weightlifting.</li>
              <li>Acreditar el presentismo de los participantes mediante escaneo de credenciales QR o códigos unívocos por encuentro.</li>
              <li>Calcular de manera matemática y auditable las horas cátedra efectivamente asistidas para la emisión de certificados oficiales.</li>
              <li>Brindar acceso privado a grabaciones pedagógicas protegidas y materiales didácticos descargables.</li>
              <li>Gestionar invitaciones individuales y privadas a salas de streaming a través de Google Calendar y Google Meet.</li>
              <li>Remitir notificaciones académicas transaccionales y de logística vía correo electrónico y mediante el sistema de mensajería automatizada Jerkson.</li>
            </ul>
          </section>

          {/* Sección 3 */}
          <section id="categorias-datos">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">3</span>
              Categorías de Datos Personales Recopilados
            </h2>
            <p className="mb-3">
              DAOM Learning recopila únicamente la información indispensable para el desenvolvimiento pedagógico y administrativo:
            </p>
            <div className="space-y-3">
              <div className="p-3.5 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1">A. Datos de Registro e Identificación del Alumno</h3>
                <p className="text-xs text-daom-neutral-600">
                  Nombre completo, correo electrónico, Documento Nacional de Identidad (DNI) o Pasaporte (requerido para la validez legal del certificado), teléfono / WhatsApp y país de residencia.
                </p>
              </div>

              <div className="p-3.5 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1">B. Datos Provistos por Google OAuth 2.0 (Alumnos y Docentes)</h3>
                <p className="text-xs text-daom-neutral-600">
                  Identificador unívoco de Google (<code>sub</code>), dirección de correo electrónico verificado, nombre completo y fotografía de perfil (si estuviera pública). No se accede a contactos, archivos privados ni mensajes del participante.
                </p>
              </div>

              <div className="p-3.5 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1">C. Historial Académico, Presentismo y Certificaciones</h3>
                <p className="text-xs text-daom-neutral-600">
                  Capacitaciones cursadas, jornadas acreditadas, marcas de presentismo por encuentro (con fecha, hora y método QR o alfanumérico), autorizaciones de recuperación académica, versiones de certificados emitidos y código hash SHA-256 de verificación pública.
                </p>
              </div>

              <div className="p-3.5 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1">D. Datos Transaccionales de Pagos y Becas</h3>
                <p className="text-xs text-daom-neutral-600">
                  Identificador de orden, arancel cobrado en pesos argentinos (ARS) o dólares estadounidenses (USD), moneda, método de cobro, estado de acreditación de Mercado Pago y porcentaje de becas institucionales otorgadas de forma inmutable.
                </p>
                <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                  <strong>Seguridad y confidencialidad financiera:</strong> DAOM Learning no almacena, no manipula ni tiene acceso a números de tarjetas de crédito o débito, códigos de seguridad (CVV) ni credenciales bancarias. Toda la transacción económica se procesa cifrada bajo estándares PCI-DSS en la pasarela oficial de <strong>Mercado Pago Checkout Pro</strong>.
                </div>
              </div>

              <div className="p-3.5 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200">
                <h3 className="font-bold text-daom-neutral-900 text-xs mb-1">E. Registros Técnicos de Seguridad</h3>
                <p className="text-xs text-daom-neutral-600">
                  Dirección IP de conexión, fecha, hora de acceso, User-Agent del navegador y registro de auditoría administrativa persistente para prevenir accesos indebidos o suplantación de identidad.
                </p>
              </div>
            </div>
          </section>

          {/* Sección 4 */}
          <section id="google-services">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">4</span>
              Uso de Google OAuth 2.0, Google Calendar API y Google Meet
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed mb-3">
              DAOM Learning se integra con los servicios de Google Cloud Platform y Google Workspace para optimizar la experiencia de los participantes y organizadores:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-daom-neutral-600">
              <li>
                <strong>Google Identity (OAuth 2.0 / OpenID Connect):</strong> Utilizado para el ingreso unificado de alumnos y administradores. Scopes: <code>openid</code>, <code>email</code> y <code>profile</code>. Permite asociar automáticamente inscripciones y certificados sin requerir contraseñas repetidas.
              </li>
              <li>
                <strong>Google Calendar API (Cuenta Organizadora Institucional):</strong> Autorizada exclusivamente por la cuenta organizadora de DAOM (<code>daom.weightlifting@gmail.com</code>). Se utiliza para crear los eventos de los encuentros y generar las salas interactivas de Google Meet.
              </li>
              <li>
                <strong>Invitaciones Privadas (Sin Enlaces Públicos):</strong> Por principio pedagógico e institucional, DAOM Learning no publica enlaces abiertos a Google Meet. Los alumnos con inscripción confirmada o beca son invitados individualmente al evento oficial en su propio Google Calendar, garantizando control de sala y trazabilidad de los asistentes.
              </li>
              <li>
                <strong>Política de Datos de Usuario de Google (Limited Use):</strong> El uso y la transferencia que hace DAOM Learning de la información recibida a través de las APIs de Google se ajustan estrictamente a la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-daom-blue underline font-semibold">Google API Services User Data Policy</a>, incluyendo las exigencias de Uso Limitado. DAOM no vende ni comercializa ningún dato de Google.
              </li>
            </ul>
          </section>

          {/* Sección 5 */}
          <section id="jerkson-comunicaciones">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">5</span>
              Comunicaciones Automatizadas con Jerkson Bot
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed mb-2">
              DAOM Learning mantiene una integración segura e idempotente con el sistema de mensajería y bot institucional <strong>Jerkson</strong> (<code>CoachMuniz/jerkson</code>):
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-daom-neutral-600">
              <li>Jerkson procesa eventos asíncronos para el envío de recordatorios de cursada, enlaces a materiales, emisión de certificados y avisos de lista de espera.</li>
              <li>Toda comunicación enviada a través de Jerkson se basa en datos registrados fehacientemente en DAOM Learning como única fuente de verdad (Single Source of Truth).</li>
              <li>Los participantes pueden solicitar el cese de avisos informativos generales en cualquier momento conservando las notificaciones transaccionales indispensables de sus cursos activos.</li>
            </ul>
          </section>

          {/* Sección 6 */}
          <section id="grabaciones-materiales">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">6</span>
              Grabaciones Pedagógicas, Materiales y Derechos de Imagen
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed mb-3">
              En las capacitaciones brindadas en streaming o presenciales, DAOM Learning podrá registrar grabaciones con fines educativos:
            </p>
            <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200 space-y-2 text-xs">
              <p>• <strong>Grabaciones protegidas:</strong> Las sesiones grabadas se alojan de forma privada (Vimeo OTT / infraestructura protegida) con acceso restringido exclusivamente a los alumnos que cuenten con derechos adquiridos.</p>
              <p>• <strong>Participación en streaming y presencial:</strong> Al encender su cámara o micrófono en Google Meet o al asistir a la tarima olímpica de Club DAOM, el participante consiente que su imagen o voz forme parte del material pedagógico de consulta interna del curso.</p>
              <p>• <strong>Prohibición estricta de redistribución:</strong> Los participantes no están autorizados a grabar, descargar, redistribuir, capturar ni comercializar las clases ni los manuales didácticos entregados.</p>
            </div>
          </section>

          {/* Sección 7 */}
          <section id="proveedores">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">7</span>
              Proveedores Tecnológicos y Seguridad de Infraestructura
            </h2>
            <p className="mb-3 text-xs text-daom-neutral-600">
              Para asegurar alta disponibilidad, integridad y confidencialidad, DAOM Learning utiliza servicios de infraestructura auditados:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200">
                <strong className="block text-daom-neutral-900">Mercado Pago (Argentina)</strong>
                <span className="text-daom-neutral-500">Pasarela oficial de cobros y conciliación con webhooks criptográficos.</span>
              </div>
              <div className="p-3 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200">
                <strong className="block text-daom-neutral-900">Render Services Inc. (EE. UU.)</strong>
                <span className="text-daom-neutral-500">Alojamiento de Next.js y base de datos PostgreSQL con cifrado TLS y SOC 2.</span>
              </div>
              <div className="p-3 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200">
                <strong className="block text-daom-neutral-900">Google Cloud / Google Workspace (EE. UU.)</strong>
                <span className="text-daom-neutral-500">Google OAuth 2.0, Google Calendar API y Google Meet para streaming interactivo.</span>
              </div>
              <div className="p-3 bg-daom-neutral-50 rounded-lg border border-daom-neutral-200">
                <strong className="block text-daom-neutral-900">Resend Inc. (EE. UU.)</strong>
                <span className="text-daom-neutral-500">Despacho de correos de recuperación de cuenta y confirmaciones académicas.</span>
              </div>
            </div>
          </section>

          {/* Sección 8 */}
          <section id="conservacion">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">8</span>
              Plazos de Conservación y Destrucción de Datos
            </h2>
            <p className="text-xs text-daom-neutral-600 mb-2">
              Los datos se conservan únicamente durante el tiempo necesario para la validez de los certificados y el cumplimiento legal:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-daom-neutral-600">
              <li><strong>Historial de certificaciones:</strong> Se preserva de forma permanente para permitir la verificación pública e histórica de autenticidad de los diplomas emitidos a los alumnos.</li>
              <li><strong>Comprobantes de pago y facturación:</strong> Conservados durante los plazos fiscales exigidos por la legislación tributaria argentina (5 a 10 años).</li>
              <li><strong>Registros temporales y tokens de presentismo:</strong> Los tokens QR de asistencia expiran a las 23:59:59 del día posterior al encuentro.</li>
            </ul>
          </section>

          {/* Sección 9 */}
          <section id="derechos-arco">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">9</span>
              Derechos ARCO (Acceso, Rectificación, Supresión y Oposición)
            </h2>
            <p className="text-xs text-daom-neutral-600 leading-relaxed mb-3">
              El titular de los datos personales tiene derecho a solicitar el acceso, rectificación, actualización o eliminación definitiva de sus datos personales, conforme a los Arts. 14, 15 y 16 de la Ley 25.326.
            </p>
            <div className="p-4 rounded-xl bg-daom-neutral-100 border border-daom-neutral-300 space-y-2 text-xs">
              <p><strong>Procedimiento formal:</strong> Para ejercer estos derechos, el titular debe enviar un correo a <a href="mailto:daom.weightlifting@gmail.com" className="text-daom-blue font-bold underline">daom.weightlifting@gmail.com</a> acreditando su identidad.</p>
              <p><strong>Plazos de resolución:</strong> 10 días corridos para solicitudes de acceso; 5 días hábiles para rectificaciones y supresiones.</p>
            </div>
          </section>

          {/* Sección 10 */}
          <section id="aaip">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">10</span>
              Órgano de Control (AAIP)
            </h2>
            <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200 text-xs text-daom-neutral-700 leading-relaxed space-y-2">
              <p>Conforme a la Resolución AAIP Nº 14/2018:</p>
              <blockquote className="border-l-2 border-daom-blue pl-3 py-1 font-medium text-daom-neutral-800">
                &ldquo;LA AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.&rdquo;
              </blockquote>
              <p className="text-daom-neutral-500">
                Sitio web oficial: <a href="https://www.argentina.gob.ar/aaip/datospersonales" target="_blank" rel="noopener noreferrer" className="text-daom-blue underline">argentina.gob.ar/aaip/datospersonales</a>
              </p>
            </div>
          </section>

          {/* Sección 11 */}
          <section id="contacto">
            <h2 className="text-lg font-bold text-daom-neutral-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-daom-neutral-900 text-white text-xs flex items-center justify-center font-bold">11</span>
              Canales Oficiales de Contacto
            </h2>
            <div className="p-4 rounded-xl bg-daom-neutral-50 border border-daom-neutral-200 text-xs space-y-1 text-daom-neutral-700">
              <p><strong>DAOM Learning — Plataforma Académica de DAOM Weightlifting</strong></p>
              <p><strong>Club DAOM:</strong> Av. Varela 1802, Flores, CABA, Argentina</p>
              <p><strong>Correo electrónico:</strong> <a href="mailto:daom.weightlifting@gmail.com" className="text-daom-blue font-semibold hover:underline">daom.weightlifting@gmail.com</a></p>
              <p><strong>WhatsApp oficial:</strong> +54 11 3039-3030</p>
            </div>
          </section>

        </div>

        {/* Footer info page */}
        <div className="mt-8 text-center text-xs text-daom-neutral-500 space-y-1">
          <p>DAOM Learning • DAOM Weightlifting • Club DAOM</p>
          <p>Protección de Datos Personales • Ley Nacional N° 25.326 • República Argentina</p>
        </div>
      </div>
    </main>
  );
}
