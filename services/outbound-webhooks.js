// ============================================================
//  SERVICES/OUTBOUND-WEBHOOKS.JS — 12.4: chiquvchi webhooklar
//  Hodisalar: new_contact | won | booking | payment_paid
//  POST JSON + X-Bugun-Signature (HMAC-SHA256, webhook secret bilan)
//  n8n/Zapier/Make shu orqali ulanadi.
// ============================================================
import crypto from "crypto";
import { state } from "../state.js";
import { pool } from "../db/pool.js";

let CACHE = { at: 0, hooks: [] };

async function activeHooks() {
  if (Date.now() - CACHE.at < 60 * 1000) return CACHE.hooks;
  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, url, events, secret FROM webhooks WHERE is_active`
    );
    CACHE = { at: Date.now(), hooks: rows };
  } catch {
    CACHE = { at: Date.now(), hooks: [] };
  }
  return CACHE.hooks;
}

export function invalidateWebhookCache() {
  CACHE = { at: 0, hooks: [] };
}

// Hodisani mos webhooklarga yuborish (fonda, xato asosiy oqimni buzmaydi)
export function dispatchEvent(event, projectId, payload) {
  if (!state.DB_READY) return;
  (async () => {
    const hooks = (await activeHooks()).filter(
      (h) =>
        (Array.isArray(h.events) ? h.events : []).includes(event) &&
        (h.project_id == null || h.project_id === projectId)
    );
    for (const h of hooks) {
      const body = JSON.stringify({
        event,
        project_id: projectId,
        data: payload,
        sent_at: new Date().toISOString(),
      });
      const headers = { "Content-Type": "application/json" };
      if (h.secret) {
        headers["X-Bugun-Signature"] =
          "sha256=" + crypto.createHmac("sha256", h.secret).update(body).digest("hex");
      }
      try {
        const r = await fetch(h.url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) });
        console.log(`📡 Webhook yuborildi (#${h.id}, ${event}): HTTP ${r.status}`);
      } catch (err) {
        console.error(`⚠️ Webhook xatoligi (#${h.id}):`, err.message);
      }
    }
  })().catch(() => {});
}
