// ============================================================
//  ROUTES/API-AUTOMATION.JS — kalit so'z (7.4) va teg (7.8) qoidalari
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import {
  listKeywordRules,
  insertKeywordRule,
  updateKeywordRule,
  deleteKeywordRule,
  listTagRules,
  insertTagRule,
  updateTagRule,
  deleteTagRule,
} from "../db.js";

const router = express.Router();

// --- 7.4: Kalit so'z qoidalari ---
router.get("/api/keywords", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ rules: await listKeywordRules() });
  } catch (err) {
    next(err);
  }
});

router.post("/api/keywords", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const keyword = String(req.body?.keyword || "").trim().slice(0, 100);
    const replyText = String(req.body?.reply_text || "").trim().slice(0, 900);
    const matchType = req.body?.match_type === "exact" ? "exact" : "contains";
    const mediaUrl = String(req.body?.media_url || "").trim().slice(0, 500) || null;
    const projectId = Number(req.body?.project_id) || null;
    if (!keyword || !replyText) {
      return res.status(400).json({ error: "Kalit so'z va javob matni majburiy" });
    }
    if (mediaUrl && !/^https:\/\//.test(mediaUrl)) {
      return res.status(400).json({ error: "Media URL https:// bilan boshlanishi kerak" });
    }
    const id = await insertKeywordRule({ projectId, keyword, matchType, replyText, mediaUrl });
    console.log(`🔑 Kalit so'z qoidasi qo'shildi: "${keyword}" (${matchType})`);
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

router.post("/api/keywords/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    await updateKeywordRule(id, {
      keyword: b.keyword != null ? String(b.keyword).trim().slice(0, 100) : null,
      matchType: b.match_type === "exact" ? "exact" : b.match_type === "contains" ? "contains" : null,
      replyText: b.reply_text != null ? String(b.reply_text).trim().slice(0, 900) : null,
      mediaUrl: b.media_url != null ? String(b.media_url).trim().slice(0, 500) || null : null,
      isActive: b.is_active != null ? Boolean(b.is_active) : null,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/keywords/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await deleteKeywordRule(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- 7.8: Teg qoidalari ---
router.get("/api/tag-rules", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ rules: await listTagRules() });
  } catch (err) {
    next(err);
  }
});

router.post("/api/tag-rules", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const keyword = String(req.body?.keyword || "").trim().slice(0, 100);
    const tagName = String(req.body?.tag_name || "").trim().slice(0, 30);
    const projectId = Number(req.body?.project_id) || null;
    if (!keyword || !tagName) {
      return res.status(400).json({ error: "So'z va teg nomi majburiy" });
    }
    const id = await insertTagRule({ projectId, keyword, tagName });
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

router.post("/api/tag-rules/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await updateTagRule(Number(req.params.id), {
      isActive: req.body?.is_active != null ? Boolean(req.body.is_active) : null,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/tag-rules/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await deleteTagRule(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
