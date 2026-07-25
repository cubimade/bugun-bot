// ============================================================
//  SERVICES/INBOUND-GUARDS.JS — kiruvchi oqim himoya funksiyalari
//  (13-audit: inbound.js 590 qator edi — shu qism alohida faylga ajratildi)
//  Rate limit, spam/so'kinish filtrlari, A/B test keshi, portfolio
//  so'rovi aniqlash, salomlashish tugmalari parse.
// ============================================================
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "../config.js";
import { getActiveAbTest } from "../db.js";
import { state } from "../state.js";

// 11.5: faol A/B test keshi (60s) — har xabarda DB so'ramaslik uchun
const AB_CACHE = new Map(); // "projectId:type" -> { at, test }
export async function activeAbTest(projectId, testType) {
  const key = `${projectId}:${testType}`;
  const hit = AB_CACHE.get(key);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.test;
  try {
    const test = await getActiveAbTest(projectId, testType);
    AB_CACHE.set(key, { at: Date.now(), test });
    return test;
  } catch {
    return null;
  }
}

// 9.5: "ishlaringizni ko'rsating" so'rovini aniqlash
const PORTFOLIO_WORDS = [
  "portfolio", "portfoliyo", "ishlaringiz", "ishlaringizni", "ishlarizni",
  "namuna", "namunalar", "misollar", "qilgan ishlar",
];
export function asksPortfolio(text) {
  const t = String(text || "").toLowerCase();
  return PORTFOLIO_WORDS.some((w) => t.includes(w));
}

// ============================================================
//  12.5: SPAM VA SO'KINISH FILTRI
// ============================================================
// Takroriy bir xil xabar (2 daqiqada 3+ marta) — spam belgisi
const REPEAT_MAP = new Map(); // key -> { text, count, at }
export function isRepeatSpam(key, text) {
  const now = Date.now();
  const rec = REPEAT_MAP.get(key);
  if (rec && rec.text === text && now - rec.at < 2 * 60 * 1000) {
    rec.count++;
    rec.at = now;
    return rec.count >= 3;
  }
  REPEAT_MAP.set(key, { text, count: 1, at: now });
  if (REPEAT_MAP.size > 3000) REPEAT_MAP.clear(); // xotira himoyasi
  return false;
}

// Havola tashlagan YANGI kontakt (birinchi xabarida) — bot-o'xshash xatti-harakat
export function looksLikeSpamLink(text, isNewContact) {
  return isNewContact && /(https?:\/\/|t\.me\/|bit\.ly)/i.test(text) && text.length < 250;
}

// So'kinish: sozlamalardagi ro'yxat (vergul bilan) — operatorga uzatiladi
export function hasBadWords(text) {
  const words = (state.SETTINGS.bad_words || "")
    .split(",").map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3);
  if (!words.length) return false;
  const t = String(text).toLowerCase();
  return words.some((w) => t.includes(w));
}

// --- Rate limiting (spam himoyasi) — xotirada, senderId bo'yicha ---
const rateMap = new Map();
export function isRateLimited(senderId) {
  const now = Date.now();
  const arr = (rateMap.get(senderId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  rateMap.set(senderId, arr);
  return arr.length > RATE_LIMIT_MAX;
}

// settings.greeting_buttons — JSON: [{ "title": "Narxlar", "reply": "..." }]
export function parseGreetingButtons() {
  try {
    const arr = JSON.parse(state.SETTINGS.greeting_buttons || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.filter((b) => b && (b.title || "").trim() && (b.reply || "").trim());
  } catch {
    return [];
  }
}
