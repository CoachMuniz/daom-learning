import { describe, it, expect, beforeEach } from "vitest";
import { getDatabase } from "@/lib/db/client";
import {
  createUser,
  createJornada,
  createEncuentro,
  getEncuentroById,
  recordEncuentroAttendance,
  issueOrUpdateCertificate2,
  recordPayment,
  updateEditionWhatsAppGroupUrl,
  updateEncuentroCalendarAndMeet,
} from "@/lib/db/repository";
import {
  isAcademicPlan2027,
  calculateCertifiedHours2027,
} from "@/lib/academic/rules2027";

describe("DAOM Learning — Corrección Integral del Seminario de Biomecánica 2026", () => {
  beforeEach(async () => {
    const db = getDatabase();
    // Limpiar tablas académicas de prueba
    await db.run(`DELETE FROM certificates`);
    await db.run(`DELETE FROM encuentro_attendances`);
    await db.run(`DELETE FROM encuentros`);
    await db.run(`DELETE FROM jornadas`);
    await db.run(`DELETE FROM enrollments`);
    await db.run(`DELETE FROM users WHERE email LIKE '%@test-bio.com'`);
  });

  it("1. Estructura Académica y Certificación: certifica 10 horas cátedra al completar ambos encuentros", async () => {
    const db = getDatabase();
    const nowIso = new Date().toISOString();

    // Crear usuario institucional con el helper estándar
    const testUser = await createUser({
      email: `alumno.biomecanica.${Date.now()}@test-bio.com`,
      fullName: "Alumno Biomecánica Test",
      role: "PARTICIPANT",
    });

    await db.run(
      `INSERT INTO trainings (capacitacion_id, tipo, titulo, estado_editorial, verificacion, synced_at)
       VALUES ('SEM-BIOMECANICA', 'seminario', 'Seminario de Biomecánica', 'publicado', 'verificado', ?)
       ON CONFLICT(capacitacion_id) DO NOTHING`,
      [nowIso]
    );

    // Crear Jornada
    const jornada = await createJornada({
      capacitacionId: "SEM-BIOMECANICA",
      ofertaId: "OF-BIOMEC-2026-11",
      nombre: "Jornada Biomecánica 29/11",
      modalidad: "hibrida",
      precioIndividual: 51711,
      orden: 1,
    });

    // Crear 2 Encuentros (duración horaria nominal 4.5h reloj c/u)
    const enc1 = await createEncuentro({
      jornadaId: jornada.id,
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Módulo 1: Fundamentos",
      fecha: "2026-11-29",
      horaInicio: "09:00",
      horaFin: "13:30",
      duracionHoras: 4.5,
      modalidad: "streaming",
    });

    const enc2 = await createEncuentro({
      jornadaId: jornada.id,
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Módulo 2: Videoanálisis",
      fecha: "2026-11-29",
      horaInicio: "14:30",
      horaFin: "19:00",
      duracionHoras: 4.5,
      modalidad: "streaming",
    });

    // Crear inscripción confirmada
    const enrollmentId = `enr-bio-test-${Date.now()}`;
    await db.run(
      `INSERT INTO enrollments (id, user_id, capacitacion_id, oferta_id, status, modality_id, amount_total, amount_paid, created_at, updated_at)
       VALUES (?, ?, 'SEM-BIOMECANICA', 'OF-BIOMEC-2026-11', 'confirmada', 'streaming', 51711, 51711, ?, ?)`,
      [enrollmentId, testUser.id, nowIso, nowIso]
    );

    // Registrar asistencia a ambos módulos
    await recordEncuentroAttendance({
      encuentroId: enc1.id,
      userId: testUser.id,
      enrollmentId,
      method: "manual",
    });

    await recordEncuentroAttendance({
      encuentroId: enc2.id,
      userId: testUser.id,
      enrollmentId,
      method: "manual",
    });

    // Emitir o actualizar certificado
    const cert = await issueOrUpdateCertificate2(enrollmentId);
    expect(cert).not.toBeNull();
    // Debe reflejar exactamente 10 horas cátedra institucionales
    expect(cert?.horas_certificadas).toBe(10);
    expect(cert?.encuentros_acreditados_count).toBe(2);
  });

  it("2. Presentismo: la expiración se calcula exactamente a las 23:59:59 del día posterior en hora Argentina (UTC-3)", async () => {
    const jornada = await createJornada({
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Jornada 29/11",
      modalidad: "hibrida",
      orden: 1,
    });

    const enc = await createEncuentro({
      jornadaId: jornada.id,
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Módulo Test Expiración",
      fecha: "2026-11-29",
      horaInicio: "09:00",
      horaFin: "13:30",
      duracionHoras: 4.5,
      modalidad: "streaming",
    });

    // Para 2026-11-29, el día siguiente es 2026-11-30.
    // 2026-11-30T23:59:59-03:00 en UTC es 2026-12-01T02:59:59.000Z
    expect(enc.attendance_valid_until).toBe("2026-12-01T02:59:59.000Z");
  });

  it("3. WhatsApp: asocia el enlace oficial a la edición y capacitacion sin exponerlo prematuramente", async () => {
    const db = getDatabase();
    const ofertaId = "OF-BIOMEC-2026-11";
    const waUrl = "https://chat.whatsapp.com/H2GeOaYVJx3HWU8ZSgKpsk?s=cl&p=a&iam=2";

    await db.run(
      `INSERT INTO training_editions (oferta_id, capacitacion_id, nombre_edicion, modalidades, estado_editorial, synced_at)
       VALUES (?, 'SEM-BIOMECANICA', 'Edición Noviembre 2026', 'presencial, streaming', 'publicado', ?)
       ON CONFLICT(oferta_id) DO NOTHING`,
      [ofertaId, new Date().toISOString()]
    );

    await updateEditionWhatsAppGroupUrl(ofertaId, waUrl);

    const edition = await db.get<any>(`SELECT * FROM training_editions WHERE oferta_id = ?`, [ofertaId]);
    expect(edition?.whatsapp_group_url).toBe(waUrl);
  });

  it("4. Calendar & Meet: actualiza ID de evento y enlace Meet en el encuentro", async () => {
    const jornada = await createJornada({
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Jornada Calendar Test",
      modalidad: "hibrida",
      orden: 1,
    });

    const enc = await createEncuentro({
      jornadaId: jornada.id,
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Módulo Calendar",
      fecha: "2026-11-29",
      horaInicio: "09:00",
      horaFin: "13:30",
      duracionHoras: 4.5,
      modalidad: "streaming",
    });

    expect(enc.google_calendar_event_id).toBeNull();
    expect(enc.google_meet_url).toBeNull();

    const updated = await updateEncuentroCalendarAndMeet(
      enc.id,
      "gcal_event_biomecanica_m1",
      "https://meet.google.com/daom-bio-test"
    );

    expect(updated?.google_calendar_event_id).toBe("gcal_event_biomecanica_m1");
    expect(updated?.google_meet_url).toBe("https://meet.google.com/daom-bio-test");
  });

  it("5. Reglas Académicas 2027+: 5h teoría Meet + 5h práctica presencial = 10h cátedra, sin bloqueo por faltar a teoría", () => {
    expect(isAcademicPlan2027("2026-11-29")).toBe(false);
    expect(isAcademicPlan2027("2027-04-15")).toBe(true);
    expect(isAcademicPlan2027(2027)).toBe(true);

    // Asistencia completa: 10h cátedra
    const full = calculateCertifiedHours2027({ theoryAttended: true, practiceAttended: true });
    expect(full.certifiedHours).toBe(10);
    expect(full.canCertify).toBe(true);

    // Faltó a teoría, asistió a práctica: no se bloquea y certifica 5h de práctica
    const practiceOnly = calculateCertifiedHours2027({ theoryAttended: false, practiceAttended: true });
    expect(practiceOnly.certifiedHours).toBe(5);
    expect(practiceOnly.canCertify).toBe(true);
    expect(practiceOnly.breakdown).toContain("Práctica Presencial");

    // Asistió solo a teoría online: certifica 5h de teoría
    const theoryOnly = calculateCertifiedHours2027({ theoryAttended: true, practiceAttended: false });
    expect(theoryOnly.certifiedHours).toBe(5);
    expect(theoryOnly.canCertify).toBe(true);
  });
});
