// ============================================================
//  TESTS/WEBHOOK-SIGNATURE.TEST.JS — ko'p ilovali imzo tekshiruvi
//  (ROADMAP-19 FAZA 3). signatureMatches sof funksiya — DB kerak emas.
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { signatureMatches } from "../routes/webhook.js";

function sign(body, secret) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

const body = Buffer.from(JSON.stringify({ entry: [{ id: "17841000000000000" }] }));

test("to'g'ri secret bilan imzo mos keladi", () => {
  assert.equal(signatureMatches(body, sign(body, "secret-A"), "secret-A"), true);
});

test("boshqa secret bilan mos kelmaydi", () => {
  assert.equal(signatureMatches(body, sign(body, "secret-A"), "secret-B"), false);
});

test("bir xil body, har loyiha o'z secret'i — faqat to'g'risi o'tadi", () => {
  const sig = sign(body, "loyiha-2-secret");
  const secrets = ["loyiha-1-secret", "loyiha-2-secret", "global-secret"];
  const matched = secrets.filter((s) => signatureMatches(body, sig, s));
  assert.deepEqual(matched, ["loyiha-2-secret"]);
});

test("buzilgan/bo'sh kirishlar xavfsiz false", () => {
  assert.equal(signatureMatches(body, "", "secret"), false);
  assert.equal(signatureMatches(body, "md5=abc", "secret"), false);
  assert.equal(signatureMatches(null, sign(body, "s"), "s"), false);
  assert.equal(signatureMatches(body, sign(body, "s"), ""), false);
  // uzunligi boshqa imzo timingSafeEqual'ni yiqitmasin
  assert.equal(signatureMatches(body, "sha256=qisqa", "secret"), false);
});
