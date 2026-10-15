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
   - se envía un **correo con el paso a paso** y un **enlace para crear su contraseña** (un solo uso, vale 7 días).
5. **Crear la contraseña:** con el enlace del correo, la persona elige su propia contraseña (mínimo 8 caracteres, con letra y
   número). **Nunca viaja una contraseña por correo.** Si el enlace venció, usa «Olvidé mi contraseña» con su cédula y correo.
   Luego entra en `/campus/ingresar` con su cédula (ya escrita) y la contraseña que creó.
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

- Contraseñas con *hash* (scrypt); nunca se guardan ni se muestran. La cuenta nueva nace con una clave al azar que nadie
  conoce hasta que la persona crea la suya con el enlace.
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

## Modelo del campus: clases de las docentes, certificaciones de la administración

- **Clase** (`classes`): lo que dicta una docente («Marketing», «Biomecánica»…). La docente la crea en *Mis clases* y define sus **horarios** (`sessions`, con repetición semanal); puede cambiarlos y se avisa a las estudiantes (campus + correo + WhatsApp).
- **Certificación** (`curriculum_modules` → `module_classes`): la arma la administración en *Certificaciones*: módulos y, dentro de cada módulo, las clases. **Una misma clase puede estar en varias certificaciones**: sus estudiantes son las de todas ellas, y la docente ve a cada una con su certificación al lado (*Mis estudiantes*).
- Las certificaciones salen hoy del catálogo (`src/data/programs.ts`). Crear una certificación nueva desde el panel necesita el editor de programas y precios (pendiente). El pensum inicial de Hatha viene de `src/data/pensum-seed.ts`.
- Las **cohortes** son solo grupos de estudiantes (sede, fecha de inicio): ya no tienen docente ni clases propias.

## Tres paneles con la misma cédula

- **Administración** (rol administradora): panel, certificaciones, clases y docentes, interesadas, quejas.
- **Docente** (docentes y administradoras): calendario mensual de sus clases (cambia horarios), sus clases, sus estudiantes.
- **Estudiante** (quien tenga inscripción propia): horario, mis cursos activos y terminados (con certificado), plan de estudios con docentes y contacto.
- Una barra «Ver como» permite pasar de un panel a otro; la elección se recuerda en una cookie. Lila, por ejemplo, puede ser administradora (rol) y ver su panel de docente aparte.

## Curso terminado y certificado

La administración marca el curso como terminado en la página de la cohorte (*Marcar curso terminado*): genera el código `FC-XXXXXXXX` y el certificado imprimible en `/campus/certificado/[id]`. Las terminadas dejan de recibir avisos de horario. La tesina (obligatoria, se presenta a Lila) y los retiros (fuera del valor del programa; precio especial a estudiantes activas) se muestran como avisos en el plan.

## Docentes: ingreso y primer registro

- Todas las personas ingresan con **cédula + contraseña**. Una docente nueva se crea solo con nombre y correo (admin → *Crear la cuenta de una profesora*, o `node scripts/create-staff.ts --role teacher --name "…" --email …`). Hasta que escribe su cédula lleva un código provisional `PEND-…` que no sirve para ingresar.
- Recibe el enlace para crear su contraseña y entra a **/campus/bienvenida-docente**: nombre, cédula, correo y celular de contacto para estudiantes. Después agrega sus clases y horarios. Si ya hay una cuenta con esa cédula (por ejemplo, de estudiante), la administración une las cuentas.
- Si el enlace vence, «Olvidé mi contraseña» acepta el correo con la cédula vacía mientras el registro está pendiente.
- `node scripts/create-staff.ts --role admin --cedula … --name … --email …` también sube de rol una cuenta que ya existe y conserva sus inscripciones.

## Panel de estudiante: horario mensual

- *Mi horario* (`/campus`) muestra la cuadrícula mensual a todo el ancho, con las clases de **una** certificación a la vez. Si la estudiante tiene más de una, arriba a la derecha aparecen botones para cambiar (el mes y la certificación quedan en la dirección: `?cert=…&mes=…`). Al tocar una clase se abre una ventana con fecha, docente, modalidad, lugar o enlace, descripción y contacto de la docente.

## Temario por clases (ej.: «Anatomía y biomecánica del yoga», Alexa Pabón)

