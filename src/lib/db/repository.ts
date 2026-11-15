/**
 * DAOM Learning — Repositorio Unificado de Datos
 * Canario: DAOM-FORMACION-SHEET-01
 *
 * Separa estrictamente datos editoriales (Google Sheets) de datos operativos (PostgreSQL/SQLite).
 */

import { getDatabase } from "./client";
import type {
  Training,
  Instructor,
  TrainingEdition,
  Price,
  User,
  Profile,
  UserAuthIdentity,
  Enrollment,
  PaymentRecord,
  MaterialAsset,
  MaterialEntitlement,
  AttendanceRecord,
  Certificate,
  IntegrationEvent,
  SyncRun,
  AuditLog,
  FAQ,
  SiteConfig,
  EditorialControl,
  ModalityId,
} from "@/lib/types";

// ==============================================================================
// 1. Catálogo Editorial Público (Solo publicados y verificados)
// ==============================================================================

export async function getPublishedTrainings(filters?: {
  tipo?: string;
  search?: string;
}): Promise<Training[]> {
  const db = getDatabase();
  let sql = `
    SELECT * FROM trainings
    WHERE estado_editorial = 'publicado' AND verificacion = 'verificado'
  `;
  const params: any[] = [];

  if (filters?.tipo && filters.tipo !== "todos") {
    sql += ` AND tipo = ?`;
    params.push(filters.tipo.toLowerCase());
  }

  if (filters?.search && filters.search.trim().length > 0) {
    sql += ` AND (titulo LIKE ? OR subtitulo LIKE ? OR descripcion LIKE ?)`;
    const term = `%${filters.search.trim()}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY orden ASC, titulo ASC`;

  const rows = await db.query<Training>(sql, params);

  // Hidratar docentes para cada capacitación
  for (const training of rows) {
    training.docentes = await getInstructorsForTraining(training.capacitacion_id);
    training.ediciones = await getPublishedEditionsForTraining(training.capacitacion_id);
  }

  return rows;
}

export async function getTrainingById(
  id: string,
  includeUnpublished = false
): Promise<Training | null> {
  const db = getDatabase();
  let sql = `SELECT * FROM trainings WHERE capacitacion_id = ?`;
  const params: any[] = [id];

  if (!includeUnpublished) {
    sql += ` AND estado_editorial = 'publicado' AND verificacion = 'verificado'`;
  }

  const training = await db.get<Training>(sql, params);
  if (!training) return null;

  training.docentes = await getInstructorsForTraining(training.capacitacion_id);
  training.ediciones = await getEditionsForTraining(training.capacitacion_id, !includeUnpublished);

  return training;
}

function normalizeForSlug(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function getTrainingBySlugOrId(
  slugOrId: string,
  includeUnpublished = false
): Promise<Training | null> {
  const clean = slugOrId.trim();

  // 1. Coincidencia exacta de capacitacion_id
  const direct = await getTrainingById(clean, includeUnpublished);
  if (direct) return direct;

  // 2. Coincidencia exacta en mayúsculas
  const upper = clean.toUpperCase();
  const directUpper = await getTrainingById(upper, includeUnpublished);
  if (directUpper) return directUpper;

  // 3. Con prefijos estándar de tipo (SEM-, CLI-, WOR-, TUT-)
  const prefixes = ["SEM", "CLI", "WOR", "TUT"];
  for (const p of prefixes) {
    const candidate = `${p}-${upper}`;
    const match = await getTrainingById(candidate, includeUnpublished);
    if (match) return match;
  }

  // 4. Búsqueda por slug normalizado y sin tildes entre capacitaciones
  const list = includeUnpublished
    ? await getAllTrainingsAdmin()
    : await getPublishedTrainings();

  const targetNorm = normalizeForSlug(clean);

  const found = list.find((t) => {
    const idNorm = normalizeForSlug(t.capacitacion_id);
    if (idNorm === targetNorm || idNorm.includes(targetNorm)) return true;

    const strippedId = normalizeForSlug(t.capacitacion_id.replace(/^(sem|cli|wor|tut)-/i, ""));
    if (strippedId === targetNorm || strippedId.includes(targetNorm)) return true;

    const titleNorm = normalizeForSlug(t.titulo);
    if (titleNorm.includes(targetNorm) || targetNorm.includes(titleNorm)) return true;

    return false;
  });

  if (found) {
    return await getTrainingById(found.capacitacion_id, includeUnpublished);
  }

  return null;
}

export async function getInstructorsForTraining(trainingId: string): Promise<Instructor[]> {
  const db = getDatabase();
  const sql = `
    SELECT i.* FROM instructors i
    INNER JOIN training_instructors ti ON i.docente_id = ti.docente_id
    WHERE ti.capacitacion_id = ?
    ORDER BY ti.orden ASC, i.nombre ASC
  `;
  return await db.query<Instructor>(sql, [trainingId]);
}

export async function getPublishedEditionsForTraining(trainingId: string): Promise<TrainingEdition[]> {
  return await getEditionsForTraining(trainingId, true);
}

export async function getEditionsForTraining(
  trainingId: string,
  onlyPublished = true
): Promise<TrainingEdition[]> {
  const db = getDatabase();
  let sql = `SELECT * FROM training_editions WHERE capacitacion_id = ?`;
  const params: any[] = [trainingId];

  if (onlyPublished) {
    sql += ` AND estado_editorial = 'publicado' AND verificacion = 'verificado'`;
  }

  sql += ` ORDER BY fecha_inicio ASC`;

  const editions = await db.query<TrainingEdition>(sql, params);

  for (const edition of editions) {
    edition.precios = await getPricesForEdition(edition.oferta_id, onlyPublished);
  }

  return editions;
}

export async function getPricesForEdition(editionId: string, onlyActive = true): Promise<Price[]> {
  const db = getDatabase();
  let sql = `SELECT * FROM prices WHERE oferta_id = ?`;
  const params: any[] = [editionId];

  if (onlyActive) {
    sql += ` AND estado = 'activo' AND verificacion = 'verificado'`;
  }

  return await db.query<Price>(sql, params);
}

export async function getEditionById(editionId: string): Promise<TrainingEdition | null> {
  const db = getDatabase();
  const ed = await db.get<TrainingEdition>(`SELECT * FROM training_editions WHERE oferta_id = ?`, [editionId]);
  if (!ed) return null;
  ed.precios = await getPricesForEdition(ed.oferta_id, false);
  return ed;
}

export async function updateEditionWhatsAppGroupUrl(editionId: string, whatsappGroupUrl: string | null): Promise<void> {
  const db = getDatabase();
  const nowIso = new Date().toISOString();
  await db.run(
    `UPDATE training_editions SET whatsapp_group_url = ?, synced_at = ? WHERE oferta_id = ?`,
    [whatsappGroupUrl ? whatsappGroupUrl.trim() : null, nowIso, editionId]
  );
}

export async function updateTrainingWhatsAppGroupUrl(capacitacionId: string, whatsappGroupUrl: string | null): Promise<void> {
  const db = getDatabase();
  const nowIso = new Date().toISOString();
  await db.run(
    `UPDATE training_editions SET whatsapp_group_url = ?, synced_at = ? WHERE capacitacion_id = ?`,
    [whatsappGroupUrl ? whatsappGroupUrl.trim() : null, nowIso, capacitacionId]
  );
}

export async function getVerifiedInstructors(): Promise<Instructor[]> {
  const db = getDatabase();
  const sql = `
    SELECT * FROM instructors
    WHERE estado = 'activo' AND verificacion = 'verificado'
    ORDER BY nombre ASC
  `;
  return await db.query<Instructor>(sql);
}

export async function getInstructorById(id: string): Promise<Instructor | null> {
  const db = getDatabase();
  return await db.get<Instructor>(`SELECT * FROM instructors WHERE docente_id = ?`, [id]);
}

export async function getPublishedFaqs(capacitacionId?: string): Promise<FAQ[]> {
  const db = getDatabase();
  let sql = `SELECT * FROM faqs WHERE estado_editorial = 'publicado'`;
  const params: any[] = [];

  if (capacitacionId) {
    sql += ` AND (capacitacion_id = ? OR capacitacion_id IS NULL)`;
    params.push(capacitacionId);
  }

  sql += ` ORDER BY orden ASC, faq_id ASC`;
  return await db.query<FAQ>(sql, params);
}

export async function getSiteConfigs(publicOnly = true): Promise<Record<string, string>> {
  const db = getDatabase();
  let sql = `SELECT clave, valor FROM site_configs`;
  if (publicOnly) {
    sql += ` WHERE publico = 'SI'`;
  }
  const rows = await db.query<{ clave: string; valor: string }>(sql);
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.clave] = r.valor;
  }
  return map;
}

