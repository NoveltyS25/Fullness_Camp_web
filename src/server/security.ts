import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;
const COST = 16384;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEY_LEN, { N: COST, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Formato: scrypt$N$sal$hash (base64). Nunca se guarda la contraseña. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${COST}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, , saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await derive(password, Buffer.from(saltB64, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Sin caracteres que se confunden al leer (0/O, 1/l/I).
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Contraseña temporal fácil de copiar: 10 caracteres. */
export function generateTempPassword(length = 10): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Reglas de la contraseña nueva. Devuelve el mensaje de error o null si es válida. */
export function validateNewPassword(password: string, cedula: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (password.length > 100) return "La contraseña es demasiado larga.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Usa al menos una letra y un número.";
  if (password.replace(/\D/g, "") === cedula || password === cedula) return "No uses tu cédula como contraseña.";
  return null;
}

/** Cédula: solo dígitos, entre 5 y 15. Acepta puntos y espacios al escribirla. */
export function normalizeCedula(input: string): string | null {
  const digits = input.replace(/[.\s-]/g, "");
  return /^\d{5,15}$/.test(digits) ? digits : null;
}
