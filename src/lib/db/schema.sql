-- ==============================================================================
-- DAOM Learning — Esquema de Base de Datos Integral
-- Canario: DAOM-FORMACION-SHEET-01
-- Motor: Compatible dual (PostgreSQL 15+ / Supabase & SQLite 3.40+)
-- ==============================================================================

-- 1. Roles del Sistema
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

INSERT OR IGNORE INTO roles (id, description) VALUES
  ('ADMIN', 'Administrador general de DAOM Learning'),
  ('PARTICIPANT', 'Estudiante y participante de capacitaciones'),
  ('STAFF', 'Personal técnico y de soporte de DAOM Weightlifting');

-- 2. Usuarios
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PARTICIPANT' REFERENCES roles(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2.1 Identidades de Autenticación Federada (H031 - Cuentas Unificadas)
CREATE TABLE IF NOT EXISTS user_auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL,
  UNIQUE(provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_user_auth_identities_user_id ON user_auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_identities_provider_subject ON user_auth_identities(provider, provider_subject);
CREATE INDEX IF NOT EXISTS idx_user_auth_identities_provider_email ON user_auth_identities(provider, provider_email);

-- 3. Perfiles de Usuario
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT,
  document_id TEXT,
  country TEXT NOT NULL DEFAULT 'AR',
  city TEXT,
  sports_background TEXT,
  instagram_handle TEXT,
  updated_at TEXT NOT NULL
);

