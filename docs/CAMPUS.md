# Campus virtual: guía de puesta en marcha

Qué hace: las estudiantes entran con un enlace que llega a su correo (sin contraseña), ven su horario y
sus avisos. Las profesoras mueven o cancelan sus clases; al guardar, cada estudiante inscrita recibe un
aviso en la plataforma y, según sus preferencias, por correo y por WhatsApp.

## 1. Crear el proyecto en Supabase (una sola vez)

1. Crear una cuenta y un proyecto en https://supabase.com (región cercana, por ejemplo São Paulo).
2. En **SQL Editor** pegar y ejecutar (**Run**), en este orden, los dos archivos:
   [0001_campus.sql](../supabase/migrations/0001_campus.sql) y luego [0002_admin.sql](../supabase/migrations/0002_admin.sql).
3. En **Project Settings → API** copiar:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable (anon) key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: solo en el servidor, nunca en el navegador ni en GitHub)
4. En **Authentication → URL Configuration**:
   - Site URL: la dirección final del sitio.
   - Redirect URLs: agregar `https://TU-DOMINIO/campus/callback` y `http://localhost:3000/campus/callback`.
5. En **Authentication → SMTP Settings** conectar Resend (el correo gratuito de Supabase solo envía unos pocos al día).

Las llaves van en `.env.local` (en tu equipo) y en las variables de entorno del hosting. Nunca se suben al repositorio.

## 2. Correo (Resend)

1. Cuenta en https://resend.com y verificar el dominio (registros DNS que debe agregar quien administre el dominio).
2. `RESEND_API_KEY` y `RESEND_FROM` (por ejemplo `Fullness Camp <avisos@fullnesscampinternacional.com>`).

## 3. WhatsApp (Meta Cloud API)

1. Cuenta de Meta Business verificada y una app con WhatsApp; número de teléfono del negocio.
2. Crear y enviar a aprobación esta **plantilla** (categoría *Utilidad*, idioma *Español*), nombre `cambio_de_horario`:

   > Hola {{1}}, tu clase {{2}} {{3}}. Revisa tu horario en el campus de Fullness Camp.

   Ejemplo de variables: `María` / `"Hatha Vinyasa"` / `ahora es el Jueves, 8 de octubre, 6:00 p. m. – 8:00 p. m. en Sede Bogotá. Motivo: cruce de agenda`.
3. Variables: `WHATSAPP_TOKEN` (token permanente del usuario del sistema), `WHATSAPP_PHONE_NUMBER_ID`.

Mientras Resend o WhatsApp no estén configurados, el cambio de horario igual se guarda y se avisa dentro de la
plataforma; los envíos externos quedan marcados como "omitidos".

## 4. Primera administradora y panel de administración

La primera administradora se crea **una sola vez** con SQL. Antes, esa persona debe entrar una vez al campus
(`/campus/ingresar`) con su correo para que exista su perfil:

```sql
update profiles set role = 'admin', full_name = 'Nombre Apellido' where email = 'admin@correo.com';
```

Desde ahí todo se hace en **/campus/admin**, sin SQL:

- **Profesoras y administradoras:** dar o quitar el rol por correo (la persona debe haber entrado antes al campus).
- **Cohortes:** crear una por programa, sede y profesora.
- **Clases:** en cada cohorte, crear una clase o repetirla cada semana (por ejemplo 12 semanas) a la misma hora de Colombia.
- **Estudiantes:** inscribir por correo y poner la inscripción en activa, pausada o cancelada. Las pausadas y
  canceladas no reciben avisos.
- Una clase creada se puede mover o cancelar con **Cambiar horario**, y eso avisa a las inscritas.

Cuando esté el pago con Bold, las inscripciones se harán solas al pagar.

## 5. Reintentos de envíos

Si un correo o WhatsApp falla, se reintenta hasta 3 veces. Un cron debe llamar a
`GET /api/notificaciones/procesar` con la cabecera `Authorization: Bearer <CRON_SECRET>`
(Vercel lo envía solo si defines la variable `CRON_SECRET`).

## Pruebas

- `npm test`: precios, mensajes, horas de Colombia y teléfonos.
- `npm run test:db`: levanta un PostgreSQL en memoria, aplica las migraciones y verifica 39 reglas de seguridad,
  de roles y del cambio de horario (quién ve qué, que una estudiante no pueda volverse administradora, que solo la
  profesora de la cohorte cambie sus clases, quién recibe aviso y por qué canal).
