import { newId, nowIso, type Db } from "./db/index.ts";
import { generateToken, hashPassword, hashToken, normalizeCedula, verifyPassword } from "./security.ts";
import { USER_COLUMNS, type User } from "./users.ts";

const SESSION_DAYS = 14;
const MAX_FAILS_PER_CEDULA = 5;
const MAX_FAILS_PER_IP = 20;
const WINDOW_MS = 15 * 60_000;

// Hash de relleno: si la cédula no existe se verifica igual, para que la respuesta tarde lo mismo.
const dummyHash = hashPassword("relleno-para-igualar-tiempos");

export type LoginResult =
  | { ok: true; user: User; token: string }
  | { ok: false; reason: "invalid" | "locked" | "bad-input" };

async function recentFails(db: Db, key: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const row = await db.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM login_attempts WHERE attempt_key = ? AND created_at >= ?",
    [key, since],
  );
  return Number(row?.n ?? 0);
}

export async function createSession(db: Db, userId: string): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600_000).toISOString();
  await db.run("INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)", [
    hashToken(token),
    userId,
    expires,
    nowIso(),
  ]);
  return token;
}

/** Valida cédula + contraseña. Límite: 5 fallos por cédula y 20 por dirección IP cada 15 minutos. */
export async function login(db: Db, cedulaInput: string, password: string, ip: string): Promise<LoginResult> {
  const cedula = normalizeCedula(cedulaInput);
  if (!cedula || !password) return { ok: false, reason: "bad-input" };

  const [byCedula, byIp] = await Promise.all([recentFails(db, `c:${cedula}`), recentFails(db, `ip:${ip}`)]);
  if (byCedula >= MAX_FAILS_PER_CEDULA || byIp >= MAX_FAILS_PER_IP) return { ok: false, reason: "locked" };

  const row = await db.get<User & { password_hash: string }>(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE cedula = ?`,
    [cedula],
  );
  const valid = await verifyPassword(password, row ? row.password_hash : await dummyHash);

  if (!row || !valid) {
    const at = nowIso();
    await db.run("INSERT INTO login_attempts (id, attempt_key, created_at) VALUES (?, ?, ?), (?, ?, ?)", [
      newId(), `c:${cedula}`, at,
      newId(), `ip:${ip}`, at,
    ]);
    return { ok: false, reason: "invalid" };
  }

  await db.run("DELETE FROM login_attempts WHERE attempt_key = ?", [`c:${cedula}`]);
  const { password_hash: _omit, ...user } = row;
  void _omit;
  return { ok: true, user, token: await createSession(db, user.id) };
}

export async function getUserBySessionToken(db: Db, token: string): Promise<User | undefined> {
  return db.get<User>(
    `SELECT ${USER_COLUMNS.split(", ").map((c) => `u.${c}`).join(", ")}
     FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [hashToken(token), nowIso()],
  );
}

export async function destroySession(db: Db, token: string): Promise<void> {
  await db.run("DELETE FROM auth_sessions WHERE token_hash = ?", [hashToken(token)]);
}

/** Enlace de un solo uso para crear una contraseña. Por defecto vale 1 hora (recuperación). */
export async function createPasswordReset(db: Db, userId: string, ttlMs = 3600_000): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + ttlMs).toISOString();
  await db.run("INSERT INTO password_resets (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)", [
    hashToken(token),
    userId,
    expires,
    nowIso(),
  ]);
  return token;
}

/** Consume el enlace (una sola vez) y devuelve de quién es; undefined si no vale. */
export async function consumePasswordReset(db: Db, token: string): Promise<string | undefined> {
  return db.transaction(async (tx) => {
    const row = await tx.get<{ user_id: string }>(
      "SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
      [hashToken(token), nowIso()],
    );
    if (!row) return undefined;
    await tx.run("UPDATE password_resets SET used_at = ? WHERE token_hash = ?", [nowIso(), hashToken(token)]);
    return row.user_id;
  });
}

export async function peekPasswordReset(db: Db, token: string): Promise<boolean> {
  const row = await db.get(
    "SELECT 1 AS ok FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
    [hashToken(token), nowIso()],
  );
  return !!row;
}

const SETUP_LINK_DAYS = 7;

/**
 * Enlace para que una cuenta nueva cree su propia contraseña. Vale 7 días (quien paga puede tardar en leer el correo);
 * si vence, la persona usa "Olvidé mi contraseña" con su cédula y correo.
 */
export async function createSetupLink(db: Db, userId: string, baseUrl: string): Promise<string> {
  const token = await createPasswordReset(db, userId, SETUP_LINK_DAYS * 24 * 3600_000);
  return `${baseUrl}/campus/restablecer?token=${token}&bienvenida=1`;
}
