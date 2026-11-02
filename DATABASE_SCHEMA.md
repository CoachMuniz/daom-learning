# Especificación del Esquema de Base de Datos — DAOM Learning

**Canario del Proyecto:** `DAOM-FORMACION-SHEET-01`  
**Motor de Persistencia:** PostgreSQL 15+ (Producción / Supabase) con compatibilidad dual SQLite 3.40+ (Local / Tests).  
**Archivo de Migración SQL:** `src/lib/db/schema.sql` y `supabase/migrations/20261102000000_init_daom_learning.sql`.

---

## 1. Clasificación de Entidades

La base de datos se estructura en dos dominios claramente delimitados:

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│       TABLAS EDITORIALES             │     │       TABLAS OPERATIVAS              │
│   (Fuente: Google Sheets)            │     │   (Transacciones & Usuarios)         │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│ • instructors                        │     │ • roles                              │
│ • trainings                          │     │ • users                              │
│ • training_instructors               │     │ • profiles                           │
│ • training_editions                  │     │ • modalities                         │
│ • prices                             │     │ • enrollments                        │
│ • faqs                               │     │ • payment_records                    │
│ • site_configs                       │     │ • material_assets                    │
│ • editorial_controls                 │     │ • material_entitlements              │
│                                      │     │ • attendance_records                 │
│                                      │     │ • certificates                       │
│                                      │     │ • integration_events                 │
│                                      │     │ • sync_runs                          │
│                                      │     │ • audit_logs                         │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

## 2. Detalle de Tablas

### 2.1 Tablas Operativas y de Seguridad

#### `roles`
Catálogo de roles del sistema.
- `id` (TEXT, PK): `'ADMIN'`, `'PARTICIPANT'`, `'STAFF'`.
- `description` (TEXT, NOT NULL).

#### `users`
Cuentas de usuario registradas en la plataforma.
- `id` (TEXT, PK): Identificador único (ej: `USR-173000000-abcd`).
- `email` (TEXT, UNIQUE, NOT NULL): Correo electrónico normalizado en minúsculas.
- `password_hash` (TEXT, NOT NULL): Contraseña hasheada mediante bcrypt.
- `full_name` (TEXT, NOT NULL): Nombre y apellido del usuario.
- `role` (TEXT, NOT NULL, FK `roles.id`): Rol asignado (default `'PARTICIPANT'`).
- `is_active` (INTEGER, NOT NULL, DEFAULT 1): Indicador de cuenta activa.
- `email_verified` (INTEGER, NOT NULL, DEFAULT 0).
- `created_at`, `updated_at` (TEXT / TIMESTAMPTZ).

#### `profiles`
Información de perfil complementaria del participante.
- `user_id` (TEXT, PK, FK `users.id` ON DELETE CASCADE).
- `phone` (TEXT): Teléfono / WhatsApp de contacto.
- `document_id` (TEXT): DNI o Pasaporte.
- `country` (TEXT, NOT NULL, DEFAULT `'AR'`).
- `city` (TEXT).
- `sports_background` (TEXT): Disciplina deportiva o box de pertenencia.
- `instagram_handle` (TEXT).
- `updated_at` (TEXT / TIMESTAMPTZ).

#### `modalities`
Modalidades oficiales de cursada.
- `id` (TEXT, PK): `'presencial'`, `'streaming'`, `'on_demand'`.
- `nombre` (TEXT, NOT NULL).
- `descripcion` (TEXT, NOT NULL).
- `permite_asistencia` (INTEGER, NOT NULL): `1` para presencial y streaming; `0` para on demand.
- `permite_grabacion` (INTEGER, NOT NULL): `1` para todas las modalidades.

#### `enrollments`
Inscripciones de participantes en capacitaciones.
- `id` (TEXT, PK): Código único de inscripción (ej: `ENR-173000000-xyz`).
- `user_id` (TEXT, NOT NULL, FK `users.id` ON DELETE CASCADE).
- `capacitacion_id` (TEXT, NOT NULL, FK `trainings.capacitacion_id`).
- `oferta_id` (TEXT, FK `training_editions.oferta_id`).
- `modality_id` (TEXT, NOT NULL, FK `modalities.id`).
- `status` (TEXT, NOT NULL, DEFAULT `'pendiente_pago'`): `'pendiente_pago'`, `'confirmada'`, `'cancelada'`, `'reembolsada'`, `'en_espera'`.
- `currency` (TEXT, NOT NULL, DEFAULT `'ARS'`): `'ARS'` o `'USD'`.
- `amount_total` (NUMERIC, NOT NULL): Monto total liquidado.
- `amount_paid` (NUMERIC, NOT NULL, DEFAULT 0): Monto efectivamente acreditado.
- `payment_method` (TEXT): `'mercadopago'`, `'stripe'`, `'transferencia'`, etc.
- `notes` (TEXT).
- `modality_change_requested` (INTEGER, DEFAULT 0): Bandera de solicitud de cambio.
- `modality_change_to` (TEXT, FK `modalities.id`).
- `modality_change_fee` (NUMERIC, DEFAULT 0): Recargo aplicado (0% o 25%).
- `modality_change_status` (TEXT, DEFAULT `'ninguno'`).
- `created_at`, `updated_at` (TEXT / TIMESTAMPTZ).

