# Base de datos

## Hoy (desarrollo y demostración)

SQLite en un archivo local: `data/fullness.sqlite` (la carpeta `data/` no se sube a GitHub). No hace falta instalar
nada: usa el SQLite que ya trae Node 24. El esquema está en [src/server/db/schema.ts](../src/server/db/schema.ts)
y se crea solo la primera vez.

Comandos:

- `npm run db:seed` agrega datos de demostración (cohortes con 12 clases semanales, una profesora, una administradora
  y una estudiante inscrita) sin borrar nada. Las contraseñas se muestran en pantalla y quedan en
  `data/demo-credenciales.txt`.
- `npm run db:reset` borra la base de datos local y la deja como nueva.

## Tablas

| Tabla | Para qué sirve |
|---|---|
| `users` | Cuentas (estudiantes, profesoras, administradoras). El usuario es la **cédula**. Guarda el hash de la contraseña, nunca la contraseña. |
| `auth_sessions` | Sesiones iniciadas (se guarda el hash del identificador, no el identificador). |
| `login_attempts` | Intentos fallidos, para bloquear 15 minutos tras 5 fallos por cédula o 20 por IP. |
| `password_resets` | Enlaces de un solo uso para crear una contraseña nueva (vencen en 1 hora). |
| `orders`, `order_items` | Pedidos y lo que incluye cada uno, con los precios calculados en el servidor. |
| `cohorts`, `enrollments` | Grupos y quién está inscrita. Una inscripción **activa** es lo que da acceso al campus. |
| `sessions`, `session_changes` | Clases y el historial de cambios de horario (quién, antes/después y motivo). |
| `notifications`, `deliveries` | Avisos dentro del campus y la cola de correos/WhatsApp por cada cambio. |
| `outbox` | Registro de todo lo que el sistema envía. En demostración es la «bandeja» (`/demo/bandeja`). |

## Cómo se decide quién entra al campus

1. Entra con cédula y contraseña (si falla, mismo mensaje exista o no la cédula).
2. Si la contraseña es temporal, obliga a crear una propia antes de ver nada.
3. Una **estudiante** solo ve contenido si tiene una inscripción **activa** (creada al confirmarse un pago, o por una
   administradora). Sin eso ve «Aún no tienes un programa activo». Profesoras y administradoras entran siempre.
4. Si un pago se reembolsa, la administradora pone la inscripción en «cancelada» y se corta el acceso.

## Pasar a Hostinger (MySQL)

Todo el código habla con la base de datos a través de la interfaz `Db` de
[src/server/db/index.ts](../src/server/db/index.ts) (`all`, `get`, `run`, `transaction`, con parámetros `?`).
Para pasar a MySQL:

1. Escribir `MysqlDb implements Db` con `mysql2/promise` (un *pool*, y `transaction` con una conexión dedicada).
2. Convertir el esquema: `TEXT` de fechas a `DATETIME` (o dejarlas `VARCHAR(30)`), `INTEGER` booleanos a `TINYINT(1)`,
   `TEXT` de claves/ids a `CHAR(36)` o `VARCHAR(36)`, y quitar los `PRAGMA`. Los `CHECK` funcionan en MySQL 8.
3. Revisar consultas: son estándar (`JOIN`, `COUNT`, `LIMIT ?`, inserciones de varias filas). No usan funciones propias
   de SQLite; las fechas «de hoy» se pasan como parámetro.
4. Mover los datos (exportar de SQLite e importar a MySQL) y apuntar la aplicación a la nueva conexión.

**Importante antes de decidir el hosting:** Next.js necesita un servidor con Node.js. El hosting compartido con PHP no
sirve para esto. Hay que confirmar con quien administra Hostinger si el plan incluye **Node.js** (los planes Business o
Cloud suelen tenerlo, o un VPS). Con Vercel u otro servicio sin disco permanente, SQLite tampoco funciona: se usaría MySQL
desde el principio. El archivo SQLite sirve para el computador de desarrollo y para la demostración.
