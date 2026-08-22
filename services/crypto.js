// ============================================================
//  SERVICES/CRYPTO.JS — maxfiy qiymatlarni shifrlash (ROADMAP-19 FAZA 1)
//  Mijozlarning Meta app secret'lari bazada OCHIQ saqlanmasligi uchun
//  AES-256-GCM (autentifikatsiyalangan shifrlash — o'zgartirilgan payload
//  decrypt'da null qaytadi, jim buzilmaydi).
//
//  Kalit: ENCRYPTION_KEY env (32 bayt, base64 — `openssl rand -base64 32`).
//  Yo'q bo'lsa DASHBOARD_PASSWORD'dan sha256 bilan hosil qilinadi (zaxira) —
//  server yiqilmaydi, lekin hasEncryptionKey() false qaytaradi (dashboard
//  ogohlantirishi uchun).
// ============================================================
import crypto from "crypto";

export function hasEncryptionKey() {
  return Boolean((process.env.ENCRYPTION_KEY || "").trim());
}

function getKey() {
  const raw = (process.env.ENCRYPTION_KEY || "").trim();
  if (raw) {
    const key = Buffer.from(raw, "base64");
    if (key.length === 32) return key;
    console.warn("⚠️ ENCRYPTION_KEY 32 bayt emas — DASHBOARD_PASSWORD zaxirasiga o'tildi");
  }
  return crypto
    .createHash("sha256")
    .update(String(process.env.DASHBOARD_PASSWORD || "bugun-bot-fallback"))
    .digest();
}

// Format: <iv b64>.<authTag b64>.<ciphertext b64>
export function encrypt(plain) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decrypt(payload) {
  if (!payload) return null;
  try {
    const [ivB, tagB, dataB] = String(payload).split(".");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (e) {
    // Kalit almashgan yoki payload buzilgan — null qaytadi, chaqiruvchi hal qiladi
    console.error("⚠️ Decrypt xatosi:", e.message);
    return null;
  }
}

// Dashboard ko'rinishi uchun: secret hech qachon to'liq ko'rsatilmaydi
export function maskSecret(plain) {
  const s = String(plain || "");
  if (!s) return "";
  return "••••" + s.slice(-4);
}
