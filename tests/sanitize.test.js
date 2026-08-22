// ============================================================
//  TESTS/SANITIZE.TEST.JS — sanitizeForInstagram birlik testlari
//  (ROADMAP-18 FAZA 3). Ishga tushirish: npm test
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeForInstagram } from "../services/sanitize.js";

test("qalin va kursiv belgilar olib tashlanadi", () => {
  assert.equal(sanitizeForInstagram("**Eng tezkor yo'llar:**"), "Eng tezkor yo'llar:");
  assert.equal(sanitizeForInstagram("**Telegram:** @elbeshmurodov"), "Telegram: @elbeshmurodov");
  assert.equal(sanitizeForInstagram("***juda muhim***"), "juda muhim");
  assert.equal(sanitizeForInstagram("bu *kursiv* so'z"), "bu kursiv so'z");
  assert.equal(sanitizeForInstagram("bu _kursiv_ so'z"), "bu kursiv so'z");
});

test("matematik ifodalar buzilmaydi", () => {
  assert.equal(sanitizeForInstagram("2*3*4 = 24"), "2*3*4 = 24");
  assert.equal(sanitizeForInstagram("narx: 100 * 2 = 200"), "narx: 100 * 2 = 200");
  assert.equal(sanitizeForInstagram("user_name_here o'zgarmaydi"), "user_name_here o'zgarmaydi");
});

test("kod belgilari olib tashlanadi", () => {
  assert.equal(sanitizeForInstagram("`kod` yozildi"), "kod yozildi");
  assert.equal(sanitizeForInstagram("```\nsalom\n```"), "salom");
});

test("sarlavha va ro'yxatlar", () => {
  assert.equal(sanitizeForInstagram("## Sarlavha"), "Sarlavha");
  assert.equal(sanitizeForInstagram("- birinchi\n- ikkinchi"), "• birinchi\n• ikkinchi");
  assert.equal(sanitizeForInstagram("1. birinchi\n2. ikkinchi"), "1. birinchi\n2. ikkinchi");
});

test("havolalar matn: url ko'rinishiga o'tadi", () => {
  assert.equal(
    sanitizeForInstagram("[Sayt](https://example.com)"),
    "Sayt: https://example.com"
  );
});

test("ortiqcha bo'sh qatorlar qisqaradi, chetlar trim qilinadi", () => {
  assert.equal(sanitizeForInstagram("a\n\n\n\nb"), "a\n\nb");
  assert.equal(sanitizeForInstagram("  salom  "), "salom");
});

test("bo'sh yoki null qiymatlar xavfsiz", () => {
  assert.equal(sanitizeForInstagram(""), "");
  assert.equal(sanitizeForInstagram(null), "");
  assert.equal(sanitizeForInstagram(undefined), "");
});

test("markdown'siz oddiy matn o'zgarmaydi", () => {
  const t = "Salom! Narx 250 000 so'm. Batafsil: @elbeshmurodov 😊";
  assert.equal(sanitizeForInstagram(t), t);
});
