import { newId, nowIso, type Db } from "./db/index.ts";
import { hashPassword } from "./security.ts";

export type Role = "student" | "teacher" | "admin";

export interface User {
  id: string;
  cedula: string;
  full_name: string;
  email: string;
  whatsapp_phone: string | null;
  role: Role;
  must_change_password: number;
  notify_email: number;
  notify_whatsapp: number;
}

export const USER_COLUMNS =
  "id, cedula, full_name, email, whatsapp_phone, role, must_change_password, notify_email, notify_whatsapp";

export function findUserByCedula(db: Db, cedula: string): Promise<User | undefined> {
  return db.get<User>(`SELECT ${USER_COLUMNS} FROM users WHERE cedula = ?`, [cedula]);
}

export function findUserById(db: Db, id: string): Promise<User | undefined> {
  return db.get<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);
}

export async function getPasswordHash(db: Db, userId: string): Promise<string | undefined> {
  return (await db.get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [userId]))?.password_hash;
}

/** Crea la cuenta con una contraseña ya generada. must_change_password = 1 obliga a cambiarla al entrar. */
export async function createUser(
  db: Db,
  input: { cedula: string; fullName: string; email: string; phone?: string | null; role?: Role; password: string; mustChange?: boolean },
): Promise<User> {
  const id = newId();
  const hash = await hashPassword(input.password);
  await db.run(
    `INSERT INTO users (id, cedula, full_name, email, whatsapp_phone, role, password_hash, must_change_password, notify_whatsapp, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.cedula, input.fullName, input.email.toLowerCase(), input.phone ?? null, input.role ?? "student", hash, input.mustChange === false ? 0 : 1, input.phone ? 1 : 0, nowIso()],
  );
  return (await findUserById(db, id))!;
}

/** Guarda la contraseña nueva y cierra las demás sesiones de esa persona. */
export async function setPassword(db: Db, userId: string, newPassword: string, keepSessionHash?: string): Promise<void> {
  const hash = await hashPassword(newPassword); // se calcula ANTES de abrir la transacción
  await db.transaction(async (tx) => {
    await tx.run("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?", [hash, userId]);
    if (keepSessionHash) {
      await tx.run("DELETE FROM auth_sessions WHERE user_id = ? AND token_hash <> ?", [userId, keepSessionHash]);
    } else {
      await tx.run("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
    }
  });
}
