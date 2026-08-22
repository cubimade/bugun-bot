// ============================================================
//  ROUTES/API-DIAGNOSTICS.JS — akkaunt diagnostikasi (ROADMAP-7.2)
//  Token holati, webhook obunasi, faollik, bilim bazasi — har biri
//  status (ok/warn/err/unknown) + aniq tavsiya bilan qaytadi.
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { ACCOUNTS_MAP, requireDb } from "../state.js";
import { IG_TOKEN } from "../config.js";
import { verifyToken, checkSubscription } from "../instagram.js";
import { getProjectToken, getProjectKnowledge, getProjectActivity } from "../db.js";
import { listCronRuns } from "../services/cron-log.js";

const router = express.Router();

// ROADMAP-18 FAZA 4: cron ishga tushishlari — "ishladimi yoki yo'qmi?"
router.get("/api/cron-runs", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ runs: await listCronRuns() });
  } catch (err) {
    next(err);
  }
});

const SETUP_URL = "https://developers.facebook.com/apps";

// ROADMAP-19 FAZA 5.1: Meta xato kodlari — tushunarli o'zbekcha.
// Har xabar: nima bo'ldi + nima qilish kerak.
export const ERROR_HINTS = {
  100:
    "So'rov parametrlari noto'g'ri, yoki bu akkaunt ilovaga ulanmagan. " +
    "Ilova o'z Meta hisobingizda yaratilganini tekshiring (sozlash sehrgari: Akkauntlar → Ulash).",
  190: "Token eskirgan yoki bekor qilingan — akkauntni qayta ulang.",
  200: "Ruxsat yetarli emas — Meta panelida kerakli ruxsatlarni bering.",
  4: "So'rovlar chegarasi oshib ketdi — bir necha daqiqadan keyin urinib ko'ring.",
  10: "Bu amal uchun ilovada ruxsat yo'q.",
};

// Meta xatosiga tarjima qo'shish (kod topilsa)
export function withErrorHint(text, code) {
  const hint = ERROR_HINTS[Number(code)];
  return hint ? `${text} — ${hint}` : text;
}

