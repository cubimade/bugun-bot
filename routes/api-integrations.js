// ============================================================
//  ROUTES/API-INTEGRATIONS.JS — 12.4: integratsiyalar
//  - Chiquvchi webhooklar boshqaruvi (owner/admin)
//  - API kalitlar (owner)
//  - Kiruvchi ochiq API: /api/v1/contacts (API kalit bilan)
// ============================================================
import express from "express";
import crypto from "crypto";

import { protect, requireRole } from "../middleware/auth.js";
import { requireDb, state } from "../state.js";
import { pool } from "../db/pool.js";
import { getOrCreateContact, logAudit } from "../db.js";
import { invalidateWebhookCache, dispatchEvent } from "../services/outbound-webhooks.js";

const router = express.Router();

const EVENTS = ["new_contact", "won", "booking", "payment_paid"];

// ------------------------------------------------------------
//  CHIQUVCHI WEBHOOKLAR
// ------------------------------------------------------------
router.get("/api/webhooks", protect, requireRole("owner", "admin"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.project_id, w.url, w.events, w.is_active, w.created_at,
              (w.secret IS NOT NULL) AS has_secret, p.name AS project_name
         FROM webhooks w LEFT JOIN projects p ON p.id = w.project_id
        ORDER BY w.id DESC`
    );
    res.json({ webhooks: rows, events: EVENTS });
  } catch (err) {
    next(err);
  }
});

router.post("/api/webhooks", protect, requireRole("owner", "admin"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const url = String(req.body?.url || "").trim();
    if (!/^https:\/\//.test(url)) return res.status(400).json({ error: "URL https:// bilan boshlanishi kerak" });
    const events = (Array.isArray(req.body?.events) ? req.body.events : []).filter((e) => EVENTS.includes(e));
    if (!events.length) return res.status(400).json({ error: "Kamida bitta hodisa tanlang" });
    const secret = crypto.randomBytes(16).toString("hex");
    const { rows } = await pool.query(
      `INSERT INTO webhooks (project_id, url, events, secret)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [Number(req.body?.project_id) || null, url, JSON.stringify(events), secret]
    );
    invalidateWebhookCache();
    logAudit(req.user?.email || "owner", "webhook_create", url).catch(() => {});
    res.json({ ok: true, id: rows[0].id, secret });
  } catch (err) {
    next(err);
  }
});

router.post("/api/webhooks/:id/test", protect, requireRole("owner", "admin"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const { rows } = await pool.query(`SELECT id, url, secret FROM webhooks WHERE id = $1`, [
      Number(req.params.id),
    ]);
    const h = rows[0];
    if (!h) return res.status(404).json({ error: "Webhook topilmadi" });
    const body = JSON.stringify({ event: "test", data: { message: "Salom, bu Bugun Bot test hodisasi!" }, sent_at: new Date().toISOString() });
    const headers = { "Content-Type": "application/json" };
    if (h.secret) {
      headers["X-Bugun-Signature"] = "sha256=" + crypto.createHmac("sha256", h.secret).update(body).digest("hex");
    }
    try {
      const r = await fetch(h.url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) });
      res.json({ ok: r.ok, status: r.status });
    } catch (err) {
      res.json({ ok: false, error: err.message });
    }
  } catch (err) {
    next(err);
  }
});

router.post("/api/webhooks/:id", protect, requireRole("owner", "admin"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await pool.query(`UPDATE webhooks SET is_active = COALESCE($2, is_active) WHERE id = $1`, [
      Number(req.params.id),
      req.body?.is_active != null ? Boolean(req.body.is_active) : null,
    ]);
    invalidateWebhookCache();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/webhooks/:id", protect, requireRole("owner", "admin"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await pool.query(`DELETE FROM webhooks WHERE id = $1`, [Number(req.params.id)]);
    invalidateWebhookCache();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  API KALITLAR (owner)
// ------------------------------------------------------------
function hashKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

router.get("/api/api-keys", protect, requireRole("owner"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const { rows } = await pool.query(
      `SELECT id, name, key_hint, is_active, created_at, last_used FROM api_keys ORDER BY id DESC`
    );
    res.json({ keys: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/api/api-keys", protect, requireRole("owner"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const name = String(req.body?.name || "API kalit").trim().slice(0, 100);
    const key = "bb_" + crypto.randomBytes(24).toString("hex");
    await pool.query(
      `INSERT INTO api_keys (name, key_hash, key_hint) VALUES ($1, $2, $3)`,
      [name, hashKey(key), key.slice(0, 8) + "…"]
    );
    logAudit(req.user?.email || "owner", "api_key_create", name).catch(() => {});
    res.json({ ok: true, key }); // faqat bir marta ko'rsatiladi
  } catch (err) {
    next(err);
  }
});

router.delete("/api/api-keys/:id", protect, requireRole("owner"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await pool.query(`DELETE FROM api_keys WHERE id = $1`, [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  KIRUVCHI OCHIQ API — /api/v1/* (X-API-Key bilan)
// ------------------------------------------------------------
async function apiKeyAuth(req, res, next) {
  try {
    if (!state.DB_READY) return res.status(503).json({ error: "Database o'chiq" });
    const key = req.get("x-api-key") || "";
    if (!key.startsWith("bb_")) return res.status(401).json({ error: "X-API-Key header kerak" });
    const { rows } = await pool.query(
      `UPDATE api_keys SET last_used = now()
        WHERE key_hash = $1 AND is_active RETURNING id`,
      [hashKey(key)]
    );
    if (!rows[0]) return res.status(401).json({ error: "API kalit noto'g'ri yoki o'chirilgan" });
    next();
  } catch (err) {
    res.status(500).json({ error: "Ichki xatolik" });
  }
}

// GET /api/v1/contacts?limit=100&offset=0
router.get("/api/v1/contacts", apiKeyAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.ig_user_id, c.tags, c.stage, c.segment, c.language,
            c.deal_amount, c.first_seen, c.last_seen, p.name AS project_name, p.platform
       FROM contacts c JOIN projects p ON p.id = c.project_id
      WHERE NOT c.archived
      ORDER BY c.last_seen DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json({ contacts: rows, limit, offset });
});

// POST /api/v1/contacts — tashqi tizimdan kontakt qo'shish
router.post("/api/v1/contacts", apiKeyAuth, async (req, res) => {
  const b = req.body || {};
  const projectId = Number(b.project_id) || state.DEFAULT_PROJECT_ID;
  const externalId = String(b.external_id || "ext:" + Date.now()).slice(0, 100);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ error: "project_id kerak" });
  }
  // Mavjud bo'lmagan loyihaga kontakt yaratilmasin (FK xatosi 500 bermasin)
  const { listProjects } = await import("../db.js");
  const exists = (await listProjects()).some((p) => p.id === projectId);
  if (!exists) return res.status(404).json({ error: "Bunday loyiha yo'q" });
  const contact = await getOrCreateContact(projectId, externalId, String(b.name || "").slice(0, 100) || null);
  if (Array.isArray(b.tags) && b.tags.length) {
    const { addContactTags } = await import("../db.js");
    await addContactTags(contact.id, b.tags.map((t) => String(t).slice(0, 30)).slice(0, 10));
  }
  res.json({ ok: true, contact_id: contact.id });
});

export default router;
