# Campus virtual: cómo funciona

Resumen del modelo (octubre de 2026). Todo ingresa con **cédula + contraseña**; las docentes se crean solo con nombre y correo y escriben su cédula en su primer ingreso.

## Modelo

- **Asignatura** (tabla `classes`): lo que dicta una docente y lo que la estudiante **aprueba** («Historia y filosofía», «Biomecánica aplicada al yoga»…). Sus **clases** (`class_lessons`: «Clase 1», «Clase 2»…) son los encuentros, cada uno con sus temas; la docente le pone **fecha, hora y lugar o enlace** a cada una.
- **Certificado**: módulos nombrados **«Módulo 1», «Módulo 2»…** (`curriculum_modules`) y, dentro, asignaturas (`module_classes`). Una asignatura se dicta **una sola vez** aunque esté en varios certificados (por ejemplo, «Historia y filosofía» está en Hatha 200, Pilates y Hatha 300); sus estudiantes son las de todos.
- **Docentes**: una titular (`classes.teacher_id`) y, si hace falta, docentes adicionales (`class_teachers`), como Lila y la Dra. Celi en «Ciclo lunar». Las adicionales ven la asignatura, programan horarios y marcan resultados.
- **Eventos** (`classes.is_event`): retiros y talleres presenciales. Sus fechas las ponen la docente o la administración en cualquier momento, sin ciclo, y también cuentan para graduarse.
- **Cohortes**: solo grupos de estudiantes (sede, fecha de inicio); no tienen docente ni clases propias.
- Los 5 certificados están en `src/data/pensum-seed.ts` (documento «Organización de certificados»): Yoga Kids y Prenatal, Hatha Vinyasa 200 h, Yoga y Pilates, Hatha Vinyasa y Meditación 300 h, y la Maestría. Se siembran la primera vez que se piden y cada asignatura queda a nombre de su docente en cuanto existe su cuenta (por correo). En una base ya sembrada con otro pensum: `node scripts/aplicar-organizacion.ts` (borra el pensum anterior de esos 5 certificados y siembra el nuevo; hacer copia antes).

## Ciclos

- Cada docente tiene **ciclos**, nombrados con el mes y año en que se crean («Octubre 2027»; si hay dos en el mismo mes, «Octubre 2027 (2)»).
- En *Mis clases → Iniciar ciclo / Programar mis clases* ve **todas sus asignaturas, con el certificado y el módulo donde aparecen**, y les pone fecha y hora a sus clases. Puede saltarse una asignatura ese ciclo.
- **Iniciar un ciclo nuevo cierra el anterior.** Sin ciclo activo no se puede programar (salvo eventos).
- Las estudiantes ven solo los horarios del **ciclo activo**. La que **aprobó** una asignatura no vuelve a ver sus horarios; la que **no aprobó** la ve de nuevo en el ciclo siguiente, y su «no aprobada» anterior se reinicia al empezar la asignatura en un ciclo nuevo (queda en el historial `class_results` con su ciclo).

## Tres paneles con la misma cédula

- **Administración**: panel, certificaciones (editar módulos y asignaturas), clases y docentes, interesadas, quejas. Puede marcar una docente como **suplente** (no aprueba estudiantes).
- **Docente**: calendario mensual, mi ciclo, mis clases, mis estudiantes (nombre y certificado). Solo la docente de la asignatura marca **en curso / aprobada / no aprobada**.
- **Estudiante**: horario mensual por certificado (ventana con toda la información al tocar una clase), **Mi avance** (pendiente / en curso / aprobada / no aprobada; graduarse = aprobar todas las asignaturas, incluidos retiros y talleres, más la tesina que se presenta a Lila), Mis cursos (activos y terminados con certificado), plan de estudios con docentes y contacto.
- «Ver como» cambia de panel; la elección se recuerda en una cookie.

## Suplencias

- La titular le pide a otra docente (con registro completo) que la supla en una asignatura; la otra recibe aviso en el campus y por correo y **acepta o rechaza**. Al aceptar, **la asignatura pasa a su nombre** (sus horarios pasan a su ciclo activo) y **las estudiantes no reciben aviso** del cambio de docente. Los cambios de fecha u hora que haga después **sí** se les avisan.
- Si quien acepta es **suplente** (`users.can_grade = 0`, como Laura Quintero), queda como docente adicional: da la clase y cambia horarios, pero **la nota la sigue poniendo la titular**.

## Aceptación del contrato y las políticas

- Al pagar: casillas separadas (contrato y políticas, datos, salud; inicio anticipado si el programa empieza en 5 días hábiles; imagen y novedades opcionales). Se guarda la evidencia (`acceptances` / `acceptance_documents`: huella SHA-256 de cada PDF, IP, navegador, fecha y hora) y el correo de bienvenida trae los enlaces como copia.
- Una estudiante con un documento vigente sin aceptar (nueva, importada o por cambio de un PDF) pasa por `/campus/aceptar` antes de ver nada; la página de cada cohorte indica si todas aceptaron. Para actualizar un documento se reemplaza su PDF en `public/politicas/` con el mismo nombre. Los textos de las casillas son provisionales hasta que la abogada los revise (`src/components/AcceptanceFields.tsx`).

## Docentes: ingreso y primer registro

- Se crean desde Administración o con `node scripts/create-staff.ts --role teacher --name "…" --email …` (opcional `--no-grade` para suplentes). Llevan un código provisional `PEND-…` hasta que escriben su cédula en `/campus/bienvenida-docente` (nombre, cédula, correo y celular de contacto).
- Si el enlace vence, «Olvidé mi contraseña» acepta el correo con la cédula vacía mientras el registro está pendiente. `create-staff` también sube de rol una cuenta existente (por ejemplo, una compra de prueba).

## Curso terminado y certificado

La administración marca el curso como terminado en la página de la cohorte: genera el código `FC-XXXXXXXX` y el certificado imprimible en `/campus/certificado/[id]`; las terminadas dejan de recibir avisos de horario.

## Datos de demostración

`npm run db:seed` crea las cuentas demo (administradora, docente, estudiante) y las cohortes. Las asignaturas reales no se siembran con datos de prueba: para ver un horario basta que una docente real (por ejemplo, Paula con «El yoga como fuente de ingresos y de servicio») inicie su ciclo y programe.
