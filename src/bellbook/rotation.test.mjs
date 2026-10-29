// node --test src/bellbook/rotation.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { rotationFrom, dn } from "../../sites/bellbook/engine.js";

const none = new Set();
// 2026-10-26 is a Monday
test("counts forward on school days only, skipping the weekend", () => {
  const mon = dn("2026-10-26");
  assert.equal(rotationFrom(mon, 0, 2, none, mon), 0);              // Mon A
  assert.equal(rotationFrom(mon, 0, 2, none, mon + 1), 1);          // Tue B
  assert.equal(rotationFrom(mon, 0, 2, none, mon + 4), 0);          // Fri A
  assert.equal(rotationFrom(mon, 0, 2, none, mon + 5), -1);         // Sat: no school
  assert.equal(rotationFrom(mon, 0, 2, none, mon + 7), 1);          // next Mon B
});
test("days off stop the count", () => {
  const mon = dn("2026-10-26");
  const off = new Set([mon + 1]);                                   // Tuesday off
  assert.equal(rotationFrom(mon, 0, 2, off, mon + 1), -1);
  assert.equal(rotationFrom(mon, 0, 2, off, mon + 2), 1);           // Wed is the next school day: B
});
test("counts backwards and wraps longer rotations", () => {
  const mon = dn("2026-10-26");
  assert.equal(rotationFrom(mon, 0, 2, none, mon - 3), 1);          // the Friday before was B
  assert.equal(rotationFrom(mon, 5, 6, none, mon + 1), 0);          // Day 6 then Day 1
  assert.equal(rotationFrom(mon, 2, 3, none, mon + 7), 1);          // A/B/C: C + 5 school days = B
});
