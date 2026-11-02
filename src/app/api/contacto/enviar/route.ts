import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditLog } from "@/lib/db/repository";

const ContactSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().optional(),
  institucion: z.string().optional(),
  tipo_consulta: z.string().default("general"),
  mensaje: z.string().min(10),
  website_url: z.string().optional(), // Honeypot
});

export async function POST(request: Request) {
  try {
    let data: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
    }

    // Honeypot check: Si website_url está completo, es un bot de spam.
    if (data.website_url && data.website_url.trim().length > 0) {
      console.warn("Spam detectado vía honeypot en formulario de contacto.");
      return NextResponse.json({ success: true, message: "Mensaje recibido." }, { status: 200 });
    }

    const parsed = ContactSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues, canary: "DAOM-FORMACION-SHEET-01" },
        { status: 400 }
      );
    }

    // Registrar en auditoría
    await recordAuditLog({
      action: "CONTACT_MESSAGE_RECEIVED",
      entityType: "contact_form",
      entityId: parsed.data.email,
      details: {
        nombre: parsed.data.nombre,
        tipo: parsed.data.tipo_consulta,
        institucion: parsed.data.institucion,
      },
    });

    // Si la llamada vino de formulario HTML estándar, redireccionar con parámetro de éxito
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL("/contacto?enviado=1", request.url), 303);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Tu consulta fue enviada con éxito. Te responderemos a la brevedad.",
        canary: "DAOM-FORMACION-SHEET-01",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message, canary: "DAOM-FORMACION-SHEET-01" },
      { status: 500 }
    );
  }
}