#### `payment_records`
Registros individuales de transacciones de pago.
- `id` (TEXT, PK).
- `enrollment_id` (TEXT, NOT NULL, FK `enrollments.id` ON DELETE CASCADE).
- `external_payment_id` (TEXT): Identificador devuelto por Mercado Pago / Stripe.
- `provider` (TEXT, NOT NULL): `'mercadopago'`, `'stripe'`, `'manual'`, `'bot'`.
- `status` (TEXT, NOT NULL): `'pending'`, `'approved'`, `'rejected'`, `'refunded'`.
- `amount` (NUMERIC, NOT NULL).
- `currency` (TEXT, NOT NULL).
- `payer_email` (TEXT).
- `raw_payload` (TEXT / JSONB): Payload crudo de la notificación para auditoría.
- `created_at` (TEXT / TIMESTAMPTZ).

#### `material_assets`
Ficheros y materiales didácticos vinculados a las capacitaciones.
- `id` (TEXT, PK): ej: `MAT-SEM-SQUATS`.
- `capacitacion_id` (TEXT, NOT NULL, FK `trainings.capacitacion_id` ON DELETE CASCADE).
- `oferta_id` (TEXT, FK `training_editions.oferta_id`).
- `title` (TEXT, NOT NULL): Título del material (ej: "Material Complementario Squats").
- `file_name` (TEXT, NOT NULL): Nombre del archivo (ej: `material-sem-squats.zip`).
- `file_size_bytes` (INTEGER / BIGINT, DEFAULT 0).
- `mime_type` (TEXT, DEFAULT `'application/zip'`).
- `storage_path` (TEXT, NOT NULL): Ruta en almacenamiento seguro.
- `file_hash` (TEXT): Hash SHA-256 para verificación de integridad.
- `version` (TEXT, DEFAULT `'1.0'`).
- `is_active` (INTEGER, DEFAULT 1).
- `created_at` (TEXT / TIMESTAMPTZ).

#### `material_entitlements`
Permisos de acceso individuales para la descarga del material complementario.
- `id` (TEXT, PK): Clave única compuesta (ej: `ENT-USR-123-MAT-SEM-SQUATS`).
- `user_id` (TEXT, NOT NULL, FK `users.id` ON DELETE CASCADE).
- `material_asset_id` (TEXT, NOT NULL, FK `material_assets.id` ON DELETE CASCADE).
- `enrollment_id` (TEXT, NOT NULL, FK `enrollments.id` ON DELETE CASCADE).
- `is_revoked` (INTEGER, DEFAULT 0).
- `granted_at` (TEXT / TIMESTAMPTZ, NOT NULL): Fecha de concesión del permiso.
- `granted_by` (TEXT, DEFAULT `'system_payment_confirmed'`).
- `expires_at` (TEXT / TIMESTAMPTZ).
- `revoked_at` (TEXT / TIMESTAMPTZ).
- `download_count` (INTEGER, DEFAULT 0): Contador de descargas efectuadas.
- `last_download_at` (TEXT / TIMESTAMPTZ).

#### `attendance_records`
Registro de asistencia a jornadas presenciales o transmisiones en vivo.
- `id` (TEXT, PK).
- `enrollment_id` (TEXT, NOT NULL, FK `enrollments.id` ON DELETE CASCADE).
- `user_id` (TEXT, NOT NULL, FK `users.id` ON DELETE CASCADE).
- `session_date` (TEXT, NOT NULL): Formato YYYY-MM-DD.
- `attended` (INTEGER, DEFAULT 1).
- `modality_attended` (TEXT, DEFAULT `'presencial'`).
- `checked_in_by` (TEXT, DEFAULT `'bot'`).
- `checked_in_at` (TEXT / TIMESTAMPTZ).
- `notes` (TEXT).

