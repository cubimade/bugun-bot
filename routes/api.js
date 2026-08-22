// ============================================================
//  ROUTES/API.JS — /api/* endpointlar kirish nuqtasi (ROADMAP-6 A3)
//  Analitika va broadcast alohida fayllarda (500 qator qoidasi):
//    api-analytics.js — stats, diagrammalar, metrikalar, AI, eksport
//    api-broadcast.js — ommaviy xabar va scheduler
//    api-contacts.js  — kontaktlar, suhbat, teglar, pauza (13-audit)
//    api-reply.js     — operator javoblari, tezkor javoblar (13-audit)
//  Bu faylda: akkauntlar (IG + Telegram), bilim bazasi, tizim.
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import {
  state,
  ACCOUNTS_MAP,
  registerAccount,
  requireDb,
} from "../state.js";
import { IG_TOKEN } from "../config.js";
import { verifyToken } from "../instagram.js";
import {
  verifyBotToken,
  setTelegramWebhook,
  telegramWebhookSecret,
} from "../services/telegram.js";
import {
  listProjects,
  deleteProject,
  getProjectKnowledge,
  setProjectKnowledge,
  createTelegramProject,
  logAudit,
} from "../db.js";
import { pool } from "../db/pool.js";
import { getRecentErrors } from "../logger.js";
import analyticsRouter from "./api-analytics.js";
import broadcastRouter from "./api-broadcast.js";
import settingsRouter from "./api-settings.js";
import diagnosticsRouter from "./api-diagnostics.js";
import cleanupRouter from "./api-cleanup.js";
import automationRouter from "./api-automation.js";
import flowsRouter from "./api-flows.js";
import pipelineRouter from "./api-pipeline.js";
import mediaRouter from "./api-media.js";
import salesRouter from "./api-sales.js";
import analytics2Router from "./api-analytics2.js";
import usersRouter from "./api-users.js";
import integrationsRouter from "./api-integrations.js";
import contactsRouter from "./api-contacts.js";
import replyRouter from "./api-reply.js";
import oauthApiRouter from "./api-oauth.js";

const router = express.Router();

// Analitika, broadcast, sozlamalar, diagnostika va avtomatizatsiya ham /api/* ostida
router.use(analyticsRouter);
router.use(broadcastRouter);
router.use(settingsRouter);
router.use(diagnosticsRouter);
router.use(cleanupRouter);
router.use(automationRouter);
router.use(flowsRouter);
router.use(pipelineRouter);
router.use(mediaRouter);
router.use(salesRouter);
router.use(analytics2Router);
router.use(usersRouter);
router.use(integrationsRouter);
router.use(contactsRouter);
router.use(replyRouter);
router.use(oauthApiRouter); // 15: OAuth holati va token uzaytirish

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
    logAudit(req.user?.email || "owner", "account_delete", `loyiha #${projectId}`).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ROADMAP-18 FAZA 6.5: akkauntga haqiqiy nom berish ("Dr. Dildora" kabi)
router.post("/api/accounts/:projectId/rename", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    const name = String(req.body?.name || "").trim().slice(0, 60);
    if (!name) return res.status(400).json({ error: "Nom bo'sh bo'lmasin" });
    await pool.query(`UPDATE projects SET name = $2 WHERE id = $1`, [projectId, name]);
    logAudit(req.user?.email || "owner", "account_rename", `loyiha #${projectId} → "${name}"`).catch(() => {});
    res.json({ ok: true, name });
  } catch (err) {
    next(err);
  }
});

// Oxirgi xatolar (muammolarni tez topish uchun)
router.get("/api/errors", protect, (req, res) => {
  res.json({ errors: getRecentErrors() });
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
    if (!Number.isInteger(projectId)) return res.status(400).json({ error: "Noto'g'ri loyiha ID" });
    // 200k belgi — har javobda system prompt'ga tushadi, cheksiz bo'lmasin
    const text = (typeof req.body?.knowledge === "string" ? req.body.knowledge : "").slice(0, 200000);
    await setProjectKnowledge(projectId, text);
    console.log(`📝 Bilim bazasi yangilandi (loyiha ${projectId}, ${text.length} belgi)`);
    logAudit(req.user?.email || "owner", "knowledge_update", `loyiha #${projectId}, ${text.length} belgi`).catch(() => {});
    res.json({ ok: true, projectId, length: text.length });
  } catch (err) {
    next(err);
  }
});

