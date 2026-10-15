# Lista para pasar a producción

Marca cada punto cuando esté hecho. Lo que depende de otras personas dice quién.

## 1. Reseñas reales de Google de las sedes (RECORDAR)

Hoy el sitio muestra 3 reseñas reales de Google **guardadas** del sitio anterior. En producción deben traerse en vivo de las
sedes de Tabío, Cajicá y Bogotá, con la calificación real y el número de reseñas. El código ya está hecho
([src/server/google-reviews.ts](../src/server/google-reviews.ts)); solo falta conectarlo:

- [ ] Crear un proyecto en Google Cloud (con facturación activada) y habilitar **Places API (New)**.
- [ ] Crear una clave de API y **restringirla** a Places API (y a la IP del servidor si es posible).
- [ ] Guardarla como `GOOGLE_PLACES_API_KEY` en las variables del hosting (nunca en GitHub ni en el chat).
- [ ] Opcional pero recomendado: poner el *Place ID* de cada sede (`GOOGLE_PLACE_ID_TABIO`, `_CAJICA`, `_BOGOTA`). Se necesitan los
      enlaces de Google Maps de Cajicá y Bogotá (solo se tiene el de Tabío).
- [ ] Revisar en la página de inicio y en una landing que aparezcan la calificación y las reseñas de cada sede.

## 2. Hosting y dominio (la persona que administra el hosting)

- [ ] Confirmar que el plan de Hostinger incluye **Node.js** (Business o Cloud) o contratar un VPS. El hosting PHP compartido no sirve.
- [ ] Respaldo completo del WordPress actual (archivos y base de datos) y guardarlo 30 días.
- [ ] Cambiar contraseñas del hosting, FTP y base de datos (la de FTP se compartió por chat).
- [ ] Apuntar el dominio al sitio nuevo cambiando solo los registros A/CNAME. **No tocar los registros MX** (el correo está en ese hosting).
- [ ] Mantener el hosting actual al menos 30 días después del lanzamiento.
- [ ] Redirecciones 301 desde las URLs de WordPress a las nuevas. Las URLs de spam no se redirigen.

## 3. Configuración del sitio

- [ ] `MAINTENANCE_MODE=false` solo el día del lanzamiento.
- [ ] **`DEMO_MODE=false`** (o ausente): apaga el pago simulado y la bandeja de correos. Con `true` cualquiera podría "pagar" sin pagar.
- [ ] `NEXT_PUBLIC_SITE_URL` con la dirección final.
- [ ] Base de datos MySQL de Hostinger (ver [BASE-DE-DATOS.md](BASE-DE-DATOS.md)): escribir el adaptador, migrar el esquema y probar.
- [ ] `CRON_SECRET` y un cron que llame a `/api/notificaciones/procesar`.
- [ ] Recrear las cuentas reales (administradora, profesoras) y **no** usar las cuentas de demostración.

## 4. Pagos, correo y WhatsApp

- [ ] **Bold:** llaves de API, enlace de pago, webhook que llame a `completeOrder()`, y confirmar si permite cobrar en USD (`USD_COP_RATE`).
- [ ] **Resend:** verificar el dominio (SPF y DKIM) y poner `RESEND_API_KEY` y `RESEND_FROM`.
- [ ] **WhatsApp (Meta Cloud API):** negocio verificado, plantilla `cambio_de_horario` aprobada, `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`.

## 5. Legal y confianza

- [ ] **Términos y condiciones** y **política de tratamiento de datos personales** (Ley 1581 de 2012: se recogen cédula, correo y teléfono). Hoy los formularios dicen que se publicarán.
- [ ] Política de cookies y aviso de consentimiento antes de instalar analítica o píxeles.
- [ ] **Revisar con la abogada el contrato y las 6 políticas nuevas**: la lista de hallazgos y preguntas está en [POLITICAS-ANALISIS.md](POLITICAS-ANALISIS.md) (plazo de devolución de 15 días, cita del art. 47, retracto en retiros, exoneración de responsabilidad, datos de salud, finalidades de datos e imagen, cláusula penal).
- [ ] Verificar que lo que se anuncia (200 h, 300 h, 500 h, Kids, Prenatal) coincide con las credenciales visibles en el perfil de Yoga Alliance de la escuela.
- [ ] Confirmar el nombre legal y el NIT (hoy «Fullness Camp Internacional», NIT 900771531, tomados del contrato) con el RUT y el certificado de Cámara de Comercio, y actualizarlos en [src/lib/brand.ts](../src/lib/brand.ts).

