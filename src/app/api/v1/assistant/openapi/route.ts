import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const schema = {
    openapi: "3.1.0",
    info: {
      title: "DAOM Learning — Creador de Capacitaciones API",
      description: "API oficial para el Asistente GPT de creación y configuración guiada de capacitaciones, jornadas y encuentros académicos de DAOM Learning.",
      version: "2.0.0",
    },
    servers: [
      {
        url: "https://learning.daom-weightlifting.com/api/v1/assistant",
        description: "Servidor Oficial de Producción",
      },
    ],
    paths: {
      "/trainings/create": {
        post: {
          summary: "Crea o consulta contexto para capacitaciones académicas",
          operationId: "createAcademicTraining",
          description: "Permite al Custom GPT consultar el catálogo/docentes disponibles y enviar la estructura final de capacitación con jornadas y encuentros.",
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    action: {
                      type: "string",
                      enum: ["get_context", "create_training_structure"],
                      description: "Acción a ejecutar",
                    },
                    capacitacionId: {
                      type: "string",
                      description: "ID único de la capacitación (ej: SEM-FUMAR-PIPA)",
                    },
                    titulo: {
                      type: "string",
                      description: "Título formal de la capacitación",
                    },
                    tipo: {
                      type: "string",
                      enum: ["seminario", "clinica", "workshop", "tutorial", "curso"],
                    },
                    jornadas: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          nombre: { type: "string" },
                          descripcion: { type: "string" },
                          modalidad: { type: "string", enum: ["presencial", "streaming", "hibrida", "on_demand"] },
                          precio: { type: "number" },
                          encuentros: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                nombre: { type: "string" },
                                contenido: { type: "string" },
                                fecha: { type: "string", format: "date" },
                                horaInicio: { type: "string" },
                                horaFin: { type: "string" },
                                duracionHoras: { type: "number" },
                                modalidad: { type: "string" },
                                ubicacionFisica: { type: "string" },
                              },
                              required: ["nombre", "fecha", "horaInicio", "horaFin"],
                            },
                          },
                        },
                        required: ["nombre"],
                      },
                    },
                  },
                  required: ["action"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Operación completada con éxito",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "No autorizado. Verifique API Key en cabecera.",
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
    },
  };

  return NextResponse.json(schema, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
