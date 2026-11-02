# Referencia de API REST — DAOM Learning

**Canario del Proyecto:** `DAOM-FORMACION-SHEET-01`  
**Versión de API:** v1  
**URL Base:** `/api`

---

## 1. Autenticación y Cabeceras

### 1.1 Sesión de Usuario (Browser / PWA)
- Cookie segura HTTP-Only: `daom_learning_session`.
- Token firmado con JWT (algoritmo HS256, expiración 7 días).

### 1.2 Integración Server-to-Server (Bot y Webhooks)
- Cabecera: `x-api-key: <BOT_API_SECRET_KEY>` o `Authorization: Bearer <BOT_API_SECRET_KEY>`.
- Cabecera de Idempotencia: `x-idempotency-key` o campo `idempotency_key` en el cuerpo JSON.

---

## 2. Endpoints de Autenticación (`/api/auth/*`)

### `POST /api/auth/register`
Registra un nuevo participante e inicia sesión automáticamente.
- **Body JSON:**
  ```json
  {
    "email": "atleta@correo.com",
    "password": "Password123!",
    "fullName": "Nombre y Apellido",
    "phone": "+54 11 1234-5678",
    "country": "AR",
    "documentId": "38123456"
  }
  ```
- **Respuestas:**
  - `201 Created`: Usuario creado exitosamente con cookie de sesión establecida.
  - `400 Bad Request`: Error de validación Zod.
  - `409 Conflict`: El correo electrónico ya se encuentra registrado.

### `POST /api/auth/login`
Autentica a un usuario y establece la cookie de sesión.
- **Body JSON:**
  ```json
  {
    "email": "admin@daom-weightlifting.com",
    "password": "DaomLearning2026!Secure"
  }
  ```
- **Respuestas:**
  - `200 OK`: Sesión iniciada con éxito.
  - `401 Unauthorized`: Credenciales inválidas.

### `POST /api/auth/logout`
Destruye la cookie de sesión activa.
- **Respuestas:**
  - `200 OK`: Sesión cerrada.

### `GET /api/auth/me`
Retorna la información del usuario autenticado en la sesión actual.
- **Respuestas:**
  - `200 OK`: Objeto con perfil y rol del usuario.
  - `401 Unauthorized`: No hay sesión activa.

---

## 3. Endpoints Operativos de Alumnos y Materiales

### `POST /api/inscripciones/crear`
Inicia el proceso de inscripción para un participante autenticado.
- **Body JSON:**
  ```json
  {
    "capacitacionId": "SEM-SQUATS",
    "ofertaId": "OFE-SQUATS-2026-01",
    "modalityId": "presencial",
    "market": "AR",
    "notes": "Comentario opcional"
  }
  ```
- **Respuestas:**
  - `201 Created`: Inscripción generada en estado `pendiente_pago`.
  - `401 Unauthorized`: El usuario debe iniciar sesión previamente.

### `GET /api/materiales/[id]/download`
Descarga segura del archivo complementario ZIP.
- **Requisitos:** Sesión autenticada + inscripción con estado `confirmada` y pago acreditado para esa capacitación.
- **Respuestas:**
  - `200 OK`: Flujo binario del archivo ZIP con encabezado `Content-Disposition: attachment; filename="material-[id].zip"`.
  - `401 Unauthorized`: Sin sesión.
  - `403 Forbidden`: Sin pago confirmado o sin autorización sobre la capacitación.

---

## 4. Endpoints de Sincronización y Mantenimiento

### `POST /api/sync/sheets`
Ejecuta la sincronización completa del catálogo desde Google Sheets.
- **Autenticación:** Requiere sesión activa de rol `ADMIN` o cabecera `Authorization: Bearer <SYNC_SECRET_TOKEN>`.
- **Respuestas:**
  - `200 OK`: Reporte de sincronización con registros procesados, advertencias y duración.
  - `401 Unauthorized`: Permisos insuficientes.
  - `500 Internal Error`: Fallo crítico durante la consulta.

---

## 5. Endpoints de Contacto

### `POST /api/contacto/enviar`
Procesa consultas públicas y solicitudes institucionales con protección Honeypot anti-spam.
- **Body:** JSON o FormData.
- **Campos:** `nombre`, `email`, `telefono`, `institucion`, `tipo_consulta`, `mensaje`, `website_url` (Honeypot invisible).
- **Respuestas:**
  - `200 OK`: Mensaje recibido y registrado en auditoría.
  - `303 See Other`: Redirección a `/contacto?enviado=1` si la petición provino de un formulario HTML clásico.
