# DAOM Learning — Plataforma Oficial de Capacitaciones y Formación

**Canario del Proyecto:** `DAOM-FORMACION-SHEET-01`  
**Institución:** DAOM Weightlifting (Sede Deportiva: Club DAOM, Av. Varela 1800, Flores, CABA, Argentina).  
**Fuente Editorial:** Google Sheets `DAOM_Learning_Contenido_ET3` (ID: `1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4`).  
**Estado:** Producción Lista, Verificada y Auditada.

---

## 1. Visión del Producto

DAOM Learning es la plataforma digital de formación técnica, pedagógica y biomecánica en **Levantamiento Olímpico de Pesas (Weightlifting)** de DAOM Weightlifting.

Diseñada con un enfoque **mobile-first** y accesible según **WCAG 2.2 AA**, permite:
- Consultar el catálogo de capacitaciones (Seminarios, Clínicas, Workshops, Tutoriales y Cursos futuros).
- Acceder a los programas, fundamentación biomecánica y credenciales del cuerpo docente certificado por la International Weightlifting Federation (IWF).
- Conocer aranceles independientes para Argentina (ARS mediante Mercado Pago) y el exterior (USD mediante Stripe).
- Iniciar inscripciones en modalidades Presencial (Sede Club DAOM), Streaming en vivo interactivo o formato On Demand grabado.
- Descargar material complementario en formato ZIP con control de acceso inmediato tras pago confirmado.
- Consultar información de asistencia y visualizar certificados oficiales vinculados por el bot.

---

## 2. Pila Tecnológica

- **Framework Web:** Next.js 14 (App Router, Server Components, Route Handlers y Server Actions).
- **Tipado:** TypeScript con tipado estricto en todas las capas.
- **Estilos:** Tailwind CSS alineado con los tokens oficiales del **DAOM Design System v1.0 (Modular Analítica)**.
- **Tipografía:** Inter (Google Fonts) con soporte multilenguaje y escala armónica.
- **Identidad de Marca:** Logotipos oficiales intocables en `/public/assets/logos/`.
- **Capa de Persistencia:** Arquitectura dual (PostgreSQL 15+ / Supabase para producción, y SQLite embebido con WAL para pruebas sin dependencias externas).
- **Integración Editorial:** Servicio observable de sincronización con Google Sheets con protección de caché ante fallas temporales.
- **Seguridad:** Tokens JWT firmados con `jose`, contraseñas con `bcryptjs`, validación estricta con `zod`, cabeceras de seguridad HTTP y protección anti-spam Honeypot.
- **Testing:** Vitest con pruebas unitarias y de integración para reglas comerciales, idempotencia, permisos y sincronización.

---

## 3. Estructura de Rutas y Navegación

### Páginas Públicas
- `/`: Inicio institucional, propuesta pedagógica, modalidades, microcredenciales y estado del catálogo.
- `/catalogo`: Catálogo completo con buscador por texto y filtros por tipo (Seminarios, Clínicas, Workshops, Tutoriales).
- `/capacitacion/[id]`: Ficha completa de capacitación con programa, objetivos, metodología, docentes, precios y botón de inscripción.
- `/docentes`: Perfiles de entrenadores certificados por la IWF (Abel Matías Muñiz, Brenda Vacotti, María Eugenia Cavero).
- `/faq`: Preguntas frecuentes categorizadas (Inscripciones, Modalidades, Materiales, Pagos, Certificados).
- `/institucional`: Presentación de DAOM Weightlifting y formulario para capacitaciones in-company / a medida para clubes y boxes.
- `/contacto`: Canales directos, WhatsApp oficial (+54 11 3039-3030) y formulario con honeypot.
- `/legal/terminos`: Términos y condiciones (borrador preliminar identificado para revisión legal).
- `/legal/privacidad`: Política de privacidad y protección de datos personales.
- `/legal/politica-comercial`: Política de precios independientes ARS/USD y condiciones comerciales.
- `/legal/cambios-modalidad`: Reglamento de cambios de modalidad (0% recargo con $\ge$ 7 días; 25% con $<$ 7 días).

### Área de Participante (Privada)
- `/login`: Inicio de sesión seguro con correo electrónico y contraseña.
- `/registro`: Alta de nuevo participante con selección de país y documento.
- `/participante`: Panel con "Mis Capacitaciones", "Material Complementario (ZIP)" y "Certificados Oficiales".
- `/participante/inscribir`: Flujo interactivo de inscripción con elección de mercado y modalidad.

### Administración
- `/admin`: Consola administrativa con catálogo sincronizado, estados editoriales, visor de auditoría y botón de sincronización manual.

---

## 4. Instalación y Puesta en Marcha

### Prerrequisitos
- Node.js versión 22 o superior (probado en Node v24).
- Gestor de paquetes `npm`.

### Comandos Rápidos
```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar pruebas unitarias y de integración
npm test

# 3. Aplicar migraciones a la base de datos
npm run db:migrate

# 4. Sembrar usuarios iniciales y sincronizar con Google Sheets
npm run db:seed

# 5. Compilar para producción
npm run build

# 6. Iniciar servidor de producción
npm start
```

La plataforma estará disponible en `http://localhost:3000`.

---

## 5. Credenciales Iniciales Sembradas

- **Administrador:**
  - **Email:** `admin@daom-weightlifting.com`
  - **Contraseña:** `DaomLearning2026!Secure`
  - **Rol:** `ADMIN`

- **Alumno de Prueba:**
  - **Email:** `alumno@daom-weightlifting.com`
  - **Contraseña:** `AlumnoDaom2026!Secure`
  - **Rol:** `PARTICIPANT`

---

## 6. Canario Obligatorio

El canario **`DAOM-FORMACION-SHEET-01`** identifica de manera única e inmutable esta versión del sistema en encabezados HTTP (`X-Canary-Project`), metadatos de aplicación, pruebas y documentación técnica.
