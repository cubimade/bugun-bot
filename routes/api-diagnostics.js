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

const router = express.Router();

const SETUP_URL = "https://developers.facebook.com/apps";

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
        tokenRes = { status: "err", text: "Instagram tokenni rad etdi: " + check.error, fix: `Yangi token oling: ${SETUP_URL} → Instagram → API setup → Generate token, so'ng akkauntni qayta qo'shing (eski yozuv ustidan yangilanadi).` };
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
      checks: { token: tokenRes, webhook: webhookRes, activity: activityRes, knowledge: kbRes },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
