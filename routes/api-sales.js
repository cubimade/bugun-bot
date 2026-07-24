// ============================================================
//  ROUTES/API-SALES.JS — 10-bosqich API:
//  bron (10.1), kalkulyator (10.2), to'lov (10.3),
//  promo (10.4), referral (10.5)
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb, state, ACCOUNTS_MAP } from "../state.js";
import { IG_TOKEN } from "../config.js";
import { senderFor } from "../services/channels.js";
import { fmtLocal } from "../services/booking.js";
import {
  getBookingSettings,
  saveBookingSettings,
  listBookings,
  insertBooking,
  updateBookingStatus,
  listPayments,
  insertPayment,
  setPaymentStatus,
  listPromoCodes,
  insertPromoCode,
  deletePromoCode,
  updatePromoCode,
  referralStats,
  listPriceRules,
  replacePriceRules,
  advanceContactStage,
  getContactAccount,
  saveMessage,
} from "../db.js";

const router = express.Router();

// ------------------------------------------------------------
//  10.1: BRON SOZLAMALARI
// ------------------------------------------------------------
router.get("/api/booking-settings/:projectId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const s = await getBookingSettings(Number(req.params.projectId));
    res.json({
      settings: s || {
        is_active: false,
        work_days: [1, 2, 3, 4, 5, 6],
        work_start: 9,
        work_end: 18,
        slot_duration_min: 60,
        break_between_min: 0,
        max_days_ahead: 7,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/api/booking-settings/:projectId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const b = req.body || {};
    const days = (Array.isArray(b.work_days) ? b.work_days : [])
      .map(Number)
      .filter((d) => d >= 1 && d <= 7);
    await saveBookingSettings(Number(req.params.projectId), {
      is_active: Boolean(b.is_active),
      work_days: days.length ? days : [1, 2, 3, 4, 5, 6],
      work_start: Math.min(Math.max(Number(b.work_start) || 9, 0), 23),
      work_end: Math.min(Math.max(Number(b.work_end) || 18, 1), 24),
      slot_duration_min: Math.min(Math.max(Number(b.slot_duration_min) || 60, 10), 480),
      break_between_min: Math.min(Math.max(Number(b.break_between_min) || 0, 0), 120),
      max_days_ahead: Math.min(Math.max(Number(b.max_days_ahead) || 7, 1), 60),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  10.1: BRONLAR
// ------------------------------------------------------------
router.get("/api/bookings", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ bookings: await listBookings() });
  } catch (err) {
    next(err);
  }
});

// Qo'lda bron qo'shish
router.post("/api/bookings", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const b = req.body || {};
    const startsAt = new Date(b.starts_at);
    if (isNaN(startsAt.getTime())) return res.status(400).json({ error: "Sana noto'g'ri" });
    const id = await insertBooking({
      projectId: Number(b.project_id) || null,
      contactId: Number(b.contact_id) || null,
      serviceName: String(b.service_name || "").trim().slice(0, 120) || null,
      startsAt: startsAt.toISOString(),
      durationMin: Math.min(Math.max(Number(b.duration_min) || 60, 10), 480),
      note: String(b.note || "").trim().slice(0, 500) || null,
      status: "confirmed",
    });
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

router.post("/api/bookings/:id/status", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const status = String(req.body?.status || "");
    if (!["pending", "confirmed", "cancelled", "done"].includes(status)) {
      return res.status(400).json({ error: "Noto'g'ri holat" });
    }
    await updateBookingStatus(Number(req.params.id), status);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  10.3: TO'LOVLAR
// ------------------------------------------------------------
router.get("/api/payments", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ payments: await listPayments() });
  } catch (err) {
    next(err);
  }
});

