// ============================================================
//  SERVICES/SALES-BOT.JS — 10-bosqich bot mantiqlari:
//  bron (10.1), kalkulyator (10.2), to'lov (10.3), promo (10.4),
//  referral (10.5). Barchasi deterministik — AI chaqirilmaydi.
//  inbound.js dan chaqiriladi: intent yoki payload ushlansa true.
// ============================================================
import { state } from "../state.js";
import {
  saveMessage,
  addContactTags,
  insertBooking,
  listActiveBookings,
  getUpcomingBooking,
  updateBookingStatus,
  getProjectKnowledge,
  listPriceRules,
  redeemPromoCode,
  findPromoInText,
  ensureReferralCode,
  findContactByReferralCode,
  setReferredBy,
  insertPromoCode,
  appendContactNote,
  getProjectToken,
} from "../db.js";
import {
  computeFreeSlots,
  fmtLocal,
  asksBooking,
  asksCancelBooking,
  extractAddress,
} from "./booking.js";
import { notifyAdmin } from "./notify.js";

// ctx: { contactId, senderId, projectId, platform, token, send }
async function saveBot(ctx, text, source = "dm") {
  if (!ctx.contactId) return;
  try {
    await saveMessage(ctx.contactId, "assistant", text, false, source);
  } catch {
    /* jim */
  }
}

// ============================================================
//  PAYLOAD'LAR — tugma bosilganda (bk: / bkc: / bkA / calc:)
// ============================================================
export async function handleSalesPayload(ctx, payload) {
  const { send, senderId } = ctx;

  // --- Bron: vaqt tanlandi → tasdiqlash so'raladi ---
  if (payload.startsWith("bk:")) {
    const ts = Number(payload.slice(3));
    if (!ts) return false;
    const when = fmtLocal(new Date(ts));
    const text = `${when} vaqtini tanladingiz. Tasdiqlaysizmi?`;
    await send.buttons(senderId, text, [
      { title: "✅ Tasdiqlash", payload: `bkc:${ts}` },
      { title: "🔄 Boshqa vaqt", payload: "bkA" },
    ]);
    await saveBot(ctx, text, "booking");
    return true;
  }

  // --- Bron: tasdiqlandi → bron yaratiladi ---
  if (payload.startsWith("bkc:")) {
    const ts = Number(payload.slice(4));
    if (!ts) return false;
    try {
      // Slot hali bo'shmi — parallel bron oldini olish
      const busy = await listActiveBookings(ctx.projectId);
      const conflict = busy.some((b) => {
        const s = new Date(b.starts_at).getTime();
        return ts < s + b.duration_min * 60000 && ts + 1 > s;
      });
      if (conflict) {
        const t = "Afsuski bu vaqt hozirgina band bo'ldi 😔 Boshqa vaqtni tanlang:";
        await send.text(senderId, t);
        await saveBot(ctx, t, "booking");
        return sendBookingSlots(ctx);
      }
      const settings = (await computeFreeSlots(ctx.projectId, 1))?.settings;
      await insertBooking({
        projectId: ctx.projectId,
        contactId: ctx.contactId,
        startsAt: new Date(ts).toISOString(),
        durationMin: settings?.slot_duration_min || 60,
        status: "confirmed",
      });
      let confirmText = `✅ Broningiz tasdiqlandi!\n📅 ${fmtLocal(new Date(ts))}`;
      try {
        const addr = extractAddress(await getProjectKnowledge(ctx.projectId));
        if (addr) confirmText += `\n📍 Manzil: ${addr}`;
      } catch {
        /* jim */
      }
      confirmText += "\n\n1 kun oldin eslatib qo'yamiz. Kela olmasangiz — \"bekor qilaman\" deb yozing.";
      await send.text(senderId, confirmText);
      await saveBot(ctx, confirmText, "booking");
      console.log(`📅 Yangi bron: mijoz ${ctx.contactId}, ${new Date(ts).toISOString()}`);
      notifyAdmin("booking", `📅 Yangi bron!\n${ctx.name || ctx.igUserId} — ${fmtLocal(new Date(ts))}`).catch(() => {});
      const { dispatchEvent } = await import("./outbound-webhooks.js");
      dispatchEvent("booking", ctx.projectId, {
        contact_id: ctx.contactId,
        name: ctx.name,
        starts_at: new Date(ts).toISOString(),
      });
      return true;
    } catch (err) {
      console.error("⚠️ Bron yaratishda xatolik:", err.message);
      return false;
    }
  }

  // --- Bron: boshqa vaqt so'raldi ---
  if (payload === "bkA") {
    return sendBookingSlots(ctx);
  }

  // --- Kalkulyator: variant tanlandi ---
  if (payload.startsWith("calc:")) {
    return handleCalcAnswer(ctx, payload);
  }

  return false;
}

