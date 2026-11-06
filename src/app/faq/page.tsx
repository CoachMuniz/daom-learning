import React from "react";
import Link from "next/link";
import { HelpCircle, ChevronDown, CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";
import { getPublishedFaqs } from "@/lib/db/repository";

export const revalidate = 60;

export const metadata = {
  title: "Preguntas Frecuentes | DAOM Learning",
  description: "Respuestas oficiales sobre inscripciones, modalidades, pagos, descarga de materiales y certificados.",
};

const defaultFaqs = [
  {
    faq_id: "FAQ-MOD-1",
    categoria: "Modalidades de Cursada",
    pregunta: "¿Cuál es la diferencia entre Presencial, Streaming en vivo y On Demand?",
    respuesta:
      "La modalidad Presencial se dicta en la sede de DAOM Weightlifting (Club DAOM, CABA) con práctica en plataforma. Streaming en vivo permite presenciar la jornada en tiempo real con canal de preguntas directo y certificado de asistencia. On Demand brinda acceso a la grabación íntegra durante 12 meses y descarga del archivo ZIP de materiales, pero no acredita asistencia presencial ni virtual.",
  },
  {
    faq_id: "FAQ-MAT-1",
    categoria: "Materiales Educativos",
    pregunta: "¿Cuándo y cómo recibo el archivo ZIP de material complementario?",
    respuesta:
      "El acceso a la descarga del archivo ZIP se habilita inmediatamente en tu panel de participante una vez confirmada la acreditación de tu pago. No tenés que esperar a la fecha del evento para comenzar a revisar el material de estudio.",
  },
  {
    faq_id: "FAQ-PAG-1",
    categoria: "Aranceles y Medios de Pago",
    pregunta: "¿Qué medios de pago están disponibles para Argentina y el exterior?",
    respuesta:
      "Todos los aranceles se expresan y procesan exclusivamente en pesos argentinos (ARS) mediante Mercado Pago como pasarela de pago oficial única. Los participantes pueden abonar mediante los medios habilitados por Mercado Pago: transferencias, tarjetas de débito y crédito nacionales o internacionales aceptadas por la plataforma.",
  },
  {
    faq_id: "FAQ-CAM-1",
    categoria: "Cambios de Modalidad",
    pregunta: "¿Puedo solicitar un cambio de modalidad (ej: de Presencial a Streaming)?",
    respuesta:
      "Sí. Las solicitudes realizadas con 7 o más días de antelación respecto a la fecha de inicio del evento no tienen recargo. Si la solicitud se efectúa con menos de 7 días de antelación, aplica un recargo reglamentario del 25% del precio base, sujeto a disponibilidad de vacantes.",
  },
  {
    faq_id: "FAQ-OND-1",
    categoria: "Modalidad On Demand",
    pregunta: "¿Cuánto cuesta la modalidad On Demand y hasta cuándo tengo acceso?",
    respuesta:
      "Si adquirís On Demand antes de la fecha del evento, abonás el precio base de la capacitación. Si la compra se realiza el mismo día del evento o posteriormente, aplica un recargo del 35%. Todas las grabaciones tienen una garantía mínima de 12 meses de acceso ininterrumpido.",
  },
  {
    faq_id: "FAQ-CER-1",
    categoria: "Certificación",
    pregunta: "¿Cómo se emiten y visualizan los certificados de asistencia?",
    respuesta:
      "Los certificados electrónicos se emiten tras la verificación de asistencia y evaluación de participación (tanto presencial como en streaming). Una vez emitidos por nuestro sistema automatizado, podés visualizarlos y descargarlos directamente desde la pestaña 'Mis Certificados' de tu área de participante.",
  },
];

export default async function FaqPage() {
  const publishedFaqs = await getPublishedFaqs();
  const faqsToDisplay = publishedFaqs.length > 0 ? publishedFaqs : defaultFaqs;

  // Agrupar por categoría
  const categories = Array.from(new Set(faqsToDisplay.map((f) => f.categoria)));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Encabezado */}
      <div className="max-w-2xl space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-daom-blue uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" />
          <span>Ayuda e Información</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-daom-neutral-900 tracking-tight">
          Preguntas Frecuentes
        </h1>
        <p className="text-base text-daom-neutral-600 leading-relaxed">
          Consultá los términos, requisitos y normas de funcionamiento operativo y académico de DAOM Learning.
        </p>
      </div>

      {/* Listado Categorizado */}
      <div className="space-y-10">
        {categories.map((cat) => (
          <div key={cat} className="space-y-4">
            <h2 className="text-xl font-bold text-daom-neutral-900 border-b border-daom-neutral-200 pb-2">
              {cat}
            </h2>
            <div className="space-y-4">
              {faqsToDisplay
                .filter((f) => f.categoria === cat)
                .map((faq) => (
                  <details
                    key={faq.faq_id}
                    className="group bg-white rounded-lg border border-daom-neutral-200 p-5 shadow-card open:ring-1 open:ring-daom-blue"
                  >
                    <summary className="flex items-center justify-between font-bold text-daom-neutral-900 cursor-pointer list-none min-h-[44px]">
                      <span className="text-base sm:text-lg pr-4">{faq.pregunta}</span>
                      <ChevronDown className="w-5 h-5 text-daom-blue transition-transform group-open:rotate-180 shrink-0" />
                    </summary>
                    <p className="mt-3 text-sm sm:text-base text-daom-neutral-600 leading-relaxed border-t border-daom-neutral-100 pt-3">
                      {faq.respuesta}
                    </p>
                  </details>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA de consulta */}
      <div className="bg-daom-blue-soft rounded-lg border border-blue-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg font-bold text-daom-neutral-900">¿Tenés alguna consulta adicional?</h3>
          <p className="text-xs sm:text-sm text-daom-neutral-600">
            Comunicate directamente con nuestro equipo de coordinación académica a través de WhatsApp.
          </p>
        </div>
        <a
          href="https://wa.me/5491130393030"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#16794A] hover:bg-[#13633c] rounded-md min-h-[44px] transition-colors shrink-0 shadow-sm"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Escribir por WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
