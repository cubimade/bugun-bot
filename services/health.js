// ============================================================
//  SERVICES/HEALTH.JS — 12.5: o'z-o'zini tekshirish (har 10 daqiqa)
//  Database + (soatiga bir) Instagram token. Muammo bo'lsa —
//  admin'ga Telegram bildirishnoma (notify_down yoqilgan bo'lsa).
// ============================================================
import { state, ACCOUNTS_MAP } from "../state.js";
import { pool } from "../db/pool.js";
import { verifyToken } from "../instagram.js";
import { notifyAdmin } from "./notify.js";
import { IG_TOKEN } from "../config.js";

let passCount = 0;
let dbWasDown = false;

export async function runHealthPass() {
  passCount++;

  // 1) Database
  try {
    if (state.DB_READY) {
      await pool.query("SELECT 1");
      if (dbWasDown) {
        console.log("✅ Health: database tiklandi");
        notifyAdmin("down", "✅ Database qayta ulandi — tizim normal ishlayapti.").catch(() => {});
        dbWasDown = false;
      }
    }
  } catch (err) {
    console.error("⚠️ Health: database ishlamayapti:", err.message);
    if (!dbWasDown) {
      dbWasDown = true;
      notifyAdmin("down", `⚠️ MUAMMO: database'ga ulanib bo'lmayapti!\n${err.message}`).catch(() => {});
    }
    return;
  }

  // 2) Instagram token — har 6-tekshiruvda (≈soatiga bir)
  if (passCount % 6 === 0) {
    const token = IG_TOKEN || [...ACCOUNTS_MAP.values()][0]?.token;
    if (token) {
      const r = await verifyToken(token);
      if (r.ok === false) {
        console.error("⚠️ Health: Instagram token ishlamayapti:", r.error);
        notifyAdmin("down", `⚠️ MUAMMO: Instagram token ishlamayapti (muddati tugagan bo'lishi mumkin)!\n${r.error}\n→ Akkauntlar sahifasida yangi token kiriting.`).catch(() => {});
      }
    }
  }
}

export function startHealthScheduler() {
  const t = setInterval(runHealthPass, 10 * 60 * 1000);
  if (t.unref) t.unref();
}
