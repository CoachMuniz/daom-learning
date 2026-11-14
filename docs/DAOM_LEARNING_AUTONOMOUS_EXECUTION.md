# REGISTRO TÉCNICO DE EJECUCIÓN AUTÓNOMA — DAOM LEARNING + JERKSON
**Identificador:** `DAOM-LEARNING-AUTONOMOUS-FINAL-01`
**Fecha de finalización:** 14 de Noviembre de 2026
**Responsable técnico:** Google Antigravity (Ingeniería de Software, DevOps & QA)

---

## 1. ESTADO GENERAL DEL SISTEMA

Los sistemas **DAOM Learning** (`CoachMuniz/daom-learning`) y **Jerkson** (`CoachMuniz/jerkson`) han alcanzado la estabilización y homologación técnica integral para el ciclo comercial y académico 2026/2027.

- **DAOM Learning:** Operativo en Render (`https://daom-learning.onrender.com`). Rama `main` (commit `90b1355`).
- **Jerkson:** Operativo en Render (`https://jerkson-daom-agent.onrender.com`). Rama `master` (commit `25d286e`).
- **Resend:** Dominio institucional `daom-weightlifting.com` activo con firma DKIM/SPF y remitente `capacitaciones@daom-weightlifting.com`.
- **Canal WhatsApp:** Totalmente preservado y sin colisiones de configuración.

---

## 2. VERIFICACIÓN DETALLADA DE CIRCUITOS (PUNTOS A - G)

### A. Catálogo y Precios
- Sincronización continua de catálogo con Google Sheets institucional mediante `sheets-sync.ts`.
- Descuentos de preventa computados fehacientemente (20% hasta el 16/11/2026).
- Normalización matemática y monetaria probada: importes en ARS y USD calculados sin discrepancias ni inconsistencias de coma/punto.

### B. Inscripción y Modalidades
- Registro transaccional seguro con idempotencia de inscripciones.
- Soporte para tres modalidades: Presencial, Streaming y On Demand.
- Reglas de cambio de modalidad verificadas:
  - Más de 7 días previos al evento: cambio sin cargo adicional.
  - Menos de 7 días: recargo del 25% auditado por el sistema.

### C. Mercado Pago y Anti-Tampering
- Validación de firmas webhook mediante HMAC-SHA256 (`x-signature`, `x-request-id`, ts milisegundos).
- Verificación anti-tampering: validación estricta contra importe esperado (`transaction_amount == expected_amount`) y divisa (`currency_id == "ARS"`).
- Idempotencia: el webhook no procesa pagos duplicados (`status == 'approved'` registrado una sola vez).
- Pagos rechazados (`rejected` / `cancelled`): mantienen la inscripción en estado `pendiente_pago` y no desbloquean acceso ni materiales.

### D. Notificaciones y Cola de Salida (`email_outbox`)
- Cabecera nativa `Idempotency-Key: jerkson-email-${enrollment_id}-${template}` implementada en llamadas a Resend.
- Tabla transaccional `email_outbox` integrada en PostgreSQL de Render y SQLite local de pruebas.
- Reintentos exponenciales escalonados programados: +5 min, +15 min, +1 hora, +6 horas.
- Tras 5 intentos fallidos, el registro se marca como `permanently_failed` y genera un incidente en la tabla `incidents` para auditoría administrativa inmediata.
- Enlace en plantillas unificado al Portal del Alumno (`https://daom-learning.onrender.com/participante/materiales`).

### E. Autorización y Materiales
- Autorización granular en `src/lib/materials/materials-authorizer.ts`:
  - `status == 'confirmada'` → Acceso autorizado.
  - `status == 'pendiente_pago'` → HTTP 403 `PAYMENT_REQUIRED`.
  - `status == 'cancelada'` → HTTP 403 `ENROLLMENT_CANCELLED`.
  - Usuario sin inscripción → HTTP 403 `ENROLLMENT_NOT_FOUND`.
- Verificación de hash SHA-256 en archivos descargados contra el registro de base de datos.
- Materiales aún no publicados retornan HTTP 404 estructurado `MATERIAL_PENDING_PUBLICATION`.

### F. Asistencia y Validación QR
- Generación de tokens QR firmados con HMAC-SHA256 vinculados a la inscripción y fecha del curso.
- Validación en tiempo real en `/api/asistencia/checkin` evitando doble marcado y tokens falsificados.

### G. Certificaciones
- Emisión restringida: bloqueada para alumnos con pago pendiente o cursada `on_demand` sin evaluación.
- Generación de hashes únicos criptográficos para validación pública en `/validar-certificado`.

---

## 3. AUDITORÍA DE PRUEBAS AUTOMATIZADAS

### DAOM Learning (101/101 pruebas aprobadas)
- `tests/materials-real-availability.test.ts`: 4 passed
- `tests/materials-authorization-rules.test.ts`: 3 passed
- `tests/mercadopago-checkout-pro.test.ts`: 10 passed
- `tests/auth-api-routes-h031.test.ts`: 11 passed
- `tests/unified-accounts-h031.test.ts`: 6 passed
- `tests/sheets-sync.test.ts`: 11 passed
- `tests/admin-google-auth-h032.test.ts`: 5 passed
- `tests/commercial-rules-h028.test.ts`: 20 passed
- `tests/google-oauth-h031.test.ts`: 13 passed
- `tests/public-api.test.ts`: 4 passed
- `tests/database-repository.test.ts`: 4 passed
- `tests/bot-integration.test.ts`: 4 passed
- `tests/price-normalization.test.ts`: 3 passed
- `tests/security-auth.test.ts`: 3 passed

### Jerkson (24/24 pruebas aprobadas)
- `tests/jerkson-daom-learning-integration.test.ts`: 15 passed
- `tests/isolated-4-scenarios-validation.test.ts`: 3 passed
- `tests/email-outbox-recovery.test.ts`: 6 passed

---

## 4. ESTADO DE LOS SERVICIOS Y COMMITS

| Servicio | Repositorio | Rama | Commit | Estado en Producción |
| :--- | :--- | :--- | :--- | :--- |
| **Jerkson** | `CoachMuniz/jerkson` | `master` | `25d286e` | Operativo / Live en Render |
| **DAOM Learning** | `CoachMuniz/daom-learning` | `main` | `90b1355` | Operativo / Live en Render |

---

## 5. CONCLUSIÓN

El circuito técnico y comercial se encuentra verificado, cerrado y listo para operación productiva continua sin dependencias técnicas pendientes.