- Una clase puede traer un **temario por encuentros** (`class_lessons`: «Clase 1», «Clase 2»… cada una con su lista de temas). La docente le pone **fecha, hora y lugar o enlace a cada una** desde la página de la clase (*Mis clases → la clase → Temario y horarios*); se pide lugar si es presencial, enlace si es virtual, ambos si es mixta. Puede agregar o quitar clases del temario. Mover una ya programada usa «Cambiar horario» (avisa a las estudiantes).
- Las estudiantes ven el temario en el plan de estudios y los temas del encuentro en la ventana de cada clase del calendario.
- `src/data/pensum-seed.ts` define clases con temario y **docente prevista por correo** (`teacherEmail`): la clase queda a su nombre en cuanto se crea su cuenta (`claimSuggestedClasses`). Hoy: Anatomía y biomecánica del yoga → Alexa Pabón (8 clases, del PDF «Programa Anatomía y Biomecánica del Yoga»), dentro del módulo «Fundamentos del yoga» de Hatha 300 h, en lugar de «Biomecánica aplicada al yoga».
- En una base que ya tenía el pensum sembrado: `node scripts/aplicar-anatomia.ts` (idempotente).
- **Filosofía del yoga (Nitya)**: 3 módulos (*Historia*, *Fundamentos*, *Principios y cosmovisión*) y 10 clases, todas de Nitya (`nitya.portal@gmail.com`); cada clase se programa con «Agregar horarios». Van primero en Hatha 300 h; el módulo que tenía Anatomía y Asanas se llama ahora «Anatomía y asanas». En una base ya sembrada: `node scripts/aplicar-filosofia.ts`.
- **Laboratorio de asanas (Lila Govardhan)**: 8 clases (Surya Namaskara A y B, asanas de pie, sentadas, posturas supinas, Surya Namaskara clásico, serie de Rishikesh, formatos, metodología de la enseñanza), en el módulo «Anatomía y asanas» en lugar de «Asanas: alineación, beneficios y secuencias». Cada clase la programa Lila; el temario de cada una lo puede agregar ella. En una base ya sembrada: `node scripts/aplicar-asanas.ts`.
- **Fundamentos del yoga (Lila Govardhan)**: 8 clases (Prakriti, la estructura del ser, Anna Yoga, principios de alineación, respiración, Yoga Nidra, Vinyasa, secuenciación). Va al inicio del módulo «Fundamentos del yoga», que tiene además Anatomía y biomecánica (Alexa) y el Laboratorio de asanas (Lila). En una base ya sembrada: `node scripts/aplicar-fundamentos.ts`.
- **Ayurveda (parte de Lila)**: 4 clases (Generalidades del Ayurveda, Dinacharya y Ratricharya, Doshas, Alimentación). Ayurveda la dictan dos docentes; **falta la parte de la otra docente** (aún no se sabe quién es). Reemplaza «Introducción a la medicina Ayurveda» y «Doshas y gunas»; los talleres de cocina ayurveda siguen. En una base ya sembrada: `node scripts/aplicar-ayurveda.ts`.
- **Marketing digital (Paula Salazar)**: 6 clases (Fundamentos, Audiencia, Contenido, Ecosistema Meta, Bases de pauta, Lanzamiento), cada una con su tema principal y su objetivo práctico. Va en Hatha 300 h, módulo «El yoga como camino de vida», y se asigna a la cuenta con `noveltystudioscolombia@gmail.com`. En una base ya sembrada: `node scripts/aplicar-marketing.ts` (convierte la clase de prueba «Marketing Digital» de Paula, conserva sus horarios y quita la clase de demostración).
- **Ayurveda (parte de la Dra. Celi)**: 7 clases (Ayurveda para la mujer, Rasayana, ciclo femenino, alteraciones del ciclo, gestación, parto y posparto, climaterio-aborto-abuso sexual), correo `dracelymargarita@gmail.com`. En una base ya sembrada: `node scripts/aplicar-celi.ts`.

## Avance de la estudiante (ciclos y graduación)

- Cada docente dicta su asignatura en un **ciclo** con fechas propias; por eso las asignaturas no se ven en el orden del pensum. *Mi avance* (`/campus/avance`) muestra, en el orden del pensum, qué asignaturas están **pendientes por tomar**, **en curso**, **aprobadas** o **no aprobadas**, cuándo inicia el ciclo de cada una, el total aprobado y la explicación de los ciclos a un lado.
- Estados: *pendiente por tomar* hasta que empieza la primera clase de la asignatura; *en curso* automáticamente desde esa fecha. **Solo la docente de la asignatura** (no la administración ni la estudiante) puede marcar *en curso*, *aprobada* o *no aprobada*, o volver a lo automático, desde la página de la clase (*Estudiantes de esta clase*). Para graduarse hay que aprobar todas las asignaturas de la certificación (más la tesina y la confirmación de la escuela).

## Suplencias entre docentes

- Desde la página de una clase, su docente puede pedirle a otra docente (con registro completo) que la supla. La otra recibe un aviso en el campus y por correo, y ve la solicitud arriba en *Mis clases* para **aceptar o rechazar**.
- Al aceptar, **la clase pasa a su nombre** de inmediato (la docente anterior recibe el aviso). Las **estudiantes no reciben aviso** del cambio de docente: solo ven el nombre nuevo. La nueva docente puede cambiar horarios y marcar resultados; los cambios de fecha u hora **sí** se avisan a las estudiantes.
- Una sola solicitud pendiente por clase; quien la envió puede cancelarla. Si la clase cambió de docente mientras tanto, la solicitud se cancela.

## Aceptación del contrato y las políticas

- Al pagar, el checkout muestra casillas separadas: contrato y políticas del programa (obligatoria), datos (obligatoria), salud (obligatoria), inicio anticipado si el programa empieza en 5 días hábiles (obligatoria en ese caso), imagen y novedades (opcionales). Se guarda la evidencia en `acceptances` / `acceptance_documents` (huella SHA-256 de cada PDF, IP, navegador, fecha y hora) y el correo de bienvenida trae los enlaces como copia.
- Una estudiante con un documento vigente sin aceptar (nueva, importada o por cambio de un PDF) es llevada a `/campus/aceptar` antes de ver nada. La página de cada cohorte indica si cada estudiante tiene todo aceptado.
- Para actualizar un documento se reemplaza su PDF en `public/politicas/` con el mismo nombre: la huella cambia y se vuelve a pedir la aceptación.
