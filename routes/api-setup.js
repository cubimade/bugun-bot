// ============================================================
//  ROUTES/API-SETUP.JS — sozlash sehrgari API (ROADMAP-19 FAZA 4)
//  Mijoz o'z Meta ilovasini yaratib ulashi uchun qadamma-qadam oqim.
//  XAVFSIZLIK: app secret shifrlangan saqlanadi, API javoblarida
//  HECH QACHON qaytarilmaydi (faqat maskalangan ko'rinish).
// ============================================================
import express from "express";
import crypto from "crypto";

import { protect } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import { pool } from "../db/pool.js";
import { encrypt, maskSecret, hasEncryptionKey } from "../services/crypto.js";
import { BASE_URL, OAUTH_REDIRECT_URI, VERIFY_TOKEN } from "../config.js";
import { logAudit } from "../db.js";

const router = express.Router();

// Sehrgar sahifasi uchun nusxalanadigan qiymatlar
function wizardUrls() {
  return {
    redirectUri: OAUTH_REDIRECT_URI || null,
    webhookUrl: BASE_URL ? `${BASE_URL}/webhook` : null,
    subscriptionFields: "messages, messaging_postbacks, comments, message_reactions",
  };
}

function shapeDraft(p) {
  return {
    projectId: p.id,
    name: p.name,
    verifyToken: p.verify_token,
    igAppId: p.ig_app_id || null,
    hasSecret: Boolean(p.ig_app_secret_enc),
    status: p.app_setup_status,
    connected: Boolean(p.access_token),
  };
}

// ------------------------------------------------------------
//  Holat: davom etayotgan sehrgar bormi? (yarim yo'lda chiqib ketilsa
//  qaytadan boshlanmasin — ROADMAP-19 4.2)
// ------------------------------------------------------------
router.get("/api/setup/instagram/state", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const { rows } = await pool.query(
      `SELECT id, name, verify_token, ig_app_id, ig_app_secret_enc,
              app_setup_status, access_token
         FROM projects
        WHERE app_setup_status IN ('draft', 'partial')
        ORDER BY id DESC LIMIT 1`
    );
    res.json({
      draft: rows[0] ? shapeDraft(rows[0]) : null,
      urls: wizardUrls(),
      encryptionKey: hasEncryptionKey(), // false — dashboard ogohlantiradi
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  Boshlash: draft loyiha yaratiladi (verify_token darhol generatsiya
//  qilinadi — 4-qadamda Meta paneliga nusxalanadi). Davom etayotgan
//  draft bo'lsa — o'sha qaytadi (dublikat yaratilmaydi).
// ------------------------------------------------------------
router.post("/api/setup/instagram/start", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const existing = await pool.query(
      `SELECT id, name, verify_token, ig_app_id, ig_app_secret_enc,
              app_setup_status, access_token
         FROM projects
        WHERE app_setup_status IN ('draft', 'partial') AND access_token IS NULL
        ORDER BY id DESC LIMIT 1`
    );
    if (existing.rows[0]) {
      return res.json({ draft: shapeDraft(existing.rows[0]), urls: wizardUrls(), resumed: true });
    }

    const name = String(req.body?.name || "").trim().slice(0, 60) || "Yangi akkaunt";
    const verifyToken = crypto.randomBytes(16).toString("hex");
    const { rows } = await pool.query(
      `INSERT INTO projects (name, platform, verify_token, app_setup_status)
       VALUES ($1, 'instagram', $2, 'draft')
       RETURNING id, name, verify_token, ig_app_id, ig_app_secret_enc,
                 app_setup_status, access_token`,
      [name, verifyToken]
    );
    logAudit(req.user?.email || "owner", "setup_wizard_start", `loyiha #${rows[0].id}`).catch(() => {});
    res.json({ draft: shapeDraft(rows[0]), urls: wizardUrls(), resumed: false });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  5-qadam: App ID + App Secret. Secret shifrlanadi, status 'partial'.
// ------------------------------------------------------------
router.post("/api/setup/instagram/:projectId/credentials", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    const appId = String(req.body?.app_id || "").trim();
    const appSecret = String(req.body?.app_secret || "").trim();

    if (!/^\d{5,20}$/.test(appId)) {
      return res.status(400).json({ error: "Instagram App ID raqamlardan iborat bo'ladi — Instagram → API setup sahifasidan nusxalang" });
    }
    if (appSecret.length < 16) {
      return res.status(400).json({ error: "App Secret juda qisqa ko'rinadi — to'liq nusxalanganini tekshiring" });
    }

    const { rowCount } = await pool.query(
      `UPDATE projects
          SET ig_app_id = $2,
              ig_app_secret_enc = $3,
              app_setup_status = 'partial',
              app_setup_error = NULL,
              app_setup_checked_at = now()
        WHERE id = $1`,
      [projectId, appId, encrypt(appSecret)]
    );
    if (!rowCount) return res.status(404).json({ error: "Loyiha topilmadi" });

    logAudit(req.user?.email || "owner", "setup_wizard_credentials", `loyiha #${projectId}, app ${appId}`).catch(() => {});
    // Secret QAYTARILMAYDI — faqat maskalangan oxiri
    res.json({ ok: true, igAppId: appId, secretMasked: maskSecret(appSecret), status: "partial" });
  } catch (err) {
    next(err);
  }
});

// Draft'ni bekor qilish (foydalanuvchi sehrgarni tashlab yubormoqchi bo'lsa)
router.delete("/api/setup/instagram/:projectId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    // Faqat ulanmagan draft o'chiriladi — ishlayotgan akkauntga tegilmaydi
    const { rowCount } = await pool.query(
      `DELETE FROM projects
        WHERE id = $1 AND access_token IS NULL
          AND app_setup_status IN ('draft', 'partial')`,
      [projectId]
    );
    res.json({ ok: true, deleted: rowCount > 0 });
  } catch (err) {
    next(err);
  }
});

export default router;
