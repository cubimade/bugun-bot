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
