# Directivas de Seguridad y Protección de Datos — DAOM Learning

**Canario del Proyecto:** `DAOM-FORMACION-SHEET-01`  
**Estándar:** OWASP ASVS Nivel 2 & Directivas de Seguridad DAOM Weightlifting  
**Estado:** Activo y Verificado

---

## 1. Principios Inviolables de Seguridad

1. **Secretos Estrictamente del Lado Servidor:** Ninguna clave privada, token de servicio ni credencial de base de datos se expone en el cliente web o en variables con prefijo `NEXT_PUBLIC_`.
2. **Cero Almacenamiento de Datos de Tarjetas:** La plataforma jamás recibe ni almacena números de tarjeta completos (PAN), códigos de seguridad (CVV) ni datos bancarios sensibles. Todas las transacciones se delegan a pasarelas certificadas PCI-DSS Nivel 1 (Mercado Pago y Stripe).
3. **Control de Acceso a Ficheros ZIP:** No existen enlaces públicos ni estáticos a los archivos de material complementario. Cada descarga se valida mediante sesión, comprobación de inscripción confirmada y pago acreditado.
4. **Idempotencia de Operaciones Externas:** Los webhooks del bot o de pasarelas de pago no pueden provocar dobles acreditaciones, mediante ledger inmutable de claves de idempotencia (`integration_events`).

---

## 2. Gestión de Identidad y Sesión

- **Hash de Contraseñas:** Se utiliza `bcryptjs` con salt de 10 rondas. Las contraseñas en texto claro nunca se guardan en logs ni en persistencia.
- **Tokens de Sesión:** Firmados mediante JSON Web Token (JWT) utilizando la librería `jose` con algoritmo simétrico HMAC-SHA256 y expiración a 7 días.
- **Cookies de Sesión:**
  - `Name`: `daom_learning_session`
  - `HttpOnly`: `true` (inaccesible desde JavaScript en el navegador, previene ataques XSS).
  - `SameSite`: `lax` (mitiga ataques Cross-Site Request Forgery - CSRF).
  - `Secure`: `true` en entornos de producción (transmisión exclusiva sobre HTTPS).
  - `Path`: `/`

---

## 3. Cabeceras HTTP de Seguridad

Configuradas globalmente en `next.config.mjs`:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (fuerza HTTPS en navegadores compatibles).
- `X-Content-Type-Options: nosniff` (previene ataques de tipo MIME sniffing).
- `X-Frame-Options: DENY` (mitiga ataques de clickjacking).
- `Referrer-Policy: origin-when-cross-origin`.
- `X-Canary-Project: DAOM-FORMACION-SHEET-01`.

---

## 4. Protección Anti-Spam y Formularios

Todos los formularios públicos (contacto y presupuesto institucional) implementan la técnica **Honeypot**:
- Se incluye un campo invisible para usuarios reales (`website_url`) con `tabIndex={-1}` y `autoComplete="off"`.
- Si un bot automatizado completa dicho campo, el servidor descarta silenciosamente la petición sin procesar envíos ni saturar el buzón de soporte.

---

## 5. Matriz de Roles y Autorizaciones (RBAC)

| Recurso / Ruta | Rol Público | Participante Autenticado | Personal Staff | Administrador (`ADMIN`) |
|---|:---:|:---:|:---:|:---:|
| Catálogo y Fichas Públicas | Lectura | Lectura | Lectura | Lectura |
| Iniciar Inscripción | — | Creación | Creación | Creación |
| Panel `/participante` | — | Solo sus datos | Solo sus datos | Acceso completo |
| Descarga de Material ZIP | — | Solo si pagó | Acceso técnico | Acceso completo |
| Consola `/admin` | Denegado (401) | Denegado (401) | Lectura | Control total |
| Sincronización Google Sheets | Denegado (401) | Denegado (401) | Denegado (401) | Ejecución permitida |
| API Integración Bot (`/api/v1/bot/*`) | Denegado | Denegado | Denegado | Solo Bot con API Key |

---

## 6. Registro de Auditoría (`audit_logs`)

Se auditan de forma persistente e inmutable los siguientes eventos críticos:
- `AUTH_LOGIN_SUCCESS` / `AUTH_LOGIN_FAILED`.
- `ENROLLMENT_CREATED` / `ENROLLMENT_STATUS_UPDATED`.
- `PAYMENT_APPROVED` / `PAYMENT_REFUNDED`.
- `MATERIAL_ENTITLEMENT_GRANTED` / `MATERIAL_DOWNLOADED`.
- `MODALITY_CHANGE_REQUESTED`.
- `SYNC_RUN_COMPLETED` / `SYNC_RUN_FAILED`.
