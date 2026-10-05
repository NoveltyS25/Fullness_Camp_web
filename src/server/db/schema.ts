/**
 * Esquema de la base de datos (SQLite hoy; MySQL en Hostinger después).
 * Reglas para que sea portable:
 *  - ids como texto (UUID generado por la aplicación),
 *  - fechas como texto ISO 8601 en UTC,
 *  - booleanos como 0/1,
 *  - sin funciones propias de SQLite dentro de las consultas (las fechas "de hoy" se pasan como parámetro).
 * Ver docs/BASE-DE-DATOS.md para la lista de diferencias al pasar a MySQL.
 */
export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  cedula TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp_phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  password_hash TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  notify_email INTEGER NOT NULL DEFAULT 1,
  notify_whatsapp INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  attempt_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_key_idx ON login_attempts (attempt_key, created_at);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  buyer_cedula TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL,
  total INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  coupon_code TEXT,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  attribution TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  program_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  list_price INTEGER NOT NULL,
  discount INTEGER NOT NULL,
  total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  program_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sede TEXT NOT NULL CHECK (sede IN ('Bogotá', 'Cajicá', 'Tabío', 'Online')),
  teacher_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  starts_on TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Una inscripción = derecho a entrar al campus a ver ese programa. cohort_id puede quedar vacío
-- cuando la persona pagó pero aún no se le asigna grupo.
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  program_slug TEXT NOT NULL,
  cohort_id TEXT REFERENCES cohorts (id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, program_slug, order_id)
);
CREATE INDEX IF NOT EXISTS enrollments_cohort_idx ON enrollments (cohort_id, status);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES cohorts (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  location TEXT,
  online_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_cohort_idx ON sessions (cohort_id, starts_at);

CREATE TABLE IF NOT EXISTS session_changes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  changed_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  old_data TEXT NOT NULL,
  new_data TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions (id) ON DELETE CASCADE,
  change_id TEXT REFERENCES session_changes (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at);

-- Cola de avisos externos (correo / WhatsApp) por cambio de horario.
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'logged', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  claimed_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (notification_id, channel)
);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON deliveries (status, created_at);

-- Personas interesadas que dejaron sus datos en una landing (pidieron información o que les avisen cuando abra un programa).
-- attribution guarda de qué campaña llegaron (utm_*). De la IP solo se guarda un hash, para frenar el spam.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  program_slug TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  interest TEXT NOT NULL CHECK (interest IN ('info', 'waitlist')),
  attribution TEXT,
  ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at);
CREATE INDEX IF NOT EXISTS leads_ip_idx ON leads (ip_hash, created_at);

-- Registro de TODO lo que el sistema envía (correos y WhatsApp). Sirve de auditoría y, en modo
-- demostración, de "bandeja" para ver los mensajes sin enviarlos de verdad.
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  to_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT NOT NULL,
  body_html TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'logged', 'failed')),
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS outbox_created_idx ON outbox (created_at);
`;
