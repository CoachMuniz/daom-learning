# Estado Actual del Proyecto — DAOM Learning

**Canario Obligatorio:** `DAOM-FORMACION-SHEET-01`  
**Fecha de Auditoría:** 02 de Noviembre de 2026  
**Versión de la Plataforma:** 1.0.0 (Release Candidate Producción)  
**Estado General:** **Completado, Probado, Verificado y Documentado.**

---

## 1. Resumen de Estado por Componente

| Componente | Estado | Evidencia de Verificación |
|---|:---:|---|
| **Web Pública (Next.js 14)** | **OPERATIVO** | Compilación `next build` exitosa (35 rutas), Server Components, First Load JS 87.1 kB. |
| **Identidad Visual & Logos** | **OPERATIVO** | Logos oficiales DAOM Weightlifting y Club DAOM intocables en `/public/assets/logos/`. |
| **Diseño & Accesibilidad** | **OPERATIVO** | Tokens oficiales DAOM Design System v1.0, escala tipográfica Inter, touch target $\ge 44\text{px}$, WCAG 2.2 AA. |
| **Sincronización Google Sheets** | **OPERATIVO** | Motor en `src/lib/sheets/sync.ts` lee en vivo las 7 pestañas de la planilla ID `1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4`. Sincroniza 27 registros reales sin inventar datos. |
| **Filtro Editorial & Borradores**| **OPERATIVO** | Controles independientes `estado_editorial` y `verificacion`. Los borradores no se publican; se muestra estado vacío profesional. |
| **Área Privada de Participante**| **OPERATIVO** | Registro, login, panel con mis capacitaciones, descarga protegida de material ZIP y certificados. |
| **Descarga de Material ZIP** | **OPERATIVO** | Endpoint `/api/materiales/[id]/download` con verificación de pago confirmado y sesión. Registra descargas en auditoría. |
| **Consola de Administración** | **OPERATIVO** | Panel `/admin` con métricas, tabla editorial, visor de auditoría, sync manual y enlaces directos a Google Sheets. |
| **Contrato de Integración Bot** | **OPERATIVO** | Endpoints `/api/v1/bot/*` con autenticación `x-api-key`/Bearer, idempotencia estricta, validación Zod y OpenAPI 3.1. |
| **Base de Datos y Persistencia** | **OPERATIVO** | 21 tablas relacionales. Migración PostgreSQL/Supabase en `supabase/migrations/` y SQLite dual con WAL mode en local. |
| **Pruebas Automatizadas** | **OPERATIVO** | 22 pruebas unitarias y de integración en Vitest (100% aprobadas en 1.93s). |
| **SEO y Metadatos** | **OPERATIVO** | Robots.txt, Sitemap.xml dinámico, Schema.org JSON-LD para Organización y Cursos. |
| **Configuración de Despliegue** | **OPERATIVO** | `render.yaml` y `.env.example` listos para Render y Supabase. |

---

## 2. Inventario de Archivos y Código Implementado