## 5b. Quejas y denuncias (/quejas) — PEDIR AL CLIENTE

- [ ] **El correo al que deben llegar las quejas y denuncias** (el que revisa el «órgano de revisión»: Recursos Humanos o la dirección). Se pone en la variable `COMPLAINTS_EMAIL`. El aviso solo trae el radicado y el tipo; el detalle se lee en el panel `/campus/admin/quejas` (solo administradoras).
- [ ] Confirmar quién integra el órgano de revisión y que esa persona tenga cuenta de administradora.
- [ ] Revisar con la abogada: la política dice que una denuncia **anónima** puede desestimarse, por eso el formulario pide nombre y correo. Si quieren aceptar anónimas, hay que cambiar la política y el formulario.
- [ ] Las políticas prometen revisar en 30 días hábiles; el panel marca «Plazo vencido». Alguien debe revisarlo con frecuencia.

## 5c. Bienvenida a las docentes al campus (enviar SOLO al pasar a producción)

Los correos están en `data/profes-correos.txt` (carpeta ignorada por git: no se suben a GitHub). Faltan los de **Lila Govardhan** y **William Feragotto**.
El correo de Paula Salazar sirve para pruebas y también es docente real.

- [ ] **Diseñar el correo de bienvenida y mostrarlo antes de enviar** (se aprueba el diseño; no se envía nada hasta producción).
- [ ] El correo dice: bienvenida al campus virtual de Fullness Camp, entrar con el enlace para **crear su contraseña**, y que el **primer paso** es registrar sus clases y horarios y a qué certificación corresponde cada clase.
- [ ] Crear las cuentas de profesora (rol `teacher`) solo con nombre y correo; cada una escribe su cédula en su primer ingreso (no hay que pedírselas antes).
- [ ] Perfil de la docente en el campus: **foto** (subir imagen; hoy solo acepta un enlace) y nombre/cargo.
- [ ] Sección «Clases grabadas» por docente: pegan enlaces (por ahora de Google Meet) y se abren en **una ventana nueva** sin salir del campus.
- [ ] Paso a paso de primer ingreso para la docente: 1) crear contraseña, 2) subir foto, 3) registrar clases y horarios por certificación, 4) agregar enlaces de grabaciones.
- [ ] Desarrollo pendiente en el campus (se hace antes de producción): subida de foto de perfil y enlaces de grabaciones por clase. Las docentes crean sus clases y horarios; la administración arma las certificaciones.
- [ ] Editor para **crear certificaciones nuevas** desde el panel (hoy salen del catálogo de programas).

## 5d. Aceptación del contrato y las políticas (por construir)

- [ ] Registro de aceptación: casillas separadas (contrato y políticas, datos, salud, imagen, comunicaciones, inicio anticipado), evidencia guardada (versión exacta, fecha y hora, IP, navegador), copia por correo y aceptación dentro del campus para quienes ya están inscritas. Ver propuesta en [POLITICAS-ANALISIS.md](POLITICAS-ANALISIS.md).
- [ ] Publicar la **política de tratamiento de datos personales**, el aviso de privacidad y la política de cookies; definir el correo oficial del dominio para solicitudes (hoy los documentos dicen fullnesscamp.bogota@gmail.com).
- [ ] Decidir si se actualizan también las políticas de asistencia, anti-acoso, anti-represalias y quejas (siguen siendo las anteriores).

## 6. Medición y buscadores

- [ ] Google Search Console (verificar el dominio, enviar `/sitemap.xml`; ya hay un archivo de verificación en el sitio anterior).
- [ ] Google Tag Manager / GA4 / píxel de Meta con consentimiento (los eventos ya se envían a `dataLayer`).
- [ ] Probar el sitio compilado con Lighthouse y revisar Core Web Vitals reales en Search Console tras unas semanas.

## 7. Contenido pendiente

Ver [PENDIENTES-ACTUALIZAR.md](PENDIENTES-ACTUALIZAR.md): fechas de cohortes, PDF actualizados, testimonios en video, docente sin foto, etc.