// ==============================================================================
// 2. Panel Administrativo (Visibilidad de borradores, errores y auditoría)
// ==============================================================================

export async function getAllTrainingsAdmin(): Promise<Training[]> {
  const db = getDatabase();
  const rows = await db.query<Training>(`SELECT * FROM trainings ORDER BY orden ASC, capacitacion_id ASC`);
  for (const t of rows) {
    t.docentes = await getInstructorsForTraining(t.capacitacion_id);
    t.ediciones = await getEditionsForTraining(t.capacitacion_id, false);
  }
  return rows;
}

export async function getAllInstructorsAdmin(): Promise<Instructor[]> {
  const db = getDatabase();
  return await db.query<Instructor>(`SELECT * FROM instructors ORDER BY docente_id ASC`);
}

export async function getAllEditorialControls(): Promise<EditorialControl[]> {
  const db = getDatabase();
  return await db.query<EditorialControl>(`SELECT * FROM editorial_controls ORDER BY registro_id ASC`);
}

export async function getRecentSyncRuns(limit = 10): Promise<SyncRun[]> {
  const db = getDatabase();
  return await db.query<SyncRun>(`SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT ?`, [limit]);
}

export async function recordAuditLog(log: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
}): Promise<void> {
  const db = getDatabase();
  const id = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const detailsStr = log.details
    ? typeof log.details === "string"
      ? log.details
      : JSON.stringify(log.details)
    : null;
  const nowIso = new Date().toISOString();

  await db.run(
    `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, log.userId || null, log.action, log.entityType, log.entityId, detailsStr, log.ipAddress || null, nowIso]
  );
}

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const db = getDatabase();
  return await db.query<AuditLog>(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`, [limit]);
}

// ==============================================================================
// 3. Usuarios y Autenticación
// ==============================================================================

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDatabase();
  const user = await db.get<User>(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);
  if (!user) return null;

  user.profile = (await db.get<Profile>(`SELECT * FROM profiles WHERE user_id = ?`, [user.id])) ?? undefined;
  user.identities = await db.query<UserAuthIdentity>(
    `SELECT * FROM user_auth_identities WHERE user_id = ? ORDER BY created_at ASC`,
    [user.id]
  );
  return user;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = getDatabase();
  const user = await db.get<User>(`SELECT * FROM users WHERE id = ?`, [id]);
  if (!user) return null;

  user.profile = (await db.get<Profile>(`SELECT * FROM profiles WHERE user_id = ?`, [user.id])) ?? undefined;
  user.identities = await db.query<UserAuthIdentity>(
    `SELECT * FROM user_auth_identities WHERE user_id = ? ORDER BY created_at ASC`,
    [user.id]
  );
  return user;
}

export async function searchParticipants(query: string, limit = 20): Promise<User[]> {
  const db = getDatabase();
  const clean = query.trim();
  if (!clean) {
    const rows = await db.query<User>(
      `SELECT u.* FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       ORDER BY u.created_at DESC LIMIT ?`,
      [limit]
    );
    for (const u of rows) {
      u.profile = (await db.get<Profile>(`SELECT * FROM profiles WHERE user_id = ?`, [u.id])) ?? undefined;
    }
    return rows;
  }

  const term = `%${clean}%`;
  const rows = await db.query<User>(
    `SELECT DISTINCT u.* FROM users u
     LEFT JOIN profiles p ON u.id = p.user_id
     WHERE u.email LIKE ? OR u.full_name LIKE ? OR p.phone LIKE ? OR p.document_id LIKE ?
     ORDER BY u.full_name ASC LIMIT ?`,
    [term, term, term, term, limit]
  );

  for (const u of rows) {
    u.profile = (await db.get<Profile>(`SELECT * FROM profiles WHERE user_id = ?`, [u.id])) ?? undefined;
  }
  return rows;
}

export async function findIdentityByProvider(
  provider: string,
  providerSubject: string
): Promise<UserAuthIdentity | null> {
  const db = getDatabase();
  return await db.get<UserAuthIdentity>(
    `SELECT * FROM user_auth_identities WHERE provider = ? AND provider_subject = ?`,
    [provider, providerSubject]
  );
}

export async function findIdentitiesByUserId(userId: string): Promise<UserAuthIdentity[]> {
  const db = getDatabase();
  return await db.query<UserAuthIdentity>(
    `SELECT * FROM user_auth_identities WHERE user_id = ? ORDER BY created_at ASC`,
    [userId]
  );
}

export async function findUserByIdentity(
  provider: string,
  providerSubject: string
): Promise<User | null> {
  const identity = await findIdentityByProvider(provider, providerSubject);
  if (!identity) return null;
  return await findUserById(identity.user_id);
}