```
DAOM Learning/
├── .env.example                               # Variables de entorno documentadas
├── .gitignore                                 # Exclusiones de Git
├── ADMIN_MANUAL.md                            # Manual de administración para equipo directivo
├── API_REFERENCE.md                           # Referencia completa de endpoints REST
├── ARCHITECTURE.md                            # Documento de arquitectura y diagramas
├── BOT_INTEGRATION_CONTRACT.md                # Contrato de integración técnica con el bot
├── CURRENT_STATE.md                           # Estado actual y auditoría del sistema
├── DATABASE_SCHEMA.md                         # Especificación técnica del esquema de 21 tablas
├── DEPLOYMENT.md                              # Guía paso a paso de despliegue en producción
├── package.json                               # Configuración de dependencias y scripts
├── README.md                                  # Visión general y puesta en marcha
├── render.yaml                                # Manifiesto de infraestructura como código para Render
├── SECURITY.md                                # Directivas de seguridad y protección de datos
├── SHEETS_SYNC.md                             # Especificación del sincronizador de Google Sheets
├── TEST_REPORT.md                             # Informe de pruebas y resultados reales
├── tsconfig.json                              # Configuración estricta de TypeScript
├── vitest.config.ts                           # Configuración del ejecutor de pruebas
│
├── public/assets/logos/                       # Logotipos oficiales definitivos e intocables
│   ├── daom-weightlifting-horizontal-azul.png
│   ├── daom-weightlifting-horizontal-blanco.png
│   ├── daom-weightlifting-vertical-azul.png
│   ├── daom-weightlifting-vertical-blanco.png
│   └── club-daom.png
│
├── scripts/
│   ├── migrate.ts                             # Script de ejecución de migraciones
│   ├── seed.ts                                # Script de sembrado de usuarios y sync inicial
│   └── sync-sheets.ts                         # Script de sincronización manual por CLI
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                         # Layout global con Navbar, Footer y Schema.org
│   │   ├── globals.css                        # Estilos Tailwind y tokens DAOM
│   │   ├── page.tsx                           # Inicio: presentación, pilares, modalidades
│   │   ├── not-found.tsx                      # Página 404 accesible
│   │   ├── error.tsx                          # Manejador de errores no controlados
│   │   ├── robots.ts                          # Directivas para motores de búsqueda
│   │   ├── sitemap.ts                         # Mapa del sitio dinámico
│   │   ├── admin/                             # Consola de administración y sync
│   │   ├── catalogo/                          # Catálogo de capacitaciones con filtros
│   │   ├── capacitacion/[id]/                 # Ficha técnica y programa detallado
│   │   ├── docentes/                          # Perfiles docentes certificados IWF
│   │   ├── faq/                               # Preguntas frecuentes categorizadas
│   │   ├── institucional/                     # Propuesta para instituciones y clubes
│   │   ├── contacto/                          # Canales y formulario con Honeypot
│   │   ├── legal/                             # Términos, privacidad, política comercial, cambios
│   │   ├── login/                             # Acceso al área de participantes
│   │   ├── registro/                          # Registro de alumnos
│   │   ├── participante/                      # Mis capacitaciones, materiales ZIP y certificados
│   │   │   └── inscribir/                     # Flujo interactivo de inscripción
│   │   └── api/
│   │       ├── auth/                          # Endpoints de login, registro, logout, me
│   │       ├── contacto/enviar/               # Procesador de formularios con Honeypot
│   │       ├── inscripciones/crear/           # Inicio de inscripción
│   │       ├── materiales/[id]/download/      # Descarga protegida de archivo ZIP
│   │       ├── sync/sheets/                   # Disparador de sincronización de catálogo
│   │       └── v1/bot/                        # Contrato OpenAPI con el bot
│   │
│   ├── components/
│   │   ├── Navbar.tsx                         # Barra superior accesible con logo intocable
│   │   ├── Footer.tsx                         # Pie institucional con canario DAOM-FORMACION-SHEET-01
│   │   ├── TrainingCard.tsx                   # Tarjeta visual de capacitación
│   │   ├── StatusBadge.tsx                    # Badges accesibles icono + texto + color
│   │   └── EmptyState.tsx                     # Estado vacío profesional para catálogo en preparación
│   │
│   ├── design-system/
│   │   ├── daom-design-system.css             # Tokens CSS oficiales
│   │   └── daom.tokens.json                   # Tokens JSON oficiales
│   │
│   └── lib/
│       ├── types.ts                           # Modelos y contratos TypeScript
│       ├── auth/                              # JWT (jose), Passwords (bcryptjs), Session
│       ├── bot/                               # Schemas Zod y validadores del contrato bot
│       ├── commercial/                        # Motor de reglas comerciales y recargos
│       ├── db/                                # Cliente dual (PostgreSQL/SQLite) y repositorio
│       └── sheets/                            # Parser CSV y sincronizador de Google Sheets
│
├── supabase/migrations/
│   └── 20261102000000_init_daom_learning.sql  # Migración DDL y políticas RLS para PostgreSQL
│
└── tests/
    ├── sheets-sync.test.ts                    # Pruebas de sincronización, reglas y resiliencia
    ├── security-auth.test.ts                  # Pruebas de contraseñas y tokens JWT
    ├── database-repository.test.ts            # Pruebas de aislamiento de borradores y ZIP
    └── bot-integration.test.ts                # Pruebas de idempotencia y validación de bot
```

---

## 3. Estado de la Sincronización Real con Google Sheets

En la última ejecución directa contra la planilla en vivo `1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4`:
- **Registros Leídos:** 27
- **Registros Sincronizados:** 27
- **Estado de Sincronización:** `success`
- **Capacitaciones:** 10 registros (`SEM-SQUATS`, `SEM-SNATCH`, `SEM-CLEAN`, `SEM-JERK`, `SEM-PLANIFICACION`, `SEM-BIOMECANICA`, `CLI-4EN1`, `WOR-INSTITUCIONAL`, `TUT-KINOVEA`, `TUT-ARBITRAJE`).
- **Estado de las Capacitaciones en la Planilla:** Todas se encuentran actualmente con `estado_editorial = 'borrador'` y `verificacion = 'pendiente'`, con observaciones explícitas del equipo directivo en la pestaña Control Editorial indicando *"No publicar automáticamente"*.
- **Comportamiento del Sistema:** La plataforma respeta fielmente la regla de oro: los borradores permanecen ocultos en el catálogo público y se muestran con sus advertencias en el panel administrativo `/admin`. El público visualiza una presentación institucional completa con un estado vacío profesional invitando a contactarse para próximas aperturas de vacantes.

---

## 4. Estado del Despliegue y Próxima Acción Humana

### Estado del Despliegue
- La aplicación compila limpiamente para producción (`npm run build`).
- Las 35 rutas estáticas y dinámicas se generan sin errores.
- El servidor de producción responde con código HTTP 200 en todas las rutas auditadas.
- La configuración para Render (`render.yaml`) y Supabase (`supabase/migrations/`) está completa y versionada en Git.

### Próxima y Única Acción Humana Indispensable
Vincular el repositorio Git en la consola de Render (o vincular `DATABASE_URL` con el pooler de Supabase deseado) para que el servicio web de producción quede expuesto en el subdominio definitivo en la nube.
