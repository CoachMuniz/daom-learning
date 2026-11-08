# DAOM Learning — H031: Google Login, Registro Social y Cuentas Unificadas
**Identificador:** `DAOM-LEARNING-H031`  
**Canario:** `DAOM-LEARNING-H031-COMPLETE`  
**Estado:** IMPLEMENTADO Y CERTIFICADO  
**Fecha:** Noviembre 2026  
**Ecosistema:** DAOM Web (`www.daom-weightlifting.com`) + DAOM Learning (`daom-learning.onrender.com`)

---

## 1. Resumen Ejecutivo y Misión H031

El objetivo de **H031** fue implementar el inicio de sesión y registro con **Google OAuth 2.0 + OpenID Connect** como método principal de acceso en el ecosistema **DAOM Learning**, manteniendo disponible el acceso tradicional mediante correo electrónico y contraseña.

Se estableció un modelo de **identidad institucional única por alumno**: independientemente del método de acceso (Google o credenciales tradicionales), el alumno accede a su mismo perfil, conservando intactas todas sus inscripciones, pagos acreditados, materiales didácticos ZIP, videotecas Vimeo y certificados oficiales.

---

## 2. Arquitectura de Cuentas Unificadas e Identidades Federadas

Se diseñó e implementó la separación estricta entre el **Usuario Institucional** y las **Identidades de Autenticación**:

```
+-------------------------------------------------------------+
|                  USUARIO INSTITUCIONAL                      |
|                  (Tabla `users`)                            |
|  - id: USR-...                                              |
|  - email: alumno@correo.com                                 |
|  - full_name: Atleta Federado                               |
|  - role: PARTICIPANT | ADMIN | STAFF                        |
|  - is_active: 1                                             |
+-------------------------------------------------------------+
                              |
       +----------------------+----------------------+
       | 1..*                                        | 0..1
+-------------------------------+       +-------------------------------+
|  IDENTIDAD FEDERADA OAUTH     |       |  CREDENCIALES TRADICIONALES   |
|  (Tabla `user_auth_identities`)|       |  (`password_hash` en `users`)  |
|  - provider: "google"         |       |  - Bcrypt 10 rounds           |
|  - provider_subject: sub Google|      |  - Inicio con email + clave   |
|  - provider_email: email      |       +-------------------------------+
|  - last_login_at: ISO8601     |
+-------------------------------+
```

### Tabla `user_auth_identities`
```sql
CREATE TABLE IF NOT EXISTS user_auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_learning_provider_subject UNIQUE (provider, provider_subject)
);

CREATE INDEX idx_user_auth_identities_user_id ON user_auth_identities(user_id);
CREATE INDEX idx_user_auth_identities_provider_subject ON user_auth_identities(provider, provider_subject);
CREATE INDEX idx_user_auth_identities_provider_email ON user_auth_identities(provider, provider_email);
```

---

## 3. Flujo de Autenticación Google OAuth 2.0 + OpenID Connect

El flujo cumple estrictamente con el estándar **OAuth 2.0 Authorization Code**:

1. **Iniciación (`/api/auth/google`)**:
   - Comprueba si `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` están presentes. Si no lo están, reporta de forma segura `google_oauth_pending_configuration` sin colapsar el sistema.
   - Genera un parámetro `state` criptográfico firmado con HMAC SHA-256 conteniendo `nonce`, `timestamp` y `redirectPath`.
   - Redirige al consent screen oficial de Google con los scopes mínimos necesarios: `openid email profile`.

2. **Canje y Verificación (`/api/auth/google/callback`)**:
   - Valida la integridad y frescura temporal del `state` (< 15 min) para mitigar CSRF.
   - Si Google reporta `error=access_denied`, redirige amigablemente con aviso de cancelación.
   - Canjea el `code` por tokens de Google en `https://oauth2.googleapis.com/token`.
   - Consulta el perfil mediante el endpoint `https://www.googleapis.com/oauth2/v3/userinfo`.
   - **Regla estricta de seguridad:** Si `email_verified !== true`, rechaza el acceso con `unverified_google_email`.

3. **Resolución de Identidad:**
   - **Caso A (Identidad Google ya vinculada):** Busca en `user_auth_identities` por `provider = 'google'` y `provider_subject = userInfo.sub`. Actualiza `last_login_at`, inicia sesión institucional y redirige al alumno a su destino.
   - **Caso B (Usuario nuevo):** Crea el registro institucional en `users` con rol `PARTICIPANT`, crea su perfil en `profiles`, vincula su identidad Google en `user_auth_identities`, emite la cookie de sesión `daom_learning_session` y redirige.
   - **Caso C (Usuario existente con contraseña - Vinculación Segura):** Para evitar ataques de secuestro de cuentas (account hijacking), **NUNCA** se fusiona automáticamente sólo por coincidencia de email. Se emite un token de vinculación criptográfico (`linking_token` firmado por JWT, 15 min) y se redirige a `/login?link_pending=true&token=...&email=...`.

