// ============================================================
//  SERVICES/INBOUND.JS — 9.1: kiruvchi xabarlarning UMUMIY oqimi.
//  Platformadan qat'i nazar (Instagram DM yoki Telegram) bir xil:
//  kontakt → pauza → flow → kalit so'z → salomlashish tugmalari →
//  ish vaqti → AI (bilim bazasi bilan) → sentiment.
//  Platformaga xos qismlar senderFor() adapteri orqali.
// ============================================================
import {
  buildSystemPrompt,
  pickModel,
  needsHuman,
  isWithinWorkHours,
  OFF_HOURS_MESSAGE,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  SALES_MODE_PROMPT,
} from "../config.js";
import { getClaudeReply, getSentiment } from "../claude.js";
import {
  getOrCreateContact,
  saveMessage,
  getConversationHistory,
  getProjectKnowledge,
  setNeedsHuman,
  setBotPaused,
  setContactSentiment,
  matchKeywordRule,
  incrementKeywordHit,
  resetFollowupCount,
} from "../db.js";
import { keywordRulesFor, autoTag } from "./rules.js";
import { tryStartFlow, handleFlowInput } from "./flow-engine.js";
import { senderFor } from "./channels.js";
import { state, workHoursOverrides } from "../state.js";

// --- Rate limiting (spam himoyasi) — xotirada, senderId bo'yicha ---
const rateMap = new Map();
export function isRateLimited(senderId) {
  const now = Date.now();
  const arr = (rateMap.get(senderId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  rateMap.set(senderId, arr);
  return arr.length > RATE_LIMIT_MAX;
}

// settings.greeting_buttons — JSON: [{ "title": "Narxlar", "reply": "..." }]
export function parseGreetingButtons() {
  try {
    const arr = JSON.parse(state.SETTINGS.greeting_buttons || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.filter((b) => b && (b.title || "").trim() && (b.reply || "").trim());
  } catch {
    return [];
  }
}

// ============================================================
//  MATNLI XABAR — umumiy oqim.
//  msg: { platform, projectId, token, senderId, name?, text,
//         quickPayload?, isStoryReply? }
// ============================================================
export async function processIncomingText(msg) {
  const { platform, projectId, token, senderId, text: userText } = msg;
  const send = senderFor(platform, token);
  const msgSource = msg.isStoryReply ? "story_reply" : "dm";

  // 1) Spam himoyasi
  if (isRateLimited(`${platform}:${senderId}`)) {
    console.log(`🚦 Rate limit: ${senderId} juda ko'p yozdi — o'tkazamiz`);
    return;
  }
  console.log(`📩 Yangi xabar [${platform}] (${senderId}): ${userText}`);

  // --- Doimiy xotira: mijoz + suhbat tarixi ---
  let contactId = null;
  let contactName = msg.name || null;
  let history = [];
  let paused = false;
  if (state.DB_READY && projectId) {
    try {
      const contact = await getOrCreateContact(projectId, String(senderId), msg.name || null);
      contactId = contact.id;
      contactName = contact.name || contactName;
      await saveMessage(contactId, "user", userText, false, msgSource);
      resetFollowupCount(contactId).catch(() => {});
      autoTag(contactId, projectId, userText);

      if (contact.bot_paused) {
        const until = contact.paused_until ? new Date(contact.paused_until) : null;
        if (until && until <= new Date()) {
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

  if (paused) {
    console.log(`🔕 Bot pauzada (mijoz ${contactId}) — operator gaplashadi`);
    return;
  }

  // 8.2: Flow konteksti
  const flowCtx = {
    contactId,
    igUserId: String(senderId),
    name: contactName,
    projectId,
    platform,
    token,
  };

  // 8.1/8.2: Tugma bosildi (quick reply / callback)
  if (msg.quickPayload) {
    if (msg.quickPayload.startsWith("fbtn:")) {
      if (await handleFlowInput(flowCtx, userText, msg.quickPayload)) return;
    } else if (await handleQuickReplyPayload(send, senderId, contactId, msg.quickPayload)) {
      return;
    }
  }

  // 8.2: Faol flow bor — u boshqaradi (AI javob bermaydi)
  if (await handleFlowInput(flowCtx, userText)) return;

  // 7.4: Kalit so'z qoidasi — tayyor javob (AI'siz)
  const kwRule = matchKeywordRule(await keywordRulesFor(projectId), userText);
  if (kwRule) {
    console.log(`🔑 Kalit so'z ishladi: "${kwRule.keyword}" (qoida #${kwRule.id})`);
    if (kwRule.media_url) await send.image(senderId, kwRule.media_url);
    await send.text(senderId, kwRule.reply_text);
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

  const isNewContact = history.length <= 1;

  // 8.2: Flow triggerlari
  if (msg.isStoryReply && (await tryStartFlow("story", flowCtx, userText))) return;
  if (await tryStartFlow("keyword", flowCtx, userText)) return;
  if (isNewContact && (await tryStartFlow("new_contact", flowCtx, userText))) return;

  // 8.1: Yangi mijozga salomlashish tugmalari
  if (isNewContact && state.SETTINGS.greeting_buttons_enabled === "true") {
    const gButtons = parseGreetingButtons();
    if (gButtons.length) {
      const greetText =
        (state.SETTINGS.greeting_buttons_text || "").trim() ||
        state.SETTINGS.greeting_message ||
        "Assalomu alaykum! 👋 Sizga qanday yordam bera olamiz? Quyidagi tugmalardan tanlang:";
      const btns = gButtons.map((b, i) => ({ title: b.title, payload: `gbtn:${i}` }));
      const result = await send.buttons(senderId, greetText, btns);
      if (result.ok) {
        if (contactId) {
          try {
            await saveMessage(contactId, "assistant", greetText + " " + gButtons.map((b) => `[${b.title}]`).join(" "));
          } catch (dbErr) {
            console.error("⚠️ Saqlashda xatolik:", dbErr.message);
          }
        }
        console.log("👋 Yangi mijozga salomlashish tugmalari yuborildi");
        return;
      }
      console.warn("⚠️ Salomlashish tugmalari yuborilmadi — AI javob beradi:", result.error);
    }
  }

  if (history.length === 0) {
    history = [{ role: "user", content: userText }];
  }

  // 2) Ish vaqti
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
    await send.text(senderId, offMsg);
    return;
  }

  // 3) "Odam kerak"
  const handoff = needsHuman(userText);
  if (handoff && contactId) {
    try {
      await setNeedsHuman(contactId, true);
      console.log("🙋 'Odam kerak' deb belgilandi (dashboard'da ko'rinadi)");
    } catch (dbErr) {
      console.error("⚠️ needs_human belgilashda xatolik:", dbErr.message);
    }
  }

  // Bilim bazasi
  let knowledge = "";
  if (state.DB_READY && projectId) {
    try {
      knowledge = await getProjectKnowledge(projectId);
    } catch (dbErr) {
      console.error("⚠️ Bilim bazasini o'qishda xatolik:", dbErr.message);
    }
  }

  // System prompt yig'ish
  let systemPrompt = buildSystemPrompt(knowledge);
  if (msg.isStoryReply) {
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
  if (state.SETTINGS.reply_length === "qisqa") {
    systemPrompt += "\n\nJavobni JUDA qisqa tut — 1-2 gap.";
  } else if (state.SETTINGS.reply_length === "batafsil") {
    systemPrompt += "\n\nKerak bo'lsa batafsilroq javob ber (4-6 gap) — lekin suvsiz, aniq.";
  }
  if (handoff) {
    systemPrompt +=
      "\n\nEslatma: mijoz jonli operator/menejer so'radi. Samimiy ayt: tez orada menejer bog'lanadi.";
  }
  if (state.SETTINGS.sales_mode === "true") {
    systemPrompt += SALES_MODE_PROMPT;
  }

  // 4) AI javob
  const model = pickModel(userText);
  const reply = await getClaudeReply(history, systemPrompt, model);
  console.log(`🤖 Claude javobi (${model.includes("sonnet") ? "Sonnet" : "Haiku"}): ${reply}`);

  if (contactId) {
    try {
      await saveMessage(contactId, "assistant", reply);
    } catch (dbErr) {
      console.error("⚠️ Javobni saqlashda xatolik:", dbErr.message);
    }
  }
  await send.text(senderId, reply);

  // D2: Kayfiyat tahlili (fonda)
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
//  8.1: Salomlashish tugmasi bosildi — payload bo'yicha javob
// ============================================================
async function handleQuickReplyPayload(send, senderId, contactId, payload) {
  if (payload.startsWith("gbtn:")) {
    const idx = parseInt(payload.slice(5), 10);
    const btn = parseGreetingButtons()[idx];
    if (!btn) return false;
    console.log(`🔘 Salomlashish tugmasi bosildi: "${btn.title}"`);
    await send.text(senderId, btn.reply);
    if (contactId) {
      try {
        await saveMessage(contactId, "assistant", btn.reply);
      } catch (dbErr) {
        console.error("⚠️ Saqlashda xatolik:", dbErr.message);
      }
    }
    return true;
  }
  return false;
}

// ============================================================
//  7.6: MEDIA XABAR — tayyor javob (AI'siz).
//  msg: { platform, projectId, token, senderId, name?, kind }
//  kind: image | audio | video | share | story_mention | file
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

export async function processIncomingMedia(msg) {
  const { platform, projectId, token, senderId, kind } = msg;
  const send = senderFor(platform, token);
  if (isRateLimited(`${platform}:${senderId}`)) {
    console.log(`🚦 Rate limit: ${senderId} — media o'tkazildi`);
    return;
  }
  const label = MEDIA_LABELS[kind] || "[fayl]";
  console.log(`📎 Media xabar [${platform}] (${senderId}): ${label}`);

  let contactId = null;
  let paused = false;
  if (state.DB_READY && projectId) {
    try {
      const contact = await getOrCreateContact(projectId, String(senderId), msg.name || null);
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
  await send.text(senderId, reply);
}