export async function linkUserIdentity(data: {
  userId: string;
  provider: string;
  providerSubject: string;
  providerEmail: string;
}): Promise<UserAuthIdentity> {
  const db = getDatabase();
  const existing = await findIdentityByProvider(data.provider, data.providerSubject);
  const nowIso = new Date().toISOString();

  if (existing) {
    if (existing.user_id !== data.userId) {
      throw new Error("Esta cuenta externa ya está vinculada a otro perfil institucional.");
    }
    await db.run(
      `UPDATE user_auth_identities SET last_login_at = ?, provider_email = ? WHERE id = ?`,
      [nowIso, data.providerEmail.toLowerCase().trim(), existing.id]
    );
    return { ...existing, last_login_at: nowIso, provider_email: data.providerEmail };
  }

  const identityId = `IDN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await db.run(
    `INSERT INTO user_auth_identities (id, user_id, provider, provider_subject, provider_email, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      identityId,
      data.userId,
      data.provider,
      data.providerSubject,
      data.providerEmail.toLowerCase().trim(),
      nowIso,
      nowIso,
    ]
  );

  const created = await db.get<UserAuthIdentity>(
    `SELECT * FROM user_auth_identities WHERE id = ?`,
    [identityId]
  );
  if (!created) throw new Error("Error al recuperar la identidad creada");
  return created;
}

