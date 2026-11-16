import { describe, it, expect, beforeAll, vi } from "vitest";
import { getDatabase } from "../src/lib/db/client";
import {
  createUser,
  createEnrollment,
  getEnrollmentById,
  createJornada,
  createEncuentro,
  getJornadasForTraining,
  getEncuentroById,
  recordEncuentroAttendance,
  issueOrUpdateCertificate2,
  joinWaitlist,
  offerSeatFromWaitlist,
  authorizeEncuentroRecovery,
  grantScholarship,
} from "../src/lib/db/repository";
import {
  createAcademicCalendarEvent,
  inviteParticipantToCalendarEvent,
  removeParticipantFromCalendarEvent,
} from "../src/lib/calendar/googleCalendar";

describe("DAOM Learning 2.0 — Academic Engine, Calendar, Presentismo, Certificados y ChatGPT", () => {
  const timestamp = Date.now();
  let adminUser: any;
  let participant1: any;
  let participant2: any;
  let enrollment1: any;
  let jornada1: any;
  let jornada2: any;
  let encuentro1: any;
  let encuentro2: any;

  beforeAll(async () => {
    // 1. Usuarios
    adminUser = await createUser({
      email: `admin_engine_${timestamp}@daom.org`,
      fullName: "Director Académico",
      role: "ADMIN",
    });

    participant1 = await createUser({
      email: `alumno_engine_${timestamp}@daom.org`,
      fullName: "Estudiante 1",
      role: "PARTICIPANT",
    });

    participant2 = await createUser({
      email: `alumno_engine2_${timestamp}@daom.org`,
      fullName: "Estudiante 2 Presencial",
      role: "PARTICIPANT",
    });

    // 2. Inscripción confirmada para alumno 1
    enrollment1 = await createEnrollment({
      userId: participant1.id,
      capacitacionId: "SEM-BIOMECANICA",
      modalityId: "streaming",
      currency: "ARS",
      amountTotal: 85000,
      paymentMethod: "manual",
      notes: "Inscripción confirmada para pruebas de motor",
    });
    // Marcar confirmada
    const db = getDatabase();
    await db.run(`UPDATE enrollments SET status = 'confirmada' WHERE id = ?`, [enrollment1.id]);
  });

  it("1. Arquitectura Académica: Capacitación -> Jornadas -> Encuentros jerárquicos", async () => {
    // Crear Jornada 1
    jornada1 = await createJornada({
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Jornada Teórica: Cinemática",
      descripcion: "Análisis cinemático del movimiento",
      modalidad: "streaming",
      precioIndividual: 40000,
      cupoIndependiente: 30,
      orden: 1,
    });

    // Crear Jornada 2
    jornada2 = await createJornada({
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Jornada Práctica: Dinámica y Videoanálisis",
      descripcion: "Videoanálisis en tarima deportiva",
      modalidad: "presencial",
      precioIndividual: 60000,
      cupoIndependiente: 20,
      orden: 2,
    });

    expect(jornada1.id).toBeDefined();
    expect(jornada2.id).toBeDefined();
    expect(Number(jornada1.precio_individual)).toBe(40000);
    expect(Number(jornada2.precio_individual)).toBe(60000);

    // Crear Encuentros para Jornada 1
    encuentro1 = await createEncuentro({
      jornadaId: jornada1.id,
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Encuentro 1: Leyes de Newton",
      fecha: "2026-11-29",
      horaInicio: "09:00",
      horaFin: "13:00",
      duracionHoras: 4.0,
      modalidad: "streaming",
      orden: 1,
    });

    encuentro2 = await createEncuentro({
      jornadaId: jornada1.id,
      capacitacionId: "SEM-BIOMECANICA",
      nombre: "Encuentro 2: Cinematografía Angular",
      fecha: "2026-11-29",
      horaInicio: "14:00",
      horaFin: "18:00",
      duracionHoras: 4.0,
      modalidad: "streaming",
      orden: 2,
    });

    expect(encuentro1.id).toBeDefined();
    expect(encuentro1.attendance_code).toBeDefined();
    expect(encuentro1.attendance_qr_token).toBeDefined();
    expect(Number(encuentro1.duracion_horas)).toBe(4.0);

    // Verificar listado jerárquico
    const jornadas = await getJornadasForTraining("SEM-BIOMECANICA");
    expect(jornadas.length).toBeGreaterThanOrEqual(2);
    const j1 = jornadas.find((j) => j.id === jornada1.id);
    expect(j1?.encuentros?.length).toBe(2);
  });

  it("2. Google Calendar y Meet: Creación de evento, conferencias e invitaciones seguras", async () => {
    // 2.1 Creación de evento para streaming
    const gcalRes = await createAcademicCalendarEvent(encuentro1.id, {
      title: "DAOM Learning: Encuentro 1 Leyes de Newton",
      description: "Clase interactiva de Biomecánica",
      startDateTime: "2026-11-29T09:00:00",
      endDateTime: "2026-11-29T13:00:00",
      generateMeet: true,
    });

    expect(gcalRes.eventId).toBeDefined();
    expect(gcalRes.status).toBeDefined();

    // 2.2 Invitar alumno con inscripción confirmada
    const inviteRes = await inviteParticipantToCalendarEvent(gcalRes.eventId, participant1.email, encuentro1.id);
    expect(inviteRes.success).toBe(true);

    // 2.3 Cancelación / Remoción de invitado
    const removeRes = await removeParticipantFromCalendarEvent(gcalRes.eventId, participant1.email, encuentro1.id);
    expect(removeRes.success).toBe(true);
  });

  it("3. Presentismo: Acreditación por Código, QR y modo manual", async () => {
    // 3.1 Acreditación manual con código correcto
    const attCodeRes = await recordEncuentroAttendance({
      encuentroId: encuentro1.id,
      userId: participant1.id,
      enrollmentId: enrollment1.id,
      method: "code",
      providedCodeOrToken: encuentro1.attendance_code,
    });

    expect(attCodeRes.success).toBe(true);
    expect(attCodeRes.attendance).toBeDefined();

    // 3.2 Idempotencia: no duplica asistencia
    const attDupRes = await recordEncuentroAttendance({
      encuentroId: encuentro1.id,
      userId: participant1.id,
      enrollmentId: enrollment1.id,
      method: "code",
      providedCodeOrToken: encuentro1.attendance_code,
    });
    expect(attDupRes.success).toBe(true);
    expect(attDupRes.message).toContain("ya acreditada previamente");

    // 3.3 Rechazo de código inválido
    const attBadRes = await recordEncuentroAttendance({
      encuentroId: encuentro1.id,
      userId: participant2.id,
      enrollmentId: enrollment1.id, // ID no match user
      method: "code",
      providedCodeOrToken: "CODIGO_INCORRECTO",
    });
    expect(attBadRes.success).toBe(false);

    // 3.4 Acreditación de encuentro 2 por QR
    const attQrRes = await recordEncuentroAttendance({
      encuentroId: encuentro2.id,
      userId: participant1.id,
      enrollmentId: enrollment1.id,
      method: "qr",
      providedCodeOrToken: encuentro2.attendance_qr_token,
    });
    expect(attQrRes.success).toBe(true);
  });

  it("4. Certificados 2.0: Emisión automática, cálculo dinámico de carga horaria y actualización", async () => {
    // El alumno 1 acreditó encuentro 1 (4h) y encuentro 2 (4h) = 8 horas totales
    const cert = await issueOrUpdateCertificate2(enrollment1.id);
    expect(cert).not.toBeNull();
    expect(cert?.certificate_code).toContain("DAOM-SEM-BIOMECANICA");
    expect(Number(cert?.horas_certificadas)).toBe(8);
    expect(cert?.encuentros_acreditados_count).toBe(2);

    // Actualización posterior (trazabilidad de versiones)
    const certV2 = await issueOrUpdateCertificate2(enrollment1.id);
    expect(certV2?.version).toBe(2);
    expect(certV2?.certificate_code).toBe(cert?.certificate_code);
  });

  it("5. Cupos y Lista de Espera: Reserva temporal de 24 horas y liberación", async () => {
    // 5.1 Unirse a lista de espera
    const waitEntry = await joinWaitlist({
      jornadaId: jornada2.id,
      userId: participant1.id,
      isPackageWait: false,
    });
    expect(waitEntry.id).toBeDefined();
    expect(waitEntry.status).toBe("waiting");

    // 5.2 Liberación y oferta de cupo por 24 horas
    const offered = await offerSeatFromWaitlist(jornada2.id);
    expect(offered).not.toBeNull();
    expect(offered?.status).toBe("offered");
    expect(offered?.reserved_until).toBeDefined();
    expect(new Date(offered!.reserved_until!).getTime()).toBeGreaterThan(Date.now());
  });

  it("6. Recuperación de Encuentros: Autorización administrativa entre distintas ediciones", async () => {
    const recovery = await authorizeEncuentroRecovery({
      originalEncuentroId: encuentro1.id,
      targetEncuentroId: encuentro2.id,
      userId: participant1.id,
      enrollmentId: enrollment1.id,
      authorizedBy: adminUser.email,
      reason: "Recuperación autorizada por motivos laborales",
    });

    expect(recovery.id).toBeDefined();
    expect(recovery.authorized_by).toBe(adminUser.email);
    expect(recovery.is_attended).toBe(0);
  });
});