4. **Confirmación de Vinculación (`/api/auth/link-account`)**:
   - El alumno confirma su identidad ingresando la contraseña de su cuenta institucional existente.
   - Tras verificar con `bcrypt`, se asocia la identidad Google a su `user_id` original.
   - Se preservan intactas todas sus inscripciones, pagos acreditados y certificados.

---

## 4. Jerarquía Visual y Experiencia de Usuario (UI/UX)

Tanto en **DAOM Learning** (`/login`, `/registro`) como en **DAOM Web** (`/mi-daom/login`), se aplicaron las siguientes pautas:

- **Acción Principal:** Botón superior oficial **«Continuar con Google»** con el isotipo oficial de cuatro colores de Google, respetando las guías de identidad corporativa y WCAG 2.2 AA (área táctil >= 44px).
- **Separador:** Divisor centrado en mayúsculas: `O INGRESÁ CON TU CORREO`.
- **Acceso Alternativo:** Formulario tradicional con campos de correo electrónico y contraseña (o Magic Link passwordless en Mi DAOM), botón «Ingresar».
- **Acciones Secundarias:** Enlaces accesibles a «Registrarse» y «Recuperar contraseña».

---

## 5. Seguridad, Roles y Autorizaciones

- **Principio de Mínimo Privilegio:** Ningún registro con Google otorga privilegios de administrador. Todos los usuarios nuevos reciben `role = 'PARTICIPANT'`.
- **Independencia de Dominio:** Los permisos administrativos no se derivan bajo ninguna circunstancia del dominio del correo (por ejemplo, correos `@daom-weightlifting.com` no son administradores automáticamente).
- **Preservación de Administradores:** Si un administrador institucional vincula legítimamente su cuenta de Google mediante su contraseña, conserva su rol `ADMIN`.
- **Acceso a Capacitaciones:** La autenticación sólo certifica la identidad del alumno. El acceso a materiales didácticos, grabaciones Vimeo Showcase y certificados sigue dependiendo estrictamente de la inscripción activa y el estado de pago acreditado (`confirmada`).
- **Protección de Redirecciones:** Se valida que toda redirección post-login pertenezca a dominios institucionales autorizados (`daom-learning.onrender.com` o `daom-weightlifting.com`), bloqueando redirecciones abiertas (`//evil.com` o `https://externo.com`).

---

## 6. Configuración de Entorno en Google Cloud y Render

### 6.1 Google Cloud Console
1. **Proyecto:** `DAOM Learning` en Google Cloud Platform.
2. **APIs Habilitadas:** `Google Identity Services` / `OAuth 2.0`.
3. **Pantalla de Consentimiento (OAuth Consent Screen):**
   - Tipo de usuario: Externo.
   - Nombre de aplicación: `DAOM Learning`.
   - Correo de asistencia: `contacto@daom-weightlifting.com`.
   - Dominios autorizados: `daom-weightlifting.com`, `onrender.com`.
4. **Credenciales (ID de cliente OAuth 2.0 - Aplicación Web):**
   - **Orígenes autorizados de JavaScript:**
     - `https://daom-learning.onrender.com`
     - `https://www.daom-weightlifting.com`
     - `http://localhost:3000` (desarrollo local)
     - `http://localhost:3001` (desarrollo local)
   - **URIs de redireccionamiento autorizados:**
     - `https://daom-learning.onrender.com/api/auth/google/callback`
     - `https://www.daom-weightlifting.com/api/v1/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback`
     - `http://localhost:3000/api/v1/auth/google/callback`

### 6.2 Variables de Entorno en Render
En los servicios web de Render (`daom-learning` y `daom-web`):
- `GOOGLE_CLIENT_ID`: ID de cliente obtenido de Google Cloud Console.
- `GOOGLE_CLIENT_SECRET`: Secreto de cliente obtenido de Google Cloud Console.
- `JWT_SECRET`: Clave criptográfica para firmas JWT y tokens de estado HMAC (mínimo 32 caracteres).

---

## 7. Verificación y Resultados de Pruebas

Se ejecutaron las suites de pruebas automatizadas en ambos repositorios:

```
=== RESUMEN GLOBAL DE PRUEBAS AUTOMATIZADAS ===
DAOM Learning:
  - tests/google-oauth-h031.test.ts: 13/13 pasados
  - tests/unified-accounts-h031.test.ts: 6/6 pasados
  - tests/auth-api-routes-h031.test.ts: 11/11 pasados
  - Test suites previas (Mercado Pago, Sheets, Comercial, etc.): 56/56 pasados
  Total DAOM Learning: 10 archivos / 86 pruebas pasadas (100%)

DAOM Web:
  - tests/unit/oauth-url-resolution.test.ts: 13/13 pasados
  - tests/unit/webhooks-and-auth-staging.test.ts: 9/9 pasados
  - Test suites previas (Vimeo, Grabaciones, Comercial, CMS, etc.): 219/219 pasados
  Total DAOM Web: 30 archivos / 241 pruebas pasadas (100%)

TOTAL ECOSISTEMA: 40 archivos de prueba / 327 pruebas exitosas (100% PASS)
```

Ambos proyectos compilaron exitosamente con `next build` en modo de producción estricto.
