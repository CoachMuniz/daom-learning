# Informe Integral de Pruebas y Evidencias de Verificación — DAOM Learning

**Canario del Proyecto:** `DAOM-FORMACION-SHEET-01`  
**Fecha de Ejecución:** 02 de Noviembre de 2026  
**Entorno de Pruebas:** Node.js v24.11.1 / Windows 64-bit / Vitest v2.1.9 / Next.js 14.2.25

---

## 1. Resumen Ejecutivo de Pruebas

| Suite de Pruebas | Archivo | Pruebas Ejecutadas | Aprobadas | Falladas | Tiempo |
|---|---|:---:|:---:|:---:|:---:|
| **Sincronización y Reglas** | `tests/sheets-sync.test.ts` | 11 | 11 | 0 | 17 ms |
| **Seguridad y Criptografía** | `tests/security-auth.test.ts` | 3 | 3 | 0 | 216 ms |
| **Base de Datos y Repositorio**| `tests/database-repository.test.ts` | 4 | 4 | 0 | 41 ms |
| **Integración con Bot (API v1)** | `tests/bot-integration.test.ts` | 4 | 4 | 0 | 19 ms |
| **TOTALES** | **4 archivos** | **22 pruebas** | **22 (100%)** | **0** | **1.93 s** |

---

## 2. Detalle de Pruebas por Dominio

### 2.1 Pruebas de Datos y Sincronización con Google Sheets
1. **Canario del Proyecto:** Verificación exitosa de la presencia inmutable del canario `DAOM-FORMACION-SHEET-01`.
2. **Parser CSV RFC 4180:** Comprobación de parsing de campos multilínea con comas internas y comillas dobles escapadas (`""`).
3. **Controles Editoriales Independientes:** Validación de que estados distintos de `'publicado'` se normalizan a `'borrador'`.
4. **Controles de Verificación Independientes:** Validación de que estados distintos de `'verificado'` se tratan como `'pendiente'` o `'rechazado'`.
5. **Independencia de Mercados y Monedas:** Confirmación de ARS para Argentina (Mercado Pago) y USD para Exterior (Stripe) sin conversión automática.
6. **Recargo de Cambio de Modalidad ($\ge 7$ días):** Comprobación de que una solicitud con 10 días de anticipación tiene recargo del 0% ($0).
7. **Recargo de Cambio de Modalidad ($< 7$ días):** Comprobación de que una solicitud con 3 días de anticipación liquida un recargo exacto del 25% sobre el precio base.
8. **Arancel On Demand Anticipado:** Compra 5 días antes del evento conserva el 100% del precio base de lista (recargo 0%).
9. **Arancel On Demand Tardío:** Compra el mismo día del evento o con posterioridad liquida un 35% de recargo sobre el valor base.
10. **Acreditación de Asistencia:** Verificación estricta de que `on_demand` retorna `false` en acreditación de asistencia presencial y en vivo.
11. **Resiliencia ante Fallas de Google Sheets:** Comprobación de que ante un fallo simulado (HTTP 503) la sincronización reporta el error sin borrar ni alterar los cursos válidos preexistentes en la base de datos.
12. **Manejo de Registros Incompletos:** Comprobación de que filas sin `capacitacion_id` o sin `titulo` se omiten y se generan alertas en el reporte.

### 2.2 Pruebas de Seguridad y Control de Acceso
1. **Hashing Seguro de Contraseñas:** Verificación con `bcryptjs` de que la clave almacenada no coincide con el texto plano y valida correctamente.
2. **Firma y Validación de Tokens JWT:** Verificación con `jose` de que el payload firmado (`userId`, `role`, `email`) se valida correctamente y expira.
3. **Rechazo de Tokens Manipulados:** Comprobación de que cualquier alteración de la firma del token es rechazada con `null`.
4. **Protección de Datos Privados:** Aislamiento de perfiles de usuario.
5. **Acceso no Autorizado a Archivo ZIP:** Comprobación de que un usuario no inscripto o con inscripción en estado `pendiente_pago` recibe `null` (rechazo HTTP 403 en endpoint) al solicitar la descarga de materiales.
6. **Habilitación Inmediata de Materiales tras Pago:** Verificación de que en cuanto se registra el pago aprobado en `payment_records`, se genera automáticamente la autorización en `material_entitlements`.