// ============================================================
//  INTENTLAR — matndan aniqlash. true = qayta ishlandi.
// ============================================================
export async function handleSalesIntents(ctx, text) {
  if (!state.DB_READY || !ctx.projectId) return false;

  // --- 10.5: referral kodi bilan kelgan mijoz (REFxxxxx) ---
  const refMatch = String(text).match(/\bREF[A-Z0-9]{4,8}\b/i);
  if (refMatch && ctx.contactId) {
    await applyReferral(ctx, refMatch[0]);
    // Kod xabari boshqa matn bilan kelishi mumkin — oqim davom etadi
  }

  // --- 10.4: promo kod tekshirish (qisqa xabarlarda) ---
  if (text.length <= 60) {
    try {
      const code = await findPromoInText(text, ctx.projectId);
      if (code) {
        const promo = await redeemPromoCode(code, ctx.projectId);
        let reply;
        if (promo) {
          const disc = promo.discount_percent
            ? `${promo.discount_percent}%`
            : `${Number(promo.discount_amount).toLocaleString("uz-UZ")} so'm`;
          reply = `🎉 "${promo.code}" kodi qabul qilindi — ${disc} chegirma! Buyurtma berishda ayting yoki menejer bilan bog'laning.`;
          if (ctx.contactId) addContactTags(ctx.contactId, ["promo"]).catch(() => {});
        } else {
          reply = `Afsuski "${code}" kodi amal qilmaydi (muddati tugagan yoki ishlatilgan) 😔`;
        }
        await ctx.send.text(ctx.senderId, reply);
        await saveBot(ctx, reply);
        return true;
      }
    } catch (err) {
      console.error("⚠️ Promo tekshirishda xatolik:", err.message);
    }
  }

  // --- 10.1: bron bekor qilish ---
  if (asksCancelBooking(text) && ctx.contactId) {
    try {
      const b = await getUpcomingBooking(ctx.contactId);
      if (b) {
        await updateBookingStatus(b.id, "cancelled");
        const reply = `Broningiz (${fmtLocal(b.starts_at)}) bekor qilindi. Boshqa vaqtga yozilmoqchi bo'lsangiz, "bron" deb yozing 😊`;
        await ctx.send.text(ctx.senderId, reply);
        await saveBot(ctx, reply, "booking");
        console.log(`📅 Bron bekor qilindi (#${b.id}, mijoz ${ctx.contactId})`);
        return true;
      }
    } catch (err) {
      console.error("⚠️ Bron bekor qilishda xatolik:", err.message);
    }
  }

  // --- 10.1: bron so'rovi ---
  if (asksBooking(text)) {
    if (await sendBookingSlots(ctx)) return true;
  }

  // --- 10.2: narx kalkulyatori ---
  if (state.SETTINGS.calc_enabled === "true" && /narx|qancha|price|сколько|стоит/i.test(text)) {
    if (await startCalculator(ctx)) return true;
  }

  // --- 10.3: to'lov havolalari ---
  if (/to'lov|to'lash|tolov|tolash|qanday to'la|оплат|paycha/i.test(text)) {
    if (await sendPaymentLinks(ctx)) return true;
  }

  // --- 10.5: referral havolasi so'raldi ---
  if (/referral|referal|taklif havola|do'stni taklif|dostni taklif|do'stimni taklif/i.test(text)) {
    if (await sendReferralLink(ctx)) return true;
  }

  return false;
}

