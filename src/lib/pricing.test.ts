import assert from "node:assert/strict";
import { test } from "node:test";
import { priceCart } from "./pricing.ts";

test("un programa disponible recibe 15% por pago único", () => {
  const q = priceCart(["hatha-vinyasa-yoga-y-meditacion"]);
  assert.equal(q.subtotal, 3_500_000);
  assert.equal(q.discount, 525_000);
  assert.equal(q.total, 2_975_000);
});

test("varios programas suman y descuentan sobre el total", () => {
  const q = priceCart(["certificacion-de-yoga-y-pilates", "certificacion-de-yoga-kids"]);
  assert.equal(q.subtotal, 6_300_000);
  assert.equal(q.total, 5_355_000);
});

test("duplicados no se cobran dos veces", () => {
  const q = priceCart(["certificacion-de-yoga-kids", "certificacion-de-yoga-kids"]);
  assert.equal(q.lines.length, 1);
  assert.equal(q.total, 2_125_000);
});

test("próximamente, sin precio e inexistentes quedan fuera del cobro", () => {
  const q = priceCart(["india", "maestria-yogaayurveda-mujer", "the-happiness-program-3", "no-existe"]);
  assert.equal(q.lines.length, 0);
  assert.equal(q.total, 0);
  assert.equal(q.unavailable.length, 4);
});

test("el bono de 15% no se suma al descuento por pago único", () => {
  const q = priceCart(["certificacion-de-yoga-y-pilates"], "bono-promo");
  assert.equal(q.discountPercent, 15);
  assert.equal(q.couponStatus, "not-better");
  assert.equal(q.total, 3_230_000);
});

test("un bono inexistente se marca inválido y no cambia el precio", () => {
  const q = priceCart(["certificacion-de-yoga-y-pilates"], "FALSO");
  assert.equal(q.couponStatus, "invalid");
  assert.equal(q.total, 3_230_000);
});

test("carrito vacío cuesta cero", () => {
  const q = priceCart([]);
  assert.equal(q.total, 0);
  assert.equal(q.discountPercent, 0);
});
