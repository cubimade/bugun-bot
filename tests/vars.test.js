// ============================================================
//  TESTS/VARS.TEST.JS — {ism} zaxirasi birlik testlari (ROADMAP-18 FAZA 7.4)
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyNameVar, validName } from "../services/vars.js";

test("haqiqiy ism o'rniga qo'yiladi", () => {
  assert.equal(applyNameVar("Salom {ism}!", "Aziza"), "Salom Aziza!");
  assert.equal(applyNameVar("{ism}, qalaysiz?", "Bek"), "Bek, qalaysiz?");
});

test("ism yo'q — {ism} toza olib tashlanadi, bo'sh joy qolmaydi", () => {
  assert.equal(applyNameVar("Salom {ism}!", null), "Salom!");
  assert.equal(applyNameVar("Salom, {ism}!", ""), "Salom!");
  assert.equal(applyNameVar("{ism}, savolingiz qoldimi?", null), "savolingiz qoldimi?");
});

test("raqamli IGSID ism hisoblanmaydi", () => {
  assert.equal(applyNameVar("Salom {ism}!", "1784300784"), "Salom!");
  assert.equal(validName("300784"), null);
  assert.equal(validName("Aziza"), "Aziza");
});

test("{ism} bo'lmagan matn o'zgarmaydi", () => {
  assert.equal(applyNameVar("Oddiy xabar", null), "Oddiy xabar");
});
