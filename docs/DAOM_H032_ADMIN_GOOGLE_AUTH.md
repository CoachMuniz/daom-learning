# DAOM — H032: Google Login para Administradores y Cuentas Unificadas

**Identificador:** `DAOM-H032-ADMIN-GOOGLE-AUTH`  
**Canario:** `DAOM-H032-ADMIN-GOOGLE-AUTH-COMPLETE`  
**Estado:** IMPLEMENTADO Y VERIFICADO  
**Fecha:** Noviembre 2026  
**Repositorios:** `CoachMuniz/daom-web` (`www.daom-weightlifting.com`) y `CoachMuniz/daom-learning` (`daom-learning.onrender.com`)  
**Dependencia:** H031 — Google Login y Cuentas Unificadas

---

## 1. Resumen Ejecutivo y Misión H032

El objetivo de **H032** es establecer **Google Login (OAuth 2.0 + OpenID Connect)** como el método principal de acceso a todos los paneles administrativos del ecosistema DAOM (**CMS Editorial de DAOM Web** y **Panel Administrativo de DAOM Learning**), reutilizando la infraestructura de identidad federada introducida en H031 y preservando el acceso alternativo mediante correo electrónico y contraseña.

Principios rectores de seguridad e identidad aplicados:
1. **Google es el método principal de acceso administrativo** (`CONTINUAR CON GOOGLE`), manteniendo correo y contraseña como respaldo (`O INGRESÁ CON TU CORREO`).
2. **Separación estricta entre Identidad, Autenticación y Autorización:** Autenticarse con Google demuestra quién es la persona, pero **nunca concede permisos administrativos automáticamente**.
3. **Ausencia de cuentas duplicadas:** Cada administrador posee una única identidad institucional en la tabla `users`, a la cual se vincula su `sub` inmutable de Google en `user_auth_identities`.
4. **Vinculación segura con prueba de titularidad:** Nunca se vincula automáticamente una cuenta administrativa sólo porque coincida la dirección de correo electrónico. Si un administrador existente con contraseña inicia sesión con Google por primera vez, el sistema exige verificar primero su contraseña administrativa actual antes de asociar la identidad Google.
5. **Independencia y preservación de roles:** Se respetan estrictamente los roles institucionales (`ADMIN` y `EDITOR` en DAOM Web; `ADMIN`, `STAFF` y `PARTICIPANT` en DAOM Learning) tanto en páginas de servidor como en rutas de API.

---

## 2. Arquitectura de Identidad Unificada

### 2.1 Separación de Responsabilidades

| Capa | Responsabilidad | Implementación Técnica |
|---|---|---|
| **Identidad** | Quién es la persona dentro del ecosistema | Registro único en `users` (`id`, `email`, `name`/`full_name`) vinculado 1..N con `user_auth_identities` (`provider = 'google'`, `provider_subject = sub`). |
| **Autenticación** | Cómo demuestra su identidad | Google OAuth 2.0 + OIDC (`state` HMAC-SHA256, `email_verified === true`, `sub` estable) o credenciales tradicionales (`bcrypt` sobre `password_hash`). |
| **Autorización** | Qué operaciones puede realizar | Rol institucional (`role` en `users`), estado activo (`!DISABLED` / `is_active = 1`) y guardias de servidor en cada página y endpoint administrativo (`requireSessionUser`, `requireAdmin`, `getCurrentUser`). |

### 2.2 Modelo de Datos (`users` + `user_auth_identities`)

Tanto en **DAOM Web** como en **DAOM Learning**, la tabla `user_auth_identities` almacena los vínculos federados verificados:

```sql
CREATE TABLE IF NOT EXISTS user_auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_auth_identities_provider_subject UNIQUE (provider, provider_subject)
);
```

---

## 3. Flujo Administrativo de Google Login y Casos de Resolución

### 3.1 Pantallas de Acceso Administrativo

1. **CMS Editorial DAOM Web (`/admin/login`):**
   - **Acción principal:** Botón destacado `CONTINUAR CON GOOGLE` (`/api/v1/auth/google?redirect=/admin`).
   - **Separador:** `O INGRESÁ CON TU CORREO`.
   - **Acceso alternativo:** Formulario de correo electrónico, contraseña y botón `Ingresar al panel`.

2. **DAOM Learning Admin (`/admin/login` y `/login?redirect=/admin`):**
   - **Acción principal:** Botón destacado `CONTINUAR CON GOOGLE` (`/api/auth/google?redirect=/admin`).
   - **Separador:** `O INGRESÁ CON TU CORREO`.
   - **Acceso alternativo:** Formulario de correo electrónico, contraseña y botón `Ingresar al panel`.

### 3.2 Casos de Resolución en el Callback OAuth

- **Caso A (Identidad vinculada):** Verifica Google OAuth -> resuelve usuario institucional en `user_auth_identities` -> valida rol administrativo activo -> autoriza acceso.
- **Caso B (Cuenta administrativa existente sin vincular):** Nunca auto-vincula por email. Emite `linking_token` firmado (15 min) y solicita la contraseña actual con el mensaje: *«Encontramos una cuenta administrativa existente. Para vincularla con Google, verificá primero tu acceso habitual»*.
- **Caso C (Usuario Google sin permisos administrativos):** Deniega el acceso administrativo sin alterar su rol y muestra: *«Tu cuenta está identificada, pero no tiene permisos para acceder a este panel»*.
- **Caso D (Error OAuth):** Muestra *«No pudimos completar el ingreso con Google. Intentá nuevamente»*.
