/**
 * DAOM Learning — Modelos y Tipos TypeScript
 * Canario: DAOM-FORMACION-SHEET-01
 */

export type EditorialStatus = "borrador" | "publicado" | "archivado";
export type VerificationStatus = "pendiente" | "verificado" | "rechazado";
export type CommercialStatus = "abierta" | "cerrada" | "agotada" | "proximamente";
export type MarketType = "AR" | "INT";
export type CurrencyType = "ARS" | "USD";
export type ModalityId = "presencial" | "streaming" | "on_demand";

export interface Instructor {
  docente_id: string;
  nombre: string;
  tipo: string;
  especialidad?: string | null;
  biografia?: string | null;
  fotografia_url?: string | null;
  credenciales?: string | null;
  estado: "activo" | "inactivo";
  verificacion: VerificationStatus;
  synced_at: string;
}

export interface Training {
  capacitacion_id: string;
  tipo: "seminario" | "clinica" | "workshop" | "tutorial" | "curso";
  titulo: string;
  subtitulo?: string | null;
  descripcion?: string | null;
  destinatarios?: string | null;
  objetivos?: string | null;
  programa?: string | null;
  metodologia?: string | null;
  duracion?: string | null;
  requisitos?: string | null;
  materiales?: string | null;
  certificado?: string | null;
  imagen_url?: string | null;
  video_url?: string | null;
  orden: number;
  destacada: "SI" | "NO";
  estado_editorial: EditorialStatus;
  verificacion: VerificationStatus;
  fuente_url?: string | null;
  synced_at: string;
  // Relaciones hidratadas
  docentes?: Instructor[];
  ediciones?: TrainingEdition[];
}

export interface TrainingEdition {
  oferta_id: string;
  capacitacion_id: string;
  nombre_edicion: string;
  tipo_oferta: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  zona_horaria: string;
  modalidades: string; // ej: "presencial, streaming, on_demand"
  sede?: string | null;
  enlace_inscripcion?: string | null;
  cupo_presencial: number;
  cupo_streaming: number;
  cupos_ocupados_presencial: number;
  cupos_ocupados_streaming: number;
  estado_comercial: CommercialStatus;
  estado_editorial: EditorialStatus;
  fecha_publicacion?: string | null;
  fecha_despublicacion?: string | null;
  fuente_url?: string | null;
  verificacion: VerificationStatus;
  synced_at: string;
  precios?: Price[];
  streaming_platform?: string | null;
  streaming_url?: string | null;
  streaming_password?: string | null;
  streaming_instructions?: string | null;
  vimeo_video_id?: string | null;
  vimeo_url?: string | null;
  recording_available_at?: string | null;
  recording_status?: "pending" | "available" | "expired" | string | null;
  whatsapp_group_url?: string | null;
}

export interface Price {
  precio_id: string;
  oferta_id: string;
  mercado: MarketType;
  moneda: CurrencyType;
  precio_base: number;
  promocion_tipo?: string | null;
  promocion_valor?: number | null;
  promocion_inicio?: string | null;
  promocion_fin?: string | null;
  estado: string;
  verificacion: VerificationStatus;
  synced_at: string;
}

export interface Modality {
  id: ModalityId;
  nombre: string;
  descripcion: string;
  permite_asistencia: number;
  permite_grabacion: number;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: "ADMIN" | "PARTICIPANT" | "STAFF";
  is_active: number;
  email_verified: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Profile {
  user_id: string;
  phone?: string | null;
  document_id?: string | null;
  country: string;
  city?: string | null;
  sports_background?: string | null;
  instagram_handle?: string | null;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  capacitacion_id: string;
  oferta_id?: string | null;
  modality_id: ModalityId;
  status: "pendiente_pago" | "confirmada" | "cancelada" | "reembolsada" | "en_espera";
  currency: CurrencyType;
  amount_total: number;
  amount_paid: number;
  payment_method?: string | null;
  notes?: string | null;
  modality_change_requested: number;
  modality_change_to?: ModalityId | null;
  modality_change_fee: number;
  modality_change_status?: "ninguno" | "pendiente_aprobacion" | "aprobado" | "rechazado";
  revocation_status?: string | null;
  qr_token?: string | null;
  created_at: string;
  updated_at: string;
  training?: Training;
  edition?: TrainingEdition;
  user?: User;
}

export interface PaymentRecord {
  id: string;
  enrollment_id: string;
  external_payment_id?: string | null;
  provider: "mercadopago" | "stripe" | "manual" | "bot";
  status: "pending" | "approved" | "rejected" | "refunded";
  amount: number;
  currency: CurrencyType;
  payer_email?: string | null;
  raw_payload?: string | null;
  created_at: string;
}

export interface MaterialAsset {
  id: string;
  capacitacion_id: string;
  oferta_id?: string | null;
  title: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  storage_path: string;
  file_hash?: string | null;
  version: string;
  is_active: number;
  created_at: string;
}

export interface MaterialEntitlement {
  id: string;
  user_id: string;
  material_asset_id: string;
  enrollment_id: string;
  is_revoked: number;
  granted_at: string;
  granted_by: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  download_count: number;
  last_download_at?: string | null;
  asset?: MaterialAsset;
}

export interface AttendanceRecord {
  id: string;
  enrollment_id: string;
  user_id: string;
  session_date: string;
  attended: number;
  modality_attended: string;
  checked_in_by: string;
  checked_in_at: string;
  notes?: string | null;
}

export interface Certificate {
  id: string;
  enrollment_id: string;
  user_id: string;
  certificate_code: string;
  title: string;
  issue_date: string;
  pdf_url: string;
  verification_hash?: string | null;
  created_at: string;
}

export interface IntegrationEvent {
  id: string;
  idempotency_key: string;
  event_type:
    | "enrollment.created"
    | "payment.approved"
    | "payment.confirmed"
    | "payment.refunded"
    | "enrollment.status_updated"
    | "materials.authorized"
    | "attendance.recorded"
    | "attendance.confirmed"
    | "certificate.linked"
    | "certificate.ready"
    | "modality_change.requested"
    | "recording.available";
  source: "bot" | "payment_gateway" | "admin_manual" | "system";
  payload: string;
  status: "processed" | "failed" | "ignored" | "pending";
  error_message?: string | null;
  processed_at: string;
  created_at: string;
}

export interface SyncRun {
  id: string;
  source: string;
  status: "success" | "partial_error" | "failed";
  records_read: number;
  records_synced: number;
  records_skipped: number;
  errors_json?: string | null;
  warnings_json?: string | null;
  duration_ms: number;
  triggered_by: string;
  started_at: string;
  completed_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface FAQ {
  faq_id: string;
  categoria: string;
  pregunta: string;
  respuesta: string;
  capacitacion_id?: string | null;
  orden: number;
  estado_editorial: EditorialStatus;
  synced_at: string;
}

export interface SiteConfig {
  clave: string;
  valor: string;
  descripcion?: string | null;
  tipo: string;
  publico: string;
  synced_at: string;
}

export interface EditorialControl {
  registro_id: string;
  tipo_registro: string;
  fuente_url?: string | null;
  fecha_revision?: string | null;
  estado_verificacion: VerificationStatus;
  observaciones?: string | null;
  responsable?: string | null;
  fecha_validacion?: string | null;
  synced_at: string;
}
