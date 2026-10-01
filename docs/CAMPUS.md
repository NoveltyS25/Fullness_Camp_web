# Campus virtual: guía de puesta en marcha

Qué hace: las estudiantes entran con un enlace que llega a su correo (sin contraseña), ven su horario y
sus avisos. Las profesoras mueven o cancelan sus clases; al guardar, cada estudiante inscrita recibe un
aviso en la plataforma y, según sus preferencias, por correo y por WhatsApp.

## 1. Crear el proyecto en Supabase (una sola vez)

1. Crear una cuenta y un proyecto en https://supabase.com (región cercana, por ejemplo São Paulo).
2. En **SQL Editor** pegar todo [supabase/migrations/0001_campus.sql](../supabase/migrations/0001_campus.sql) y pulsar **Run**.
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

## 4. Crear profesoras, cohortes, inscripciones y clases

Por ahora esto se hace en el **SQL Editor** de Supabase (el panel de administración vendrá después y,
cuando esté el pago con Bold, las inscripciones se harán solas al pagar).

```sql
-- Hacer profesora (la persona ya debe haber entrado una vez al campus con su correo)
update profiles set role = 'teacher', full_name = 'Lila Góvardhan' where email = 'profesora@correo.com';
-- Hacer administradora
update profiles set role = 'admin' where email = 'admin@correo.com';

-- Crear una cohorte con su profesora
insert into cohorts (program_slug, name, sede, teacher_id, starts_on)
select 'hatha-vinyasa-yoga-y-meditacion', 'Hatha Vinyasa 300h - Bogotá 2026', 'Bogotá', id, '2026-11-03'
from profiles where email = 'profesora@correo.com';

-- Inscribir una estudiante
insert into enrollments (cohort_id, student_id)
select c.id, p.id from cohorts c, profiles p
where c.name = 'Hatha Vinyasa 300h - Bogotá 2026' and p.email = 'estudiante@correo.com';

-- Programar una clase (la hora va en UTC: 6:00 p. m. de Colombia = 23:00 UTC)
insert into sessions (cohort_id, title, starts_at, ends_at, location)
select id, 'Módulo 1: Fundamentos', '2026-11-03T23:00:00Z', '2026-11-04T01:00:00Z', 'Sede Bogotá'
from cohorts where name = 'Hatha Vinyasa 300h - Bogotá 2026';
```

## 5. Reintentos de envíos

Si un correo o WhatsApp falla, se reintenta hasta 3 veces. Un cron debe llamar a
`GET /api/notificaciones/procesar` con la cabecera `Authorization: Bearer <CRON_SECRET>`
(Vercel lo envía solo si defines la variable `CRON_SECRET`).

## Pruebas

- `npm test`: precios, mensajes, horas de Colombia y teléfonos.
- `npm run test:db`: levanta un PostgreSQL en memoria, aplica la migración y verifica 31 reglas de seguridad
  y del cambio de horario (quién ve qué, que una estudiante no pueda volverse administradora, que solo la
  profesora de la cohorte cambie sus clases, quién recibe aviso y por qué canal).