-- 4. Modalidades de Capacitación
CREATE TABLE IF NOT EXISTS modalities (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  permite_asistencia INTEGER NOT NULL DEFAULT 0,
  permite_grabacion INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO modalities (id, nombre, descripcion, permite_asistencia, permite_grabacion) VALUES
  ('presencial', 'Presencial', 'Asistencia en sede deportiva Club DAOM, interacción directa con docentes y acceso a material complementario', 1, 1),
  ('streaming', 'Streaming en vivo', 'Transmisión interactiva en tiempo real con preguntas en vivo y acceso a material complementario', 1, 1),
  ('on_demand', 'On Demand', 'Acceso a la grabación completa del evento y material complementario (no acredita asistencia presencial ni en vivo)', 0, 1);

-- 5. Docentes (Fuente Editorial: Google Sheets)
CREATE TABLE IF NOT EXISTS instructors (
  docente_id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'DAOM',
  especialidad TEXT,
  biografia TEXT,
  fotografia_url TEXT,
  credenciales TEXT,
  estado TEXT NOT NULL DEFAULT 'activo',
  verificacion TEXT NOT NULL DEFAULT 'pendiente',
  synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instructors_verificacion ON instructors(verificacion);

-- 6. Capacitaciones (Fuente Editorial: Google Sheets)
CREATE TABLE IF NOT EXISTS trainings (
  capacitacion_id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  descripcion TEXT,
  destinatarios TEXT,
  objetivos TEXT,
  programa TEXT,
  metodologia TEXT,
  duracion TEXT,
  requisitos TEXT,
  materiales TEXT,
  certificado TEXT,
  imagen_url TEXT,
  video_url TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  destacada TEXT NOT NULL DEFAULT 'NO',
  estado_editorial TEXT NOT NULL DEFAULT 'borrador',
  verificacion TEXT NOT NULL DEFAULT 'pendiente',
  fuente_url TEXT,
  synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trainings_tipo ON trainings(tipo);
CREATE INDEX IF NOT EXISTS idx_trainings_editorial ON trainings(estado_editorial, verificacion);

-- 7. Relación Capacitaciones y Docentes
CREATE TABLE IF NOT EXISTS training_instructors (
  capacitacion_id TEXT NOT NULL REFERENCES trainings(capacitacion_id) ON DELETE CASCADE,
  docente_id TEXT NOT NULL REFERENCES instructors(docente_id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (capacitacion_id, docente_id)
);

-- 8. Ofertas y Ediciones de Capacitación (Fuente Editorial: Google Sheets)
CREATE TABLE IF NOT EXISTS training_editions (
  oferta_id TEXT PRIMARY KEY,
  capacitacion_id TEXT NOT NULL REFERENCES trainings(capacitacion_id) ON DELETE CASCADE,
  nombre_edicion TEXT NOT NULL,
  tipo_oferta TEXT NOT NULL DEFAULT 'abierta',
  fecha_inicio TEXT,
  fecha_fin TEXT,
  hora_inicio TEXT,
  hora_fin TEXT,
  zona_horaria TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  modalidades TEXT NOT NULL,
  sede TEXT DEFAULT 'Club DAOM, Av. Varela 1800, Flores, CABA',
  enlace_inscripcion TEXT,
  cupo_presencial INTEGER DEFAULT 0,
  cupo_streaming INTEGER DEFAULT 0,
  cupos_ocupados_presencial INTEGER DEFAULT 0,
  cupos_ocupados_streaming INTEGER DEFAULT 0,
  estado_comercial TEXT NOT NULL DEFAULT 'proximamente',
  estado_editorial TEXT NOT NULL DEFAULT 'borrador',
  fecha_publicacion TEXT,
  fecha_despublicacion TEXT,
  fuente_url TEXT,
  verificacion TEXT NOT NULL DEFAULT 'pendiente',
  synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_editions_capacitacion ON training_editions(capacitacion_id);
CREATE INDEX IF NOT EXISTS idx_editions_editorial ON training_editions(estado_editorial, verificacion);

-- 9. Precios por Mercado y Moneda (Fuente Editorial: Google Sheets)
CREATE TABLE IF NOT EXISTS prices (
  precio_id TEXT PRIMARY KEY,
  oferta_id TEXT NOT NULL REFERENCES training_editions(oferta_id) ON DELETE CASCADE,
  mercado TEXT NOT NULL, -- 'AR' o 'INT'
  moneda TEXT NOT NULL, -- 'ARS' o 'USD'
  precio_base NUMERIC NOT NULL,
  promocion_tipo TEXT,
  promocion_valor NUMERIC,
  promocion_inicio TEXT,
  promocion_fin TEXT,
  estado TEXT NOT NULL DEFAULT 'activo',
  verificacion TEXT NOT NULL DEFAULT 'pendiente',
  synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prices_oferta ON prices(oferta_id);

-- 10. Inscripciones (Operativo)
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capacitacion_id TEXT NOT NULL REFERENCES trainings(capacitacion_id),
  oferta_id TEXT REFERENCES training_editions(oferta_id),
  modality_id TEXT NOT NULL REFERENCES modalities(id),
  status TEXT NOT NULL DEFAULT 'pendiente_pago', -- 'pendiente_pago', 'confirmada', 'cancelada', 'reembolsada', 'en_espera'
  currency TEXT NOT NULL DEFAULT 'ARS',
  amount_total NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  modality_change_requested INTEGER NOT NULL DEFAULT 0,
  modality_change_to TEXT REFERENCES modalities(id),
  modality_change_fee NUMERIC NOT NULL DEFAULT 0,
  modality_change_status TEXT DEFAULT 'ninguno',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_capacitacion ON enrollments(capacitacion_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- 11. Registros de Pagos (Operativo)
CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  external_payment_id TEXT,
  provider TEXT NOT NULL, -- 'mercadopago', 'stripe', 'manual', 'bot'
  status TEXT NOT NULL, -- 'pending', 'approved', 'rejected', 'refunded'
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  payer_email TEXT,
  raw_payload TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payment_records(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_external ON payment_records(external_payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_external_unique ON payment_records(external_payment_id) WHERE external_payment_id IS NOT NULL;

-- 12. Activos de Material Educativo (ZIP)
CREATE TABLE IF NOT EXISTS material_assets (
  id TEXT PRIMARY KEY,
  capacitacion_id TEXT NOT NULL REFERENCES trainings(capacitacion_id) ON DELETE CASCADE,
  oferta_id TEXT REFERENCES training_editions(oferta_id),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/zip',
  storage_path TEXT NOT NULL,
  file_hash TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_materials_capacitacion ON material_assets(capacitacion_id);

-- 13. Autorizaciones de Materiales (Entitlements)
CREATE TABLE IF NOT EXISTS material_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_asset_id TEXT NOT NULL REFERENCES material_assets(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  granted_at TEXT NOT NULL,
  granted_by TEXT NOT NULL DEFAULT 'system_payment_confirmed',
  expires_at TEXT,
  revoked_at TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_download_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_user_asset ON material_entitlements(user_id, material_asset_id);

-- 14. Registro de Asistencia (Operativo - Bot / Staff)
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date TEXT NOT NULL,
  attended INTEGER NOT NULL DEFAULT 1,
  modality_attended TEXT NOT NULL DEFAULT 'presencial',
  checked_in_by TEXT NOT NULL DEFAULT 'bot',
  checked_in_at TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment ON attendance_records(enrollment_id);

-- 15. Certificados Emitidos (Operativo - Vinculados por el Bot)
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certificate_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  verification_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);

-- 16. Eventos de Integración Idempotentes (Operativo - Bot & Webhooks)
CREATE TABLE IF NOT EXISTS integration_events (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  error_message TEXT,
  processed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_key ON integration_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_events_type ON integration_events(event_type);

-- 17. Registro de Sincronizaciones (Observabilidad)
CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'google_sheets',
  status TEXT NOT NULL, -- 'success', 'partial_error', 'failed'
  records_read INTEGER NOT NULL DEFAULT 0,
  records_synced INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT,
  warnings_json TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT NOT NULL DEFAULT 'automated',
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL
);

-- 18. Registro de Auditoría (Operativo)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 19. Preguntas Frecuentes (Fuente Editorial: Google Sheets)
CREATE TABLE IF NOT EXISTS faqs (
  faq_id TEXT PRIMARY KEY,
  categoria TEXT NOT NULL,
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  capacitacion_id TEXT REFERENCES trainings(capacitacion_id) ON DELETE SET NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  estado_editorial TEXT NOT NULL DEFAULT 'borrador',
  synced_at TEXT NOT NULL
);

-- 20. Configuraciones Globales (Fuente Editorial: Google Sheets)
CREATE TABLE IF NOT EXISTS site_configs (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL DEFAULT 'texto',
  publico TEXT NOT NULL DEFAULT 'SI',
  synced_at TEXT NOT NULL
);

-- 21. Control Editorial y Auditoría de Planilla (Fuente: Google Sheets)
CREATE TABLE IF NOT EXISTS editorial_controls (
  registro_id TEXT PRIMARY KEY,
  tipo_registro TEXT NOT NULL,
  fuente_url TEXT,
  fecha_revision TEXT,
  estado_verificacion TEXT NOT NULL DEFAULT 'pendiente',
  observaciones TEXT,
  responsable TEXT,
  fecha_validacion TEXT,
  synced_at TEXT NOT NULL
);
