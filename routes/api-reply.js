// ============================================================
//  ROUTES/API-REPLY.JS — operator javoblari va tezkor javoblar
//  (13-audit: api.js 610 qator edi — shu guruh alohida faylga ajratildi)
//  Tezkor javoblar (saved replies), qo'lda javob, media yuborish.
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { ACCOUNTS_MAP, requireDb } from "../state.js";
import { IG_TOKEN } from "../config.js";
import { senderFor } from "../services/channels.js";
import {
  listSavedReplies,
  insertSavedReply,
  deleteSavedReply,
  getContactAccount,
  saveMessage,
  setNeedsHuman,
  setBotPaused,
  stopContactFlows,
  getMediaMeta,
} from "../db.js";

const router = express.Router();

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

    // 9.1: platformaga mos yuborish (Instagram yoki Telegram)
    const send = senderFor(acct.platform || "instagram", token);
    const result = await send.text(acct.ig_user_id, text);
    if (!result.ok) {
      return res.status(502).json({ error: (acct.platform === "telegram" ? "Telegram: " : "Instagram: ") + result.error });
    }

    await saveMessage(contactId, "assistant", text, true); // operator belgisi bilan
    await setNeedsHuman(contactId, false); // operator javob berdi — hal qilindi

    // AVTO-PAUZA: operator qo'lda yozdi — bot 30 daqiqa jim turadi,
    // muddat tugagach o'zi qayta yoqiladi (ChatPlace'dan aqlliroq).
    const pausedUntil = new Date(Date.now() + 30 * 60 * 1000);
    await setBotPaused(contactId, true, pausedUntil);
    // 8.7: operator suhbatni oldi — faol flow to'xtatiladi
    await stopContactFlows(contactId).catch(() => {});

    console.log(`👤 Operator javobi yuborildi (mijoz ${contactId}) — bot 30 daqiqa pauzada`);
    res.json({ ok: true, botPausedUntil: pausedUntil.toISOString() });
  } catch (err) {
    next(err);
  }
});

// --- 9.5: Media yuborish (inbox'dan kutubxona fayli) ---
router.post("/api/reply-media", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.body?.contactId);
    const mediaId = Number(req.body?.mediaId);
    if (!contactId || !mediaId) {
      return res.status(400).json({ error: "contactId va mediaId majburiy" });
    }
    const [acct, media] = await Promise.all([
      getContactAccount(contactId),
      getMediaMeta(mediaId),
    ]);
    if (!acct) return res.status(404).json({ error: "Mijoz topilmadi" });
    if (!media) return res.status(404).json({ error: "Fayl topilmadi" });

    const token =
      acct.access_token ||
      ACCOUNTS_MAP.get(String(acct.ig_account_id || ""))?.token ||
      IG_TOKEN;
    if (!token) return res.status(400).json({ error: "Bu akkaunt uchun token topilmadi" });

    const host = process.env.RAILWAY_PUBLIC_DOMAIN || req.get("host");
    const url = `https://${host}/media/${media.id}`;
    const send = senderFor(acct.platform || "instagram", token);
    const result = media.type === "image"
      ? await send.image(acct.ig_user_id, url)
      : await send.file(acct.ig_user_id, url, media.name);
    if (!result.ok) {
      return res.status(502).json({ error: "Yuborilmadi: " + result.error });
    }
    await saveMessage(contactId, "assistant", `📎 [${media.name}]`, true);
    console.log(`📎 Media yuborildi (mijoz ${contactId}): ${media.name}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
