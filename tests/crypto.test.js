// ============================================================
//  TESTS/CRYPTO.TEST.JS — AES-256-GCM shifrlash testlari (ROADMAP-19 FAZA 1)
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt, maskSecret, hasEncryptionKey } from "../services/crypto.js";

test("shifrlash-ochish aylanasi", () => {
  const secret = "abc123XYZsecret_-!";
  const enc = encrypt(secret);
  assert.notEqual(enc, secret, "shifrlangan qiymat ochiq matnga teng bo'lmasin");
  assert.match(enc, /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/, "iv.tag.data formati");
  assert.equal(decrypt(enc), secret);
});

test("har safar boshqa shifr (tasodifiy IV)", () => {
  const a = encrypt("bir xil matn");
  const b = encrypt("bir xil matn");
  assert.notEqual(a, b);
  assert.equal(decrypt(a), decrypt(b));
});

test("buzilgan payload null qaytaradi (GCM auth)", () => {
  const enc = encrypt("maxfiy");
  const parts = enc.split(".");
  // ciphertext'ning bir belgisini o'zgartiramiz
  const tampered = [parts[0], parts[1], "A" + parts[2].slice(1)].join(".");
  assert.equal(decrypt(tampered), null);
  assert.equal(decrypt("notog'ri-format"), null);
});

test("bo'sh qiymatlar xavfsiz", () => {
  assert.equal(encrypt(null), null);
  assert.equal(encrypt(""), null);
  assert.equal(decrypt(null), null);
  assert.equal(decrypt(""), null);
});

test("maskSecret to'liq qiymatni ko'rsatmaydi", () => {
  assert.equal(maskSecret("abcdefgh1X29B"), "••••1X29B".slice(0, 4) + "X29B");
  assert.equal(maskSecret(""), "");
  assert.ok(!maskSecret("supersecret123").includes("supersecret".slice(0, 7)));
});

test("hasEncryptionKey boolean qaytaradi", () => {
  assert.equal(typeof hasEncryptionKey(), "boolean");
});
