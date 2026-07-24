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
import { getClaudeReply, getSentiment, getProfileExtract } from "../claude.js";
import { mergeContactProfile, setContactName } from "../db.js";
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
import { detectLanguage, languageInstruction } from "./lang.js";
import { setContactLanguage } from "../db.js";
import { sttAvailable, transcribeAudio } from "./stt.js";
import { getTelegramFileUrl } from "./telegram.js";
import { listPortfolioMedia, addContactTags } from "../db.js";
import { handleSalesPayload, handleSalesIntents } from "./sales-bot.js";
import { getActiveAbTest, setContactAbVariant } from "../db.js";
import { notifyAdmin } from "./notify.js";
import { dispatchEvent } from "./outbound-webhooks.js";

// 11.5: faol A/B test keshi (60s) — har xabarda DB so'ramaslik uchun
const AB_CACHE = new Map(); // "projectId:type" -> { at, test }
export async function activeAbTest(projectId, testType) {
  const key = `${projectId}:${testType}`;
  const hit = AB_CACHE.get(key);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.test;
  try {
    const test = await getActiveAbTest(projectId, testType);
    AB_CACHE.set(key, { at: Date.now(), test });
    return test;
  } catch {
    return null;
  }
}

// 9.5: "ishlaringizni ko'rsating" so'rovini aniqlash
const PORTFOLIO_WORDS = [
  "portfolio", "portfoliyo", "ishlaringiz", "ishlaringizni", "ishlarizni",
  "namuna", "namunalar", "misollar", "qilgan ishlar",
];
function asksPortfolio(text) {
  const t = String(text || "").toLowerCase();
  return PORTFOLIO_WORDS.some((w) => t.includes(w));
}
import { tryStartFlow, handleFlowInput } from "./flow-engine.js";
import { senderFor } from "./channels.js";
import { state, workHoursOverrides } from "../state.js";

// ============================================================
//  12.5: SPAM VA SO'KINISH FILTRI
// ============================================================
// Takroriy bir xil xabar (2 daqiqada 3+ marta) — spam belgisi
const REPEAT_MAP = new Map(); // key -> { text, count, at }
function isRepeatSpam(key, text) {
  const now = Date.now();
  const rec = REPEAT_MAP.get(key);
  if (rec && rec.text === text && now - rec.at < 2 * 60 * 1000) {
    rec.count++;
    rec.at = now;
    return rec.count >= 3;
  }
  REPEAT_MAP.set(key, { text, count: 1, at: now });
  if (REPEAT_MAP.size > 3000) REPEAT_MAP.clear(); // xotira himoyasi
  return false;
}

// Havola tashlagan YANGI kontakt (birinchi xabarida) — bot-o'xshash xatti-harakat
function looksLikeSpamLink(text, isNewContact) {
  return isNewContact && /(https?:\/\/|t\.me\/|bit\.ly)/i.test(text) && text.length < 250;
}

