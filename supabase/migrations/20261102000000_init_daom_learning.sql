-- ==============================================================================
-- DAOM Learning — Migración Inicial PostgreSQL / Supabase
-- Canario: DAOM-FORMACION-SHEET-01
-- ==============================================================================

-- 1. Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

INSERT INTO public.roles (id, description) VALUES
  ('ADMIN', 'Administrador general de DAOM Learning'),
  ('PARTICIPANT', 'Estudiante y participante de capacitaciones'),
  ('STAFF', 'Personal técnico y de soporte de DAOM Weightlifting')
ON CONFLICT (id) DO NOTHING;

-- 2. Usuarios
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PARTICIPANT' REFERENCES public.roles(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 3. Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT,
  document_id TEXT,
  country TEXT NOT NULL DEFAULT 'AR',
  city TEXT,
  sports_background TEXT,
  instagram_handle TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Modalidades
CREATE TABLE IF NOT EXISTS public.modalities (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  permite_asistencia INTEGER NOT NULL DEFAULT 0,
  permite_grabacion INTEGER NOT NULL DEFAULT 1
);

INSERT INTO public.modalities (id, nombre, descripcion, permite_asistencia, permite_grabacion) VALUES
  ('presencial', 'Presencial', 'Asistencia en sede deportiva Club DAOM, interacción directa con docentes y acceso a material complementario', 1, 1),
  ('streaming', 'Streaming en vivo', 'Transmisión interactiva en tiempo real con preguntas en vivo y acceso a material complementario', 1, 1),
  ('on_demand', 'On Demand', 'Acceso a la grabación completa del evento y material complementario (no acredita asistencia presencial ni en vivo)', 0, 1)
ON CONFLICT (id) DO NOTHING;

