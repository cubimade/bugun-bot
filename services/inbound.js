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
  keywordRuleFiredFor,
  recordKeywordRuleHit,
  markKeywordRuleReplied,
} from "../db.js";
import { profileIsStale } from "../db.js";
import { refreshContactProfileInBackground } from "./ig-profile.js";
import { keywordRulesFor, autoTag } from "./rules.js";
import { detectLanguage, languageInstruction } from "./lang.js";
import { setContactLanguage } from "../db.js";
import { listPortfolioMedia, addContactTags } from "../db.js";
import { handleSalesPayload, handleSalesIntents } from "./sales-bot.js";
import { setContactAbVariant } from "../db.js";
import { notifyAdmin } from "./notify.js";
import { dispatchEvent } from "./outbound-webhooks.js";

import { tryStartFlow, handleFlowInput } from "./flow-engine.js";
import { senderFor } from "./channels.js";
import { state, workHoursOverrides } from "../state.js";
import {
  activeAbTest,
  asksPortfolio,
  isRepeatSpam,
  looksLikeSpamLink,
  hasBadWords,
  isRateLimited,
  parseGreetingButtons,
} from "./inbound-guards.js";

// 13-audit: himoya funksiyalari inbound-guards.js'ga, media oqimi
// inbound-media.js'ga ajratildi; tashqi import'lar buzilmasligi uchun
// shu yerdan qayta eksport qilinadi.
export { activeAbTest, isRateLimited, parseGreetingButtons } from "./inbound-guards.js";
export { processIncomingMedia } from "./inbound-media.js";