// To'lov yaratish + mijozga havola yuborish (operator tugmasi)
router.post("/api/payments", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.body?.contactId);
    const amount = Number(req.body?.amount) || null;
    const method = String(req.body?.method || "").toLowerCase();
    const linkKey = { click: "pay_click", payme: "pay_payme", uzum: "pay_uzum" }[method];
    if (!contactId || !linkKey) {
      return res.status(400).json({ error: "contactId va method (click/payme/uzum) majburiy" });
    }
    const link = (state.SETTINGS[linkKey] || "").trim();
    if (!/^https:\/\//.test(link)) {
      return res.status(400).json({ error: "Bu usul uchun havola sozlanmagan (Sotuv sahifasida kiriting)" });
    }
    const acct = await getContactAccount(contactId);
    if (!acct) return res.status(404).json({ error: "Mijoz topilmadi" });
    const token =
      acct.access_token || ACCOUNTS_MAP.get(String(acct.ig_account_id || ""))?.token || IG_TOKEN;
    if (!token) return res.status(400).json({ error: "Akkaunt tokeni topilmadi" });

    const id = await insertPayment({
      projectId: acct.project_id,
      contactId,
      amount,
      method,
      link,
    });
    const send = senderFor(acct.platform || "instagram", token);
    const text =
      `To'lov havolasi 💳${amount ? `\nSumma: ${amount.toLocaleString("uz-UZ")} so'm` : ""}` +
      `\n${method.toUpperCase()}: ${link}\n\nTo'lagach, xabar yozib qo'ying — tasdiqlaymiz ✅`;
    const r = await send.text(acct.ig_user_id, text);
    if (!r.ok) return res.status(502).json({ error: "Yuborilmadi: " + r.error });
    await saveMessage(contactId, "assistant", text, true);
    console.log(`💳 To'lov havolasi yuborildi (mijoz ${contactId}, ${method})`);
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

// Holat: paid bo'lsa kontakt "Sotildi" bosqichiga o'tadi (kanban bilan bog'liq)
router.post("/api/payments/:id/status", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const status = String(req.body?.status || "");
    if (!["pending", "paid", "failed"].includes(status)) {
      return res.status(400).json({ error: "Noto'g'ri holat" });
    }
    const r = await setPaymentStatus(Number(req.params.id), status);
    if (status === "paid" && r?.contact_id) {
      await advanceContactStage(r.contact_id, "won");
      console.log(`💰 To'lov tasdiqlandi — mijoz ${r.contact_id} "Sotildi" bosqichiga o'tdi`);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  10.4: PROMO KODLAR
// ------------------------------------------------------------
router.get("/api/promos", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ promos: await listPromoCodes() });
  } catch (err) {
    next(err);
  }
});

router.post("/api/promos", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const code = String(req.body?.code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
    if (code.length < 3) return res.status(400).json({ error: "Kod kamida 3 belgi (A-Z, 0-9)" });
    const discountPercent = Number(req.body?.discount_percent) || null;
    const discountAmount = Number(req.body?.discount_amount) || null;
    if (!discountPercent && !discountAmount) {
      return res.status(400).json({ error: "Chegirma foizi yoki summasi kerak" });
    }
    const validUntil = req.body?.valid_until ? new Date(req.body.valid_until) : null;
    const id = await insertPromoCode({
      projectId: Number(req.body?.project_id) || null,
      code,
      discountPercent,
      discountAmount,
      maxUses: Math.min(Math.max(Number(req.body?.max_uses) || 1, 1), 100000),
      validUntil: validUntil && !isNaN(validUntil.getTime()) ? validUntil.toISOString() : null,
    });
    res.json({ ok: true, id });
  } catch (err) {
    if (String(err.message).includes("duplicate")) {
      return res.status(400).json({ error: "Bu kod allaqachon mavjud" });
    }
    next(err);
  }
});

router.post("/api/promos/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await updatePromoCode(Number(req.params.id), {
      isActive: req.body?.is_active != null ? Boolean(req.body.is_active) : null,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/promos/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await deletePromoCode(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  10.5: REFERRAL STATISTIKA
// ------------------------------------------------------------
router.get("/api/referrals", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ top: await referralStats(10) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  10.2: KALKULYATOR QOIDALARI
// ------------------------------------------------------------
router.get("/api/price-rules", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ rules: await listPriceRules(null) });
  } catch (err) {
    next(err);
  }
});

// To'liq almashtirish: [{question, options: [{label, add, mult}]}]
router.post("/api/price-rules", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const raw = Array.isArray(req.body?.rules) ? req.body.rules : [];
    if (raw.length > 10) return res.status(400).json({ error: "Maksimum 10 ta savol" });
    const rules = raw
      .map((r) => ({
        project_id: Number(r.project_id) || null,
        question: String(r.question || "").trim().slice(0, 300),
        options: (Array.isArray(r.options) ? r.options : [])
          .map((o) => ({
            label: String(o.label || "").trim().slice(0, 20),
            add: Number(o.add) || 0,
            mult: Number(o.mult) || 1,
          }))
          .filter((o) => o.label)
          .slice(0, 8),
      }))
      .filter((r) => r.question && r.options.length >= 2);
    await replacePriceRules(rules);
    res.json({ ok: true, count: rules.length });
  } catch (err) {
    next(err);
  }
});

export default router;
