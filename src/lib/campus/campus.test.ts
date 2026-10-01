import assert from "node:assert/strict";
import { test } from "node:test";
import { emailContent, whatsappSummary, type ChangeContext } from "./messages.ts";
import { normalizeWhatsapp } from "./phone.ts";
import { dayKey, fromLocalInput, toLocalInput } from "./time.ts";

const ctx: ChangeContext = {
  studentName: "María Fernanda López",
  sessionTitle: "Hatha Vinyasa - Módulo 3",
  oldData: { starts_at: "2026-10-06T23:00:00.000Z", ends_at: "2026-10-07T01:00:00.000Z", location: "Sede Bogotá", online_url: null, status: "scheduled" },
  newData: { starts_at: "2026-10-08T23:00:00.000Z", ends_at: "2026-10-09T01:00:00.000Z", location: "Sede Bogotá", online_url: null, status: "scheduled" },
  reason: "Cruce con otra actividad",
  campusUrl: "https://example.com/campus",
};

test("la hora de Colombia se convierte en ambos sentidos", () => {
  assert.equal(fromLocalInput("2026-10-05T18:00"), "2026-10-05T23:00:00.000Z");
  assert.equal(toLocalInput("2026-10-05T23:00:00.000Z"), "2026-10-05T18:00");
  assert.equal(fromLocalInput("basura"), null);
});

test("el día se agrupa en hora de Colombia, no en UTC", () => {
  // 2026-10-07 03:00 UTC sigue siendo el 6 de octubre a las 10 p. m. en Colombia.
  assert.equal(dayKey("2026-10-07T03:00:00.000Z"), "2026-10-06");
});

test("el correo explica antes, ahora y motivo", () => {
  const m = emailContent(ctx);
  assert.match(m.subject, /Cambio de horario/);
  assert.match(m.text, /Hola María/);
  assert.match(m.text, /Antes: /);
  assert.match(m.text, /Motivo: Cruce con otra actividad/);
  assert.match(m.html, /Ver mi horario/);
});

test("una clase cancelada se avisa como cancelada", () => {
  const cancelled = { ...ctx, newData: { ...ctx.newData, status: "cancelled" as const } };
  assert.match(emailContent(cancelled).subject, /cancelada/i);
  assert.match(whatsappSummary(cancelled), /se canceló/);
});

test("el correo escapa HTML del nombre y del motivo", () => {
  const m = emailContent({ ...ctx, studentName: "<b>Ana</b>", reason: "<script>x</script>" });
  assert.ok(!m.html.includes("<script>"));
  assert.ok(!m.html.includes("<b>Ana"));
});

test("normaliza números de WhatsApp", () => {
  assert.equal(normalizeWhatsapp("311 674 1900"), "573116741900");
  assert.equal(normalizeWhatsapp("+57 311 674 1900"), "573116741900");
  assert.equal(normalizeWhatsapp("0057 3116741900"), "573116741900");
  assert.equal(normalizeWhatsapp("+1 415 555 2671"), "14155552671");
  assert.equal(normalizeWhatsapp("123"), null);
  assert.equal(normalizeWhatsapp(""), null);
});