#### `certificates`
Certificados oficiales emitidos y vinculados por el bot.
- `id` (TEXT, PK).
- `enrollment_id` (TEXT, NOT NULL, FK `enrollments.id` ON DELETE CASCADE).
- `user_id` (TEXT, NOT NULL, FK `users.id` ON DELETE CASCADE).
- `certificate_code` (TEXT, UNIQUE, NOT NULL): Código verificable del diploma.
- `title` (TEXT, NOT NULL).
- `issue_date` (TEXT, NOT NULL): Formato YYYY-MM-DD.
- `pdf_url` (TEXT, NOT NULL): Enlace público o firmado al archivo PDF.
- `verification_hash` (TEXT): Hash de verificación criptográfica.
- `created_at` (TEXT / TIMESTAMPTZ).

#### `integration_events`
Ledger inmutable para idempotencia y registro de webhooks del bot.
- `id` (TEXT, PK).
- `idempotency_key` (TEXT, UNIQUE, NOT NULL): Clave de idempotencia única.
- `event_type` (TEXT, NOT NULL): `'payment.confirmed'`, `'attendance.recorded'`, etc.
- `source` (TEXT, NOT NULL): `'bot'`, `'payment_gateway'`, `'admin_manual'`.
- `payload` (TEXT / JSONB, NOT NULL): Contenido completo de la solicitud.
- `status` (TEXT, DEFAULT `'processed'`): `'processed'`, `'failed'`, `'ignored'`.
- `error_message` (TEXT).
- `processed_at`, `created_at` (TEXT / TIMESTAMPTZ).

#### `sync_runs`
Historial de ejecuciones del servicio de sincronización de Google Sheets.
- `id` (TEXT, PK).
- `source` (TEXT, DEFAULT `'google_sheets'`).
- `status` (TEXT, NOT NULL): `'success'`, `'partial_error'`, `'failed'`.
- `records_read`, `records_synced`, `records_skipped` (INTEGER, DEFAULT 0).
- `errors_json`, `warnings_json` (TEXT / JSONB).
- `duration_ms` (INTEGER).
- `triggered_by` (TEXT): Identidad de quien ejecutó la sincronización.
- `started_at`, `completed_at` (TEXT / TIMESTAMPTZ).

#### `audit_logs`
Bitácora de eventos sensibles para seguridad y cumplimiento.
- `id` (TEXT, PK).
- `user_id` (TEXT).
- `action` (TEXT, NOT NULL): Acción efectuada (ej: `'MATERIAL_DOWNLOADED'`).
- `entity_type`, `entity_id` (TEXT, NOT NULL).
- `details` (TEXT / JSONB).
- `ip_address` (TEXT).
- `created_at` (TEXT / TIMESTAMPTZ).

---

### 2.2 Tablas Editoriales (Sincronizadas desde Google Sheets)

#### `trainings`
Catálogo de capacitaciones.
- `capacitacion_id` (TEXT, PK): Clave alfanumérica única (ej: `SEM-SQUATS`).
- `tipo` (TEXT, NOT NULL): `'seminario'`, `'clinica'`, `'workshop'`, `'tutorial'`, `'curso'`.
- `titulo` (TEXT, NOT NULL).
- `subtitulo`, `descripcion`, `destinatarios`, `objetivos`, `programa`, `metodologia`, `duracion`, `requisitos`, `materiales`, `certificado`, `imagen_url`, `video_url` (TEXT).
- `orden` (INTEGER, DEFAULT 0).
- `destacada` (TEXT, DEFAULT `'NO'`).
- `estado_editorial` (TEXT, NOT NULL, DEFAULT `'borrador'`): `'borrador'`, `'publicado'`, `'archivado'`.
- `verificacion` (TEXT, NOT NULL, DEFAULT `'pendiente'`): `'pendiente'`, `'verificado'`, `'rechazado'`.
- `fuente_url` (TEXT).
- `synced_at` (TEXT / TIMESTAMPTZ).

#### `instructors`
Perfiles docentes.
- `docente_id` (TEXT, PK): ej: `DOC-MUNIZ`.
- `nombre` (TEXT, NOT NULL).
- `tipo` (TEXT, DEFAULT `'DAOM'`).
- `especialidad`, `biografia`, `fotografia_url`, `credenciales` (TEXT).
- `estado` (TEXT, DEFAULT `'activo'`).
- `verificacion` (TEXT, DEFAULT `'pendiente'`).
- `synced_at` (TEXT / TIMESTAMPTZ).

#### `training_instructors`
Relación N:M entre capacitaciones y docentes.
- `capacitacion_id` (TEXT, NOT NULL, FK `trainings.capacitacion_id` ON DELETE CASCADE).
- `docente_id` (TEXT, NOT NULL, FK `instructors.docente_id` ON DELETE CASCADE).
- `orden` (INTEGER, DEFAULT 0).
- `PRIMARY KEY (capacitacion_id, docente_id)`.

