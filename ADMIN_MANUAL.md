# Manual de Administración y Operación Editorial — DAOM Learning

**Canario del Proyecto:** `DAOM-FORMACION-SHEET-01`  
**Destinatarios:** Dirección Deportiva, Coordinación Académica y Administradores de DAOM Weightlifting.

---

## 1. Acceso a la Consola Administrativa

1. Ingresar a: `https://tu-dominio.com/login` (o en local `http://localhost:3000/login`).
2. Utilizar las credenciales administrativas oficiales:
   - **Usuario:** `admin@daom-weightlifting.com`
   - **Contraseña:** `DaomLearning2026!Secure` (se recomienda cambiar tras el primer acceso).
3. Una vez autenticado, dirigirse a la ruta `/admin` o hacer clic en el botón **"Panel Admin"** ubicado en la barra de navegación superior.

---

## 2. Gestión Editorial del Catálogo desde Google Sheets

> **REGLA DE ORO:** La edición de contenidos, programas, fechas, docentes y aranceles se realiza exclusivamente en la planilla de Google Sheets:
> **`DAOM_Learning_Contenido_ET3`** (ID: `1LlUzvMbEoJ4-ATmecOCyRBgy19Hrib4cdkpyLaspjI4`).
> No intente modificar el catálogo tocando código de la plataforma web.

### 2.1 ¿Cómo Publicar una Capacitación en la Web?
Para que una capacitación (ej: `SEM-SQUATS`) aparezca visible para el público en la página principal y en `/catalogo`, deben cumplirse dos pasos en la pestaña **Capacitaciones** de Google Sheets:
1. En la columna `estado_editorial`, cambiar el valor de `borrador` a `publicado`.
2. En la columna `verificacion`, cambiar el valor de `pendiente` a `verificado`.
3. Presionar el botón **"Sincronizar Catálogo Ahora"** en el panel `/admin` (o esperar el ciclo automático de sincronización).

### 2.2 ¿Cómo Ocultar Temporalmente una Capacitación?
Para despublicar una capacitación sin borrar sus datos:
- Cambiar la columna `estado_editorial` a `borrador` o `archivado`.
- Al sincronizar, la capacitación dejará de ser visible inmediatamente para el público, pero se conservará en el panel de administración.

---

## 3. Gestión de Modalidades y Aranceles

En la pestaña **Precios** de Google Sheets:
- **Mercado Argentino:** Debe registrarse con código `AR` y moneda `ARS`. Los cobros se liquidan mediante Mercado Pago.
- **Mercado Internacional:** Debe registrarse con código `INT` y moneda `USD`. Los cobros se liquidan mediante Stripe.
- **Regla de Equivalencia:** Presencial y Streaming comparten el mismo precio base.
- **Modalidad On Demand:** Si el alumno adquiere la capacitación antes de la fecha del evento, abona el precio base. Si la adquiere a partir del día del evento, el sistema le liquida automáticamente un 35% de recargo.

---

## 4. Gestión de Cambios de Modalidad

Cuando un participante solicita pasar de una modalidad a otra (ej: de Presencial a Streaming):
- La plataforma no efectúa el traspaso a ciegas: registra la solicitud en la base de datos para que el bot o el personal administrativo verifique si hay vacante física disponible.
- Si la solicitud fue realizada **7 o más días antes** de la fecha de inicio: no tiene recargo (0%).
- Si la solicitud fue realizada **con menos de 7 días de antelación**: el sistema calcula automáticamente un recargo del **25%** sobre el precio base.

---

## 5. Carga y Reemplazo del Archivo ZIP de Materiales

Cada capacitación dispone de un archivo ZIP de material complementario (`material-[capacitacion_id].zip`):
- Los archivos se alojan en el directorio protegido del servidor (`./data/materials/`) o en el bucket seguro de almacenamiento.
- El sistema habilita la descarga al alumno de forma inmediata en cuanto se registra el pago aprobado.
- Ningún usuario puede descargar el archivo sin una inscripción confirmada.

---

## 6. Monitoreo de Auditoría y Estado del Sistema

En la parte inferior del panel `/admin` se visualizan:
1. **Historial de Sincronizaciones (`sync_runs`):** Permite verificar la hora exacta de la última sincronización, cuántos registros fueron leídos y si se detectó algún error de formato en Google Sheets.
2. **Registro de Auditoría (`audit_logs`):** Detalla inicio de sesiones, pagos acreditados, solicitudes de cambio de modalidad y descargas de materiales ZIP con indicación de fecha, hora e IP.
