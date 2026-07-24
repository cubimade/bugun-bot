// ============================================================
//  ROUTES/API.JS — /api/* endpointlar kirish nuqtasi (ROADMAP-6 A3)
//  Analitika va broadcast alohida fayllarda (500 qator qoidasi):
//    api-analytics.js — stats, diagrammalar, metrikalar, AI, eksport
//    api-broadcast.js — ommaviy xabar va scheduler
//  Bu faylda: akkauntlar, kontaktlar, teglar, javoblar, bilim bazasi,
//  sozlamalar, tizim holati.
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import {
  state,
  ACCOUNTS_MAP,
  STARTED_AT,
  registerAccount,
  reloadSettings,
  requireDb,
} from "../state.js";
import { IG_TOKEN, OFF_HOURS_MESSAGE } from "../config.js";
import { sendInstagramMessage } from "../instagram.js";
import {
  listProjects,
  deleteProject,
  listContacts,
  getContact,
  getContactMessages,
  markContactRead,
  listAllTags,
  setContactTags,
  setNeedsHuman,
  getContactAccount,
  saveMessage,
  setBotPaused,
  setContactNote,
  listSavedReplies,
  insertSavedReply,
  deleteSavedReply,
  getProjectKnowledge,
  setProjectKnowledge,
  saveSettings,
} from "../db.js";
import { APP_VERSION } from "../templates.js";
import { getRecentErrors } from "../logger.js";
import analyticsRouter from "./api-analytics.js";
import broadcastRouter from "./api-broadcast.js";

const router = express.Router();

// Analitika va broadcast endpointlari ham /api/* ostida
router.use(analyticsRouter);
router.use(broadcastRouter);

router.get("/api/projects", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    // Har akkauntga faollik holatini qo'shamiz: token DB'da yoki xotira
    // xaritasida bo'lsa — faol (webhook xabarlariga javob bera oladi).
    const projects = (await listProjects()).map((p) => ({
      ...p,
      active: p.ig_account_id
        ? Boolean(p.has_token || ACCOUNTS_MAP.has(String(p.ig_account_id)))
        : Boolean(IG_TOKEN), // asosiy (fallback) loyiha
    }));
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

// Akkauntni o'chirish (mijozlar va xabarlar ham o'chadi — CASCADE)
router.delete("/api/accounts/:projectId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    if (state.DEFAULT_PROJECT_ID && projectId === state.DEFAULT_PROJECT_ID) {
      return res.status(400).json({ error: "Asosiy loyihani o'chirib bo'lmaydi" });
    }
    const igId = await deleteProject(projectId);
    if (igId) ACCOUNTS_MAP.delete(String(igId));
    console.log(`🗑 Akkaunt o'chirildi (loyiha ${projectId})`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/api/contacts", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    res.json({ contacts: await listContacts(limit) });
  } catch (err) {
    next(err);
  }
});

// Oxirgi xatolar (muammolarni tez topish uchun)
router.get("/api/errors", protect, (req, res) => {
  res.json({ errors: getRecentErrors() });
});

router.get("/api/conversation/:contactId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.contactId);
    const contact = await getContact(contactId);
    if (!contact) return res.status(404).json({ error: "Mijoz topilmadi" });
    const messages = await getContactMessages(contactId);
    await markContactRead(contactId); // suhbat ochildi — o'qildi deb belgilaymiz
    res.json({ contact, messages });
  } catch (err) {
    next(err);
  }
});

// --- Teglar ---
router.get("/api/tags", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ tags: await listAllTags() });
  } catch (err) {
    next(err);
  }
});

router.post("/api/contacts/:id/tags", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    let tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    // Tozalash: satr, bo'sh emas, 30 belgigacha, ko'pi bilan 15 ta, takrorsiz
    tags = [...new Set(
      tags
        .map((t) => String(t).trim().slice(0, 30))
        .filter(Boolean)
    )].slice(0, 15);
    await setContactTags(contactId, tags);
    res.json({ ok: true, tags });
  } catch (err) {
    next(err);
  }
});

// --- "Odam kerak" holatini boshqarish (hal qilindi deb belgilash) ---
router.post("/api/contacts/:id/needs-human", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    const value = Boolean(req.body?.value);
    await setNeedsHuman(contactId, value);
    res.json({ ok: true, value });
  } catch (err) {
    next(err);
  }
});

// --- C4: Kontakt profili (drawer uchun — xabarlarsiz, yengil) ---
router.get("/api/contacts/:id/profile", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contact = await getContact(Number(req.params.id));
    if (!contact) return res.status(404).json({ error: "Mijoz topilmadi" });
    res.json({ contact });
  } catch (err) {
    next(err);
  }
});