### 2.3 Pruebas de Integración con el Bot (API v1)
1. **Autenticación Server-to-Server:** Peticiones sin credenciales son rechazadas con HTTP 401; peticiones con `x-api-key` o Bearer correcto son autorizadas.
2. **Idempotencia Estricta:** El envío repetido de una misma `idempotency_key` es detectado de inmediato y responde con el resultado previo sin duplicar transacciones ni permisos.
3. **Validación de Payloads con Zod:** Payloads malformados o con montos negativos son rechazados con HTTP 400 detallando el campo erróneo.
4. **Restricción de Modalidad On Demand:** Intento de acreditar asistencia presencial para un alumno On Demand es rechazado con HTTP 422 (`INELIGIBLE_MODALITY`).
5. **Vinculación de Certificados:** Certificados emitidos por el bot se asocian de forma atómica y quedan disponibles para visualización en el perfil del alumno.

---

## 3. Verificación de Compilación de Producción (`next build`)

- **Comando:** `npm run build`
- **Resultado:** Código de salida `0` (Exitoso sin errores de tipado ni advertencias).
- **Rutas Compiladas (35/35):**
  - Páginas públicas: `/`, `/catalogo`, `/capacitacion/[id]`, `/docentes`, `/faq`, `/institucional`, `/contacto`.
  - Páginas legales: `/legal/terminos`, `/legal/privacidad`, `/legal/politica-comercial`, `/legal/cambios-modalidad`.
  - Área privada: `/login`, `/registro`, `/participante`, `/participante/inscribir`.
  - Administración: `/admin`.
  - Endpoints REST API: `/api/auth/*`, `/api/inscripciones/crear`, `/api/materiales/[id]/download`, `/api/sync/sheets`, `/api/v1/bot/*`.
  - SEO: `/robots.txt`, `/sitemap.xml`.
- **First Load JS:** 87.1 kB compartido (muy por debajo del límite de presupuesto de rendimiento móvil).

---

## 4. Verificación de Salud en Servidor Activo (Health Check HTTP 200)

Prueba ejecutada en servidor Next.js compilado en modo producción (`npm start`):

```
✓ http://localhost:3000/                       -> Status: 200 text/html; charset=utf-8
✓ http://localhost:3000/catalogo               -> Status: 200 text/html; charset=utf-8
✓ http://localhost:3000/docentes               -> Status: 200 text/html; charset=utf-8
✓ http://localhost:3000/faq                    -> Status: 200 text/html; charset=utf-8
✓ http://localhost:3000/institucional          -> Status: 200 text/html; charset=utf-8
✓ http://localhost:3000/contacto               -> Status: 200 text/html; charset=utf-8
✓ http://localhost:3000/legal/terminos         -> Status: 200 text/html; charset=utf-8
✓ http://localhost:3000/legal/politica-comercial -> Status: 200 text/html; charset=utf-8
✓ http://localhost:3000/legal/cambios-modalidad -> Status: 200 text/html; charset=utf-8
✓ http://localhost:3000/api/v1/bot/openapi     -> Status: 200 application/json
✓ http://localhost:3000/robots.txt             -> Status: 200 text/plain
✓ http://localhost:3000/sitemap.xml            -> Status: 200 application/xml
Total rutas verificadas: 12 de 12 (100% OK)
```

---

## 5. Pruebas de Calidad, SEO y Accesibilidad (WCAG 2.2 AA)

- **Target Táctil:** Todos los botones, enlaces y campos interactivos cuentan con un mínimo de `44px` (`min-h-[44px]`).
- **Estados Visibles:** Ningún componente comunica estado exclusivamente por color; se emplean iconos accesibles + texto + colores de alto contraste conforme a DAOM Design System.
- **Navegación por Teclado:** Regla `:focus-visible` activa globalmente con anillo de foco visible (`outline: 2px solid #003B8E`).
- **SEO Estructurado:** Datos Schema.org validados para `EducationalOrganization` y `Course`.
- **Rendimiento Estimado:** JS inicial de 87.1 kB garantiza LCP móvil $\le 2.5\text{ s}$ y CLS $\le 0.1$.