// --- Yangi akkaunt qo'shish (multi-account) ---
router.post("/api/accounts", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    // C4: input validatsiya — tur, uzunlik, format
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const ig_account_id = String(req.body?.ig_account_id || "").trim();
    const token = String(req.body?.token || "").trim();
    if (!ig_account_id || !token) {
      return res.status(400).json({ error: "ig_account_id va token majburiy" });
    }
    if (!/^\d{5,25}$/.test(ig_account_id)) {
      return res.status(400).json({ error: "ig_account_id faqat raqamlardan iborat bo'lishi kerak" });
    }
    if (token.length > 500) {
      return res.status(400).json({ error: "Token juda uzun" });
    }

    // Tokenni Instagram'da jonli tekshiramiz — o'lik token saqlanmasin
    const check = await verifyToken(token);
    if (check.ok === false) {
      return res.status(400).json({ error: "Token ishlamadi — Instagram javobi: " + check.error });
    }
    // ok === null (tarmoq xatosi) — tekshirib bo'lmadi, baribir saqlaymiz
    let warning = null;
    if (check.ok && check.userId && check.userId !== ig_account_id) {
      warning =
        `Diqqat: token boshqa akkauntga tegishli ko'rinadi ` +
        `(token akkaunti: ${check.userId}, siz kiritgan ID: ${ig_account_id}). ` +
        `Webhook xabarlari kiritilgan ID bo'yicha yo'naltiriladi — ID noto'g'ri bo'lsa bot javob bermaydi.`;
    }

    const projectId = await registerAccount({
      name: name || (check.username ? "@" + check.username : ""),
      igAccountId: ig_account_id,
      token,
    });
    console.log(
      `➕ Yangi akkaunt qo'shildi: ${ig_account_id}` +
        (check.username ? ` (@${check.username})` : "") +
        ` (loyiha ${projectId})` +
        (warning ? " — ⚠️ ID mos emas" : "")
    );
    res.json({ ok: true, projectId, username: check.username || null, warning });
  } catch (err) {
    next(err);
  }
});

// ============================================================
//  9.1: TELEGRAM BOT QO'SHISH — token tekshiriladi, loyiha yaratiladi,
//  webhook avtomatik o'rnatiladi (secret bilan).
// ============================================================
router.post("/api/accounts/telegram", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const token = String(req.body?.token || "").trim();
    if (!token || token.length > 200 || !/^\d{5,12}:[\w-]{20,60}$/.test(token)) {
      return res.status(400).json({ error: "Bot token formati noto'g'ri (123456:ABC-... ko'rinishida bo'ladi)" });
    }

    // Tokenni Telegram'da jonli tekshiramiz
    const check = await verifyBotToken(token);
    if (check.ok === false) {
      return res.status(400).json({ error: "Token ishlamadi — Telegram javobi: " + check.error });
    }
    if (check.ok === null) {
      return res.status(502).json({ error: "Telegram'ga ulanib bo'lmadi: " + check.error });
    }

    const projectId = await createTelegramProject(
      name || (check.username ? "@" + check.username : "Telegram bot"),
      check.botId,
      token,
      check.username
    );

    // Webhook'ni avtomatik o'rnatamiz (domen: so'rov kelgan host)
    const host = process.env.RAILWAY_PUBLIC_DOMAIN || req.get("host");
    const url = `https://${host}/webhook/telegram/${projectId}`;
    const wh = await setTelegramWebhook(token, url, telegramWebhookSecret(projectId));

    console.log(
      `➕ Telegram bot qo'shildi: @${check.username} (loyiha ${projectId})` +
        (wh.ok ? " — webhook o'rnatildi" : ` — ⚠️ webhook xatosi: ${wh.error}`)
    );
    res.json({
      ok: true,
      projectId,
      username: check.username,
      webhook: wh.ok,
      warning: wh.ok ? null : "Webhook o'rnatilmadi: " + wh.error,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