// ============================================================
//  10.1: bo'sh slotlarni tugma qilib yuborish
// ============================================================
async function sendBookingSlots(ctx) {
  try {
    const r = await computeFreeSlots(ctx.projectId, 6);
    if (!r) return false; // bron tizimi yoqilmagan — AI javob beradi
    if (!r.slots.length) {
      const t = "Afsuski yaqin kunlarda bo'sh vaqt yo'q 😔 Menejer siz bilan bog'lanadi.";
      await ctx.send.text(ctx.senderId, t);
      await saveBot(ctx, t, "booking");
      return true;
    }
    const btns = r.slots.map((s) => ({ title: fmtLocal(s), payload: `bk:${s.getTime()}` }));
    const t = "Qulay vaqtni tanlang 📅";
    await ctx.send.buttons(ctx.senderId, t, btns);
    await saveBot(ctx, t + " " + btns.map((b) => `[${b.title}]`).join(" "), "booking");
    return true;
  } catch (err) {
    console.error("⚠️ Slotlarni yuborishda xatolik:", err.message);
    return false;
  }
}

// ============================================================
//  10.2: kalkulyator — xotirada sessiya (30 daqiqa)
// ============================================================
const CALC_SESSIONS = new Map(); // contactId -> { at, idx, add, mult, answers, rules }

function calcSession(contactId) {
  const s = CALC_SESSIONS.get(contactId);
  if (s && Date.now() - s.at < 30 * 60 * 1000) return s;
  CALC_SESSIONS.delete(contactId);
  return null;
}

async function startCalculator(ctx) {
  if (!ctx.contactId) return false;
  try {
    const rules = await listPriceRules(ctx.projectId);
    if (!rules.length) return false;
    const sess = { at: Date.now(), idx: 0, add: 0, mult: 1, answers: [], rules };
    CALC_SESSIONS.set(ctx.contactId, sess);
    await sendCalcQuestion(ctx, sess);
    return true;
  } catch (err) {
    console.error("⚠️ Kalkulyatorda xatolik:", err.message);
    return false;
  }
}

async function sendCalcQuestion(ctx, sess) {
  const rule = sess.rules[sess.idx];
  const opts = Array.isArray(rule.options) ? rule.options : [];
  const btns = opts.slice(0, 8).map((o, j) => ({
    title: String(o.label || "").slice(0, 20),
    payload: `calc:${sess.idx}:${j}`,
  }));
  await ctx.send.buttons(ctx.senderId, rule.question, btns);
  await saveBot(ctx, rule.question + " " + btns.map((b) => `[${b.title}]`).join(" "));
}

async function handleCalcAnswer(ctx, payload) {
  const sess = ctx.contactId ? calcSession(ctx.contactId) : null;
  if (!sess) return false;
  const [, idxS, optS] = payload.split(":");
  const idx = Number(idxS), opt = Number(optS);
  if (idx !== sess.idx) return true; // eski tugma — e'tiborsiz
  const rule = sess.rules[idx];
  const o = (rule.options || [])[opt];
  if (!o) return true;
  sess.at = Date.now();
  sess.add += Number(o.add) || 0;
  sess.mult *= Number(o.mult) || 1;
  sess.answers.push(`${rule.question} → ${o.label}`);
  sess.idx++;

  if (sess.idx < sess.rules.length) {
    await sendCalcQuestion(ctx, sess);
    return true;
  }

  // Yakun: taxminiy narx
  CALC_SESSIONS.delete(ctx.contactId);
  const base = Number(state.SETTINGS.calc_base_price) || 0;
  const total = Math.round((base + sess.add) * sess.mult);
  const reply = `Taxminiy narx: ${total.toLocaleString("uz-UZ")} so'm 💰\n\nBu dastlabki hisob — aniq narx uchun menejerimiz bilan bog'laning yoki telefon raqamingizni qoldiring 😊`;
  await ctx.send.text(ctx.senderId, reply);
  await saveBot(ctx, reply);
  appendContactNote(
    ctx.contactId,
    `🧮 Kalkulyator (${new Date().toISOString().slice(0, 10)}): ${sess.answers.join("; ")} = ~${total.toLocaleString("uz-UZ")} so'm`
  ).catch(() => {});
  console.log(`🧮 Kalkulyator yakunlandi (mijoz ${ctx.contactId}): ~${total}`);
  return true;
}

