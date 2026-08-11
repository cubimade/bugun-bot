// ============================================================
//  ROUTES/API-AUTOMATION.JS — kalit so'z (7.4) va teg (7.8) qoidalari
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import {
  listKeywordRules,
  insertKeywordRule,
  keywordRuleExists,
  updateKeywordRule,
  deleteKeywordRule,
  listTagRules,
  insertTagRule,
  updateTagRule,
  deleteTagRule,
  getProjectKnowledge,
  getUnansweredSamples,
} from "../db.js";
import { getKnowledgeReview } from "../claude.js";

const router = express.Router();

// ROADMAP-16 (3.1b): moslik turlari. DB'dagi CHECK cheklovi bilan bir xil bo'lsin.
const MATCH_TYPES = ["exact", "contains", "starts", "regex"];

// --- 7.7: Bilim bazasi sifat bahosi (Haiku, 1 soatlik kesh) ---
const KB_REVIEW_TTL_MS = 60 * 60 * 1000;
const KB_REVIEW_CACHE = new Map(); // projectId -> { at, data, kbLen }

router.get("/api/knowledge/:projectId/review", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    const knowledge = await getProjectKnowledge(projectId);
    if (!(knowledge || "").trim()) {
      return res.json({
        review: {
          score: 0,
          sections: { xizmatlar: "missing", narxlar: "missing", aloqa: "missing", ish_vaqti: "missing", faq: "missing" },
          tips: ["Bilim bazasi bo'sh — avval xizmatlar, narxlar va aloqa ma'lumotini kiriting."],
          unanswered_note: "",
        },
        cachedAt: new Date().toISOString(),
      });
    }
    const force = req.query.refresh === "1";
    const hit = KB_REVIEW_CACHE.get(projectId);
    // Kesh: 1 soat VA bilim bazasi o'zgarmagan bo'lsa
    if (!force && hit && Date.now() - hit.at < KB_REVIEW_TTL_MS && hit.kbLen === knowledge.length) {
      return res.json({ review: hit.data, cachedAt: new Date(hit.at).toISOString() });
    }
    const unanswered = await getUnansweredSamples(projectId);
    const review = await getKnowledgeReview(knowledge, unanswered.join("\n"));
    if (!review) {
      return res.status(502).json({ error: "Baholab bo'lmadi — birozdan keyin urinib ko'ring" });
    }
    review.unanswered_samples = unanswered;
    KB_REVIEW_CACHE.set(projectId, { at: Date.now(), data: review, kbLen: knowledge.length });
    res.json({ review, cachedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// --- 7.4: Kalit so'z qoidalari ---
router.get("/api/keywords", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ rules: await listKeywordRules() });
  } catch (err) {
    next(err);
  }
});

// ROADMAP-16 (1.1): bir so'rovda BIR NECHTA kalit so'z.
// Eski shakl (`keyword: "narx"`) ham ishlaydi — orqaga moslik saqlangan.
// Har kalit so'z uchun ALOHIDA qoida yaratiladi, natija har biri bo'yicha
// alohida qaytariladi (qaysi biri qo'shildi, qaysi biri nega qo'shilmadi).
router.post("/api/keywords", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    // `keywords: [...]` yoki `keyword: "a, b, c"` — ikkalasi ham qabul qilinadi
    const raw = Array.isArray(req.body?.keywords)
      ? req.body.keywords
      : String(req.body?.keyword || "").split(",");

    // tozalash + bo'shlarni tashlash + takrorlarni olib tashlash (registrsiz)
    const seen = new Set();
    const keywords = raw
      .map((k) => String(k || "").trim().slice(0, 100))
      .filter((k) => {
        if (!k) return false;
        const low = k.toLowerCase();
        if (seen.has(low)) return false;
        seen.add(low);
        return true;
      });

    const replyText = String(req.body?.reply_text || "").trim().slice(0, 900);
    const matchType = MATCH_TYPES.includes(req.body?.match_type) ? req.body.match_type : "contains";
    const mediaUrl = String(req.body?.media_url || "").trim().slice(0, 500) || null;
    const projectId = Number(req.body?.project_id) || null;

    if (!keywords.length || !replyText) {
      return res.status(400).json({ error: "Kalit so'z va javob matni majburiy" });
    }
    if (keywords.length > 20) {
      return res.status(400).json({ error: "Bir vaqtda ko'pi bilan 20 ta kalit so'z qo'shish mumkin" });
    }
    if (mediaUrl && !/^https:\/\//.test(mediaUrl)) {
      return res.status(400).json({ error: "Media URL https:// bilan boshlanishi kerak" });
    }
    if (matchType === "regex") {
      // Xato regex saqlanmasin — bot har xabarda yiqilib qolmasligi uchun
      for (const k of keywords) {
        try {
          new RegExp(k, "i");
        } catch {
          return res.status(400).json({ error: `Regex xato: "${k}" — tekshirib qayta yozing` });
        }
      }
    }

    const created = [];
    const skipped = [];
    for (const keyword of keywords) {
      try {
        if (await keywordRuleExists(projectId, keyword)) {
          skipped.push({ keyword, reason: "bu kalit so'z shu akkaunt uchun allaqachon bor" });
          continue;
        }
        const id = await insertKeywordRule({ projectId, keyword, matchType, replyText, mediaUrl });
        created.push({ id, keyword });
        console.log(`🔑 Kalit so'z qoidasi qo'shildi: "${keyword}" (${matchType})`);
      } catch (err) {
        // Bittasi yiqilsa qolganlari qo'shilaveradi — sabab loglanadi va qaytariladi
        console.error(`⚠️ Kalit so'z qo'shilmadi ("${keyword}"): ${err.message}`);
        skipped.push({ keyword, reason: err.message });
      }
    }

    if (!created.length) {
      return res.status(409).json({
        error: skipped.map((s) => `"${s.keyword}" — ${s.reason}`).join("; "),
        created,
        skipped,
      });
    }
    res.json({ ok: true, created, skipped, id: created[0].id });
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
      matchType: MATCH_TYPES.includes(b.match_type) ? b.match_type : null,
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
