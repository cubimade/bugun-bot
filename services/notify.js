// ============================================================
//  SERVICES/NOTIFY.JS — 12.3: admin uchun Telegram bildirishnomalar
//  Turlari (har biri sozlamada alohida yoqiladi):
//  human · negative · booking · payment · down
//  Yuborish: birinchi ulangan Telegram bot orqali, chat ID sozlamada.
// ============================================================
import { state } from "../state.js";
import { pool } from "../db/pool.js";
import { sendTelegramMessage } from "./telegram.js";

let TG_TOKEN_CACHE = { at: 0, token: null };

async function notifyToken() {
  if (Date.now() - TG_TOKEN_CACHE.at < 5 * 60 * 1000) return TG_TOKEN_CACHE.token;
  try {
    const { rows } = await pool.query(
      `SELECT access_token FROM projects WHERE platform = 'telegram' AND access_token IS NOT NULL LIMIT 1`
    );
    TG_TOKEN_CACHE = { at: Date.now(), token: rows[0]?.access_token || null };
  } catch {
    TG_TOKEN_CACHE = { at: Date.now(), token: null };
  }
  return TG_TOKEN_CACHE.token;
}

// Takroriy xabar bosimini kamaytirish (tur bo'yicha 10 daqiqa oyna)
const LAST_SENT = new Map(); // type -> ts
const COOLDOWN_MS = { human: 0, negative: 5 * 60 * 1000, booking: 0, payment: 0, down: 30 * 60 * 1000 };

// type yoqilganmi + chat id bormi → yuboradi. Xato bo'lsa jim (asosiy oqimga xalaqit yo'q).
export async function notifyAdmin(type, text) {
  try {
    if (!state.DB_READY) return;
    if (state.SETTINGS[`notify_${type}`] !== "true") return;
    const chatId = (state.SETTINGS.notify_tg_chat_id || state.SETTINGS.report_tg_chat_id || "").trim();
    if (!chatId) return;
    const cd = COOLDOWN_MS[type] || 0;
    if (cd && Date.now() - (LAST_SENT.get(type) || 0) < cd) return;
    const token = await notifyToken();
    if (!token) return;
    const r = await sendTelegramMessage(chatId, text, token);
    if (r.ok) {
      LAST_SENT.set(type, Date.now());
      console.log(`🔔 Admin bildirishnomasi yuborildi (${type})`);
    }
  } catch (err) {
    console.error("⚠️ Bildirishnoma xatoligi:", err.message);
  }
}
