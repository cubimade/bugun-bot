// ============================================================
//  ROUTES/OAUTH.JS — "Instagram bilan ulash" (ROADMAP-15)
//    GET /auth/instagram           → Instagram ruxsat sahifasiga yo'naltiradi
//    GET /auth/instagram/callback  → code'ni tokenga almashtirib, akkauntni saqlaydi
//
//  Qo'lda token kiritish sehrgari (POST /api/accounts) O'ZGARISHSIZ qoladi —
//  bu oqim unga zaxira emas, qulay muqobil.
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { state, ACCOUNTS_MAP } from "../state.js";
import * as oauth from "../services/instagram-oauth.js";
import { getAppConfig } from "../services/project-config.js";
import {
  upsertOAuthProject,
  attachOAuthAccountToProject,
  setAppSetupStatus,
  logAudit,
} from "../db.js";
import { renderOAuthSuccessPage, renderOAuthErrorPage } from "../templates/oauth-pages.js";

const router = express.Router();

const NOT_CONFIGURED_HINT =
  "Railway → Variables bo'limiga <strong>IG_APP_ID</strong> va <strong>IG_APP_SECRET</strong> qo'shing. " +
  "Ular Meta App ID/Secret EMAS: App Dashboard → Instagram → API setup with Instagram login → " +
  "Business login settings dan olinadi. Hozircha qo'lda token kiritish orqali ulashingiz mumkin.";

// ------------------------------------------------------------
//  BOSHLASH — state yaratiladi va Instagram'ga yo'naltiriladi
// ------------------------------------------------------------
router.get("/auth/instagram", protect, async (req, res) => {
  // state DB'ga yoziladi — database o'chiq bo'lsa CSRF himoyasi ishlamaydi
  if (!state.DB_READY) {
    return res
      .status(503)
      .send(
        renderOAuthErrorPage(
          "Database o'chiq",
          "Ulash uchun database kerak (DATABASE_URL topilmadi).",
          "Railway'da Postgres ulangan ekanini tekshiring."
        )
      );
  }

  // ROADMAP-19 FAZA 2: ?project=<id> — o'sha loyihaning ilova sozlamalari
  // bilan ulash (mijozning o'z Meta ilovasi). Berilmasa — global (eski oqim).
  const projectId = Number(req.query.project) || null;
  const cfg = await getAppConfig(projectId);

  if (!oauth.isConfigured(cfg)) {
    return res
      .status(503)
      .send(
        renderOAuthErrorPage(
          "Sozlanmagan",
          "Yetishmayotgan sozlama: " + oauth.missingConfig(cfg).join(", "),
          NOT_CONFIGURED_HINT
        )
      );
  }

  try {
    res.redirect(await oauth.buildAuthUrl(cfg, projectId));
  } catch (err) {
    oauth.reportOAuthError(err);
    res.status(500).send(renderOAuthErrorPage("Xatolik", err.message));
  }
});

