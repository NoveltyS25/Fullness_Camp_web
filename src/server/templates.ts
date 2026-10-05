const BRAND = "Fullness Camp";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

function money(value: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

const wrap = (inner: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.7;color:#3b2523;max-width:600px;margin:0 auto;padding:24px">${inner}<p style="color:#5d4542;margin-top:32px">Con cariño,<br>El equipo de ${BRAND}</p></div>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#7a4a45;color:#ffffff;padding:16px 28px;border-radius:999px;text-decoration:none;display:inline-block;font-weight:bold">${esc(label)}</a></p>`;

export interface WelcomeInput {
  fullName: string;
  cedula: string;
  /** Solo para cuentas nuevas: enlace para crear su contraseña. Si ya tenía cuenta es null y usa la que ya tiene. */
  setPasswordUrl: string | null;
  programs: { title: string; cohortName: string | null }[];
  /** null cuando la inscripción la hizo una administradora (sin pago en línea). */
  payment: { orderId: string; total: number } | null;
  loginUrl: string;
  recoverUrl: string;
}

export function welcomeEmail(i: WelcomeInput): { subject: string; text: string; html: string } {
  const name = firstName(i.fullName);
  const isNew = i.setPasswordUrl !== null;
  const subject = isNew
    ? `¡Bienvenida a ${BRAND}! Así entras a tu campus virtual`
    : i.payment ? `Tu pago fue confirmado: ya tienes acceso en el campus` : `Tu inscripción está lista en el campus virtual`;

  const list = i.programs.map((p) => `• ${p.title}${p.cohortName ? ` (grupo: ${p.cohortName})` : " (te asignaremos grupo muy pronto)"}`);
  const paymentLine = i.payment ? `Total pagado: ${money(i.payment.total)}  ·  Referencia: ${i.payment.orderId.slice(0, 8).toUpperCase()}` : null;
  const intro = i.payment ? `Recibimos tu pago. ¡Gracias por confiar en ${BRAND}!` : i.programs.length ? `Te inscribimos en un programa de ${BRAND}.` : `Creamos tu cuenta del campus virtual de ${BRAND}.`;

  const stepsNew = [
    `1. Abre este enlace para crear tu contraseña (sirve una sola vez y dura 7 días): ${i.setPasswordUrl}`,
    `2. Escribe la contraseña que quieras usar: mínimo 8 caracteres, con una letra y un número.`,
    `3. Entra al campus virtual en ${i.loginUrl}`,
    `4. En "Cédula" escribe ${i.cedula} y, en "Contraseña", la que acabas de crear.`,
    `5. ¡Listo! Verás tus clases, tu horario y los avisos de tu profesora.`,
  ];
  const stepsExisting = [
    `1. Entra a ${i.loginUrl}`,
    `2. En "Cédula" escribe: ${i.cedula}`,
    `3. En "Contraseña" usa la que ya tenías. Si la olvidaste, recupérala aquí: ${i.recoverUrl}`,
    `4. Tu nuevo programa aparecerá en tu campus.`,
  ];

  const text = [
    `Hola ${name},`,
    "",
    intro,
    "",
    ...(i.programs.length ? ["Tu inscripción:", ...list] : []),
    ...(paymentLine ? [paymentLine] : []),
    "",
    "Cómo entrar a tu campus virtual:",
    ...(isNew ? stepsNew : stepsExisting),
    "",
    isNew ? `Si el enlace venció, entra a ${i.recoverUrl} con tu cédula y tu correo y te enviamos otro.` : "",
    `${BRAND}`,
  ].join("\n");

  const li = (s: string) => `<li style="margin-bottom:10px">${s}</li>`;
  const stepsHtml = isNew
    ? [
        li("Pulsa el botón <strong>«Crear mi contraseña»</strong> de abajo (sirve una sola vez y dura 7 días)."),
        li("Escribe la contraseña que quieras usar: mínimo 8 caracteres, con una letra y un número."),
        li(`Entra a <a href="${esc(i.loginUrl)}">${esc(i.loginUrl)}</a>`),
        li(`En <strong>Cédula</strong> escribe <strong>${esc(i.cedula)}</strong> y, en <strong>Contraseña</strong>, la que acabas de crear.`),
        li("¡Listo! Verás tus clases, tu horario y los avisos de tu profesora."),
      ].join("")
    : [
        li(`Entra a <a href="${esc(i.loginUrl)}">${esc(i.loginUrl)}</a>`),
        li(`En <strong>Cédula</strong> escribe: <strong>${esc(i.cedula)}</strong>`),
        li(`En <strong>Contraseña</strong> usa la que ya tenías. Si la olvidaste, <a href="${esc(i.recoverUrl)}">recupérala aquí</a>.`),
        li("Tu nuevo programa aparecerá en tu campus."),
      ].join("");

  const html = wrap(
    `<h1 style="color:#7a4a45;font-size:26px;margin:0 0 16px">${isNew ? `¡Bienvenida, ${esc(name)}!` : i.payment ? `¡Pago confirmado, ${esc(name)}!` : `¡Inscripción lista, ${esc(name)}!`}</h1>` +
      `<p>${esc(intro)}</p>` +
      (i.programs.length ? `<div style="background:#fbf6f3;border:1px solid #f1ddd8;border-radius:16px;padding:16px 20px"><strong>Tu inscripción</strong><ul style="padding-left:20px;margin:8px 0">${i.programs.map((p) => `<li>${esc(p.title)}${p.cohortName ? ` <span style="color:#5d4542">(grupo: ${esc(p.cohortName)})</span>` : ` <span style="color:#5d4542">(te asignaremos grupo muy pronto)</span>`}</li>`).join("")}</ul>` +
      `${paymentLine ? `<span style="color:#5d4542">${esc(paymentLine)}</span>` : ""}</div>` : "") +
      `<h2 style="color:#7a4a45;font-size:22px;margin-top:28px">Cómo entrar a tu campus virtual</h2><ol style="padding-left:22px">${stepsHtml}</ol>` +
      (isNew ? button(i.setPasswordUrl!, "Crear mi contraseña") : button(i.loginUrl, "Entrar al campus virtual")) +
      (isNew ? `<p style="color:#5d4542">Si el enlace venció, entra a <a href="${esc(i.recoverUrl)}">${esc(i.recoverUrl)}</a> con tu cédula y tu correo y te enviamos otro.</p>` : ""),
  );

  return { subject, text, html };
}

/** Recibo para quien pagó cuando la cuenta del campus tiene otro correo registrado. Sin contraseñas. */
export function receiptEmail(i: { buyerName: string; programs: string[]; total: number; orderId: string; accountEmailHint: string }) {
  const ref = i.orderId.slice(0, 8).toUpperCase();
  const text = `Hola ${firstName(i.buyerName)},\n\nRecibimos tu pago (${money(i.total)}, referencia ${ref}) por:\n${i.programs.map((p) => `• ${p}`).join("\n")}\n\nLas instrucciones de acceso se enviaron al correo registrado en el campus (${i.accountEmailHint}).\n\n${BRAND}`;
  const html = wrap(
    `<h1 style="color:#7a4a45;font-size:24px">Recibimos tu pago</h1><p>Total: <strong>${money(i.total)}</strong> · Referencia: ${ref}</p><ul>${i.programs.map((p) => `<li>${esc(p)}</li>`).join("")}</ul><p>Las instrucciones de acceso se enviaron al correo registrado en el campus (${esc(i.accountEmailHint)}).</p>`,
  );
  return { subject: `Recibimos tu pago · ${BRAND}`, text, html };
}

export function passwordResetEmail(i: { fullName: string; resetUrl: string }) {
  const name = firstName(i.fullName);
  const text = `Hola ${name},\n\nPediste crear una contraseña nueva para tu campus virtual. Abre este enlace (sirve una sola vez y vence en 1 hora):\n${i.resetUrl}\n\nSi no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.\n\n${BRAND}`;
  const html = wrap(
    `<h1 style="color:#7a4a45;font-size:24px">Crea tu contraseña nueva</h1><p>Hola ${esc(name)}, pediste crear una contraseña nueva para tu campus virtual. El enlace sirve una sola vez y vence en 1 hora.</p>${button(i.resetUrl, "Crear contraseña nueva")}<p style="color:#5d4542">Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.</p>`,
  );
  return { subject: `Crea tu contraseña nueva · ${BRAND}`, text, html };
}

/** Cuenta creada por una administradora (pago por transferencia, por ejemplo). */
export function manualAccountEmail(i: { fullName: string; cedula: string; setPasswordUrl: string; programTitle: string | null; loginUrl: string; recoverUrl: string }) {
  return welcomeEmail({
    fullName: i.fullName,
    cedula: i.cedula,
    setPasswordUrl: i.setPasswordUrl,
    programs: i.programTitle ? [{ title: i.programTitle, cohortName: null }] : [],
    payment: null,
    loginUrl: i.loginUrl,
    recoverUrl: i.recoverUrl,
  });
}

export function leadEmail(i: { fullName: string; programTitle: string; interest: "info" | "waitlist"; programUrl: string; whatsappUrl: string }) {
  const name = firstName(i.fullName);
  const waitlist = i.interest === "waitlist";
  const subject = waitlist ? `Te avisaremos cuando abra: ${i.programTitle}` : `Recibimos tu solicitud: ${i.programTitle}`;
  const intro = waitlist
    ? `Anotamos tus datos para avisarte apenas abramos inscripciones de «${i.programTitle}».`
    : `Recibimos tu solicitud de información sobre «${i.programTitle}». Una asesora te escribirá por WhatsApp o correo.`;
  const text = `Hola ${name},\n\n${intro}\n\nMientras tanto puedes ver el programa completo aquí: ${i.programUrl}\n¿Prefieres escribirnos tú? ${i.whatsappUrl}\n\n${BRAND}`;
  const html = wrap(
    `<h1 style="color:#7a4a45;font-size:24px">Gracias, ${esc(name)}</h1><p>${esc(intro)}</p>${button(i.programUrl, "Ver el programa")}<p>¿Prefieres escribirnos tú? <a href="${esc(i.whatsappUrl)}">Habla con una asesora por WhatsApp</a>.</p>`,
  );
  return { subject, text, html };
}
