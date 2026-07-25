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

const router = express.Router();

// ============================================================
//  C2: WEBHOOK IMZOSI — Meta X-Hub-Signature-256 yuboradi.
//  APP_SECRET bilan HMAC-SHA256 tekshiriladi — soxta so'rovlar kirmaydi.
// ============================================================
if (!APP_SECRET) {
  console.warn("⚠️ APP_SECRET env yo'q — webhook imzosi tekshirilmaydi. Railway'ga APP_SECRET (Meta App Secret) qo'shing.");
}

function verifySignature(req) {
  if (!APP_SECRET) return true;
  const sig = req.get("x-hub-signature-256") || "";
  // 13-audit VAQTINCHALIK diagnostika: qaysi bosqich yiqilayotganini ko'rsatadi
  // (secret loglanmaydi; imzo prefiksi maxfiy emas). Imzo mos kelgach olib tashlanadi.
  if (!sig.startsWith("sha256=")) {
    console.warn(`🔎 Imzo diagnostika: X-Hub-Signature-256 header yo'q yoki formati boshqa (bor: "${sig.slice(0, 12)}")`);
    return false;
  }
  if (!req.rawBody) {
    console.warn("🔎 Imzo diagnostika: rawBody yo'q — express.json verify ishlamagan");
    return false;
  }
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", APP_SECRET).update(req.rawBody).digest("hex");
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) {
      console.warn(
        `🔎 Imzo diagnostika: kelgan=${sig.slice(7, 17)}… kutilgan=${expected.slice(7, 17)}… ` +
        `body=${req.rawBody.length} bayt — APP_SECRET boshqa app'niki bo'lishi mumkin`
      );
    }
    return ok;
  } catch {
    return false;
  }
}

// ============================================================
//  WEBHOOK — TEKSHIRUV (Meta ulanishni tasdiqlaydi)
// ============================================================
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
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

router.post("/webhook", async (req, res) => {
  // Imzo LOG-ONLY rejimda: tekshiriladi va loglanadi, lekin noto'g'ri bo'lsa ham
  // so'rov BLOKLANMAYDI — ishonchlilik birinchi (bot DM'larga javob beraveradi).
  if (verifySignature(req)) {
    if (SIG_LAST_STATE !== "ok") {
      console.log("✅ Webhook imzosi to'g'ri — APP_SECRET Meta bilan mos");
      SIG_LAST_STATE = "ok";
    }
  } else {
    if (SIG_LAST_STATE !== "bad") {
      console.warn("⚠️ Webhook imzosi MOS KELMADI (log-only rejim) — so'rov baribir qayta ishlanadi. APP_SECRET'ni Meta App Secret bilan solishtiring.");
      SIG_LAST_STATE = "bad";
    }
  }
  res.status(200).send("EVENT_RECEIVED"); // Meta'ga darhol javob (talab)

  try {
    const body = req.body;

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
});

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