// --- C1: Bot pauza (operator rejimi) — qo'lda yoqish/o'chirish ---
router.post("/api/contacts/:id/pause", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    const value = Boolean(req.body?.value);
    // Qo'lda pauza — muddatsiz (operator o'zi qayta yoqadi)
    await setBotPaused(contactId, value, null);
    console.log(`${value ? "🔕 Bot pauza qilindi" : "▶️ Bot qayta yoqildi"} (mijoz ${contactId})`);
    res.json({ ok: true, value });
  } catch (err) {
    next(err);
  }
});

// --- C4: Mijoz izohi (nota) — mini-CRM ---
router.post("/api/contacts/:id/note", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    const note = String(req.body?.note ?? "").slice(0, 2000);
    await setContactNote(contactId, note);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- C2: Tezkor javoblar (saved replies) ---
router.get("/api/saved-replies", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ replies: await listSavedReplies() });
  } catch (err) {
    next(err);
  }
});

router.post("/api/saved-replies", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const title = String(req.body?.title || "").trim().slice(0, 80);
    const text = String(req.body?.text || "").trim().slice(0, 1000);
    if (!title || !text) {
      return res.status(400).json({ error: "title va text majburiy" });
    }
    const id = await insertSavedReply(title, text);
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/saved-replies/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await deleteSavedReply(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Qo'lda javob yuborish (operator bot o'rniga yozadi) ---
router.post("/api/reply", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.body?.contactId);
    const text = String(req.body?.text || "").trim();
    if (!contactId || !text) {
      return res.status(400).json({ error: "contactId va text majburiy" });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: "Xabar juda uzun (1000 belgigacha)" });
    }

    const acct = await getContactAccount(contactId);
    if (!acct) return res.status(404).json({ error: "Mijoz topilmadi" });

    // Token: loyihadagi token → xotira xaritasi → asosiy (fallback) token
    const token =
      acct.access_token ||
      ACCOUNTS_MAP.get(String(acct.ig_account_id || ""))?.token ||
      IG_TOKEN;
    if (!token) {
      return res.status(400).json({ error: "Bu akkaunt uchun token topilmadi" });
    }

    const result = await sendInstagramMessage(acct.ig_user_id, text, token);
    if (!result.ok) {
      return res.status(502).json({ error: "Instagram: " + result.error });
    }

    await saveMessage(contactId, "assistant", text, true); // operator belgisi bilan
    await setNeedsHuman(contactId, false); // operator javob berdi — hal qilindi

    // AVTO-PAUZA: operator qo'lda yozdi — bot 30 daqiqa jim turadi,
    // muddat tugagach o'zi qayta yoqiladi (ChatPlace'dan aqlliroq).
    const pausedUntil = new Date(Date.now() + 30 * 60 * 1000);
    await setBotPaused(contactId, true, pausedUntil);

    console.log(`👤 Operator javobi yuborildi (mijoz ${contactId}) — bot 30 daqiqa pauzada`);
    res.json({ ok: true, botPausedUntil: pausedUntil.toISOString() });
  } catch (err) {
    next(err);
  }
});

// --- Bilim bazasi (o'qish/yozish) ---
router.get("/api/knowledge/:projectId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    res.json({ projectId, knowledge: await getProjectKnowledge(projectId) });
  } catch (err) {
    next(err);
  }
});

router.post("/api/knowledge/:projectId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    const text = typeof req.body?.knowledge === "string" ? req.body.knowledge : "";
    await setProjectKnowledge(projectId, text);
    console.log(`📝 Bilim bazasi yangilandi (loyiha ${projectId}, ${text.length} belgi)`);
    res.json({ ok: true, projectId, length: text.length });
  } catch (err) {
    next(err);
  }
});

// --- Yangi akkaunt qo'shish (multi-account) ---
router.post("/api/accounts", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const { name, ig_account_id, token } = req.body || {};
    if (!ig_account_id || !token) {
      return res.status(400).json({ error: "ig_account_id va token majburiy" });
    }
    const projectId = await registerAccount({
      name,
      igAccountId: ig_account_id,
      token,
    });
    console.log(`➕ Yangi akkaunt qo'shildi: ${ig_account_id} (loyiha ${projectId})`);
    res.json({ ok: true, projectId });
  } catch (err) {
    next(err);
  }
});

// ============================================================
//  SOZLAMALAR va TIZIM HOLATI
// ============================================================
const SETTING_KEYS = [
  "work_hours_enabled",
  "work_start",
  "work_end",
  "off_hours_message",
  "greeting_message",
  "reply_length",
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
      const { pool } = await import("../db.js");
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