// So'kinish: sozlamalardagi ro'yxat (vergul bilan) — operatorga uzatiladi
function hasBadWords(text) {
  const words = (state.SETTINGS.bad_words || "")
    .split(",").map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3);
  if (!words.length) return false;
  const t = String(text).toLowerCase();
  return words.some((w) => t.includes(w));
}

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
  let contactLang = null;
  let history = [];
  let paused = false;
  if (state.DB_READY && projectId) {
    try {
      const contact = await getOrCreateContact(projectId, String(senderId), msg.name || null);
      contactId = contact.id;
      contactName = contact.name || contactName;
      contactLang = contact.language || null;
      // 9.4: ovozdan o'girilgan matn inbox'da 🎤 belgisi bilan ko'rinadi
      const savedText = msg.voiceTranscribed ? `🎤 (ovozdan): ${userText}` : userText;
      await saveMessage(contactId, "user", savedText, false, msgSource);
      resetFollowupCount(contactId).catch(() => {});
      autoTag(contactId, projectId, userText);

      // 9.3: Til aniqlash — qo'llab-quvvatlanadigan ro'yxatda bo'lsa saqlaymiz
      const detected = detectLanguage(userText);
      if (detected && detected !== contactLang) {
        const supported = (state.SETTINGS.supported_languages || "uz,ru,en").split(",").map((s) => s.trim());
        if (supported.includes(detected)) {
          contactLang = detected;
          setContactLanguage(contactId, detected).catch(() => {});
          console.log(`🌐 Mijoz tili aniqlandi: ${detected} (mijoz ${contactId})`);
        }
      }

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

  // 12.5: spam — takroriy xabar yoki yangi kontaktdan havola
  const isNewForSpam = history.length <= 1;
  if (isRepeatSpam(`${platform}:${senderId}`, userText) || looksLikeSpamLink(userText, isNewForSpam)) {
    console.log(`🚫 Spam belgisi (mijoz ${contactId}): javob berilmaydi`);
    if (contactId) addContactTags(contactId, ["spam"]).catch(() => {});
    return;
  }

  // 12.5: so'kinish — bot javob bermaydi, operatorga uzatiladi
  if (hasBadWords(userText)) {
    console.log(`🤬 Qo'pol so'z aniqlandi (mijoz ${contactId}) — operatorga uzatildi`);
    if (contactId) {
      addContactTags(contactId, ["e'tibor kerak"]).catch(() => {});
      setNeedsHuman(contactId, true).catch(() => {});
      notifyAdmin("human", `🤬 Qo'pol muomala: ${contactName || senderId}\n"${userText.slice(0, 120)}"`).catch(() => {});
    }
    return;
  }

  // 10-bosqich: sotuv konteksti (bron/kalkulyator/to'lov/referral)
  const salesCtx = { contactId, senderId, projectId, platform, token, send };

  // 8.1/8.2/10.x: Tugma bosildi (quick reply / callback)
  if (msg.quickPayload) {
    if (msg.quickPayload.startsWith("fbtn:")) {
      if (await handleFlowInput(flowCtx, userText, msg.quickPayload)) return;
    } else if (await handleSalesPayload(salesCtx, msg.quickPayload)) {
      return;
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

  // 9.6: Lead magnit — kalit so'z yozilsa fayl + "lead" tegi
  if (state.SETTINGS.lead_magnet_enabled === "true") {
    const lmKeywords = (state.SETTINGS.lead_magnet_keyword || "")
      .split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    const low = userText.toLowerCase();
    if (lmKeywords.length && lmKeywords.some((k) => low.includes(k))) {
      const fileUrl = (state.SETTINGS.lead_magnet_media || "").trim();
      const lmText = (state.SETTINGS.lead_magnet_text || "").trim() ||
        "Mana va'da qilingan material! 🎁 Savollaringiz bo'lsa, bemalol yozing 😊";
      try {
        if (fileUrl) {
          const r = await send.file(senderId, fileUrl, lmText);
          if (!r.ok) throw new Error(r.error || "Fayl yuborilmadi");
        } else {
          await send.text(senderId, lmText);
        }
        if (contactId) {
          await saveMessage(contactId, "assistant", `🎁 [lead magnit] ${lmText}`, false, "lead_magnet").catch(() => {});
          addContactTags(contactId, ["lead"]).catch(() => {});
        }
        console.log(`🎁 Lead magnit yuborildi (mijoz ${contactId})`);
        return;
      } catch (err) {
        console.error("⚠️ Lead magnit xatoligi:", err.message);
        // Yuborilmasa — oddiy oqim davom etadi (mijoz javobsiz qolmasin)
      }
    }
  }

  const isNewContact = history.length <= 1;

  // 12.4: chiquvchi webhook — yangi kontakt hodisasi (fonda)
  if (isNewContact && contactId) {
    dispatchEvent("new_contact", projectId, {
      contact_id: contactId,
      name: contactName,
      platform,
      first_message: userText.slice(0, 300),
    });
  }

  // 8.2: Flow triggerlari
  if (msg.isStoryReply && (await tryStartFlow("story", flowCtx, userText))) return;
  if (await tryStartFlow("keyword", flowCtx, userText)) return;
  if (isNewContact && (await tryStartFlow("new_contact", flowCtx, userText))) return;

  // 10-bosqich: sotuv intentlari — bron, kalkulyator, to'lov, promo, referral
  if (await handleSalesIntents(salesCtx, userText)) return;

  // 9.5: Portfolio so'raldi — belgilangan rasmlarni avtomatik yuboramiz
  if (state.DB_READY && projectId && asksPortfolio(userText)) {
    try {
      const items = await listPortfolioMedia(projectId, 3);
      const host = process.env.RAILWAY_PUBLIC_DOMAIN;
      if (items.length && host) {
        for (const it of items) {
          await send.image(senderId, `https://${host}/media/${it.id}`);
        }
        const followText = "Mana ishlarimizdan namunalar 👆 Batafsil ma'lumot kerak bo'lsa, bemalol so'rang 😊";
        await send.text(senderId, followText);
        if (contactId) {
          await saveMessage(contactId, "assistant", `📎 [portfolio: ${items.length} ta rasm] ${followText}`).catch(() => {});
        }
        console.log(`⭐ Portfolio yuborildi (${items.length} ta rasm, mijoz ${contactId})`);
        return;
      }
    } catch (err) {
      console.error("⚠️ Portfolio yuborishda xatolik:", err.message);
    }
  }

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
      notifyAdmin("human", `🙋 Operator kerak!\n${contactName || senderId}: "${userText.slice(0, 150)}"\n→ Inbox'ni oching`).catch(() => {});
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
    // 11.5: A/B test — salomlashish matni varianti
    let greetText = state.SETTINGS.greeting_message || "";
    const abTest = await activeAbTest(projectId, "greeting");
    if (abTest && contactId) {
      const variant = Math.random() * 100 < abTest.split_percent ? "A" : "B";
      setContactAbVariant(contactId, variant).catch(() => {});
      const vText = variant === "A" ? abTest.variant_a : abTest.variant_b;
      if ((vText || "").trim()) greetText = vText.trim();
      console.log(`🧪 A/B: mijoz ${contactId} → ${variant} varianti ("${abTest.name}")`);
    }
    if (greetText) {
      systemPrompt += `\nSalomlashishda ushbu matn/uslubdan foydalan: "${greetText}"`;
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
  // 9.3: mijoz tili — bot o'sha tilda javob beradi
  systemPrompt += languageInstruction(contactLang || state.SETTINGS.default_language);

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
        if (s === "negative") {
          console.log(`😟 Salbiy kayfiyat aniqlandi (mijoz ${contactId})`);
          notifyAdmin("negative", `😟 Salbiy kayfiyat: ${contactName || senderId}\nOxirgi xabar: "${userText.slice(0, 150)}"`).catch(() => {});
        }
      }
    })().catch((err) => console.error("⚠️ Sentiment saqlashda xatolik:", err.message));

    // 10.6: AI mijoz profili — har 5-xabarda fonda yig'iladi
    const userMsgCount = history.filter((m) => m.role === "user").length;
    if (userMsgCount >= 3 && userMsgCount % 5 === 0) {
      (async () => {
        const convo = history
          .slice(-15)
          .map((m) => (m.role === "user" ? "Mijoz: " : "Bot: ") + m.content)
          .join("\n");
        const profile = await getProfileExtract(convo);
        if (profile) {
          await mergeContactProfile(contactId, profile);
          if (profile.ism) await setContactName(contactId, profile.ism);
          console.log(`🪪 AI profil yangilandi (mijoz ${contactId}): ${Object.keys(profile).join(", ")}`);
        }
      })().catch((err) => console.error("⚠️ AI profil xatoligi:", err.message));
    }
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

  // 9.4: Ovozli xabar → matn (ELEVENLABS_API_KEY bo'lsa)
  if (kind === "audio" && sttAvailable()) {
    let audioUrl = msg.mediaUrl || null;
    if (!audioUrl && msg.tgFileId) {
      audioUrl = await getTelegramFileUrl(msg.tgFileId, token);
    }
    if (audioUrl) {
      const transcript = await transcribeAudio(audioUrl);
      if (transcript) {
        // Matnga o'girildi — odatdagi AI oqimi (inbox'da 🎤 belgisi bilan)
        await processIncomingText({ ...msg, text: transcript, voiceTranscribed: true });
        return;
      }
    }
    console.log("🎤 Transkripsiya bo'lmadi — tayyor javob yuboriladi");
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