export async function touchUserIdentityLogin(id: string): Promise<void> {
  const db = getDatabase();
  await db.run(
    `UPDATE user_auth_identities SET last_login_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

export async function unlinkUserIdentity(userId: string, provider: string): Promise<boolean> {
  const db = getDatabase();
  const res = await db.run(
    `DELETE FROM user_auth_identities WHERE user_id = ? AND provider = ?`,
    [userId, provider]
  );
  return res.changes > 0;
}

export async function createUser(data: {
  email: string;
  passwordHash?: string;
  fullName: string;
  role?: "ADMIN" | "PARTICIPANT" | "STAFF";
  phone?: string;
  country?: string;
  documentId?: string;
  emailVerified?: boolean;
}): Promise<User> {
  const db = getDatabase();
  const userId = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const role = data.role || "PARTICIPANT";
  const verified = data.emailVerified ? 1 : 0;
  const hash = data.passwordHash || "";

  await db.run(
    `INSERT INTO users (id, email, password_hash, full_name, role, is_active, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [userId, data.email.toLowerCase().trim(), hash, data.fullName.trim(), role, verified, nowIso, nowIso]
  );

  await db.run(
    `INSERT INTO profiles (user_id, phone, document_id, country, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, data.phone || null, data.documentId || null, data.country || "AR", nowIso]
  );

  const created = await findUserById(userId);
  if (!created) throw new Error("Error al recuperar el usuario recién creado");
  return created;
}

export async function createUserWithIdentity(data: {
  email: string;
  fullName: string;
  role?: "ADMIN" | "PARTICIPANT" | "STAFF";
  provider: string;
  providerSubject: string;
  providerEmail: string;
  phone?: string;
  country?: string;
  documentId?: string;
}): Promise<User> {
  const user = await createUser({
    email: data.email,
    passwordHash: "",
    fullName: data.fullName,
    role: data.role || "PARTICIPANT",
    phone: data.phone,
    country: data.country || "AR",
    documentId: data.documentId,
    emailVerified: true,
  });

  await linkUserIdentity({
    userId: user.id,
    provider: data.provider,
    providerSubject: data.providerSubject,
    providerEmail: data.providerEmail,
  });

  const refreshed = await findUserById(user.id);
  return refreshed || user;
}

export async function findOrCreateParticipant(data: {
  email: string;
  fullName: string;
  phone?: string;
  country?: string;
  documentId?: string;
}): Promise<User> {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    const db = getDatabase();
    if (data.phone || data.documentId || data.country) {
      await db.run(
        `UPDATE profiles SET
          phone = COALESCE(?, phone),
          document_id = COALESCE(?, document_id),
          country = COALESCE(?, country),
          updated_at = ?
         WHERE user_id = ?`,
        [data.phone || null, data.documentId || null, data.country || null, new Date().toISOString(), existing.id]
      );
    }
    const refreshed = await findUserById(existing.id);
    return refreshed || existing;
  }

  const randomPass = `auto_part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const { hashPassword } = await import("@/lib/auth/passwords");
  const passwordHash = await hashPassword(randomPass);

  return await createUser({
    email: data.email,
    passwordHash,
    fullName: data.fullName,
    role: "PARTICIPANT",
    phone: data.phone,
    country: data.country || "AR",
    documentId: data.documentId,
  });
}

export async function getUserEnrollmentForTraining(
  userId: string,
  capacitacionId: string,
  ofertaId?: string | null
): Promise<Enrollment | null> {
  const db = getDatabase();
  let sql = `SELECT * FROM enrollments WHERE user_id = ? AND capacitacion_id = ?`;
  const params: any[] = [userId, capacitacionId];
  if (ofertaId) {
    sql += ` AND (oferta_id = ? OR oferta_id IS NULL)`;
    params.push(ofertaId);
  }
  sql += ` AND status IN ('pendiente_pago', 'confirmada') ORDER BY created_at DESC LIMIT 1`;
  const row = await db.get<Enrollment>(sql, params);
  if (!row) return null;
  return await getEnrollmentById(row.id);
}

// ==============================================================================
// 4. Inscripciones y Pagos (Datos Operativos)
// ==============================================================================

export async function createEnrollment(data: {
  userId: string;
  capacitacionId: string;
  ofertaId?: string | null;
  modalityId: ModalityId;
  currency?: "ARS" | "USD";
  amountTotal: number;
  paymentMethod?: string | null;
  notes?: string | null;
}): Promise<Enrollment> {
  const db = getDatabase();
  const id = `ENR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  await db.run(
    `INSERT INTO enrollments (
      id, user_id, capacitacion_id, oferta_id, modality_id, status, currency,
      amount_total, amount_paid, payment_method, notes, modality_change_requested,
      modality_change_fee, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'pendiente_pago', ?, ?, 0, ?, ?, 0, 0, ?, ?)`,
    [
      id,
      data.userId,
      data.capacitacionId,
      data.ofertaId || null,
      data.modalityId,
      data.currency || "ARS",
      data.amountTotal,
      data.paymentMethod || null,
      data.notes || null,
      nowIso,
      nowIso,
    ]
  );

  await recordAuditLog({
    userId: data.userId,
    action: "ENROLLMENT_CREATED",
    entityType: "enrollment",
    entityId: id,
    details: { capacitacionId: data.capacitacionId, modalityId: data.modalityId },
  });

  const enr = await getEnrollmentById(id);
  if (!enr) throw new Error("Error al obtener la inscripción creada");
  return enr;
}

export async function getEnrollmentById(id: string): Promise<Enrollment | null> {
  const db = getDatabase();
  const enr = await db.get<Enrollment>(`SELECT * FROM enrollments WHERE id = ?`, [id]);
  if (!enr) return null;

  enr.training = (await getTrainingById(enr.capacitacion_id, true)) ?? undefined;
  if (enr.oferta_id) {
    enr.edition =
      (await db.get<TrainingEdition>(`SELECT * FROM training_editions WHERE oferta_id = ?`, [enr.oferta_id])) ??
      undefined;
  }
  enr.user = (await findUserById(enr.user_id)) ?? undefined;
  return enr;
}

export async function getPaymentsForEnrollment(enrollmentId: string): Promise<PaymentRecord[]> {
  const db = getDatabase();
  return await db.query<PaymentRecord>(
    `SELECT * FROM payment_records WHERE enrollment_id = ? ORDER BY created_at DESC`,
    [enrollmentId]
  );
}

export async function getUserEnrollments(userId: string): Promise<Enrollment[]> {
  const db = getDatabase();
  const rows = await db.query<Enrollment>(
    `SELECT * FROM enrollments WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  for (const enr of rows) {
    enr.training = (await getTrainingById(enr.capacitacion_id, true)) ?? undefined;
    if (enr.oferta_id) {
      enr.edition =
        (await db.get<TrainingEdition>(`SELECT * FROM training_editions WHERE oferta_id = ?`, [enr.oferta_id])) ??
        undefined;
    }
  }
  return rows;
}

export async function getAllEnrollmentsAdmin(filter?: { status?: string }): Promise<Enrollment[]> {
  const db = getDatabase();
  let sql = `SELECT * FROM enrollments`;
  const params: any[] = [];
  if (filter?.status && filter.status !== "todos") {
    sql += ` WHERE status = ?`;
    params.push(filter.status);
  }
  sql += ` ORDER BY created_at DESC`;
  const rows = await db.query<Enrollment>(sql, params);
  for (const enr of rows) {
    enr.training = (await getTrainingById(enr.capacitacion_id, true)) ?? undefined;
    enr.user = (await findUserById(enr.user_id)) ?? undefined;
  }
  return rows;
}

export async function updateEnrollmentStatus(
  id: string,
  status: "pendiente_pago" | "confirmada" | "cancelada" | "reembolsada" | "en_espera",
  notes?: string
): Promise<void> {
  const db = getDatabase();
  const nowIso = new Date().toISOString();
  await db.run(
    `UPDATE enrollments SET status = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?`,
    [status, notes || null, nowIso, id]
  );

  await recordAuditLog({
    action: "ENROLLMENT_STATUS_UPDATED",
    entityType: "enrollment",
    entityId: id,
    details: { newStatus: status, notes },
  });
}

export async function requestModalityChange(
  enrollmentId: string,
  toModality: ModalityId,
  fee: number
): Promise<void> {
  const db = getDatabase();
  const nowIso = new Date().toISOString();
  await db.run(
    `UPDATE enrollments SET
      modality_change_requested = 1,
      modality_change_to = ?,
      modality_change_fee = ?,
      modality_change_status = 'pendiente_aprobacion',
      updated_at = ?
     WHERE id = ?`,
    [toModality, fee, nowIso, enrollmentId]
  );

  await recordAuditLog({
    action: "MODALITY_CHANGE_REQUESTED",
    entityType: "enrollment",
    entityId: enrollmentId,
    details: { toModality, fee },
  });
}

export async function getPendingEnrollments(limit = 20): Promise<Enrollment[]> {
  const db = getDatabase();
  const rows = await db.query<Enrollment>(
    `SELECT * FROM enrollments WHERE status = 'pendiente_pago' ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  for (const enr of rows) {
    enr.training = (await getTrainingById(enr.capacitacion_id, true)) ?? undefined;
    enr.user = (await findUserById(enr.user_id)) ?? undefined;
  }
  return rows;
}

export async function recordPayment(data: {
  enrollmentId: string;
  externalPaymentId?: string | null;
  provider: "mercadopago" | "stripe" | "manual" | "bot";
  status: "pending" | "approved" | "rejected" | "refunded";
  amount: number;
  currency: "ARS" | "USD";
  payerEmail?: string | null;
  rawPayload?: Record<string, any> | string | null;
}): Promise<PaymentRecord> {
  const db = getDatabase();

  // 1. Idempotencia estricta por externalPaymentId
  if (data.externalPaymentId) {
    const existingPayment = await db.get<PaymentRecord>(
      `SELECT * FROM payment_records WHERE external_payment_id = ?`,
      [data.externalPaymentId]
    );
    if (existingPayment) {
      // Si el pago ya fue registrado y aprobado, asegurar que la inscripción esté confirmada y retornar
      if (data.status === "approved") {
        const enr = await db.get<Enrollment>(`SELECT * FROM enrollments WHERE id = ?`, [data.enrollmentId]);
        if (enr && enr.status !== "confirmada") {
          await db.run(
            `UPDATE enrollments SET status = 'confirmada', amount_paid = ?, updated_at = ? WHERE id = ?`,
            [data.amount, new Date().toISOString(), data.enrollmentId]
          );
          await autoGrantMaterialForEnrollment(enr.user_id, enr.capacitacion_id, enr.id);
        }
      }
      return existingPayment;
    }
  }

  const id = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const payloadStr = data.rawPayload
    ? typeof data.rawPayload === "string"
      ? data.rawPayload
      : JSON.stringify(data.rawPayload)
    : null;

  await db.run(
    `INSERT INTO payment_records (id, enrollment_id, external_payment_id, provider, status, amount, currency, payer_email, raw_payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.enrollmentId,
      data.externalPaymentId || null,
      data.provider,
      data.status,
      data.amount,
      data.currency,
      data.payerEmail || null,
      payloadStr,
      nowIso,
    ]
  );

  // Si el pago es aprobado, actualizar la inscripción y monto pagado de forma idempotente
  if (data.status === "approved") {
    const enr = await db.get<Enrollment>(`SELECT * FROM enrollments WHERE id = ?`, [data.enrollmentId]);
    if (enr) {
      if (enr.status !== "confirmada") {
        await db.run(
          `UPDATE enrollments SET status = 'confirmada', amount_paid = ?, updated_at = ? WHERE id = ?`,
          [data.amount, nowIso, data.enrollmentId]
        );
      } else {
        await db.run(
          `UPDATE enrollments SET updated_at = ? WHERE id = ?`,
          [nowIso, data.enrollmentId]
        );
      }
      // Regla obligatoria: Habilitar inmediatamente el material complementario ZIP tras pago confirmado
      await autoGrantMaterialForEnrollment(enr.user_id, enr.capacitacion_id, enr.id);
    }
  }

  return {
    id,
    enrollment_id: data.enrollmentId,
    external_payment_id: data.externalPaymentId || null,
    provider: data.provider,
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    payer_email: data.payerEmail || null,
    raw_payload: payloadStr,
    created_at: nowIso,
  };
}

// ==============================================================================
// 5. Material Educativo Complementario (Archivos ZIP y Control de Acceso)
// ==============================================================================

export async function getMaterialAssetForTraining(trainingId: string): Promise<MaterialAsset | null> {
  const db = getDatabase();
  return await db.get<MaterialAsset>(
    `SELECT * FROM material_assets WHERE capacitacion_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1`,
    [trainingId]
  );
}

export async function ensureDefaultMaterialAsset(trainingId: string, title: string): Promise<MaterialAsset> {
  const db = getDatabase();
  const existing = await getMaterialAssetForTraining(trainingId);
  if (existing) return existing;

  const id = `MAT-${trainingId}`;
  const fileName = `material-${trainingId.toLowerCase()}.zip`;
  const storagePath = `materials/${fileName}`;
  const nowIso = new Date().toISOString();

  await db.run(
    `INSERT INTO material_assets (id, capacitacion_id, title, file_name, file_size_bytes, mime_type, storage_path, version, is_active, created_at)
     VALUES (?, ?, ?, ?, 1048576, 'application/zip', ?, '1.0', 1, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title`,
    [id, trainingId, title, fileName, storagePath, nowIso]
  );

  const asset = await db.get<MaterialAsset>(`SELECT * FROM material_assets WHERE id = ?`, [id]);
  return asset!;
}

export async function autoGrantMaterialForEnrollment(
  userId: string,
  trainingId: string,
  enrollmentId: string
): Promise<void> {
  const db = getDatabase();
  const asset = await ensureDefaultMaterialAsset(trainingId, `Material Complementario ${trainingId}`);
  const entitlementId = `ENT-${userId}-${asset.id}`;
  const nowIso = new Date().toISOString();

  await db.run(
    `INSERT INTO material_entitlements (
      id, user_id, material_asset_id, enrollment_id, is_revoked, granted_at, granted_by, download_count
    ) VALUES (?, ?, ?, ?, 0, ?, 'system_payment_confirmed', 0)
    ON CONFLICT(id) DO UPDATE SET is_revoked = 0, revoked_at = NULL`,
    [entitlementId, userId, asset.id, enrollmentId, nowIso]
  );

  await recordAuditLog({
    userId,
    action: "MATERIAL_ENTITLEMENT_GRANTED",
    entityType: "material_entitlement",
    entityId: entitlementId,
    details: { trainingId, enrollmentId, assetId: asset.id },
  });
}

export async function getUserMaterialEntitlements(userId: string): Promise<MaterialEntitlement[]> {
  const db = getDatabase();
  const rows = await db.query<MaterialEntitlement>(
    `SELECT me.* FROM material_entitlements me
     WHERE me.user_id = ? AND me.is_revoked = 0
     ORDER BY me.granted_at DESC`,
    [userId]
  );

  for (const ent of rows) {
    ent.asset =
      (await db.get<MaterialAsset>(`SELECT * FROM material_assets WHERE id = ?`, [ent.material_asset_id])) ??
      undefined;
  }

  return rows;
}

export async function verifyMaterialAccess(
  userId: string,
  materialAssetId: string
): Promise<MaterialEntitlement | null> {
  const db = getDatabase();
  const entitlement = await db.get<MaterialEntitlement>(
    `SELECT me.* FROM material_entitlements me
     INNER JOIN enrollments e ON me.enrollment_id = e.id
     WHERE me.user_id = ? AND me.material_asset_id = ? AND me.is_revoked = 0 AND e.status = 'confirmada'`,
    [userId, materialAssetId]
  );
  if (!entitlement) return null;

  entitlement.asset =
    (await db.get<MaterialAsset>(`SELECT * FROM material_assets WHERE id = ?`, [entitlement.material_asset_id])) ??
    undefined;
  return entitlement;
}

export async function recordMaterialDownload(entitlementId: string, ipAddress?: string): Promise<void> {
  const db = getDatabase();
  const nowIso = new Date().toISOString();
  await db.run(
    `UPDATE material_entitlements SET download_count = download_count + 1, last_download_at = ? WHERE id = ?`,
    [nowIso, entitlementId]
  );

  await recordAuditLog({
    action: "MATERIAL_DOWNLOADED",
    entityType: "material_entitlement",
    entityId: entitlementId,
    ipAddress,
  });
}

// ==============================================================================
// 6. Asistencia y Certificados (Bot Integration)
// ==============================================================================

export async function recordAttendance(data: {
  enrollmentId: string;
  userId: string;
  sessionDate: string;
  attended?: boolean;
  modalityAttended?: string;
  checkedInBy?: string;
  notes?: string;
}): Promise<AttendanceRecord> {
  const db = getDatabase();
  const id = `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const attendedNum = data.attended === false ? 0 : 1;

  await db.run(
    `INSERT INTO attendance_records (id, enrollment_id, user_id, session_date, attended, modality_attended, checked_in_by, checked_in_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.enrollmentId,
      data.userId,
      data.sessionDate,
      attendedNum,
      data.modalityAttended || "presencial",
      data.checkedInBy || "bot",
      nowIso,
      data.notes || null,
    ]
  );

  return {
    id,
    enrollment_id: data.enrollmentId,
    user_id: data.userId,
    session_date: data.sessionDate,
    attended: attendedNum,
    modality_attended: data.modalityAttended || "presencial",
    checked_in_by: data.checkedInBy || "bot",
    checked_in_at: nowIso,
    notes: data.notes || null,
  };
}

export async function getUserAttendance(userId: string): Promise<AttendanceRecord[]> {
  const db = getDatabase();
  return await db.query<AttendanceRecord>(
    `SELECT * FROM attendance_records WHERE user_id = ? ORDER BY session_date DESC`,
    [userId]
  );
}

export async function linkCertificate(data: {
  enrollmentId: string;
  userId: string;
  certificateCode: string;
  title: string;
  issueDate: string;
  pdfUrl: string;
  verificationHash?: string;
}): Promise<Certificate> {
  const db = getDatabase();
  const id = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  await db.run(
    `INSERT INTO certificates (id, enrollment_id, user_id, certificate_code, title, issue_date, pdf_url, verification_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(certificate_code) DO UPDATE SET
       title = excluded.title,
       pdf_url = excluded.pdf_url,
       verification_hash = excluded.verification_hash`,
    [
      id,
      data.enrollmentId,
      data.userId,
      data.certificateCode,
      data.title,
      data.issueDate,
      data.pdfUrl,
      data.verificationHash || null,
      nowIso,
    ]
  );

  const cert = await db.get<Certificate>(`SELECT * FROM certificates WHERE certificate_code = ?`, [
    data.certificateCode,
  ]);
  return cert!;
}

export async function getUserCertificates(userId: string): Promise<Certificate[]> {
  const db = getDatabase();
  return await db.query<Certificate>(`SELECT * FROM certificates WHERE user_id = ? ORDER BY issue_date DESC`, [
    userId,
  ]);
}

export async function getCertificateByCode(code: string): Promise<Certificate | null> {
  const db = getDatabase();
  return await db.get<Certificate>(`SELECT * FROM certificates WHERE certificate_code = ?`, [code]);
}

// ==============================================================================
// 7. Eventos de Integración Idempotentes (Bot Contract)
// ==============================================================================

export async function findIntegrationEvent(idempotencyKey: string): Promise<IntegrationEvent | null> {
  const db = getDatabase();
  return await db.get<IntegrationEvent>(`SELECT * FROM integration_events WHERE idempotency_key = ?`, [
    idempotencyKey,
  ]);
}

export async function recordIntegrationEvent(event: {
  idempotencyKey: string;
  eventType: IntegrationEvent["event_type"];
  source: "bot" | "payment_gateway" | "admin_manual";
  payload: Record<string, any>;
  status?: "processed" | "failed" | "ignored";
  errorMessage?: string | null;
}): Promise<IntegrationEvent> {
  const db = getDatabase();
  const id = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const payloadStr = JSON.stringify(event.payload);
  const status = event.status || "processed";

  await db.run(
    `INSERT INTO integration_events (id, idempotency_key, event_type, source, payload, status, error_message, processed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      event.idempotencyKey,
      event.eventType,
      event.source,
      payloadStr,
      status,
      event.errorMessage || null,
      nowIso,
      nowIso,
    ]
  );

  return {
    id,
    idempotency_key: event.idempotencyKey,
    event_type: event.eventType,
    source: event.source,
    payload: payloadStr,
    status,
    error_message: event.errorMessage || null,
    processed_at: nowIso,
    created_at: nowIso,
  };
}


export async function listIntegrationEvents(options?: {
  limit?: number;
  eventType?: string;
  status?: string;
}): Promise<IntegrationEvent[]> {
  const db = getDatabase();
  const limit = Math.min(options?.limit || 50, 200);

  let query = `SELECT * FROM integration_events`;
  const params: any[] = [];
  const conditions: string[] = [];

  if (options?.eventType) {
    conditions.push(`event_type = ?`);
    params.push(options.eventType);
  }
  if (options?.status) {
    conditions.push(`status = ?`);
    params.push(options.status);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(" AND ");
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  return await db.query<IntegrationEvent>(query, params);
}

// ==============================================================================
// 9. Gestión Administrativa Avanzada y Limpieza Quirúrgica (DAOM-LEARNING-CLEANUP-01)
// ==============================================================================

export async function updateParticipantAdmin(
  userId: string,
  data: {
    fullName?: string;
    phone?: string;
    documentId?: string;
    country?: string;
    isActive?: boolean | number;
  }
): Promise<User | null> {
  const db = getDatabase();
  const user = await findUserById(userId);
  if (!user) return null;

  const nowIso = new Date().toISOString();

  if (data.fullName !== undefined || data.isActive !== undefined) {
    const isActiveVal = data.isActive !== undefined ? (data.isActive ? 1 : 0) : user.is_active;
    const fullNameVal = data.fullName !== undefined ? data.fullName.trim() : user.full_name;
    await db.run(
      `UPDATE users SET full_name = ?, is_active = ?, updated_at = ? WHERE id = ?`,
      [fullNameVal, isActiveVal, nowIso, userId]
    );
  }

  if (data.phone !== undefined || data.documentId !== undefined || data.country !== undefined) {
    await db.run(
      `UPDATE profiles SET
        phone = COALESCE(?, phone),
        document_id = COALESCE(?, document_id),
        country = COALESCE(?, country),
        updated_at = ?
       WHERE user_id = ?`,
      [
        data.phone !== undefined ? data.phone.trim() : null,
        data.documentId !== undefined ? data.documentId.trim() : null,
        data.country !== undefined ? data.country.trim() : null,
        nowIso,
        userId,
      ]
    );
  }

  await recordAuditLog({
    action: "PARTICIPANT_UPDATED",
    entityType: "user",
    entityId: userId,
    details: { changes: data },
  });

  return await findUserById(userId);
}

export async function deleteParticipantAdmin(userId: string): Promise<{ success: boolean; reason?: string }> {
  const db = getDatabase();
  const user = await findUserById(userId);
  if (!user) {
    return { success: false, reason: "Usuario no encontrado" };
  }

  // Protección inquebrantable de administradores institucionales
  if (user.role === "ADMIN" || user.email === "daom.weightlifting@gmail.com" || user.email === "admin@daom-weightlifting.com") {
    return { success: false, reason: "No es posible eliminar una cuenta administrativa institucional protegida." };
  }

  // Verificar si tiene actividad operativa legítima (pagos confirmados, asistencias, certificados)
  const paymentsCount = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM payment_records pr
     JOIN enrollments e ON pr.enrollment_id = e.id
     WHERE e.user_id = ? AND pr.status = 'approved'`,
    [userId]
  );

  const certificatesCount = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM certificates WHERE user_id = ?`,
    [userId]
  );

  const attendanceCount = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM attendance_records WHERE user_id = ? AND attended = 1`,
    [userId]
  );

  const totalLegitActivity = (paymentsCount?.count || 0) + (certificatesCount?.count || 0) + (attendanceCount?.count || 0);

  if (totalLegitActivity > 0) {
    // Si tiene actividad legítima, no se destruye: se desactiva (archivado)
    await db.run(`UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?`, [new Date().toISOString(), userId]);
    await recordAuditLog({
      action: "PARTICIPANT_DEACTIVATED_DUE_TO_ACTIVITY",
      entityType: "user",
      entityId: userId,
      details: {
        reason: "El usuario cuenta con pagos, asistencia o certificados. Se procedió a desactivar / archivar.",
        approvedPayments: paymentsCount?.count || 0,
        certificates: certificatesCount?.count || 0,
      },
    });
    return {
      success: true,
      reason: "El usuario posee historial operativo legítimo. Se ha desactivado y archivado de forma segura sin destruir su trazabilidad.",
    };
  }

  // Si no tiene actividad legítima (ej: usuario de prueba o sin pagos), se eliminan dependencias y el usuario
  await db.run(`DELETE FROM material_entitlements WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM attendance_records WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM certificates WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM user_auth_identities WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM profiles WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM enrollments WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM users WHERE id = ?`, [userId]);

  await recordAuditLog({
    action: "PARTICIPANT_PERMANENTLY_DELETED",
    entityType: "user",
    entityId: userId,
    details: { email: user.email, fullName: user.full_name },
  });

  return { success: true, reason: "Usuario y registros asociados eliminados definitivamente." };
}