// ------------------------------------------------------------
//  QAYTISH (callback)
//  DIQQAT: bu route'da `protect` ATAYLAB yo'q — Instagram'dan qaytganda
//  sessiya cookie'si SameSite sababli yuborilmasligi mumkin edi.
//  Xavfsizlik bir martalik `state` orqali ta'minlanadi (15 daqiqa, CSRF).
// ------------------------------------------------------------
router.get("/auth/instagram/callback", async (req, res) => {
  const { code, state: stateParam, error, error_description } = req.query;

  // Foydalanuvchi "Cancel" bosgan holat
  if (error) {
    return res.send(
      renderOAuthErrorPage(
        "Ruxsat berilmadi",
        String(error_description || "Foydalanuvchi so'rovni rad etdi.").slice(0, 300),
        "Ulash uchun Instagram oynasida <strong>Allow</strong> tugmasini bosish kerak."
      )
    );
  }

  if (!state.DB_READY) {
    return res.status(503).send(renderOAuthErrorPage("Database o'chiq", "Akkauntni saqlab bo'lmadi."));
  }

  // CSRF: state bir martalik va 15 daqiqalik.
  // FAZA 2: state loyiha kontekstini olib yuradi — { projectId, appId } | null
  let stateData = null;
  try {
    stateData = await oauth.consumeState(stateParam);
  } catch (err) {
    oauth.reportOAuthError(err);
  }
  if (!stateData) {
    return res
      .status(400)
      .send(
        renderOAuthErrorPage(
          "Xavfsizlik xatosi",
          "So'rov muddati tugagan yoki takroriy ishlatilgan.",
          "Bu normal himoya — <strong>Qayta urinish</strong> tugmasini bosing."
        )
      );
  }

  try {
    // FAZA 2: loyiha konteksti bo'lsa — o'sha loyihaning ilova secret'i bilan
    const cfg = await getAppConfig(stateData.projectId);
    // code → qisqa token → uzoq token (60 kun) → profil
    const { token, expiresIn, permissions, profile } = await oauth.completeFlow(code, cfg);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Loyiha konteksti bor — akkaunt O'SHA loyihaga biriktiriladi (sehrgar oqimi);
    // yo'q bo'lsa — eski upsert (ig_account_id bo'yicha, dublikat yaratilmaydi)
    const saveArgs = {
      igAccountId: profile.instagramId,
      appScopedId: profile.appScopedId,
      name: profile.username ? "@" + profile.username : profile.name || "Yangi akkaunt",
      username: profile.username,
      fullName: profile.name,
      picture: profile.picture,
      token,
      expiresAt,
      scopes: permissions,
    };
    const { projectId, created } = stateData.projectId
      ? await attachOAuthAccountToProject(stateData.projectId, saveArgs)
      : await upsertOAuthProject(saveArgs);

    // O'z ilovasi bilan ulangan loyiha — holat 'ready'
    if (cfg.source === "project") {
      await setAppSetupStatus(projectId, "ready", "OAuth muvaffaqiyatli").catch(() => {});
    }

    // Xotira xaritasi — restart kutmasdan darhol ishlasin.
    // Ikkala kalit ham ro'yxatga olinadi: webhook entry.id haqiqiy akkaunt IDsi
    // yoki app-scoped ID bo'lishi mumkin — qaysi biri kelsa ham loyiha topiladi.
    const acctEntry = {
      projectId,
      token,
      name: profile.username ? "@" + profile.username : profile.name || "Instagram",
    };
    ACCOUNTS_MAP.set(String(profile.instagramId), acctEntry);
    if (profile.appScopedId && profile.appScopedId !== profile.instagramId) {
      ACCOUNTS_MAP.set(String(profile.appScopedId), acctEntry);
    }

    // Webhook obunasi — xato bo'lsa oqim to'xtamaydi, ogohlantirish ko'rsatiladi
    const subscribed = await oauth.subscribeWebhooks(token);

    // LOG: token yozilmaydi (xavfsizlik)
    console.log(
      `🔗 OAuth muvaffaqiyatli: @${profile.username || "?"} (${profile.instagramId}), ` +
        `loyiha ${projectId} (${created ? "yangi" : "yangilandi"}), webhook: ${subscribed}`
    );
    logAudit(
      "oauth",
      "account_connect_oauth",
      `@${profile.username || "?"} (${profile.instagramId}), webhook: ${subscribed}`
    ).catch(() => {});

    res.send(renderOAuthSuccessPage(profile, subscribed));
  } catch (err) {
    oauth.reportOAuthError(err);
    res.status(500).send(
      renderOAuthErrorPage(
        "Ulanmadi",
        err.message,
        "Akkauntingiz <strong>Professional</strong> (Business/Creator) turida ekanini tekshiring. " +
          "Muammo takrorlansa qo'lda token kiritish orqali ulashingiz mumkin."
      )
    );
  }
});

export default router;