-- 5. Docentes
CREATE TABLE IF NOT EXISTS public.instructors (
  docente_id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'DAOM',
  especialidad TEXT,
  biografia TEXT,
  fotografia_url TEXT,
  credenciales TEXT,
  estado TEXT NOT NULL DEFAULT 'activo',
  verificacion TEXT NOT NULL DEFAULT 'pendiente',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instructors_verificacion ON public.instructors(verificacion);

-- 6. Capacitaciones
CREATE TABLE IF NOT EXISTS public.trainings (
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
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainings_tipo ON public.trainings(tipo);
CREATE INDEX IF NOT EXISTS idx_trainings_editorial ON public.trainings(estado_editorial, verificacion);

-- 7. Relación Capacitaciones y Docentes
CREATE TABLE IF NOT EXISTS public.training_instructors (
  capacitacion_id TEXT NOT NULL REFERENCES public.trainings(capacitacion_id) ON DELETE CASCADE,
  docente_id TEXT NOT NULL REFERENCES public.instructors(docente_id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (capacitacion_id, docente_id)
);

-- 8. Ofertas / Ediciones
CREATE TABLE IF NOT EXISTS public.training_editions (
  oferta_id TEXT PRIMARY KEY,
  capacitacion_id TEXT NOT NULL REFERENCES public.trainings(capacitacion_id) ON DELETE CASCADE,
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
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editions_capacitacion ON public.training_editions(capacitacion_id);
CREATE INDEX IF NOT EXISTS idx_editions_editorial ON public.training_editions(estado_editorial, verificacion);

-- 9. Precios
CREATE TABLE IF NOT EXISTS public.prices (
  precio_id TEXT PRIMARY KEY,
  oferta_id TEXT NOT NULL REFERENCES public.training_editions(oferta_id) ON DELETE CASCADE,
  mercado TEXT NOT NULL,
  moneda TEXT NOT NULL,
  precio_base NUMERIC NOT NULL,
  promocion_tipo TEXT,
  promocion_valor NUMERIC,
  promocion_inicio TEXT,
  promocion_fin TEXT,
  estado TEXT NOT NULL DEFAULT 'activo',
  verificacion TEXT NOT NULL DEFAULT 'pendiente',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prices_oferta ON public.prices(oferta_id);

-- 10. Inscripciones
CREATE TABLE IF NOT EXISTS public.enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  capacitacion_id TEXT NOT NULL REFERENCES public.trainings(capacitacion_id),
  oferta_id TEXT REFERENCES public.training_editions(oferta_id),
  modality_id TEXT NOT NULL REFERENCES public.modalities(id),
  status TEXT NOT NULL DEFAULT 'pendiente_pago',
  currency TEXT NOT NULL DEFAULT 'ARS',
  amount_total NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  modality_change_requested INTEGER NOT NULL DEFAULT 0,
  modality_change_to TEXT REFERENCES public.modalities(id),
  modality_change_fee NUMERIC NOT NULL DEFAULT 0,
  modality_change_status TEXT DEFAULT 'ninguno',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_capacitacion ON public.enrollments(capacitacion_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);

-- 11. Pagos
CREATE TABLE IF NOT EXISTS public.payment_records (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  external_payment_id TEXT,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  payer_email TEXT,
  raw_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON public.payment_records(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_external ON public.payment_records(external_payment_id);

-- 12. Activos de Material (ZIP)
CREATE TABLE IF NOT EXISTS public.material_assets (
  id TEXT PRIMARY KEY,
  capacitacion_id TEXT NOT NULL REFERENCES public.trainings(capacitacion_id) ON DELETE CASCADE,
  oferta_id TEXT REFERENCES public.training_editions(oferta_id),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/zip',
  storage_path TEXT NOT NULL,
  file_hash TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_capacitacion ON public.material_assets(capacitacion_id);

-- 13. Autorizaciones de Materiales (Entitlements)
CREATE TABLE IF NOT EXISTS public.material_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  material_asset_id TEXT NOT NULL REFERENCES public.material_assets(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by TEXT NOT NULL DEFAULT 'system_payment_confirmed',
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_download_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_user_asset ON public.material_entitlements(user_id, material_asset_id);

-- 14. Registro de Asistencia
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_date TEXT NOT NULL,
  attended INTEGER NOT NULL DEFAULT 1,
  modality_attended TEXT NOT NULL DEFAULT 'presencial',
  checked_in_by TEXT NOT NULL DEFAULT 'bot',
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_attendance_user ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment ON public.attendance_records(enrollment_id);

-- 15. Certificados Emitidos
CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  certificate_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  verification_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code);

-- 16. Eventos de Integración Idempotentes
CREATE TABLE IF NOT EXISTS public.integration_events (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  error_message TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_key ON public.integration_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.integration_events(event_type);

-- 17. Registro de Sincronizaciones (Observabilidad)
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'google_sheets',
  status TEXT NOT NULL,
  records_read INTEGER NOT NULL DEFAULT 0,
  records_synced INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  errors_json JSONB,
  warnings_json JSONB,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT NOT NULL DEFAULT 'automated',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);

-- 19. Preguntas Frecuentes
CREATE TABLE IF NOT EXISTS public.faqs (
  faq_id TEXT PRIMARY KEY,
  categoria TEXT NOT NULL,
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  capacitacion_id TEXT REFERENCES public.trainings(capacitacion_id) ON DELETE SET NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  estado_editorial TEXT NOT NULL DEFAULT 'borrador',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Configuraciones Globales
CREATE TABLE IF NOT EXISTS public.site_configs (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL DEFAULT 'texto',
  publico TEXT NOT NULL DEFAULT 'SI',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Control Editorial
CREATE TABLE IF NOT EXISTS public.editorial_controls (
  registro_id TEXT PRIMARY KEY,
  tipo_registro TEXT NOT NULL,
  fuente_url TEXT,
  fecha_revision TEXT,
  estado_verificacion TEXT NOT NULL DEFAULT 'pendiente',
  observaciones TEXT,
  responsable TEXT,
  fecha_validacion TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Catálogo público: solo registros verificados y publicados
CREATE POLICY public_trainings_read ON public.trainings
  FOR SELECT USING (estado_editorial = 'publicado' AND verificacion = 'verificado');

CREATE POLICY public_instructors_read ON public.instructors
  FOR SELECT USING (estado = 'activo' AND verificacion = 'verificado');

CREATE POLICY public_editions_read ON public.training_editions
  FOR SELECT USING (estado_editorial = 'publicado' AND verificacion = 'verificado');

CREATE POLICY public_prices_read ON public.prices
  FOR SELECT USING (estado = 'activo' AND verificacion = 'verificado');

-- Inscripciones privadas: solo el propio usuario o staff/admin
CREATE POLICY user_enrollments_read ON public.enrollments
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY user_materials_read ON public.material_entitlements
  FOR SELECT USING (auth.uid()::text = user_id AND is_revoked = 0);

CREATE POLICY user_certificates_read ON public.certificates
  FOR SELECT USING (auth.uid()::text = user_id);
