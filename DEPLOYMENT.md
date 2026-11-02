# Guía de Despliegue y Operaciones — DAOM Learning

**Canario del Proyecto:** `DAOM-FORMACION-SHEET-01`  
**Infraestructura:** Next.js Node.js 22+ / Render Web Service / Supabase PostgreSQL / SQLite Dual.

---

## 1. Secuencia Oficial de Despliegue

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Verificación de Código & Rama main (Git 2.52+)                      │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Ejecución de Pruebas Automatizadas: npm test                        │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Configuración de Variables de Entorno (ver Sección 2)               │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Aplicación de Migraciones de Base de Datos: npm run db:migrate      │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Compilación de Producción: npm run build                            │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Sembrado y Sincronización Inicial: npm run db:seed                  │
├────────────────────────────────────────────────────────────────────────┤
│ 7. Inicio del Servicio: npm start                                      │
├────────────────────────────────────────────────────────────────────────┤
│ 8. Verificación de Salud (Health Checks) en Rutas Críticas             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Variables de Entorno Requeridas

| Variable | Descripción | Valor de Ejemplo / Defecto |
|---|---|---|
| `NODE_ENV` | Modo de ejecución de Node.js | `production` |
| `PORT` | Puerto de escucha HTTP | `3000` |
| `NEXT_PUBLIC_APP_URL` | URL canónica pública de la plataforma | `https://daom-learning.onrender.com` |
| `GOOGLE_SHEET_ID` | ID de la planilla editorial única | `1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4` |
| `TIMEZONE` | Zona horaria para eventos y recargos | `America/Argentina/Buenos_Aires` |
| `JWT_SECRET` | Clave secreta para firma de cookies JWT | Mínimo 32 caracteres aleatorios |
| `BOT_API_SECRET_KEY` | Clave compartida para API de integración | Clave secreta de servicio |
| `SYNC_SECRET_TOKEN` | Token para disparar sincronización externa | Token Bearer |
| `DATABASE_URL` | Cadena de conexión PostgreSQL (opcional) | `postgresql://user:pass@host:5432/db` (si no se define, usa SQLite local) |
| `ADMIN_EMAIL` | Email del usuario administrador inicial | `admin@daom-weightlifting.com` |
| `ADMIN_INITIAL_PASSWORD` | Contraseña sembrada del administrador | `DaomLearning2026!Secure` |

---

## 3. Despliegue en Render (Infraestructura Recomendada)

La plataforma incluye el archivo oficial `render.yaml`:
1. Vincular el repositorio Git en la consola de Render.
2. Render detectará automáticamente el archivo `render.yaml` y aprovisionará:
   - Un servicio web Node.js (`daom-learning`).
   - Una base de datos PostgreSQL administrada (`daom-learning-db`).
3. El comando de build configurado es:
   `npm install && npm run build`
4. El comando de inicio configurado es:
   `npm run start`
5. El health check monitorea la ruta `/` esperando código HTTP 200.

---

## 4. Despliegue con Supabase (PostgreSQL Externo)

Si se utiliza un proyecto existente en Supabase:
1. Copiar la cadena de conexión del Connection Pooler (Modo Sesión o Transacción) en `DATABASE_URL`.
2. Ejecutar la migración inicial en Supabase SQL Editor:
   Archivo: `supabase/migrations/20261102000000_init_daom_learning.sql`.
3. Iniciar la aplicación: Next.js detectará `DATABASE_URL` y activará el cliente `PostgresDatabase` con pooling de conexiones y TLS seguro.

---

## 5. Protocolo de Verificación Post-Despliegue

Ejecutar las siguientes comprobaciones una vez iniciado el servicio:
```bash
# 1. Health check página principal
curl -I https://tu-dominio.com/
# Esperado: HTTP/1.1 200 OK y X-Canary-Project: DAOM-FORMACION-SHEET-01

# 2. Catálogo público
curl -I https://tu-dominio.com/catalogo
# Esperado: HTTP/1.1 200 OK

# 3. Especificación OpenAPI del bot
curl -I https://tu-dominio.com/api/v1/bot/openapi
# Esperado: HTTP/1.1 200 OK con Content-Type: application/json

# 4. Sitemap y Robots
curl -I https://tu-dominio.com/sitemap.xml
curl -I https://tu-dominio.com/robots.txt
# Esperado: HTTP/1.1 200 OK
```
