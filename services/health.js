// ============================================================
//  SERVICES/HEALTH.JS — 12.5: o'z-o'zini tekshirish (har 10 daqiqa)
//  Database + (soatiga bir) Instagram token. Muammo bo'lsa —
//  admin'ga Telegram bildirishnoma (notify_down yoqilgan bo'lsa).
// ============================================================
import { state, ACCOUNTS_MAP } from "../state.js";
import { wrapCron } from "./cron-log.js";
import { pool } from "../db/pool.js";
import { verifyToken } from "../instagram.js";
import { notifyAdmin } from "./notify.js";
import { IG_TOKEN } from "../config.js";

let passCount = 0;
let dbWasDown = false;

export async function runHealthPass() {
  passCount++;

  // 1) Database — DB_READY bayrog'idan MUSTAQIL ping: boot'da ulanmagan yoki
  // keyin uzilgan bo'lsa ham sezamiz; tiklanganda bayroqni qayta yoqamiz
  // (aks holda barcha scheduler'lar abadiy jim no-op bo'lib qolardi).
  if (process.env.DATABASE_URL) {
    try {
      await pool.query("SELECT 1");
      if (!state.DB_READY) {
        const { initDb } = await import("../db/pool.js");
        await initDb(); // idempotent (IF NOT EXISTS)
        state.DB_READY = true;
        console.log("✅ Health: database tiklandi — DB_READY qayta yoqildi");
      }
      if (dbWasDown) {
        console.log("✅ Health: database tiklandi");
        notifyAdmin("down", "✅ Database qayta ulandi — tizim normal ishlayapti.").catch(() => {});
        dbWasDown = false;
      }
    } catch (err) {
      console.error("⚠️ Health: database ishlamayapti:", err.message);
      if (!dbWasDown) {
        dbWasDown = true;
        notifyAdmin("down", `⚠️ MUAMMO: database'ga ulanib bo'lmayapti!\n${err.message}`).catch(() => {});
      }
      return;
    }
  }

  // 2) Instagram token — har 6-tekshiruvda (≈soatiga bir), xatoga chidamli
  if (passCount % 6 === 0) {
    try {
      const token = IG_TOKEN || [...ACCOUNTS_MAP.values()][0]?.token;
      if (token) {
        const r = await verifyToken(token);
        if (r.ok === false) {
          console.error("⚠️ Health: Instagram token ishlamayapti:", r.error);
          notifyAdmin("down", `⚠️ MUAMMO: Instagram token ishlamayapti (muddati tugagan bo'lishi mumkin)!\n${r.error}\n→ Akkauntlar sahifasida yangi token kiriting.`).catch(() => {});
        }
      }
    } catch (err) {
      console.error("⚠️ Health: token tekshiruvi xatoligi:", err.message);
    }
  }
}

export function startHealthScheduler() {
  // ROADMAP-18 FAZA 4: [CRON] loglari + cron_runs jadvali
  const pass_ = wrapCron("health", runHealthPass, { quiet: true });
  const t = setInterval(pass_, 10 * 60 * 1000);
  if (t.unref) t.unref();
}
