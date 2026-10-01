import assert from "node:assert/strict";
import { test } from "node:test";
import { priceCart, priceItems, type PricedItem } from "./pricing.ts";

const cert: PricedItem = { slug: "c", title: "Cert", category: "certificacion", listPrice: 3_500_000 };
const taller: PricedItem = { slug: "t", title: "Taller", category: "taller", listPrice: 800_000 };
const retiro: PricedItem = { slug: "r", title: "Retiro", category: "retiro", listPrice: 560_000 };

test("certificación: 15% por pago único", () => {
  const q = priceCart(["hatha-vinyasa-yoga-y-meditacion"]);
  assert.equal(q.subtotal, 3_500_000);
  assert.equal(q.discount, 525_000);
  assert.equal(q.total, 2_975_000);
});

test("taller: 10% por pago único", () => {
  const q = priceCart(["yoga-prenatal-nacimiento-consciente"]);
  assert.equal(q.total, 720_000);
});

test("retiro: sin descuento si no hay cupón", () => {
  const q = priceItems([retiro]);
  assert.equal(q.discount, 0);
  assert.equal(q.total, 560_000);
});

test("retiro: el cupón sí lo descuenta", () => {
  const q = priceItems([retiro], "bono-promo");
  assert.equal(q.couponStatus, "applied");
  assert.equal(q.total, 476_000);
});

test("el cupón de 15% mejora el taller (10%) pero no la certificación (15%)", () => {
  const q = priceItems([cert, taller], "BONO-PROMO");
  assert.equal(q.lines[0].discountPercent, 15);
  assert.equal(q.lines[1].discountPercent, 15);
  assert.equal(q.total, 2_975_000 + 680_000);
});

test("un carrito mixto aplica cada regla por línea", () => {
  const q = priceItems([cert, taller, retiro]);
  assert.equal(q.total, 2_975_000 + 720_000 + 560_000);
});

test("varios programas y duplicados no se cobran dos veces", () => {
  const q = priceCart(["certificacion-de-yoga-kids", "certificacion-de-yoga-kids", "certificacion-de-yoga-y-pilates"]);
  assert.equal(q.lines.length, 2);
  assert.equal(q.total, 2_125_000 + 3_230_000);
});

test("próximamente, sin precio e inexistentes quedan fuera del cobro", () => {
  const q = priceCart(["india", "maestria-yogaayurveda-mujer", "the-happiness-program-3", "no-existe"]);
  assert.equal(q.lines.length, 0);
  assert.equal(q.total, 0);
  assert.equal(q.unavailable.length, 4);
});

test("un bono inexistente se marca inválido y no cambia el precio", () => {
  const q = priceItems([cert], "FALSO");
  assert.equal(q.couponStatus, "invalid");
  assert.equal(q.total, 2_975_000);
});

test("carrito vacío cuesta cero", () => {
  assert.equal(priceCart([]).total, 0);
});
