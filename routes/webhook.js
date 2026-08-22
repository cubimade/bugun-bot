// ============================================================
//  ROUTES/WEBHOOK.JS — Instagram webhook (ROADMAP-6 A3 da ajratilgan)
//  GET  /webhook — Meta ulanish tekshiruvi
//  POST /webhook — DM va kommentlarni qabul qilish
//  9.1 dan: DM'ning umumiy oqimi services/inbound.js da (Telegram bilan
//  bir xil) — bu fayl faqat Instagram'ga xos qismlarni qoldiradi.
// ============================================================
import express from "express";
import crypto from "crypto";

import {
  VERIFY_TOKEN,
  APP_SECRET,
  AUTO_DM_ON_COMMENT,
  buildCommentSystemPrompt,
} from "../config.js";
import { getCommentReply } from "../claude.js";
import { replyToComment, sendPrivateReply } from "../instagram.js";
import {
  getOrCreateContact,
  getProjectKnowledge,
  matchKeywordRule,
  incrementKeywordHit,
  findTriggerFlow,
} from "../db.js";
import { keywordRulesFor } from "../services/rules.js";
import { tryStartFlow } from "../services/flow-engine.js";
import { processIncomingText, processIncomingMedia, isRateLimited } from "../services/inbound.js";
import { state, ACCOUNTS_MAP, resolveAccount } from "../state.js";
import { findProjectsByIgIds, verifyTokenExistsInAnyProject } from "../db.js";
import { getAppConfig } from "../services/project-config.js";

const router = express.Router();

// ============================================================
//  C2: WEBHOOK IMZOSI — Meta X-Hub-Signature-256 yuboradi.
//  APP_SECRET bilan HMAC-SHA256 tekshiriladi — soxta so'rovlar kirmaydi.
// ============================================================
if (!APP_SECRET) {
  console.warn("⚠️ APP_SECRET env yo'q — webhook imzosi tekshirilmaydi. Railway'ga APP_SECRET (Meta App Secret) qo'shing.");
} else {
  // 13-audit diagnostika: qaysi secret jonli ekanini aniqlash uchun xavfsiz
  // fingerprint (secretning o'zi emas — sha256 hashining 8 belgisi).
  console.log(
    "🔐 APP_SECRET faol, fingerprint: " +
    crypto.createHash("sha256").update(APP_SECRET).digest("hex").slice(0, 8)
  );
}

