import { z } from "zod";

export const PaymentConfirmSchema = z.object({
  idempotency_key: z.string().min(8),
  enrollment_id: z.string().min(3),
  external_payment_id: z.string().optional(),
  provider: z.enum(["mercadopago", "stripe", "manual", "bot"]),
  amount: z.number().positive(),
  currency: z.enum(["ARS", "USD"]),
  payer_email: z.string().email().optional(),
  notes: z.string().optional(),
});

export const EnrollmentStatusSchema = z.object({
  idempotency_key: z.string().min(8),
  enrollment_id: z.string().min(3),
  status: z.enum(["pendiente_pago", "confirmada", "cancelada", "reembolsada", "en_espera"]),
  notes: z.string().optional(),
});

export const MaterialAuthorizeSchema = z.object({
  idempotency_key: z.string().min(8),
  user_id: z.string().min(3),
  training_id: z.string().min(3),
  enrollment_id: z.string().min(3),
  expires_at: z.string().datetime().optional(),
});

export const AttendanceRecordSchema = z.object({
  idempotency_key: z.string().min(8),
  enrollment_id: z.string().min(3),
  user_id: z.string().min(3),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato requerido: YYYY-MM-DD"),
  attended: z.boolean().default(true),
  modality_attended: z.enum(["presencial", "streaming"]).default("presencial"),
  checked_in_by: z.string().default("bot"),
  notes: z.string().optional(),
});

export const CertificateLinkSchema = z.object({
  idempotency_key: z.string().min(8),
  enrollment_id: z.string().min(3),
  user_id: z.string().min(3),
  certificate_code: z.string().min(5),
  title: z.string().min(3),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato requerido: YYYY-MM-DD"),
  pdf_url: z.string().url(),
  verification_hash: z.string().optional(),
});

export const ModalityChangeRequestSchema = z.object({
  idempotency_key: z.string().min(8),
  enrollment_id: z.string().min(3),
  requested_modality: z.enum(["presencial", "streaming", "on_demand"]),
  reason: z.string().optional(),
});