router.get("/api/accounts/:projectId/diagnostics", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    const project = await getProjectToken(projectId);
    if (!project) return res.status(404).json({ error: "Akkaunt topilmadi" });

    const token =
      project.access_token ||
      ACCOUNTS_MAP.get(String(project.ig_account_id || ""))?.token ||
      (project.ig_account_id ? null : IG_TOKEN); // asosiy loyiha fallback tokenda ishlaydi

    // 1) Token holati — jonli /me so'rovi
    let tokenRes;
    if (!token) {
      tokenRes = { status: "err", text: "Token yo'q", fix: `Sehrgar orqali token qo'shing (Akkauntlar → + Yangi akkaunt) yoki ${SETUP_URL} da Generate token.` };
    } else {
      const check = await verifyToken(token);
      if (check.ok === true) {
        const idMatch = !project.ig_account_id || check.userId === String(project.ig_account_id);
        tokenRes = idMatch
          ? { status: "ok", text: `Tirik — @${check.username || check.userId}` }
          : {
              status: "warn",
              text: `Token @${check.username || "?"} (${check.userId}) akkauntiga tegishli, lekin bu karta IDsi ${project.ig_account_id}`,
              fix: "ID yoki token noto'g'ri juftlangan — sehrgarning 4-qadamidan to'g'ri juftlikni oling.",
            };
      } else if (check.ok === false) {
        // FAZA 5.1: Meta xato kodi tushunarli tarjima bilan
        tokenRes = { status: "err", text: withErrorHint("Instagram tokenni rad etdi: " + check.error, check.code), fix: `Yangi token oling: ${SETUP_URL} → Instagram → API setup → Generate token, so'ng akkauntni qayta qo'shing (eski yozuv ustidan yangilanadi).` };
      } else {
        tokenRes = { status: "unknown", text: "Tarmoq xatosi — tekshirib bo'lmadi: " + check.error };
      }
    }

    // 2) Webhook obunasi
    let webhookRes;
    if (!token) {
      webhookRes = { status: "unknown", text: "Token bo'lmagani uchun tekshirib bo'lmadi" };
    } else {
      const sub = await checkSubscription(token);
      if (sub.ok === true && sub.subscribed) {
        const f = sub.fields || [];
        const needs = ["messages", "comments"].filter((x) => f.length && !f.includes(x));
        webhookRes = needs.length
          ? { status: "warn", text: `Obuna bor, lekin maydonlar yetishmaydi: ${needs.join(", ")}`, fix: `${SETUP_URL} → API setup → Webhook Subscription → messages va comments ni belgilang.` }
          : { status: "ok", text: "Obuna yoqilgan" + (f.length ? ` (${f.join(", ")})` : "") };
      } else if (sub.ok === true) {
        webhookRes = { status: "err", text: "Webhook obunasi YO'Q — xabarlar botga kelmaydi", fix: `${SETUP_URL} → Instagram → API setup → akkaunt qatorida Webhook Subscription = On.` };
      } else {
        webhookRes = { status: "unknown", text: "Avtomatik tekshirib bo'lmadi — qo'lda tekshiring", fix: `${SETUP_URL} → API setup sahifasida Webhook Subscription = On ekanini ko'ring.` };
      }
    }

    // 3) Faollik — oxirgi mijoz xabari
    const act = await getProjectActivity(projectId);
    let activityRes;
    if (!act.last_user_msg) {
      activityRes = { status: "warn", text: "Hali xabar kelmagan", fix: "Akkauntga test DM yozib ko'ring — Railway loglarida 📇 qatori chiqishi kerak." };
    } else {
      const days = (Date.now() - new Date(act.last_user_msg).getTime()) / 86400000;
      activityRes = {
        status: days <= 7 ? "ok" : "warn",
        text: `Oxirgi xabar: ${new Date(act.last_user_msg).toLocaleString("uz-UZ")} · ${act.contacts} mijoz`,
      };
    }

    // 3.5) ROADMAP-19 FAZA 5: ilova sozlamasi — o'z ilovasimi, umumiymi
    let appRes;
    if (project.app_setup_status === "error") {
      appRes = {
        status: "err",
        text: "Ilova sozlamasida xato: " + (project.app_setup_error || "sabab yozilmagan"),
        fix: "Sozlash sehrgarini qayta oching (Akkauntlar → Ulash → Sozlash sehrgari).",
      };
    } else if (project.ig_app_id) {
      appRes = { status: "ok", text: `O'z ilovasi ulangan (App ID ${project.ig_app_id}) — tester roli kerak emas` };
    } else if (project.platform === "telegram") {
      appRes = { status: "ok", text: "Telegram — Meta ilovasi kerak emas" };
    } else {
      appRes = {
        status: "warn",
        text: "Umumiy (global) ilova ishlatilmoqda",
        fix: "Standard Access'da faqat ilovada roli bor akkauntlar ishlaydi. O'z ilovangizni ulash uchun sozlash sehrgarini oching — tester roli kerak bo'lmaydi.",
      };
    }

    // 3.6) Ruxsatlar — OAuth'da berilgan scope'lar (bazadagi granted_scopes)
    let permsRes;
    const scopes = String(project.granted_scopes || "");
    if (project.platform === "telegram") {
      permsRes = { status: "ok", text: "Telegram — Meta ruxsatlari talab qilinmaydi" };
    } else if (!scopes) {
      permsRes = { status: "unknown", text: "Ruxsatlar ro'yxati yo'q (qo'lda token bilan ulangan bo'lishi mumkin)" };
    } else {
      const need = ["instagram_business_basic", "instagram_business_manage_messages"];
      const missing = need.filter((s) => !scopes.includes(s));
      permsRes = missing.length
        ? { status: "err", text: "Ruxsat berilmagan: " + missing.join(", "), fix: "Akkauntni qayta ulang va so'ralgan barcha ruxsatlarga rozilik bering." }
        : { status: "ok", text: "Kerakli ruxsatlar berilgan (" + scopes.split(",").length + " ta)" };
    }

    // 4) Bilim bazasi
    const kb = await getProjectKnowledge(projectId);
    const kbLen = (kb || "").length;
    const kbRes =
      kbLen === 0
        ? { status: "err", text: "Bo'sh — bot umumiy javob beradi", fix: "Bilim bazasi sahifasida xizmatlar, narxlar, aloqa ma'lumotini kiriting." }
        : kbLen < 200
          ? { status: "warn", text: `Juda qisqa (${kbLen} belgi)`, fix: "Kamida xizmatlar ro'yxati, narxlar va aloqa usulini yozing." }
          : { status: "ok", text: `To'ldirilgan (${kbLen} belgi)` };

    res.json({
      project: { id: project.id, name: project.name, ig_account_id: project.ig_account_id },
      checks: { token: tokenRes, app: appRes, permissions: permsRes, webhook: webhookRes, activity: activityRes, knowledge: kbRes },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