#### `training_editions`
Ediciones o convocatorias puntuales.
- `oferta_id` (TEXT, PK): ej: `OFE-SQUATS-2026-01`.
- `capacitacion_id` (TEXT, NOT NULL, FK `trainings.capacitacion_id` ON DELETE CASCADE).
- `nombre_edicion` (TEXT, NOT NULL).
- `tipo_oferta` (TEXT, DEFAULT `'abierta'`).
- `fecha_inicio`, `fecha_fin`, `hora_inicio`, `hora_fin` (TEXT).
- `zona_horaria` (TEXT, DEFAULT `'America/Argentina/Buenos_Aires'`).
- `modalidades` (TEXT, NOT NULL).
- `sede` (TEXT).
- `cupo_presencial`, `cupo_streaming` (INTEGER, DEFAULT 0).
- `cupos_ocupados_presencial`, `cupos_ocupados_streaming` (INTEGER, DEFAULT 0).
- `estado_comercial` (TEXT, DEFAULT `'proximamente'`).
- `estado_editorial` (TEXT, DEFAULT `'borrador'`).
- `verificacion` (TEXT, DEFAULT `'pendiente'`).
- `synced_at` (TEXT / TIMESTAMPTZ).

#### `prices`
Estructura tarifaria por mercado y moneda.
- `precio_id` (TEXT, PK).
- `oferta_id` (TEXT, NOT NULL, FK `training_editions.oferta_id` ON DELETE CASCADE).
- `mercado` (TEXT, NOT NULL): `'AR'` o `'INT'`.
- `moneda` (TEXT, NOT NULL): `'ARS'` o `'USD'`.
- `precio_base` (NUMERIC, NOT NULL).
- `promocion_tipo`, `promocion_valor`, `promocion_inicio`, `promocion_fin` (TEXT / NUMERIC).
- `estado` (TEXT, DEFAULT `'activo'`).
- `verificacion` (TEXT, DEFAULT `'pendiente'`).
- `synced_at` (TEXT / TIMESTAMPTZ).

#### `faqs`
Preguntas frecuentes sincronizadas.
- `faq_id` (TEXT, PK).
- `categoria`, `pregunta`, `respuesta` (TEXT, NOT NULL).
- `capacitacion_id` (TEXT, FK `trainings.capacitacion_id` ON DELETE SET NULL).
- `orden` (INTEGER, DEFAULT 0).
- `estado_editorial` (TEXT, DEFAULT `'borrador'`).
- `synced_at` (TEXT / TIMESTAMPTZ).

#### `site_configs`
Configuraciones globales del ecosistema formativo.
- `clave` (TEXT, PK): ej: `zona_horaria`, `plazo_espera_horas`, `recargo_cambio_tardio_pct`.
- `valor`, `descripcion`, `tipo`, `publico` (TEXT).
- `synced_at` (TEXT / TIMESTAMPTZ).

#### `editorial_controls`
Auditoría y observaciones directas de la planilla.
- `registro_id` (TEXT, PK).
- `tipo_registro` (TEXT, NOT NULL).
- `fuente_url`, `fecha_revision`, `estado_verificacion`, `observaciones`, `responsable`, `fecha_validacion` (TEXT).
- `synced_at` (TEXT / TIMESTAMPTZ).

---

## 3. Seguridad a Nivel de Fila (RLS) en Supabase

En entornos PostgreSQL alojados en Supabase, las siguientes políticas están activas:
```sql
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_trainings_read ON public.trainings
  FOR SELECT USING (estado_editorial = 'publicado' AND verificacion = 'verificado');

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_enrollments_read ON public.enrollments
  FOR SELECT USING (auth.uid()::text = user_id);

ALTER TABLE public.material_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_materials_read ON public.material_entitlements
  FOR SELECT USING (auth.uid()::text = user_id AND is_revoked = 0);
```

---

## 4. Estrategia de Copias de Seguridad (Backups)

1. **Backups Automáticos del Proveedor:** En Supabase o Render PostgreSQL, los respaldos físicos diarios se encuentran activados por defecto con retención de 7 a 30 días.
2. **Respaldo Local SQLite:** Si se utiliza SQLite para entornos de contingencia, el fichero `./data/daom_learning.db` se respalda automáticamente copiando el archivo principal y su log WAL mediante el comando `VACUUM INTO 'backup.db'`.
3. **Reconstrucción Inmediata del Catálogo:** Como los datos editoriales residen en Google Sheets, ante cualquier eventualidad de pérdida catastrófica de infraestructura, la ejecución de `npm run db:seed` o `npm run sync` reconstituye el 100% de la oferta académica en menos de 5 segundos.
