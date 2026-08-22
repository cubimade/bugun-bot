// ============================================================
//  TESTS/KEYWORD-MATCHER.TEST.JS — matchKeywordRule birlik testlari
//  (ROADMAP-18 FAZA 2.3). Ishga tushirish: npm test
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchKeywordRule } from "../db/automation.js";

const rule = (keyword, match_type = "contains", id = 1) => ({ id, keyword, match_type });

test('"narx" (ichida bo\'lsa): oddiy holatlar', () => {
  const rules = [rule("narx")];
  assert.ok(matchKeywordRule(rules, "narx"));
  assert.ok(matchKeywordRule(rules, "narx qancha"));
  assert.ok(matchKeywordRule(rules, "NARX"));
  assert.ok(matchKeywordRule(rules, "  narx  "));
  assert.ok(matchKeywordRule(rules, "narxlar"));
  assert.equal(matchKeywordRule(rules, "salom"), null);
});

test('vergulli keyword "narx, narxr" (eski format): har varianti alohida ishlaydi', () => {
  const rules = [rule("narx, narxr")];
  assert.ok(matchKeywordRule(rules, "narx qancha"), '"narx qancha" mos kelishi kerak');
  assert.ok(matchKeywordRule(rules, "narx"), '"narx" mos kelishi kerak');
  assert.ok(matchKeywordRule(rules, "narxr bormi"));
  assert.equal(matchKeywordRule(rules, "salom"), null);
});

test('ikki so\'zli qoida "narx, xizmat": ikkinchi so\'z ham topiladi', () => {
  const rules = [rule("narx, xizmat")];
  assert.ok(matchKeywordRule(rules, "xizmat bormi"));
});

test('aniq moslik (exact): faqat to\'liq matn', () => {
  const rules = [rule("narx", "exact")];
  assert.ok(matchKeywordRule(rules, "narx"));
  assert.ok(matchKeywordRule(rules, "  NARX  "), "trim + registrsiz");
  assert.equal(matchKeywordRule(rules, "narx qancha"), null);
});

test('exact + vergulli variantlar: har biri alohida to\'liq moslik', () => {
  const rules = [rule("narx, price", "exact")];
  assert.ok(matchKeywordRule(rules, "price"));
  assert.equal(matchKeywordRule(rules, "price list"), null);
});

test('boshlanishi bilan (starts)', () => {
  const rules = [rule("salom", "starts")];
  assert.ok(matchKeywordRule(rules, "salom aleykum"));
  assert.equal(matchKeywordRule(rules, "assalomu salom"), null);
});

test("regex: vergul bo'yicha BO'LINMAYDI (vergul regex qismi bo'lishi mumkin)", () => {
  const rules = [rule("na{1,2}rx", "regex")];
  assert.ok(matchKeywordRule(rules, "narx qancha"));
  assert.equal(matchKeywordRule(rules, "nrx"), null);
});

test("buzuq regex bot ishini to'xtatmaydi", () => {
  const rules = [rule("([", "regex"), rule("narx", "contains", 2)];
  const hit = matchKeywordRule(rules, "narx qancha");
  assert.ok(hit);
  assert.equal(hit.id, 2, "buzuq regex tashlab ketilib, keyingi qoida ishlaydi");
});

test("birinchi mos kelgani yutadi (tartib saqlanadi)", () => {
  const rules = [rule("narx", "contains", 1), rule("qancha", "contains", 2)];
  assert.equal(matchKeywordRule(rules, "narx qancha").id, 1);
});

test("bo'sh matn va bo'sh keyword xavfsiz", () => {
  assert.equal(matchKeywordRule([rule("narx")], ""), null);
  assert.equal(matchKeywordRule([rule("narx")], "   "), null);
  assert.equal(matchKeywordRule([rule("")], "narx"), null);
  assert.equal(matchKeywordRule([rule(" , , ")], "narx"), null);
});

test("trace: mos kelmagan qoidalar sababi yoziladi", () => {
  const trace = [];
  matchKeywordRule([rule("olma", "contains", 7)], "narx", trace);
  assert.equal(trace.length, 1);
  assert.match(trace[0], /#7/);
});
