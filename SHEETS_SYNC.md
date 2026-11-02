# Integración y Sincronización con Google Sheets — DAOM Learning

**Canario del Proyecto:** `DAOM-FORMACION-SHEET-01`  
**Google Sheet ID:** `1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4`  
**URL:** [https://docs.google.com/spreadsheets/d/1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4/edit](https://docs.google.com/spreadsheets/d/1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4/edit)  
**Módulo Implementador:** `src/lib/sheets/sync.ts`  
**Parser:** `src/lib/sheets/csv-parser.ts`

---

## 1. Principio Fundamental: Planilla como Fuente Única de Verdad

El catálogo de capacitaciones, ediciones, tarifas, docentes, FAQs y directivas editoriales se gestiona de manera centralizada desde Google Sheets.
- **Sin Redeploy:** Las modificaciones editoriales realizadas en la planilla se reflejan en la plataforma mediante sincronización automática periódica o ejecución manual administrativa.
- **Sin Invención de Datos:** La plataforma no genera cursos, precios ni docentes ficticios. Si un campo no está definido, se respeta la ausencia del dato.
- **Sin Exposición de Secretos:** Las peticiones a Google Sheets se realizan exclusivamente desde el servidor Next.js. El navegador del usuario jamás interactúa con claves de Google.

---

## 2. Pestañas Oficiales y Mapeo de Encabezados

| Pestaña en Planilla | Tabla Destino en DB | Encabezados Obligatorios Clave |
|---|---|---|
| **Capacitaciones** | `trainings` | `capacitacion_id`, `tipo`, `titulo`, `subtitulo`, `descripcion`, `programa`, `duracion`, `estado_editorial`, `verificacion` |
| **Ofertas** | `training_editions` | `oferta_id`, `capacitacion_id`, `nombre_edicion`, `fecha_inicio`, `modalidades`, `estado_editorial`, `verificacion` |
| **Precios** | `prices` | `precio_id`, `oferta_id`, `mercado`, `moneda`, `precio_base`, `estado`, `verificacion` |
| **Docentes** | `instructors` | `docente_id`, `nombre`, `especialidad`, `credenciales`, `estado`, `verificacion` |
| **Preguntas frecuentes** | `faqs` | `faq_id`, `categoria`, `pregunta`, `respuesta`, `estado_editorial` |
| **Configuracion** | `site_configs` | `clave`, `valor`, `descripcion`, `tipo`, `publico` |
| **Control editorial** | `editorial_controls` | `registro_id`, `tipo_registro`, `fuente_url`, `estado_verificacion`, `observaciones` |

---

## 3. Reglas de Filtrado y Controles Independientes

Un registro **solo se publica en el catálogo público** si cumple simultáneamente con dos condiciones independientes:
$$\text{Visibilidad Pública} = (\text{estado\_editorial} = \text{'publicado'}) \land (\text{verificacion} = \text{'verificado'})$$

### Comportamiento según Estados

| `estado_editorial` | `verificacion` | Visibilidad en Catálogo Público | Visibilidad en Panel `/admin` |
|---|---|:---:|:---:|
| `borrador` | `pendiente` | **NO** (Oculto) | **SÍ** (Marcado en amarillo) |
| `borrador` | `verificado` | **NO** (Oculto) | **SÍ** (Marcado en revisión) |
| `publicado` | `pendiente` | **NO** (Oculto) | **SÍ** (Requiere verificación) |
| `publicado` | `verificado` | **SÍ (Visible)** | **SÍ** (Estado óptimo) |
| `archivado` | Cualquiera | **NO** (Oculto) | **SÍ** (Histórico) |

> **IMPORTANTE:** En el estado actual de la planilla real, todas las capacitaciones (`SEM-SQUATS`, `SEM-SNATCH`, etc.) se encuentran en estado `borrador` y `pendiente` de verificación. Por esta razón, la web muestra legítimamente el estado vacío institucional profesional con información sobre próximas aperturas, cumpliendo con la regla de **no publicar borradores ni inventar datos ficticios**.

---

## 4. Observabilidad y Auditoría de Sincronizaciones

Cada ejecución del motor de sincronización se registra en la tabla `sync_runs` con:
- `id`: Identificador único (ej: `SYNC-173000000-abc`).
- `status`: `'success'`, `'partial_error'` o `'failed'`.
- `records_read`: Cantidad total de filas leídas en las 7 pestañas.
- `records_synced`: Cantidad de filas persistidas satisfactoriamente.
- `records_skipped`: Filas ignoradas por falta de campos clave requeridos.
- `errors_json`: Vector de errores tipados si ocurrió alguna anomalía.
- `duration_ms`: Duración de la operación en milisegundos.
- `triggered_by`: Origen del trigger (ej: `'admin:admin@daom-weightlifting.com'`, `'cli_manual'`, `'seed_script'`).

---

## 5. Disparadores de Sincronización

1. **Desde la Consola de Administración (`/admin`):**
   El botón *"Sincronizar Catálogo Ahora"* realiza una llamada `POST` a `/api/sync/sheets`, validando la sesión activa del administrador.
2. **Mediante Tarea Programada (Cron / Webhook):**
   Petición `POST /api/sync/sheets` con la cabecera:
   `Authorization: Bearer <SYNC_SECRET_TOKEN>`.
3. **Mediante CLI en Entorno Local o Servidor:**
   `npm run sync` ejecuta directamente el script `scripts/sync-sheets.ts`.
