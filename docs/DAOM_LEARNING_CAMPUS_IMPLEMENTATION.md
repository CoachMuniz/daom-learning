# DAOM LEARNING — CAMPUS DE ALUMNOS, AUTENTICACIÓN Y DOMINIO INSTITUCIONAL
**Identificador Maestro:** `DAOM-LEARNING-CAMPUS-01`  
**Fecha:** 14 de Noviembre de 2026  
**Estado:** IMPLEMENTADO Y VERIFICADO (100% Passing Tests: 118/118)

---

## 1. Dominio Institucional Canónico

- **Dominio Objetivo:** `https://learning.daom-weightlifting.com`
- **Rutas Principales:**
  - Campus de Alumnos: `https://learning.daom-weightlifting.com/campus`
  - Administración: `https://learning.daom-weightlifting.com/admin`
  - Recuperación Segura: `https://learning.daom-weightlifting.com/recuperar-password`
  - Retorno de Pagos / Reintentos: `https://learning.daom-weightlifting.com/api/inscripciones/[id]/reintentar`
- **Configuración Render (`render.yaml`):**
  - Inyección de variables `APP_URL` y `NEXT_PUBLIC_APP_URL` apuntando a `https://learning.daom-weightlifting.com`.
  - Configuración DNS necesaria en Cloudflare / Proveedor DNS:
    ```dns
    Type:  CNAME
    Name:  learning
    Value: daom-learning.onrender.com (o el CNAME asignado por Render en Custom Domains)
    Proxy: DNS Only (o Proxied con SSL Full/Strict)
    ```

---

## 2. Recuperación Administrativa y Seguridad

- **Problema Abordado:** El administrador no recordaba su contraseña. Se prohibió alterar hashes manualmente, exponer contraseñas en logs o duplicar cuentas.
- **Mecanismo Implementado:**
  1. Tabla `password_recovery_tokens` en PostgreSQL / SQLite con hashes SHA-256 de un solo uso.
  2. Procedimiento CLI de emisión local:
     ```bash
     npx tsx scripts/issue-admin-recovery.ts admin@daom-weightlifting.com
     ```
  3. Genera un enlace seguro temporal de 30 minutos:
     `https://learning.daom-weightlifting.com/recuperar-password?token=DAOM-REC-...&email=admin%40daom-weightlifting.com`
  4. Consumo atómico: Al ingresar la nueva contraseña (mínimo 8 caracteres), se hashea con `bcryptjs`, se actualiza la cuenta del administrador y el token queda invalidado irreversiblemente.

---

## 3. Campus de Alumnos (`/campus`)

- **Biblioteca Académica Permanente:**
  - Estructuración en pestañas: **PRÓXIMAS**, **EN CURSO**, **FINALIZADAS**.
  - Buscador reactivo por título o código de capacitación.
  - Organización pedagógica clara:
    - **ANTES DEL SEMINARIO:** Videos introductorios (nunca llamados nivelatorios) y descarga de material preparatorio.
    - **DESPUÉS DEL SEMINARIO:** Grabaciones masterizadas de la jornada (Vimeo player protegido), material complementario y certificados oficiales de participación.
  - Botón de reintento de pago directo con Mercado Pago Checkout Pro para inscripciones en estado `pendiente_pago`.
  - Enlace al grupo oficial de WhatsApp para participantes confirmados (administrado desde el panel).
  - Compatibilidad total: `/participante` redirige transparentemente a `/campus`.

---

## 4. Auditoría de Calidad y Pruebas

- **Test Suite:** 16 archivos de prueba, **118 tests pasando con éxito (0 fallos)**.
- **Next.js Production Build:** Compilación limpia sin errores de tipos TypeScript.