// ROADMAP-19 FAZA 3: imzo endi ixtiyoriy secret bilan tekshiriladi —
// har loyihaning o'z ilova secret'i bo'lishi mumkin. (export — birlik test uchun)
export function signatureMatches(rawBody, sig, secret) {
  if (!secret || !rawBody || !sig || !sig.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Ko'p ilovali imzo tekshiruvi: entry[].id bo'yicha nomzod loyihalar topiladi,
// har birining secret'i bilan sinaladi; hech biri mos kelmasa global APP_SECRET.
// Natija: { verified: project|"global"|null, candidates: n }
async function verifyMultiApp(req, entryIds) {
  const sig = req.get("x-hub-signature-256") || "";
  const rawBody = req.rawBody;
  if (!rawBody) {
    console.warn("🔎 Imzo diagnostika: rawBody yo'q — express.json verify ishlamagan");
    return { verified: null, candidates: 0 };
  }

  let candidates = [];
  if (state.DB_READY && entryIds.length) {
    try {
      candidates = await findProjectsByIgIds(entryIds);
    } catch (e) {
      console.warn("⚠️ Webhook nomzod loyihalarni o'qib bo'lmadi:", e.message);
    }
  }

  // O'z ilovasi borlarning secret'i bilan
  for (const p of candidates.filter((c) => c.has_own_app)) {
    try {
      const cfg = await getAppConfig(p.id);
      if (signatureMatches(rawBody, sig, cfg.appSecret) || signatureMatches(rawBody, sig, cfg.igAppSecret)) {
        return { verified: p, candidates: candidates.length };
      }
    } catch {
      /* keyingi nomzod */
    }
  }

  // Global zaxira (mavjud oqim)
  if (signatureMatches(rawBody, sig, APP_SECRET)) {
    return { verified: "global", candidates: candidates.length };
  }
  return { verified: null, candidates: candidates.length };
}

// ============================================================
//  WEBHOOK — TEKSHIRUV (Meta ulanishni tasdiqlaydi)
// ============================================================
router.get("/webhook", async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // ROADMAP-19 FAZA 3.3: global VERIFY_TOKEN yoki birorta loyihaning
  // o'z verify_token'i — har mijoz ilovasi o'z tokeni bilan ro'yxatdan o'tadi
  let ok = mode === "subscribe" && Boolean(token) && token === VERIFY_TOKEN;
  if (!ok && mode === "subscribe" && state.DB_READY) {
    try {
      ok = await verifyTokenExistsInAnyProject(token);
    } catch (e) {
      console.warn("⚠️ Loyiha verify_token tekshiruvida xato:", e.message);
    }
  }

  if (ok) {
    console.log("✅ Webhook tasdiqlandi!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook tasdiqlanmadi — token noto'g'ri");
    res.sendStatus(403);
  }
});

// ============================================================
//  WEBHOOK — XABAR/KOMMENT QABUL QILISH
// ============================================================
// Imzo holati faqat o'zgarganda loglanadi (har so'rovda spam bo'lmasin)
let SIG_LAST_STATE = null; // null | "ok" | "bad"

router.post("/webhook", (req, res) => {
  // Meta'ga DARROV 200 (talab — kechikish webhook o'chirilishiga olib keladi).
  // Imzo tekshiruvi ham, ishlov ham fon rejimida.
  res.status(200).send("EVENT_RECEIVED");
  processWebhookAsync(req).catch((err) => {
    console.error("⚠️ Webhook fon ishlovida xatolik:", err.message);
    console.error(err.stack);
  });
});

async function processWebhookAsync(req) {
  const body = req.body || {};
  const entryIds = (body.entry || []).map((e) => String(e.id)).filter(Boolean);

  // ROADMAP-19 FAZA 3: imzo har nomzod loyihaning o'z secret'i bilan, keyin
  // global APP_SECRET bilan tekshiriladi. HOZIRCHA LOG-ONLY — noto'g'ri
  // bo'lsa ham BLOKLANMAYDI (ko'p ilovali oqim barqarorlashgach qattiqlashadi).
  const { verified, candidates } = await verifyMultiApp(req, entryIds);
  if (verified) {
    if (SIG_LAST_STATE !== "ok") {
      const src = verified === "global" ? "global APP_SECRET" : `loyiha ${verified.id} ilova secret'i`;
      console.log(`✅ Webhook imzosi to'g'ri — ${src} bilan mos`);
      SIG_LAST_STATE = "ok";
    }
  } else if (SIG_LAST_STATE !== "bad") {
    console.warn(
      `⚠️ [WEBHOOK] imzo tasdiqlanmadi (log-only rejim) — so'rov baribir qayta ishlanadi. ` +
        `entry: [${entryIds.join(", ")}], nomzod loyihalar: ${candidates}. ` +
        `APP_SECRET yoki loyiha ilova secret'ini Meta bilan solishtiring.`
    );
    SIG_LAST_STATE = "bad";
  }

  try {
    for (const entry of body.entry || []) {
      const { projectId, token } = resolveAccount(entry.id);
      console.log(
        `📇 Akkaunt: ${entry.id} → loyiha ${projectId ?? "-"} ` +
          (ACCOUNTS_MAP.has(String(entry.id)) ? "(ro'yxatda)" : "(fallback)")
      );

      // --- DM (shaxsiy xabarlar) ---
      for (const event of entry.messaging || []) {
        await handleDirectMessage(event, projectId, token);
      }

      // --- Kommentlar va boshqa o'zgarishlar ---
      for (const change of entry.changes || []) {
        console.log(`🔄 Change hodisasi: ${change.field}`);
        if (change.field === "comments") {
          await handleComment(entry, change.value, projectId, token);
        }
      }
    }
  } catch (err) {
    console.error("⚠️ Webhook xatoligi:", err.message);
    console.error(err.stack);
  }
}

// ============================================================
//  DM — Instagram hodisasini umumiy formatga o'girib, umumiy
//  oqimga (services/inbound.js) uzatamiz.
// ============================================================
async function handleDirectMessage(event, projectId, token) {
  if (event.message?.is_echo) {
    console.log("↩️ Echo xabar (bot o'zi yuborgan) — o'tkazamiz");
    return;
  }
  const senderId = event.sender?.id;
  if (!senderId) {
    console.log("⚠️ senderId topilmadi");
    return;
  }

  const userText = event.message?.text;
  const attachments = event.message?.attachments || [];

  // 7.6: Media xabar (rasm/ovoz/video/fayl)
  if (!userText && attachments.length) {
    const att = attachments[0] || {};
    await processIncomingMedia({
      platform: "instagram",
      projectId,
      token,
      senderId,
      kind: att.type || "file",
      mediaUrl: att.payload?.url || null,
    });
    return;
  }
  if (!userText) {
    console.log("ℹ️ Matn ham, media ham yo'q — o'tkazamiz");
    return;
  }

  const isStoryReply = Boolean(event.message?.reply_to?.story);
  if (isStoryReply) console.log(`📸 Story reply (${senderId}): ${userText}`);

  await processIncomingText({
    platform: "instagram",
    projectId,
    token,
    senderId,
    text: userText,
    quickPayload: event.message?.quick_reply?.payload || null,
    isStoryReply,
  });
}

// ============================================================
//  KOMMENTNI qayta ishlash (ommaviy javob + ixtiyoriy DM) — IG'ga xos
// ============================================================
async function handleComment(entry, value, projectId, token) {
  try {
    const commentId = value?.id;
    const commentText = value?.text;
    const fromId = value?.from?.id;
    const username = value?.from?.username;
    const accountId = entry?.id;

    if (!commentId || !commentText) {
      console.log("ℹ️ Komment matni yoki ID yo'q — o'tkazamiz");
      return;
    }
    if (fromId && accountId && fromId === accountId) {
      console.log("↩️ Bu botning o'z kommenti — o'tkazamiz");
      return;
    }
    // 13-audit (C): komment spam himoyasi — DM'dagi kabi rate limit
    if (fromId && isRateLimited(`comment:${fromId}`)) {
      console.log(`🚦 Rate limit: ${fromId} juda ko'p komment yozdi — o'tkazamiz`);
      return;
    }
    console.log(`💬 Yangi komment (@${username || fromId}): ${commentText}`);

    // 8.2: Komment triggerli flow
    if (state.DB_READY && projectId && fromId) {
      try {
        const flow = await findTriggerFlow(projectId, "comment", commentText);
        if (flow) {
          const contact = await getOrCreateContact(projectId, fromId, username || null);
          const started = await tryStartFlow(
            "comment",
            {
              contactId: contact.id,
              igUserId: fromId,
              name: contact.name || username,
              projectId,
              platform: "instagram",
              token,
              commentId, // birinchi xabar private reply orqali boradi
            },
            commentText
          );
          if (started) {
            await replyToComment(commentId, "Javobni DM'ga yubordim 📩", token);
            return;
          }
        }
      } catch (flowErr) {
        console.error("⚠️ Komment flow xatoligi:", flowErr.message);
      }
    }

    // 7.4: Komment'da kalit so'z — avtomatik DM (AI'siz)
    const kwRule = matchKeywordRule(await keywordRulesFor(projectId), commentText);
    if (kwRule) {
      console.log(`🔑 Kommentda kalit so'z ishladi: "${kwRule.keyword}" (qoida #${kwRule.id})`);
      await sendPrivateReply(commentId, kwRule.reply_text, token);
      await replyToComment(commentId, "Javobni DM'ga yubordim 📩", token);
      incrementKeywordHit(kwRule.id).catch(() => {});
      return;
    }

    // AI bilan komment javobi
    let knowledge = "";
    if (state.DB_READY && projectId) {
      try {
        knowledge = await getProjectKnowledge(projectId);
      } catch (dbErr) {
        console.error("⚠️ Bilim bazasini o'qishda xatolik:", dbErr.message);
      }
    }

    const reply = await getCommentReply(
      commentText,
      username,
      buildCommentSystemPrompt(knowledge)
    );
    console.log(`🤖 Komment javobi: ${reply}`);

    await replyToComment(commentId, reply, token);

    if (AUTO_DM_ON_COMMENT) {
      const dmText = `Salom${username ? " @" + username : ""}! Kommentingiz uchun rahmat 🙏 Savolingiz bo'lsa, shu yerda — DM'da bemalol yozing, yordam beraman. 😊`;
      await sendPrivateReply(commentId, dmText, token);
    }
  } catch (err) {
    console.error("⚠️ Komment qayta ishlashda xatolik:", err.message);
  }
}

export default router;
