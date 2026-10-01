import assert from "node:assert/strict";
import { test } from "node:test";
import { copToUsd } from "./fx.ts";

test("convierte COP a USD con centavos", () => {
  assert.equal(copToUsd(2_975_000, 4000), 743.75);
  assert.equal(copToUsd(476_000, 3900), 122.05);
});