export async function updateEnrollmentAdmin(
  enrollmentId: string,
  data: {
    modalityId?: ModalityId;
    status?: "pendiente_pago" | "confirmada" | "cancelada" | "reembolsada" | "en_espera";
    notes?: string;
    amountPaid?: number;
  }
): Promise<Enrollment | null> {
  const db = getDatabase();
  const enr = await getEnrollmentById(enrollmentId);
  if (!enr) return null;

  const nowIso = new Date().toISOString();
  const modalityId = data.modalityId || enr.modality_id;
  const status = data.status || enr.status;
  const notes = data.notes !== undefined ? data.notes : enr.notes;
  const amountPaid = data.amountPaid !== undefined ? data.amountPaid : enr.amount_paid;

  await db.run(
    `UPDATE enrollments SET
      modality_id = ?,
      status = ?,
      notes = ?,
      amount_paid = ?,
      updated_at = ?
     WHERE id = ?`,
    [modalityId, status, notes, amountPaid, nowIso, enrollmentId]
  );

  // Si pasa a confirmada y no tenía materiales, auto otorgar
  if (status === "confirmada" && enr.status !== "confirmada") {
    await autoGrantMaterialForEnrollment(enr.user_id, enr.capacitacion_id, enr.id);
  }

  await recordAuditLog({
    action: "ENROLLMENT_ADMIN_UPDATED",
    entityType: "enrollment",
    entityId: enrollmentId,
    details: { previousStatus: enr.status, newStatus: status, changes: data },
  });

  return await getEnrollmentById(enrollmentId);
}

