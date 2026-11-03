/**
 * DAOM Learning — Servicio de Sincronización de Google Sheets
 * Canario: DAOM-FORMACION-SHEET-01
 *
 * Fuente de Verdad:
 * Google Sheet ID: 1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4
 *
 * Pestañas:
 * 1. Capacitaciones
 * 2. Ofertas
 * 3. Precios
 * 4. Docentes
 * 5. Preguntas frecuentes
 * 6. Configuracion
 * 7. Control editorial
 */

import { parseCsv } from "./csv-parser";
import { getDatabase, IDatabase } from "@/lib/db/client";
import type { SyncRun, EditorialStatus, VerificationStatus } from "@/lib/types";

export const DEFAULT_SHEET_ID = "1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4";

export interface SyncOptions {
  sheetId?: string;
  triggeredBy?: string;
  customFetcher?: (url: string) => Promise<string>;
}

export interface SyncReport {
  id: string;
  status: "success" | "partial_error" | "failed";
  recordsRead: number;
  recordsSynced: number;
  recordsSkipped: number;
  errors: string[];
  warnings: string[];
  durationMs: number;
  timestamp: string;
}

export async function fetchTabCsv(
  sheetId: string,
  tabName: string,
  customFetcher?: (url: string) => Promise<string>
): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  if (customFetcher) {
    return await customFetcher(url);
  }
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "DAOM-Learning-SyncEngine/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al consultar la pestaña "${tabName}" de Google Sheets`);
  }
  return await response.text();
}

/**
 * Normaliza y valida el estado editorial.
 */
export function normalizeEditorialStatus(raw?: string | null): EditorialStatus {
  const s = (raw ?? "").toLowerCase().trim();
  if (s === "publicado") return "publicado";
  if (s === "archivado") return "archivado";
  return "borrador";
}

/**
 * Normaliza y valida el estado de verificación independiente.
 */
export function normalizeVerificationStatus(raw?: string | null): VerificationStatus {
  const s = (raw ?? "").toLowerCase().trim();
  if (s === "verificado") return "verificado";
  if (s === "rechazado") return "rechazado";
  return "pendiente";
}

/**
 * Convierte de forma robusta valores numéricos de Google Sheets a Number,
 * soportando notación en español con coma decimal (ej: "26,98", "1.234,56")
 * y notación estándar con punto decimal.
 */