// ============================================================
//  10.3: to'lov havolalari
// ============================================================
export async function sendPaymentLinks(ctx) {
  const links = [
    { title: "Click", url: (state.SETTINGS.pay_click || "").trim() },
    { title: "Payme", url: (state.SETTINGS.pay_payme || "").trim() },
    { title: "Uzum", url: (state.SETTINGS.pay_uzum || "").trim() },
  ].filter((l) => /^https:\/\//.test(l.url));
  if (!links.length) return false; // sozlanmagan — AI javob beradi
  const t = "To'lov uchun qulay usulni tanlang 💳";
  await ctx.send.buttons(ctx.senderId, t, [], links);
  await saveBot(ctx, t + " " + links.map((l) => `[${l.title}: ${l.url}]`).join(" "));
  return true;
}

// ============================================================
//  10.5: referral havolasi va kodni qo'llash
// ============================================================
async function sendReferralLink(ctx) {
  if (!ctx.contactId) return false;
  try {
    const code = await ensureReferralCode(ctx.contactId);
    if (!code) return false;
    let linkPart;
    if (ctx.platform === "telegram") {
      const p = await getProjectToken(ctx.projectId);
      linkPart = p?.tg_username
        ? `havola: https://t.me/${p.tg_username}?start=${code}`
        : `kod: ${code}`;
    } else {
      linkPart = `kod: ${code}`;
    }
    const reply = `Do'stlaringizni taklif qiling! 🤝\nSizning taklif ${linkPart}\n\nDo'stingiz bizga yozganda shu kodni yuborsin — biz uni siz orqali kelganini bilamiz 🎁`;
    await ctx.send.text(ctx.senderId, reply);
    await saveBot(ctx, reply);
    return true;
  } catch (err) {
    console.error("⚠️ Referral havolasida xatolik:", err.message);
    return false;
  }
}

async function applyReferral(ctx, code) {
  try {
    const referrer = await findContactByReferralCode(code);
    if (!referrer || referrer.id === ctx.contactId) return;
    const applied = await setReferredBy(ctx.contactId, referrer.id);
    if (!applied) return;
    console.log(`🤝 Referral: mijoz ${ctx.contactId} ← ${referrer.id} (${code})`);
    // Bonus: taklif qilganga avto promo-kod (sozlamada yoqilgan bo'lsa)
    if (state.SETTINGS.referral_bonus_enabled === "true") {
      const pct = Math.min(Math.max(parseInt(state.SETTINGS.referral_bonus_percent, 10) || 10, 1), 90);
      const bonusCode = "BONUS" + Math.random().toString(36).slice(2, 6).toUpperCase();
      try {
        await insertPromoCode({
          projectId: referrer.project_id,
          code: bonusCode,
          discountPercent: pct,
          maxUses: 1,
        });
        const p = await getProjectToken(referrer.project_id);
        if (p?.access_token || ctx.token) {
          const { senderFor } = await import("./channels.js");
          const send = senderFor(p?.platform || "instagram", p?.access_token || ctx.token);
          const msg = `🎁 Rahmat! Siz taklif qilgan do'stingiz bizga yozdi. Sizga ${pct}% chegirma kodi: ${bonusCode}`;
          await send.text(referrer.ig_user_id, msg);
          await saveMessage(referrer.id, "assistant", msg).catch(() => {});
        }
      } catch (err) {
        console.error("⚠️ Referral bonus xatoligi:", err.message);
      }
    }
  } catch (err) {
    console.error("⚠️ Referral qo'llashda xatolik:", err.message);
  }
}