export async function deleteEnrollmentAdmin(enrollmentId: string): Promise<{ success: boolean; reason?: string }> {
  const db = getDatabase();
  const enr = await getEnrollmentById(enrollmentId);
  if (!enr) {
    return { success: false, reason: "Inscripción no encontrada." };
  }

  // Verificar si tiene pagos aprobados por pasarelas externas
  const payments = await getPaymentsForEnrollment(enrollmentId);
  const approvedPayments = payments.filter((p) => p.status === "approved");

  if (approvedPayments.length > 0) {
    // Si tiene pagos aprobados, no se borra físicamente: se cancela y se registra auditoría
    await db.run(`UPDATE enrollments SET status = 'cancelada', updated_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      enrollmentId,
    ]);
    await recordAuditLog({
      action: "ENROLLMENT_CANCELLED_PRESERVING_PAYMENT",
      entityType: "enrollment",
      entityId: enrollmentId,
      details: {
        reason: "La inscripción posee cobros registrados y aprobados. Se marcó como cancelada preservando trazabilidad contable.",
        approvedPaymentsCount: approvedPayments.length,
      },
    });
    return {
      success: true,
      reason: "La inscripción posee pagos aprobados registrados. Se canceló preservando la auditoría contable.",
    };
  }

  // Si no tiene cobros reales aprobados (ej: prueba, pendiente o cancelada sin fondos), se elimina
  await db.run(`DELETE FROM material_entitlements WHERE enrollment_id = ?`, [enrollmentId]);
  await db.run(`DELETE FROM payment_records WHERE enrollment_id = ?`, [enrollmentId]);
  await db.run(`DELETE FROM attendance_records WHERE enrollment_id = ?`, [enrollmentId]);
  await db.run(`DELETE FROM certificates WHERE enrollment_id = ?`, [enrollmentId]);
  await db.run(`DELETE FROM enrollments WHERE id = ?`, [enrollmentId]);

  await recordAuditLog({
    action: "ENROLLMENT_PERMANENTLY_DELETED",
    entityType: "enrollment",
    entityId: enrollmentId,
    details: { userId: enr.user_id, capacitacionId: enr.capacitacion_id },
  });

  return { success: true, reason: "Inscripción eliminada correctamente." };
}

export async function deleteTrainingAdmin(capacitacionId: string): Promise<{ success: boolean; reason?: string }> {
  const db = getDatabase();
  const training = await getTrainingById(capacitacionId, true);
  if (!training) {
    return { success: false, reason: "Capacitación no encontrada." };
  }

  // Verificar si tiene inscripciones vinculadas
  const enrollmentsCount = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM enrollments WHERE capacitacion_id = ?`,
    [capacitacionId]
  );

  if ((enrollmentsCount?.count || 0) > 0) {
    // Si tiene inscripciones, se archiva
    const nowIso = new Date().toISOString();
    await db.run(
      `UPDATE trainings SET estado_editorial = 'archivado', synced_at = ? WHERE capacitacion_id = ?`,
      [nowIso, capacitacionId]
    );
    await db.run(
      `UPDATE training_editions SET estado_editorial = 'archivado', synced_at = ? WHERE capacitacion_id = ?`,
      [nowIso, capacitacionId]
    );
    await recordAuditLog({
      action: "TRAINING_ARCHIVED_DUE_TO_ACTIVITY",
      entityType: "training",
      entityId: capacitacionId,
      details: { enrollmentsCount: enrollmentsCount?.count },
    });
    return {
      success: true,
      reason: "La capacitación cuenta con inscripciones activas o históricas. Se procedió a archivarla sin destruir el catálogo de los alumnos.",
    };
  }

  // Si es una capacitación de prueba sin inscripciones, se elimina
  await db.run(`DELETE FROM prices WHERE oferta_id IN (SELECT oferta_id FROM training_editions WHERE capacitacion_id = ?)`, [capacitacionId]);
  await db.run(`DELETE FROM training_instructors WHERE capacitacion_id = ?`, [capacitacionId]);
  await db.run(`DELETE FROM material_assets WHERE capacitacion_id = ?`, [capacitacionId]);
  await db.run(`DELETE FROM training_editions WHERE capacitacion_id = ?`, [capacitacionId]);
  await db.run(`DELETE FROM trainings WHERE capacitacion_id = ?`, [capacitacionId]);

  await recordAuditLog({
    action: "TRAINING_PERMANENTLY_DELETED",
    entityType: "training",
    entityId: capacitacionId,
    details: { titulo: training.titulo },
  });

  return { success: true, reason: "Capacitación de prueba eliminada definitivamente." };
}

export async function executeProductionCleanup(): Promise<{
  backupSummary: any;
  purgedCounts: {
    users: number;
    enrollments: number;
    payments: number;
    entitlements: number;
    certificates: number;
    events: number;
  };
  preservedAdmins: string[];
}> {
  const db = getDatabase();

  // 1. Identificar registros ficticios y de prueba
  // Patrones claros de prueba:
  // - Correos con @daom-test.com, @test.com, alumno_existente_, atleta_test, atleta.staging, mp.test, fake_, intruder_
  // - Inscripciones en capacitaciones de prueba (MP-TEST-TRAINING, SEM-TEST-ZIP, test-course)
  // - Pagos con external_payment_id que inician con 'TEST-', 'PAY-BOT-', 'DEV-' o en enrollments de prueba
  // - Entitlements asociados a usuarios o inscripciones de prueba
  // - Certificados asociados a inscripciones de prueba

  // Resumen previo para backup / auditoría
  const testUsers = await db.query<{ id: string; email: string; full_name: string }>(
    `SELECT id, email, full_name FROM users
     WHERE (
       email LIKE '%@daom-test.com'
       OR email LIKE '%@test.com'
       OR email LIKE 'alumno_existente_%'
       OR email LIKE 'atleta_test_%'
       OR email LIKE 'atleta.staging%'
       OR email LIKE 'fake_%'
       OR email LIKE 'intruder_%'
       OR email LIKE 'test_user_%'
     )
     AND role = 'PARTICIPANT'
     AND email NOT IN ('daom.weightlifting@gmail.com', 'admin@daom-weightlifting.com')`
  );

  const testUserIds = testUsers.map((u) => u.id);

  const testTrainings = await db.query<{ capacitacion_id: string }>(
    `SELECT capacitacion_id FROM trainings
     WHERE capacitacion_id LIKE 'MP-TEST%'
        OR capacitacion_id LIKE 'SEM-TEST%'
        OR capacitacion_id LIKE 'TEST-%'`
  );
  const testCapacitacionIds = testTrainings.map((t) => t.capacitacion_id);

  // Inscripciones ficticias: o del usuario de prueba o de capacitaciones de prueba
  const testEnrollments = await db.query<{ id: string }>(
    `SELECT id FROM enrollments
     WHERE user_id IN (${testUserIds.length ? testUserIds.map(() => "?").join(",") : "''"})
        OR capacitacion_id IN (${testCapacitacionIds.length ? testCapacitacionIds.map(() => "?").join(",") : "''"})
        OR id LIKE 'ENR-TEST%'`,
    [...testUserIds, ...testCapacitacionIds]
  );
  const testEnrollmentIds = testEnrollments.map((e) => e.id);

  // Backup summary
  const backupSummary = {
    timestamp: new Date().toISOString(),
    identifiedTestUsers: testUsers.length,
    identifiedTestEnrollments: testEnrollments.length,
    identifiedTestCapacitaciones: testTrainings.length,
    sampleUsers: testUsers.slice(0, 10).map((u) => u.email),
  };

  // Purgar de manera segura respetando integridad referencial
  let deletedEntitlements = 0;
  let deletedCertificates = 0;
  let deletedPayments = 0;
  let deletedEvents = 0;
  let deletedEnrollments = 0;
  let deletedUsers = 0;

  if (testEnrollmentIds.length > 0) {
    const enrPlaceholders = testEnrollmentIds.map(() => "?").join(",");
    const resCert = await db.run(`DELETE FROM certificates WHERE enrollment_id IN (${enrPlaceholders})`, testEnrollmentIds);
    deletedCertificates = resCert.changes;

    const resEnt = await db.run(`DELETE FROM material_entitlements WHERE enrollment_id IN (${enrPlaceholders})`, testEnrollmentIds);
    deletedEntitlements = resEnt.changes;

    const resPay = await db.run(`DELETE FROM payment_records WHERE enrollment_id IN (${enrPlaceholders})`, testEnrollmentIds);
    deletedPayments = resPay.changes;

    await db.run(`DELETE FROM attendance_records WHERE enrollment_id IN (${enrPlaceholders})`, testEnrollmentIds);

    const resEnr = await db.run(`DELETE FROM enrollments WHERE id IN (${enrPlaceholders})`, testEnrollmentIds);
    deletedEnrollments = resEnr.changes;
  }

  // Purgar eventos de integración ficticios
  const resEvt = await db.run(
    `DELETE FROM integration_events
     WHERE idempotency_key LIKE 'TEST-%'
        OR idempotency_key LIKE 'test-%'
        OR source = 'vitest'
        OR payload LIKE '%@daom-test.com%'`
  );
  deletedEvents = resEvt.changes;

  // Purgar usuarios de prueba
  if (testUserIds.length > 0) {
    const userPlaceholders = testUserIds.map(() => "?").join(",");
    await db.run(`DELETE FROM profiles WHERE user_id IN (${userPlaceholders})`, testUserIds);
    await db.run(`DELETE FROM user_auth_identities WHERE user_id IN (${userPlaceholders})`, testUserIds);
    await db.run(`DELETE FROM material_entitlements WHERE user_id IN (${userPlaceholders})`, testUserIds);
    await db.run(`DELETE FROM attendance_records WHERE user_id IN (${userPlaceholders})`, testUserIds);
    await db.run(`DELETE FROM certificates WHERE user_id IN (${userPlaceholders})`, testUserIds);
    const resUsers = await db.run(`DELETE FROM users WHERE id IN (${userPlaceholders})`, testUserIds);
    deletedUsers = resUsers.changes;
  }

  // Purgar capacitaciones de prueba
  for (const capId of testCapacitacionIds) {
    await deleteTrainingAdmin(capId);
  }

  // Comprobar administradores preservados
  const admins = await db.query<{ email: string; role: string }>(
    `SELECT email, role FROM users WHERE role = 'ADMIN'`
  );

  await recordAuditLog({
    action: "PRODUCTION_CLEANUP_EXECUTED",
    entityType: "system",
    entityId: "DAOM-LEARNING-CLEANUP",
    details: {
      purged: {
        users: deletedUsers,
        enrollments: deletedEnrollments,
        payments: deletedPayments,
        entitlements: deletedEntitlements,
        certificates: deletedCertificates,
        events: deletedEvents,
      },
      preservedAdmins: admins.map((a) => a.email),
    },
  });

  return {
    backupSummary,
    purgedCounts: {
      users: deletedUsers,
      enrollments: deletedEnrollments,
      payments: deletedPayments,
      entitlements: deletedEntitlements,
      certificates: deletedCertificates,
      events: deletedEvents,
    },
    preservedAdmins: admins.map((a) => a.email),
  };
}