export function parseSheetNumber(val: string | null | undefined): number {
  if (!val) return 0;
  const s = String(val).trim();
  if (!s) return 0;
  if (s.includes(",")) {
    if (s.includes(".")) {
      return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(s.replace(",", ".")) || 0;
  }
  return parseFloat(s) || 0;
}

/**
 * Ejecuta la sincronización completa preservando datos existentes en caso de falla.
 */
export async function syncGoogleSheetsCatalog(options: SyncOptions = {}): Promise<SyncReport> {
  const startTime = Date.now();
  const sheetId = options.sheetId || process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
  const triggeredBy = options.triggeredBy || "automated";
  const db = getDatabase();

  const errors: string[] = [];
  const warnings: string[] = [];
  let recordsRead = 0;
  let recordsSynced = 0;
  let recordsSkipped = 0;
  const nowIso = new Date().toISOString();

  // 1. Sincronizar Docentes
  try {
    const csv = await fetchTabCsv(sheetId, "Docentes", options.customFetcher);
    const rows = parseCsv(csv);
    recordsRead += rows.length;

    for (const row of rows) {
      const docenteId = row["docente_id"];
      const nombre = row["nombre"];
      if (!docenteId || !nombre) {
        recordsSkipped++;
        warnings.push(`Docente ignorado por falta de ID o Nombre: ${JSON.stringify(row)}`);
        continue;
      }

      const tipo = row["tipo"] || "DAOM";
      const especialidad = row["especialidad"] || null;
      const biografia = row["biografia"] || null;
      const fotografiaUrl = row["fotografia_url"] || null;
      const credenciales = row["credenciales"] || null;
      const estado = (row["estado"] || "activo").toLowerCase() === "inactivo" ? "inactivo" : "activo";
      const verificacion = normalizeVerificationStatus(row["verificacion"]);

      await db.run(
        `INSERT INTO instructors (
          docente_id, nombre, tipo, especialidad, biografia, fotografia_url, credenciales, estado, verificacion, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(docente_id) DO UPDATE SET
          nombre = excluded.nombre,
          tipo = excluded.tipo,
          especialidad = excluded.especialidad,
          biografia = excluded.biografia,
          fotografia_url = excluded.fotografia_url,
          credenciales = excluded.credenciales,
          estado = excluded.estado,
          verificacion = excluded.verificacion,
          synced_at = excluded.synced_at`,
        [docenteId, nombre, tipo, especialidad, biografia, fotografiaUrl, credenciales, estado, verificacion, nowIso]
      );
      recordsSynced++;
    }
  } catch (err: any) {
    errors.push(`Error en pestaña Docentes: ${err.message}`);
  }

  // 2. Sincronizar Capacitaciones
  try {
    const csv = await fetchTabCsv(sheetId, "Capacitaciones", options.customFetcher);
    const rows = parseCsv(csv);
    recordsRead += rows.length;

    for (const row of rows) {
      const capId = row["capacitacion_id"];
      const titulo = row["titulo"];
      const tipoRaw = (row["tipo"] || "seminario").toLowerCase();
      if (!capId || !titulo) {
        recordsSkipped++;
        warnings.push(`Capacitación ignorada por falta de capacitacion_id o titulo: ${JSON.stringify(row)}`);
        continue;
      }

      const subtitulo = row["subtitulo"] || null;
      const descripcion = row["descripcion"] || null;
      const destinatarios = row["destinatarios"] || null;
      const objetivos = row["objetivos"] || null;
      const programa = row["programa"] || null;
      const metodologia = row["metodologia"] || null;
      const duracion = row["duracion"] || null;
      const requisitos = row["requisitos"] || null;
      const materiales = row["materiales"] || null;
      const certificado = row["certificado"] || null;
      const imagenUrl = row["imagen_url"] || null;
      const videoUrl = row["video_url"] || null;
      const orden = parseInt(row["orden"] || "0", 10) || 0;
      const destacada = (row["destacada"] || "NO").toUpperCase() === "SI" ? "SI" : "NO";
      const estadoEditorial = normalizeEditorialStatus(row["estado_editorial"]);
      const verificacion = normalizeVerificationStatus(row["verificacion"]);
      const fuenteUrl = row["fuente_url"] || null;

      await db.run(
        `INSERT INTO trainings (
          capacitacion_id, tipo, titulo, subtitulo, descripcion, destinatarios, objetivos, programa, metodologia,
          duracion, requisitos, materiales, certificado, imagen_url, video_url, orden, destacada,
          estado_editorial, verificacion, fuente_url, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(capacitacion_id) DO UPDATE SET
          tipo = excluded.tipo,
          titulo = excluded.titulo,
          subtitulo = excluded.subtitulo,
          descripcion = excluded.descripcion,
          destinatarios = excluded.destinatarios,
          objetivos = excluded.objetivos,
          programa = excluded.programa,
          metodologia = excluded.metodologia,
          duracion = excluded.duracion,
          requisitos = excluded.requisitos,
          materiales = excluded.materiales,
          certificado = excluded.certificado,
          imagen_url = excluded.imagen_url,
          video_url = excluded.video_url,
          orden = excluded.orden,
          destacada = excluded.destacada,
          estado_editorial = excluded.estado_editorial,
          verificacion = excluded.verificacion,
          fuente_url = excluded.fuente_url,
          synced_at = excluded.synced_at`,
        [
          capId,
          tipoRaw,
          titulo,
          subtitulo,
          descripcion,
          destinatarios,
          objetivos,
          programa,
          metodologia,
          duracion,
          requisitos,
          materiales,
          certificado,
          imagenUrl,
          videoUrl,
          orden,
          destacada,
          estadoEditorial,
          verificacion,
          fuenteUrl,
          nowIso,
        ]
      );

      // Sincronizar docentes_ids asociados
      const docentesRaw = row["docentes_ids"] || "";
      const docList = docentesRaw
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      await db.run(`DELETE FROM training_instructors WHERE capacitacion_id = ?`, [capId]);
      let docOrder = 0;
      for (const dId of docList) {
        docOrder++;
        // Solo asociar si el docente existe en tabla instructors
        const exists = await db.get(`SELECT docente_id FROM instructors WHERE docente_id = ?`, [dId]);
        if (exists) {
          await db.run(
            `INSERT INTO training_instructors (capacitacion_id, docente_id, orden) VALUES (?, ?, ?)
            ON CONFLICT(capacitacion_id, docente_id) DO UPDATE SET orden = excluded.orden`,
            [capId, dId, docOrder]
          );
        } else {
          warnings.push(`Capacitación ${capId} referencia docente no cargado: ${dId}`);
        }
      }

      recordsSynced++;
    }
  } catch (err: any) {
    errors.push(`Error en pestaña Capacitaciones: ${err.message}`);
  }

  // 3. Sincronizar Ofertas (Ediciones)
  try {
    const csv = await fetchTabCsv(sheetId, "Ofertas", options.customFetcher);
    const rows = parseCsv(csv);
    recordsRead += rows.length;

    for (const row of rows) {
      const ofertaId = row["oferta_id"];
      const capId = row["capacitacion_id"];
      const nombreEdicion = row["nombre_edicion"];
      if (!ofertaId || !capId || !nombreEdicion) {
        recordsSkipped++;
        continue;
      }

      const tipoOferta = row["tipo_oferta"] || "abierta";
      const fechaInicio = row["fecha_inicio"] || null;
      const fechaFin = row["fecha_fin"] || null;
      const horaInicio = row["hora_inicio"] || null;
      const horaFin = row["hora_fin"] || null;
      const zonaHoraria = row["zona_horaria"] || "America/Argentina/Buenos_Aires";
      const modalidades = row["modalidades"] || "presencial, streaming, on_demand";
      const sede = row["sede"] || "Club DAOM, Av. Varela 1800, Flores, CABA";
      const enlaceInscripcion = row["enlace_inscripcion"] || null;
      const cupoPresencial = parseInt(row["cupo_presencial"] || "0", 10) || 0;
      const cupoStreaming = parseInt(row["cupo_streaming"] || "0", 10) || 0;
      const estadoComercial = row["estado_comercial"] || "proximamente";
      const estadoEditorial = normalizeEditorialStatus(row["estado_editorial"]);
      const fechaPublicacion = row["fecha_publicacion"] || null;
      const fechaDespublicacion = row["fecha_despublicacion"] || null;
      const fuenteUrl = row["fuente_url"] || null;
      const verificacion = normalizeVerificationStatus(row["verificacion"]);

      await db.run(
        `INSERT INTO training_editions (
          oferta_id, capacitacion_id, nombre_edicion, tipo_oferta, fecha_inicio, fecha_fin, hora_inicio, hora_fin,
          zona_horaria, modalidades, sede, enlace_inscripcion, cupo_presencial, cupo_streaming,
          estado_comercial, estado_editorial, fecha_publicacion, fecha_despublicacion, fuente_url, verificacion, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(oferta_id) DO UPDATE SET
          capacitacion_id = excluded.capacitacion_id,
          nombre_edicion = excluded.nombre_edicion,
          tipo_oferta = excluded.tipo_oferta,
          fecha_inicio = excluded.fecha_inicio,
          fecha_fin = excluded.fecha_fin,
          hora_inicio = excluded.hora_inicio,
          hora_fin = excluded.hora_fin,
          zona_horaria = excluded.zona_horaria,
          modalidades = excluded.modalidades,
          sede = excluded.sede,
          enlace_inscripcion = excluded.enlace_inscripcion,
          cupo_presencial = excluded.cupo_presencial,
          cupo_streaming = excluded.cupo_streaming,
          estado_comercial = excluded.estado_comercial,
          estado_editorial = excluded.estado_editorial,
          fecha_publicacion = excluded.fecha_publicacion,
          fecha_despublicacion = excluded.fecha_despublicacion,
          fuente_url = excluded.fuente_url,
          verificacion = excluded.verificacion,
          synced_at = excluded.synced_at`,
        [
          ofertaId,
          capId,
          nombreEdicion,
          tipoOferta,
          fechaInicio,
          fechaFin,
          horaInicio,
          horaFin,
          zonaHoraria,
          modalidades,
          sede,
          enlaceInscripcion,
          cupoPresencial,
          cupoStreaming,
          estadoComercial,
          estadoEditorial,
          fechaPublicacion,
          fechaDespublicacion,
          fuenteUrl,
          verificacion,
          nowIso,
        ]
      );
      recordsSynced++;
    }
  } catch (err: any) {
    errors.push(`Error en pestaña Ofertas: ${err.message}`);
  }

  // 4. Sincronizar Precios
  try {
    const csv = await fetchTabCsv(sheetId, "Precios", options.customFetcher);
    const rows = parseCsv(csv);
    recordsRead += rows.length;

    for (const row of rows) {
      const precioId = row["precio_id"];
      const ofertaId = row["oferta_id"];
      const mercado = (row["mercado"] || "AR").toUpperCase();
      const moneda = (row["moneda"] || "ARS").toUpperCase();
      const precioBase = parseSheetNumber(row["precio_base"]);
      if (!precioId || !ofertaId) {
        recordsSkipped++;
        continue;
      }

      const promocionTipo = row["promocion_tipo"] || null;
      const promocionValor = row["promocion_valor"] ? parseSheetNumber(row["promocion_valor"]) : null;
      const promocionInicio = row["promocion_inicio"] || null;
      const promocionFin = row["promocion_fin"] || null;
      const estado = row["estado"] || "activo";
      const verificacion = normalizeVerificationStatus(row["verificacion"]);

      await db.run(
        `INSERT INTO prices (
          precio_id, oferta_id, mercado, moneda, precio_base, promocion_tipo, promocion_valor,
          promocion_inicio, promocion_fin, estado, verificacion, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(precio_id) DO UPDATE SET
          oferta_id = excluded.oferta_id,
          mercado = excluded.mercado,
          moneda = excluded.moneda,
          precio_base = excluded.precio_base,
          promocion_tipo = excluded.promocion_tipo,
          promocion_valor = excluded.promocion_valor,
          promocion_inicio = excluded.promocion_inicio,
          promocion_fin = excluded.promocion_fin,
          estado = excluded.estado,
          verificacion = excluded.verificacion,
          synced_at = excluded.synced_at`,
        [
          precioId,
          ofertaId,
          mercado,
          moneda,
          precioBase,
          promocionTipo,
          promocionValor,
          promocionInicio,
          promocionFin,
          estado,
          verificacion,
          nowIso,
        ]
      );
      recordsSynced++;
    }
  } catch (err: any) {
    errors.push(`Error en pestaña Precios: ${err.message}`);
  }

  // 5. Sincronizar Preguntas Frecuentes
  try {
    const csv = await fetchTabCsv(sheetId, "Preguntas frecuentes", options.customFetcher);
    const rows = parseCsv(csv);
    recordsRead += rows.length;

    for (const row of rows) {
      const faqId = row["faq_id"];
      const pregunta = row["pregunta"];
      const respuesta = row["respuesta"];
      if (!faqId || !pregunta || !respuesta) {
        recordsSkipped++;
        continue;
      }

      const categoria = row["categoria"] || "General";
      const capId = row["capacitacion_id"] || null;
      const orden = parseInt(row["orden"] || "0", 10) || 0;
      const estadoEditorial = normalizeEditorialStatus(row["estado_editorial"]);

      await db.run(
        `INSERT INTO faqs (
          faq_id, categoria, pregunta, respuesta, capacitacion_id, orden, estado_editorial, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(faq_id) DO UPDATE SET
          categoria = excluded.categoria,
          pregunta = excluded.pregunta,
          respuesta = excluded.respuesta,
          capacitacion_id = excluded.capacitacion_id,
          orden = excluded.orden,
          estado_editorial = excluded.estado_editorial,
          synced_at = excluded.synced_at`,
        [faqId, categoria, pregunta, respuesta, capId, orden, estadoEditorial, nowIso]
      );
      recordsSynced++;
    }
  } catch (err: any) {
    errors.push(`Error en pestaña Preguntas frecuentes: ${err.message}`);
  }

  // 6. Sincronizar Configuración
  try {
    const csv = await fetchTabCsv(sheetId, "Configuracion", options.customFetcher);
    const rows = parseCsv(csv);
    recordsRead += rows.length;

    for (const row of rows) {
      // Manejar formato clave-valor
      const clave = row["clave"] || row["clave zona_horaria"] || Object.keys(row)[0];
      const valor = row["valor"] || row["valor america/argentina/buenos_aires"] || Object.values(row)[1];
      if (!clave || !valor) continue;

      const desc = row["descripcion"] || null;
      const tipo = row["tipo"] || "texto";
      const publico = (row["publico"] || "SI").toUpperCase() === "NO" ? "NO" : "SI";

      await db.run(
        `INSERT INTO site_configs (clave, valor, descripcion, tipo, publico, synced_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(clave) DO UPDATE SET
          valor = excluded.valor,
          descripcion = excluded.descripcion,
          tipo = excluded.tipo,
          publico = excluded.publico,
          synced_at = excluded.synced_at`,
        [clave, valor, desc, tipo, publico, nowIso]
      );
      recordsSynced++;
    }
  } catch (err: any) {
    errors.push(`Error en pestaña Configuracion: ${err.message}`);
  }

  // 7. Sincronizar Control Editorial
  try {
    const csv = await fetchTabCsv(sheetId, "Control editorial", options.customFetcher);
    const rows = parseCsv(csv);
    recordsRead += rows.length;

    for (const row of rows) {
      const regId = row["registro_id"];
      const tipoReg = row["tipo_registro"];
      if (!regId || !tipoReg) {
        recordsSkipped++;
        continue;
      }

      const fuenteUrl = row["fuente_url"] || null;
      const fechaRev = row["fecha_revision"] || null;
      const estadoVerif = normalizeVerificationStatus(row["estado_verificacion"]);
      const obs = row["observaciones"] || null;
      const responsable = row["responsable"] || null;
      const fechaVal = row["fecha_validacion"] || null;

      await db.run(
        `INSERT INTO editorial_controls (
          registro_id, tipo_registro, fuente_url, fecha_revision, estado_verificacion, observaciones,
          responsable, fecha_validacion, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(registro_id) DO UPDATE SET
          tipo_registro = excluded.tipo_registro,
          fuente_url = excluded.fuente_url,
          fecha_revision = excluded.fecha_revision,
          estado_verificacion = excluded.estado_verificacion,
          observaciones = excluded.observaciones,
          responsable = excluded.responsable,
          fecha_validacion = excluded.fecha_validacion,
          synced_at = excluded.synced_at`,
        [regId, tipoReg, fuenteUrl, fechaRev, estadoVerif, obs, responsable, fechaVal, nowIso]
      );
      recordsSynced++;
    }
  } catch (err: any) {
    errors.push(`Error en pestaña Control editorial: ${err.message}`);
  }

  const durationMs = Date.now() - startTime;
  let syncStatus: "success" | "partial_error" | "failed" = "success";
  if (errors.length > 0) {
    syncStatus = recordsSynced > 0 ? "partial_error" : "failed";
  }

  const syncRunId = `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    await db.run(
      `INSERT INTO sync_runs (
        id, source, status, records_read, records_synced, records_skipped,
        errors_json, warnings_json, duration_ms, triggered_by, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        syncRunId,
        "google_sheets",
        syncStatus,
        recordsRead,
        recordsSynced,
        recordsSkipped,
        errors.length > 0 ? JSON.stringify(errors) : null,
        warnings.length > 0 ? JSON.stringify(warnings) : null,
        durationMs,
        triggeredBy,
        new Date(startTime).toISOString(),
        nowIso,
      ]
    );
  } catch (err: any) {
    console.error("No se pudo registrar sync_run en la base de datos:", err.message);
  }

  return {
    id: syncRunId,
    status: syncStatus,
    recordsRead,
    recordsSynced,
    recordsSkipped,
    errors,
    warnings,
    durationMs,
    timestamp: nowIso,
  };
}
