// ============================================================
//  ROUTES/API-SETTINGS.JS — sozlamalar va tizim holati (ROADMAP-6 H5:
//  api.js 500 qatordan oshmasligi uchun ajratilgan)
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { state, ACCOUNTS_MAP, STARTED_AT, reloadSettings, requireDb } from "../state.js";
import { OFF_HOURS_MESSAGE } from "../config.js";
import { saveSettings, pool } from "../db.js";
import { APP_VERSION } from "../templates.js";

const router = express.Router();

const SETTING_KEYS = [
  "work_hours_enabled",
  "work_start",
  "work_end",
  "off_hours_message",
  "greeting_message",
  "reply_length",
  "story_reply_greeting", // 7.3
  "followup_enabled", // 7.5
  "followup_wait_hours",
  "followup_max",
  "followup_text",
  "media_image_reply", // 7.6
  "media_audio_reply",
  "sales_mode", // 8.6
  "supported_languages", // 9.3 (csv: uz,ru,en)
  "default_language",
  "greeting_buttons_enabled", // 8.1
  "greeting_buttons_text",
  "greeting_buttons", // JSON: [{title, reply}]
  "lead_magnet_enabled", // 9.6
  "lead_magnet_keyword",
  "lead_magnet_text",
  "lead_magnet_media",
  "pay_click", // 10.3
  "pay_payme",
  "pay_uzum",
  "calc_enabled", // 10.2
  "calc_base_price",
  "referral_bonus_enabled", // 10.5
  "referral_bonus_percent",
];

router.get("/api/settings", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await reloadSettings();
    // Standart qiymatlar (env) + database ustunligi
    res.json({
      settings: {
        work_hours_enabled:
          state.SETTINGS.work_hours_enabled ??
          String((process.env.WORK_HOURS_ENABLED ?? "false") === "true"),
        work_start: state.SETTINGS.work_start ?? String(process.env.WORK_START ?? 9),
        work_end: state.SETTINGS.work_end ?? String(process.env.WORK_END ?? 21),
        off_hours_message: state.SETTINGS.off_hours_message ?? OFF_HOURS_MESSAGE,
        greeting_message: state.SETTINGS.greeting_message ?? "",
        reply_length: state.SETTINGS.reply_length ?? "orta",
        story_reply_greeting: state.SETTINGS.story_reply_greeting ?? "",
        followup_enabled: state.SETTINGS.followup_enabled ?? "false",
        followup_wait_hours: state.SETTINGS.followup_wait_hours ?? "12",
        followup_max: state.SETTINGS.followup_max ?? "1",
        followup_text: state.SETTINGS.followup_text ?? "",
        media_image_reply: state.SETTINGS.media_image_reply ?? "",
        media_audio_reply: state.SETTINGS.media_audio_reply ?? "",
        sales_mode: state.SETTINGS.sales_mode ?? "false",
        supported_languages: state.SETTINGS.supported_languages ?? "uz,ru,en",
        default_language: state.SETTINGS.default_language ?? "uz",
        lead_magnet_enabled: state.SETTINGS.lead_magnet_enabled ?? "false",
        lead_magnet_keyword: state.SETTINGS.lead_magnet_keyword ?? "",
        lead_magnet_text: state.SETTINGS.lead_magnet_text ?? "",
        lead_magnet_media: state.SETTINGS.lead_magnet_media ?? "",
        pay_click: state.SETTINGS.pay_click ?? "",
        pay_payme: state.SETTINGS.pay_payme ?? "",
        pay_uzum: state.SETTINGS.pay_uzum ?? "",
        calc_enabled: state.SETTINGS.calc_enabled ?? "false",
        calc_base_price: state.SETTINGS.calc_base_price ?? "0",
        referral_bonus_enabled: state.SETTINGS.referral_bonus_enabled ?? "false",
        referral_bonus_percent: state.SETTINGS.referral_bonus_percent ?? "10",
        greeting_buttons_enabled: state.SETTINGS.greeting_buttons_enabled ?? "false",
        greeting_buttons_text: state.SETTINGS.greeting_buttons_text ?? "",
        greeting_buttons: state.SETTINGS.greeting_buttons ?? "[]",
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/api/settings", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const body = req.body || {};
    const toSave = {};
    for (const k of SETTING_KEYS) {
      if (body[k] != null) toSave[k] = String(body[k]).slice(0, 2000);
    }
    if (!Object.keys(toSave).length) {
      return res.status(400).json({ error: "Saqlash uchun sozlama yo'q" });
    }
    await saveSettings(toSave);
    await reloadSettings();
    console.log(`⚙️ Sozlamalar yangilandi: ${Object.keys(toSave).join(", ")}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 9.6: Lead magnit statistikasi — nechta yuborilgan, nechtasi mijozga aylangan
router.get("/api/lead-magnet/stats", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const [sent, converted] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS n FROM messages WHERE source = 'lead_magnet'`),
      pool.query(
        `SELECT COUNT(*)::int AS n FROM contacts WHERE 'lead' = ANY(tags) AND stage = 'won'`
      ),
    ]);
    res.json({ sent: sent.rows[0].n, converted: converted.rows[0].n });
  } catch (err) {
    next(err);
  }
});

// Tizim holati (sozlamalar sahifasidagi "Tizim" kartasi uchun)
router.get("/api/system", protect, async (req, res) => {
  let dbOk = false;
  if (state.DB_READY) {
    try {
      await pool.query("SELECT 1");
      dbOk = true;
    } catch (err) {
      dbOk = false;
    }
  }
  res.json({
    version: APP_VERSION,
    node: process.version,
    db: dbOk,
    accounts: ACCOUNTS_MAP.size,
    startedAt: STARTED_AT.toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    models: { haiku: "Haiku 4.5 (oddiy savollar)", sonnet: "Sonnet 5 (murakkab savollar)" },
  });
});

export default router;