// ------------------------------------------------------------
//  16 (3.1e): mos kelgan qoidani SOZLAMALAR bo'yicha tanlash.
//  Qoidalar ustuvorlik bo'yicha tartiblangan (getActiveKeywordRules).
//  Mos kelgani shartlardan o'tmasa — keyingi mos qoidaga o'tamiz,
//  shunda "faqat bir marta" qoidasi qolganlarini bloklab qo'ymaydi.
// ------------------------------------------------------------
async function pickKeywordRule(rules, text, contactId) {
  let pool = rules;
  for (let guard = 0; guard < 20; guard++) {
    // ROADMAP-18 FAZA 2.4: DEBUG=1 da har qoida nega mos kelmagani loglanadi —
    // "nega ishlamadi" diagnostikasi soniyalarda bo'ladi
    const trace = process.env.DEBUG ? [] : null;
    const rule = matchKeywordRule(pool, text, trace);
    if (trace?.length) {
      console.log(`🔎 Kalit so'z diagnostika ("${String(text).slice(0, 60)}"):\n   ` + trace.join("\n   "));
    }
    if (!rule) return null;

    // Vaqt oynasi: faqat ish vaqtida
    if (rule.work_hours_only && !isWithinWorkHours()) {
      pool = pool.filter((r) => r.id !== rule.id);
      continue;
    }
    // Faqat bir marta: shu mijozda allaqachon ishlagan bo'lsa — o'tkazamiz
    if (rule.once_per_contact && contactId) {
      let fired = false;
      try {
        fired = await keywordRuleFiredFor(rule.id, contactId);
      } catch {
        fired = false; // baza xatosi qoidani bloklamasin
      }
      if (fired) {
        pool = pool.filter((r) => r.id !== rule.id);
        continue;
      }
    }
    return rule;
  }
  return null;
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
      // 16 (3.1e): mijoz qoida javobidan keyin yozdi → "javob berdi" statistikasi
      markKeywordRuleReplied(contactId).catch(() => {});

      // 16 (2.1): mijoz profilini (@username, rasm) FON REJIMIDA olamiz —
      // javob shu sabab kechikmaydi. Faqat Instagram va faqat profil yo'q
      // yoki 7 kundan eski bo'lsa (Meta limitini tejaymiz).
      if (platform === "instagram" && token) {
        profileIsStale(contactId)
          .then((stale) => {
            if (stale) refreshContactProfileInBackground(contactId, String(senderId), token);
          })
          .catch(() => {});
      }

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
    // 16 (3.1d): kalit so'z qoidasi tugmasi — KW_<ruleId>_<amal>
    if (msg.quickPayload.startsWith("KW_")) {
      const [, ruleId, action] = msg.quickPayload.split("_");
      const rule = (await keywordRulesFor(projectId)).find((r) => String(r.id) === String(ruleId));
      const btn = (rule?.buttons || []).find((b) => b.action === action);
      if (action === "handoff") {
        if (contactId) {
          await setNeedsHuman(contactId, true).catch(() => {});
          await setBotPaused(contactId, true, null).catch(() => {});
        }
        await send.text(senderId, "Ulandik ✅ Operatorimiz tez orada javob beradi.");
        notifyAdmin(`🙋 Tugma orqali operator so'raldi (mijoz ${contactId})`).catch(() => {});
        return;
      }
      if (action === "tag" && btn?.tag && contactId) {
        await addContactTags(contactId, [btn.tag]).catch(() => {});
        await send.text(senderId, "Qabul qilindi ✅");
        return;
      }
    }
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
  // 16 (3.1e): qoida ishlashidan oldin sozlamalar tekshiriladi. Mos kelgan
  // qoida shartlardan o'tmasa, keyingi mos qoidaga o'tamiz (ustuvorlik bo'yicha).
  const kwRule = await pickKeywordRule(await keywordRulesFor(projectId), userText, contactId);
  if (kwRule) {
    console.log(`🔑 Kalit so'z ishladi: "${kwRule.keyword}" (qoida #${kwRule.id})`);

    // Kechikish — javob "jonli" ko'rinsin (0–60 soniya)
    if (kwRule.delay_sec > 0) {
      await new Promise((r) => setTimeout(r, Math.min(60, kwRule.delay_sec) * 1000));
    }

    // Media: Instagram bitta xabarda 1 ta media qabul qiladi → ketma-ket
    const medias = Array.isArray(kwRule.media_urls) && kwRule.media_urls.length
      ? kwRule.media_urls
      : kwRule.media_url ? [kwRule.media_url] : [];
    for (const url of medias.slice(0, 5)) {
      try {
        await send.image(senderId, url);
      } catch (err) {
        console.warn(`⚠️ Kalit so'z media yuborilmadi: ${err.message}`);
      }
    }

    // Tugmalar (3 tagacha — Instagram cheklovi) yoki oddiy matn
    const btns = Array.isArray(kwRule.buttons) ? kwRule.buttons.slice(0, 3) : [];
    try {
      if (btns.length && send.buttons) {
        const urlBtns = btns.filter((b) => b.action === "link" && b.url)
          .map((b) => ({ title: b.title, url: b.url }));
        const payloadBtns = btns.filter((b) => b.action !== "link")
          .map((b) => ({ title: b.title, payload: `KW_${kwRule.id}_${b.action}` }));
        await send.buttons(senderId, kwRule.reply_text, payloadBtns, urlBtns);
      } else {
        await send.text(senderId, kwRule.reply_text);
      }
    } catch (err) {
      console.error("⚠️ Kalit so'z javobi yuborilmadi:", err.message);
    }

    if (contactId) {
      try {
        // 16 (2.2): suhbatda "⚡ Avtomatlashtirish: <qoida>" bo'lib ko'rinadi
        const shown = kwRule.reply_text + (btns.length ? " " + btns.map((b) => `[${b.title}]`).join(" ") : "");
        await saveMessage(contactId, "assistant", shown, false, "dm", {
          type: "automation",
          label: kwRule.keyword,
        });
      } catch (dbErr) {
        console.error("⚠️ Saqlashda xatolik:", dbErr.message);
      }
      recordKeywordRuleHit(kwRule.id, contactId).catch(() => {});
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

// 7.6: MEDIA XABAR oqimi — inbound-media.js'da (yuqorida qayta eksport qilingan)
