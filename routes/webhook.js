// ============================================================
//  ROUTES/WEBHOOK.JS — Instagram webhook (ROADMAP-6 A3 da ajratilgan)
//  GET  /webhook — Meta ulanish tekshiruvi
//  POST /webhook — DM va kommentlarni qabul qilish va qayta ishlash
// ============================================================
import express from "express";
import crypto from "crypto";

import {
  VERIFY_TOKEN,
  APP_SECRET,
  AUTO_DM_ON_COMMENT,
  buildSystemPrompt,
  buildCommentSystemPrompt,
  pickModel,
  needsHuman,
  isWithinWorkHours,
  OFF_HOURS_MESSAGE,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from "../config.js";
import { getClaudeReply, getCommentReply, getSentiment } from "../claude.js";
import {
  sendInstagramMessage,
  replyToComment,
  sendPrivateReply,
} from "../instagram.js";
import {
  getOrCreateContact,
  saveMessage,
  getConversationHistory,
  getProjectKnowledge,
  setNeedsHuman,
  setBotPaused,
  setContactSentiment,
  getActiveKeywordRules,
  matchKeywordRule,
  incrementKeywordHit,
  resetFollowupCount,
  getActiveTagRules,
  matchTagRules,
  addContactTags,
} from "../db.js";
import { sendInstagramImage } from "../instagram.js";
import { state, ACCOUNTS_MAP, resolveAccount, workHoursOverrides } from "../state.js";

const router = express.Router();

// ============================================================
//  C2: WEBHOOK IMZOSI — Meta X-Hub-Signature-256 yuboradi.
//  APP_SECRET (config.js dan, Meta ilova "App Secret") bilan HMAC-SHA256
//  tekshiriladi — soxta so'rovlar botga kira olmaydi. Env yo'q bo'lsa —
//  tekshirilmaydi (startupda ogohlantiriladi, Railway'ga qo'shish kerak).
// ============================================================
if (!APP_SECRET) {
  console.warn("⚠️ APP_SECRET env yo'q — webhook imzosi tekshirilmaydi. Railway'ga APP_SECRET (Meta App Secret) qo'shing.");
}

function verifySignature(req) {
  if (!APP_SECRET) return true;
  const sig = req.get("x-hub-signature-256") || "";
  if (!sig.startsWith("sha256=") || !req.rawBody) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", APP_SECRET).update(req.rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
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
router.post("/webhook", async (req, res) => {
  // C2: imzo noto'g'ri — soxta so'rov, qayta ishlamaymiz
  if (!verifySignature(req)) {
    console.warn("🚫 Webhook imzosi noto'g'ri — so'rov rad etildi");
    return res.sendStatus(403);
  }
  res.status(200).send("EVENT_RECEIVED"); // Meta'ga darhol javob (talab)

  try {
    const body = req.body;

    for (const entry of body.entry || []) {
      // Qaysi akkauntga tegishli — o'sha akkauntning loyihasi va tokeni
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

// --- 7.4: Kalit so'z qoidalari keshi (60 soniya, loyiha bo'yicha) ---
const KEYWORD_CACHE = new Map(); // projectId -> { at, rules }
async function keywordRulesFor(projectId) {
  if (!state.DB_READY) return [];
  const key = String(projectId ?? "null");
  const hit = KEYWORD_CACHE.get(key);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.rules;
  try {
    const rules = await getActiveKeywordRules(projectId);
    KEYWORD_CACHE.set(key, { at: Date.now(), rules });
    return rules;
  } catch (err) {
    console.error("⚠️ Kalit so'z qoidalarini o'qishda xatolik:", err.message);
    return [];
  }
}

// --- 7.8: Avto-teg qoidalari keshi (60 soniya) va qo'llash (fonda) ---
const TAG_RULES_CACHE = new Map(); // projectId -> { at, rules }
async function tagRulesFor(projectId) {
  if (!state.DB_READY) return [];
  const key = String(projectId ?? "null");
  const hit = TAG_RULES_CACHE.get(key);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.rules;
  try {
    const rules = await getActiveTagRules(projectId);
    TAG_RULES_CACHE.set(key, { at: Date.now(), rules });
    return rules;
  } catch (err) {
    return [];
  }
}

function autoTag(contactId, projectId, text) {
  if (!contactId) return;
  (async () => {
    const tags = matchTagRules(await tagRulesFor(projectId), text);
    if (tags.length) {
      await addContactTags(contactId, tags);
      console.log(`🏷 Avto-teg (mijoz ${contactId}): ${tags.join(", ")}`);
    }
  })().catch((err) => console.error("⚠️ Avto-teg xatoligi:", err.message));
}

// --- Rate limiting (spam himoyasi) — xotirada, senderId bo'yicha ---
const rateMap = new Map();
function isRateLimited(senderId) {
  const now = Date.now();
  const arr = (rateMap.get(senderId) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  arr.push(now);
  rateMap.set(senderId, arr);
  return arr.length > RATE_LIMIT_MAX;
}

// ============================================================
//  DM ni qayta ishlash (xotira + bilim bazasi + yaxshilanishlar)
// ============================================================
async function handleDirectMessage(event, projectId, token) {
  if (event.message?.is_echo) {
    console.log("↩️ Echo xabar (bot o'zi yuborgan) — o'tkazamiz");
    return;
  }

  const senderId = event.sender?.id;
  const userText = event.message?.text;

  if (!senderId) {
    console.log("⚠️ senderId topilmadi");
    return;
  }

  // 7.6: Media xabar (rasm/ovoz/video/fayl) — jim qolmaymiz, tayyor javob
  const attachments = event.message?.attachments || [];
  if (!userText && attachments.length) {
    await handleMediaMessage(senderId, attachments, projectId, token);
    return;
  }
  if (!userText) {
    console.log("ℹ️ Matn ham, media ham yo'q — o'tkazamiz");
    return;
  }

  // 7.3: Story reply — mijoz story'ga javob yozdi (eng katta oqim manbai!)
  const isStoryReply = Boolean(event.message?.reply_to?.story);
  const msgSource = isStoryReply ? "story_reply" : "dm";
  if (isStoryReply) console.log(`📸 Story reply (${senderId}): ${userText}`);

  // 1) Spam himoyasi — juda ko'p yozsa, jim o'tkazamiz (xarajatni tejaymiz)
  if (isRateLimited(senderId)) {
    console.log(`🚦 Rate limit: ${senderId} juda ko'p yozdi — o'tkazamiz`);
    return;
  }

  console.log(`📩 Yangi xabar (${senderId}): ${userText}`);

  // --- Doimiy xotira: mijoz + suhbat tarixi (shu akkaunt loyihasida) ---
  let contactId = null;
  let history = [];
  let paused = false;
  if (state.DB_READY && projectId) {
    try {
      const contact = await getOrCreateContact(projectId, senderId);
      contactId = contact.id;
      await saveMessage(contactId, "user", userText, false, msgSource);
      // 7.5: mijoz javob berdi — follow-up hisoblagichi nolga
      resetFollowupCount(contactId).catch(() => {});
      // 7.8: avto-teglash (fonda — javobni kechiktirmaydi)
      autoTag(contactId, projectId, userText);

      // C1: Bot pauza (operator rejimi) tekshiruvi
      if (contact.bot_paused) {
        const until = contact.paused_until ? new Date(contact.paused_until) : null;
        if (until && until <= new Date()) {
          // Avto-pauza muddati tugadi — bot o'zi qayta yoqiladi
          await setBotPaused(contactId, false, null);
          console.log(`▶️ Avto-pauza tugadi — bot qayta yoqildi (mijoz ${contactId})`);
        } else {
          paused = true;
        }
      }

      history = await getConversationHistory(contactId, 20);
    } catch (dbErr) {
      console.error("⚠️ Xabarni saqlashda xatolik:", dbErr.message);
    }
  }

  // Pauzada: xabar saqlandi, lekin bot javob BERMAYDI (operator gaplashadi)
  if (paused) {
    console.log(`🔕 Bot pauzada (mijoz ${contactId}) — javob berilmaydi, operator gaplashadi`);
    return;
  }

  // 7.4: Kalit so'z qoidasi — mos kelsa tayyor javob (AI chaqirilmaydi, tejamkor!)
  const kwRule = matchKeywordRule(await keywordRulesFor(projectId), userText);
  if (kwRule) {
    console.log(`🔑 Kalit so'z ishladi: "${kwRule.keyword}" (qoida #${kwRule.id})`);
    if (kwRule.media_url) {
      await sendInstagramImage(senderId, kwRule.media_url, token);
    }
    await sendInstagramMessage(senderId, kwRule.reply_text, token);
    if (contactId) {
      try {
        await saveMessage(contactId, "assistant", kwRule.reply_text);
      } catch (dbErr) {
        console.error("⚠️ Saqlashda xatolik:", dbErr.message);
      }
    }
    incrementKeywordHit(kwRule.id).catch(() => {});
    return;
  }

  // Bu mijozning birinchi xabari? (tarixда faqat shu xabar bo'lsa — yangi)
  const isNewContact = history.length <= 1;

  // Agar tarix bo'lmasa (DB o'chiq), joriy xabarning o'zini beramiz
  if (history.length === 0) {
    history = [{ role: "user", content: userText }];
  }

  // 2) Ish vaqti — tashqarida bo'lsa, tayyor xabar (AI chaqirilmaydi)
  if (!isWithinWorkHours(new Date(), workHoursOverrides())) {
    console.log("🌙 Ish vaqti emas — tayyor javob yuboramiz");
    const offMsg = state.SETTINGS.off_hours_message || OFF_HOURS_MESSAGE;
    if (contactId) {
      try {
        await saveMessage(contactId, "assistant", offMsg);
      } catch (dbErr) {
        console.error("⚠️ Saqlashda xatolik:", dbErr.message);
      }
    }
    await sendInstagramMessage(senderId, offMsg, token);
    return;
  }

  // 3) "Odam kerak" — mijoz jonli operator so'radimi
  const handoff = needsHuman(userText);
  if (handoff && contactId) {
    try {
      await setNeedsHuman(contactId, true);
      console.log("🙋 'Odam kerak' deb belgilandi (dashboard'da ko'rinadi)");
    } catch (dbErr) {
      console.error("⚠️ needs_human belgilashда xatolik:", dbErr.message);
    }
  }

  // Shu akkauntning bilim bazasi
  let knowledge = "";
  if (state.DB_READY && projectId) {
    try {
      knowledge = await getProjectKnowledge(projectId);
    } catch (dbErr) {
      console.error("⚠️ Bilim bazasini o'qishda xatolik:", dbErr.message);
    }
  }

  // System prompt: bilim bazasi + (yangi mijoz salomi) + (odam kerak eslatmasi)
  let systemPrompt = buildSystemPrompt(knowledge);
  // 7.3: Story reply konteksti — bot minnatdorchilik bilan boshlaydi
  if (isStoryReply) {
    systemPrompt +=
      "\n\nEslatma: mijoz STORY'ga javob yozdi. Javobni story uchun qisqa minnatdorchilik bilan boshla" +
      (state.SETTINGS.story_reply_greeting
        ? ` (ushbu uslubda: "${state.SETTINGS.story_reply_greeting}")`
        : ' (masalan: "Story\'imga javob berganingiz uchun rahmat! 🙌")') +
      ", so'ng savoliga javob ber.";
  }
  if (isNewContact) {
    systemPrompt +=
      "\n\nEslatma: bu mijozning birinchi xabari — iliq salomlash va o'zingni qisqa tanishtir.";
    if (state.SETTINGS.greeting_message) {
      systemPrompt += `\nSalomlashishda ushbu matn/uslubdan foydalan: "${state.SETTINGS.greeting_message}"`;
    }
  }
  // Javob uzunligi sozlamasi (dashboard'dan)
  if (state.SETTINGS.reply_length === "qisqa") {
    systemPrompt += "\n\nJavobni JUDA qisqa tut — 1-2 gap.";
  } else if (state.SETTINGS.reply_length === "batafsil") {
    systemPrompt += "\n\nKerak bo'lsa batafsilroq javob ber (4-6 gap) — lekin suvsiz, aniq.";
  }
  if (handoff) {
    systemPrompt +=
      "\n\nEslatma: mijoz jonli operator/menejer so'radi. Samimiy ayt: tez orada menejer bog'lanadi.";
  }

  // 4) Model tanlash: oddiy → Haiku, murakkab → Sonnet
  const model = pickModel(userText);
  const reply = await getClaudeReply(history, systemPrompt, model);
  console.log(`🤖 Claude javobi (${model.includes("sonnet") ? "Sonnet" : "Haiku"}): ${reply}`);

  // Botning javobini ham xotiraga yozamiz
  if (contactId) {
    try {
      await saveMessage(contactId, "assistant", reply);
    } catch (dbErr) {
      console.error("⚠️ Javobni saqlashda xatolik:", dbErr.message);
    }
  }

  await sendInstagramMessage(senderId, reply, token);

  // D2: Kayfiyat (sentiment) tahlili — javobni kechiktirmaydi (fonda ishlaydi)
  if (contactId) {
    const userTexts = history
      .filter((m) => m.role === "user")
      .slice(-5)
      .map((m) => m.content);
    (async () => {
      const s = await getSentiment(userTexts);
      if (s) {
        await setContactSentiment(contactId, s);
        if (s === "negative") console.log(`😟 Salbiy kayfiyat aniqlandi (mijoz ${contactId})`);
      }
    })().catch((err) => console.error("⚠️ Sentiment saqlashda xatolik:", err.message));
  }
}

// ============================================================
//  7.6: MEDIA XABAR (rasm/ovoz/video/fayl) — tayyor javob, AI'siz
// ============================================================
const MEDIA_LABELS = {
  image: "[rasm]",
  audio: "[ovozli xabar]",
  video: "[video]",
  share: "[ulashilgan post]",
  story_mention: "[story'da belgilagan]",
};
const DEFAULT_IMAGE_REPLY =
  "Rasmni oldim! 📸 Savolingizni yozib yuborsangiz, aniq javob beraman.";
const DEFAULT_AUDIO_REPLY =
  "Ovozli xabaringizni oldim 🎤 Iltimos, savolingizni matn bilan yozing — shunda tez javob beraman.";
const DEFAULT_MEDIA_REPLY =
  "Xabaringizni oldim! 🙌 Savolingizni matn bilan yozsangiz, tez javob beraman.";

async function handleMediaMessage(senderId, attachments, projectId, token) {
  if (isRateLimited(senderId)) {
    console.log(`🚦 Rate limit: ${senderId} — media o'tkazildi`);
    return;
  }
  const kind = attachments[0]?.type || "file";
  const label = MEDIA_LABELS[kind] || "[fayl]";
  console.log(`📎 Media xabar (${senderId}): ${label}`);

  let contactId = null;
  let paused = false;
  if (state.DB_READY && projectId) {
    try {
      const contact = await getOrCreateContact(projectId, senderId);
      contactId = contact.id;
      await saveMessage(contactId, "user", label);
      resetFollowupCount(contactId).catch(() => {});
      if (contact.bot_paused) {
        const until = contact.paused_until ? new Date(contact.paused_until) : null;
        if (until && until <= new Date()) {
          await setBotPaused(contactId, false, null);
        } else {
          paused = true;
        }
      }
    } catch (dbErr) {
      console.error("⚠️ Media xabarni saqlashda xatolik:", dbErr.message);
    }
  }
  if (paused) {
    console.log(`🔕 Bot pauzada (mijoz ${contactId}) — media javobsiz qoldirildi`);
    return;
  }

  const reply =
    kind === "audio"
      ? state.SETTINGS.media_audio_reply || DEFAULT_AUDIO_REPLY
      : kind === "image"
        ? state.SETTINGS.media_image_reply || DEFAULT_IMAGE_REPLY
        : DEFAULT_MEDIA_REPLY;

  if (contactId) {
    try {
      await saveMessage(contactId, "assistant", reply);
    } catch (dbErr) {
      console.error("⚠️ Saqlashda xatolik:", dbErr.message);
    }
  }
  await sendInstagramMessage(senderId, reply, token);
}

// ============================================================
//  KOMMENTNI qayta ishlash (ommaviy javob + ixtiyoriy DM)
// ============================================================
async function handleComment(entry, value, projectId, token) {
  try {
    const commentId = value?.id;
    const commentText = value?.text;
    const fromId = value?.from?.id;
    const username = value?.from?.username;
    const accountId = entry?.id; // webhook kelgan biznes-akkaunt IDsi

    if (!commentId || !commentText) {
      console.log("ℹ️ Komment matni yoki ID yo'q — o'tkazamiz");
      return;
    }

    // O'z kommentimizga javob bermaymiz (cheksiz tsikl oldini olish)
    if (fromId && accountId && fromId === accountId) {
      console.log("↩️ Bu botning o'z kommenti — o'tkazamiz");
      return;
    }

    console.log(`💬 Yangi komment (@${username || fromId}): ${commentText}`);

    // 7.4: Komment'da kalit so'z — avtomatik DM (ManyChat uslubi), AI'siz
    const kwRule = matchKeywordRule(await keywordRulesFor(projectId), commentText);
    if (kwRule) {
      console.log(`🔑 Kommentda kalit so'z ishladi: "${kwRule.keyword}" (qoida #${kwRule.id})`);
      await sendPrivateReply(commentId, kwRule.reply_text, token);
      await replyToComment(commentId, "Javobni DM'ga yubordim 📩", token);
      incrementKeywordHit(kwRule.id).catch(() => {});
      return;
    }

    // Shu akkauntning bilim bazasi bilan komment javobini tayyorlaymiz
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

    // 1) Ommaviy javob — komment ostiga yoziladi
    await replyToComment(commentId, reply, token);

    // 2) Ixtiyoriy: komment yozgan odamga shaxsiy DM (ManyChat uslubi)
    if (AUTO_DM_ON_COMMENT) {
      const dmText = `Salom${username ? " @" + username : ""}! Kommentingiz uchun rahmat 🙏 Savolingiz bo'lsa, shu yerda — DM'da bemalol yozing, yordam beraman. 😊`;
      await sendPrivateReply(commentId, dmText, token);
    }
  } catch (err) {
    console.error("⚠️ Komment qayta ishlashda xatolik:", err.message);
  }
}

export default router;
