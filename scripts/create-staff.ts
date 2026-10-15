/**
 * Crea la cuenta de una docente o administradora y muestra el enlace para que cree su contraseña.
 * El mismo enlace también queda en el correo registrado en /demo/bandeja (en local no se envía a un correo real).
 *
 *   node scripts/create-staff.ts --role admin --cedula 1010231015 --name "Paula Salazar" --email correo@ejemplo.com
 *   node scripts/create-staff.ts --role teacher --name "Docente Nueva" --email docente@ejemplo.com     (sin cédula: la escribe al entrar)
 *
 * Con --contact-email se guarda el correo de contacto que ven las estudiantes (si es distinto al de la cuenta).
 * Variable BASE_URL para la dirección del enlace (por defecto http://localhost:3000).
 */
import { createStaffAccount } from "../src/server/campus.ts";
import { claimSuggestedClasses } from "../src/server/classes.ts";
import { getDb } from "../src/server/db/index.ts";
import { getTeacherProfile, saveTeacherProfile } from "../src/server/curriculum.ts";
import { normalizeCedula } from "../src/server/security.ts";
import { createSetupLink } from "../src/server/auth.ts";
import { sendEmail } from "../src/server/outbox.ts";
import { manualAccountEmail } from "../src/server/templates.ts";
import { findUserByCedula } from "../src/server/users.ts";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i].replace(/^--/, "");
  if (key === "no-grade") {
    args.set(key, "1");
    i -= 1; // bandera sin valor
  } else args.set(key, process.argv[i + 1] ?? "");
}

const role = args.get("role") === "admin" ? "admin" : "teacher";
const rawCedula = args.get("cedula") ?? "";
const cedula = rawCedula ? normalizeCedula(rawCedula) : null;
const name = args.get("name");
const email = args.get("email");
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

if (!name || !email || (rawCedula && !cedula) || (role === "admin" && !cedula)) {
  console.error('Faltan datos. Ejemplo: node scripts/create-staff.ts --role admin --cedula 1010231015 --name "Paula Salazar" --email correo@ejemplo.com');
  process.exit(1);
}

const db = getDb();
// Si la cédula ya tiene cuenta (por ejemplo, de estudiante por una compra), se sube de rol y se conserva todo lo suyo (inscripciones incluidas).
const existing = cedula ? await findUserByCedula(db, cedula) : undefined;
if (existing) {
  await db.run("UPDATE users SET role = ?, email = ?, full_name = ?, must_change_password = 0 WHERE id = ?", [role, email.toLowerCase(), name, existing.id]);
  await claimSuggestedClasses(db, existing.id, email);
  const link = await createSetupLink(db, existing.id, baseUrl);
  await sendEmail(db, { to: email.toLowerCase(), ...manualAccountEmail({ fullName: name, cedula: cedula!, setPasswordUrl: link, programTitle: null, loginUrl: `${baseUrl}/campus/ingresar`, recoverUrl: `${baseUrl}/campus/recuperar` }) });
  console.log(`Cuenta existente actualizada: ${name} → ${role}, correo ${email}`);
  console.log(`Enlace para crear la contraseña (válido 7 días):
${link}`);
} else {
  const result = await createStaffAccount(db, { role: "admin" }, { cedula, fullName: name, email, role }, baseUrl);
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
}

const row = existing ? undefined : await db.get<{ body_text: string }>("SELECT body_text FROM outbox WHERE to_address = ? ORDER BY created_at DESC LIMIT 1", [email.toLowerCase()]);
const link = row?.body_text.match(/https?:\/\/\S*restablecer\?token=\S+/)?.[0];
if (!existing) {
  console.log(`Cuenta creada: ${name} (${role}) ${cedula ? `cédula ${cedula}` : "sin cédula (la escribe al entrar)"}`);
  console.log(`Enlace para crear la contraseña (válido 7 días):\n${link ?? "(míralo en /demo/bandeja)"}`);
}

if (args.has("no-grade")) {
  await db.run("UPDATE users SET can_grade = 0 WHERE email = ?", [email.toLowerCase()]);
  console.log("Suplente: no aprueba estudiantes.");
}

const contact = args.get("contact-email");
if (contact) {
  const user = cedula ? await findUserByCedula(db, cedula) : undefined;
  if (user) {
    const prev = await getTeacherProfile(db, user.id);
    await saveTeacherProfile(db, user.id, { headline: prev?.headline ?? null, bio: prev?.bio ?? null, photo_url: prev?.photo_url ?? null, contact_phone: prev?.contact_phone ?? null, contact_email: contact.toLowerCase() });
    console.log(`Correo de contacto de docente: ${contact}`);
  }
}
