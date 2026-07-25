// ============================================================
//  SERVICES/REPORT.JS — 11.7: haftalik hisobot
//  Matn hisobot yig'ish + Telegram'ga avtomatik yuborish
//  (dushanba ~09:00 Toshkent, sozlamada yoqiladi)
// ============================================================
import { state, reloadSettings } from "../state.js";
import { TZ_OFFSET } from "../config.js";
import {
  getStatsForPeriod,
  getFinance,
  segmentCounts,
  saveSettings,
} from "../db.js";
import { getWhatsChanged } from "../claude.js";
import { sendTelegramMessage } from "./telegram.js";

// Hisobot matni (Telegram va HTML eksport asosi)
export async function buildWeeklyReportData() {
  const avgCheck = Number(state.SETTINGS.avg_check) || 0;
  const [week, finance, segments] = await Promise.all([
    getStatsForPeriod("7d"),
    getFinance(avgCheck),
    segmentCounts(),
  ]);
  return { week, finance, segments };
}

export function reportToText(d) {
  const w = d.week || {};
  const f = d.finance || {};
  const lines = [
    "📊 BUGUN BOT — haftalik hisobot",
    "",
    `💬 Xabarlar (7 kun): ${w.messages ?? "—"}`,
    `👥 Yangi mijozlar: ${w.contactsNew ?? "—"}`,
    `📈 Konversiya (jami): ${f.conversion ?? 0}%`,
    `✅ Sotilgan (jami): ${f.won ?? 0} ta`,
    `💰 Daromad${f.revenueIsEstimate ? " (taxminiy)" : ""}: ${Number(f.revenue || 0).toLocaleString("uz-UZ")} so'm`,
    `🧲 LTV: ${Number(f.ltv || 0).toLocaleString("uz-UZ")} so'm`,
    "",
    `Segmentlar: 🌟 VIP ${d.segments?.vip || 0} · 🔥 Faol ${d.segments?.faol || 0} · 😴 Uxlagan ${d.segments?.uxlagan || 0} · ❄️ Sovuq ${d.segments?.sovuq || 0}`,
  ];
  return lines.join("\n");
}

// ------------------------------------------------------------
//  Haftalik avto-yuborish (soatiga tekshiradi; dushanba 09:00 dan keyin
//  shu hafta yuborilmagan bo'lsa — yuboradi)
// ------------------------------------------------------------
function currentWeekKey() {
  const local = new Date(Date.now() + TZ_OFFSET * 3600 * 1000);
  const year = local.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.ceil(((local.getTime() - jan1) / 86400000 + 1) / 7);
  return `${year}-w${week}`;
}

export async function runWeeklyReportPass() {
  if (!state.DB_READY) return;
  if (state.SETTINGS.report_telegram_enabled !== "true") return;
  const chatId = (state.SETTINGS.report_tg_chat_id || "").trim();
  if (!chatId) return;

  const local = new Date(Date.now() + TZ_OFFSET * 3600 * 1000);
  const isMonday = local.getUTCDay() === 1;
  const hour = local.getUTCHours();
  if (!isMonday || hour < 9) return;

  const wk = currentWeekKey();
  if (state.SETTINGS.report_last_week === wk) return; // shu hafta yuborilgan

  try {
    // Telegram bot tokeni — birinchi telegram loyihadan
    const { pool } = await import("../db/pool.js");
    const { rows } = await pool.query(
      `SELECT access_token FROM projects WHERE platform = 'telegram' AND access_token IS NOT NULL LIMIT 1`
    );
    const token = rows[0]?.access_token;
    if (!token) {
      console.warn("⚠️ Haftalik hisobot: Telegram bot ulanmagan");
      return;
    }
    const data = await buildWeeklyReportData();
    let text = reportToText(data);
    try {
      const ai = await getWhatsChanged({
        messages: data.week.messages,
        messagesPrev: data.week.prevRaw?.messages,
        activeContacts: data.week.contactsActive,
        activeContactsPrev: data.week.prevRaw?.contactsActive,
        newContacts: data.week.contactsNew,
        needsHuman: data.week.needsHuman,
      });
      if (ai) text += `\n\n🤖 AI xulosa: ${ai}`;
    } catch {
      /* jim */
    }
    const r = await sendTelegramMessage(chatId, text, token);
    if (r.ok) {
      await saveSettings({ report_last_week: wk });
      await reloadSettings();
      console.log(`📬 Haftalik hisobot Telegram'ga yuborildi (${wk})`);
    } else {
      console.error("⚠️ Haftalik hisobot yuborilmadi:", r.error);
    }
  } catch (err) {
    console.error("⚠️ Haftalik hisobot xatoligi:", err.message);
  }
}

export function startWeeklyReportScheduler() {
  setTimeout(runWeeklyReportPass, 4 * 60 * 1000);
  const t = setInterval(runWeeklyReportPass, 60 * 60 * 1000);
  if (t.unref) t.unref();
}
