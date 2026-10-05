# Campus virtual y pagos

## Cómo funciona de principio a fin

1. **Carrito:** la persona agrega programas. Los descuentos se calculan en el servidor (certificaciones 15 %, talleres 10 %,
   retiros solo con cupón).
2. **Checkout** (`/checkout`): escribe nombre, **cédula**, correo y WhatsApp (opcional) y acepta los términos.
3. **Pago:** hoy es una pasarela de **demostración** (`/pago/demo/…`) sin dinero real ni datos de tarjeta. Con Bold será la
   misma lógica: la pasarela confirma el pago y se ejecuta `completeOrder()` en [src/server/orders.ts](../src/server/orders.ts).
4. **Al confirmarse el pago**, de una sola vez y sin duplicar si la pasarela avisa dos veces:
   - se crea la cuenta del campus con la cédula (o se reutiliza si ya existía),
   - se inscribe a la persona en cada programa y en un grupo abierto, si lo hay,
   - se envía un **correo con el paso a paso** y una contraseña temporal.
5. **Primer ingreso** (`/campus/ingresar`): cédula + contraseña temporal. El campus **obliga a crear una contraseña propia**
   antes de mostrar nada.
6. **Acceso:** al entrar se consulta la base de datos. Solo ve el contenido quien tiene una **inscripción activa** (pago
   confirmado o inscripción manual). Sin ella ve «Aún no tienes un programa activo».

## Roles

- **Estudiante:** ve sus programas, su horario, sus avisos y su perfil.
- **Profesora:** además ve «Mis clases» y puede **mover o cancelar** una clase con un motivo. Se avisa a cada estudiante
  inscrita en el campus, por correo y por WhatsApp (según sus preferencias).
- **Administradora:** además tiene «Administración»: crea cohortes y clases (también repetidas cada semana), inscribe
  manualmente (por ejemplo pagos por transferencia: si la cédula no tiene cuenta, la crea y envía el acceso), cambia
  inscripciones a activa/pausada/cancelada y crea cuentas de profesoras.

## Seguridad

- Contraseñas con *hash* (scrypt); nunca se guardan ni se muestran. La temporal solo viaja en el correo de bienvenida.
- Bloqueo de 15 minutos tras 5 intentos fallidos por cédula (20 por IP). Mismo mensaje si la cédula no existe.
- Cookie de sesión `httpOnly`, `sameSite=lax` y `secure` en producción. La sesión se valida contra la base de datos en cada
  visita y se cierran las demás sesiones al cambiar la contraseña.
- Recuperar contraseña: enlace de un solo uso que vence en 1 hora; la respuesta es la misma exista o no la cuenta.
- Todas las acciones de profesoras y administradoras se verifican **en el servidor**, no solo en la pantalla.
- Los precios nunca vienen del navegador: el servidor los recalcula con el catálogo.

## Demostración

Con `DEMO_MODE=true` (solo en tu computador, **nunca en producción**):

- `/pago/demo/…` simula el pago (aprobado o rechazado).
- `/demo/bandeja` muestra los correos y WhatsApp que el sistema habría enviado.

Preparar datos: `npm run db:reset` y luego abrir el sitio con `npm run dev`. Las cuentas de demostración quedan en
`data/demo-credenciales.txt`.

## Avisos reales (cuando haya cuentas)

- **Correo (Resend):** `RESEND_API_KEY` y `RESEND_FROM`. Hay que verificar el dominio (registros DNS).
- **WhatsApp (Meta Cloud API):** `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`, más una **plantilla aprobada por Meta**
  (categoría *Utilidad*, idioma *Español*) llamada `cambio_de_horario`:

  > Hola {{1}}, tu clase {{2}} {{3}}. Revisa tu horario en el campus de Fullness Camp.

Sin esas llaves, los envíos solo quedan registrados en la bandeja. Si un envío falla se reintenta hasta 3 veces; un cron
puede llamar a `GET /api/notificaciones/procesar` con `Authorization: Bearer <CRON_SECRET>`.

## Pruebas

- `npm test`: precios y descuentos, mensajes, horas de Colombia, teléfonos, contraseñas, ingreso con bloqueo, pedidos,
  pago idempotente, creación de cuenta y recuperación de contraseña (29 pruebas).
- Se probó además de punta a punta en un navegador real (24 comprobaciones): compra, correo, primer ingreso, cambio de
  contraseña, acceso según pago, bloqueo por intentos, cambio de horario por una profesora y aviso a estudiantes.
