// ============================================================
//  ROUTES/API-FLOWS.JS — 8.3: flow builder API
//  Ro'yxat, CRUD, graf saqlash, nusxalash, simulyatsiya, shablonlar
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import {
  listFlows,
  getFlow,
  insertFlow,
  updateFlow,
  deleteFlow,
  getFlowGraph,
  saveFlowGraph,
  duplicateFlow,
} from "../db.js";
import { simulateFlow } from "../services/flow-engine.js";
import { FLOW_TEMPLATES, createFlowFromTemplate } from "../services/flow-templates.js";

const router = express.Router();

const TRIGGER_TYPES = ["keyword", "story", "comment", "new_contact", "manual"];
const NODE_TYPES = ["message", "buttons", "condition", "action", "delay"];
// Flow motori config maydonlarini to'g'ridan ishlatadi (xabar yuborish, teg,
// bosqich o'zgartirish) — shuning uchun saqlashda qat'iy tozalaymiz.
const ACTION_KINDS = ["add_tag", "remove_tag", "handoff", "pause_bot", "set_stage", "give_promo"];
const CONDITION_KINDS = ["has_tag", "contains", "subscribed"];
const PIPELINE_STAGES = ["new", "interested", "negotiation", "won", "lost"];

function safeUrl(v) {
  const s = String(v || "").trim().slice(0, 500);
  return /^https:\/\//i.test(s) ? s : "";
}

function sanitizeNodeConfig(type, raw) {
  const c = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  if (type === "message") {
    return { text: String(c.text || "").slice(0, 2000), media_url: safeUrl(c.media_url) };
  }
  if (type === "buttons") {
    const urlBtns = (Array.isArray(c.url_buttons) ? c.url_buttons : [])
      .slice(0, 5)
      .map((b) => ({ title: String(b?.title || "").slice(0, 60), url: safeUrl(b?.url) }))
      .filter((b) => b.title && b.url);
    return { text: String(c.text || "").slice(0, 1000), url_buttons: urlBtns };
  }
  if (type === "condition") {
    return {
      kind: CONDITION_KINDS.includes(c.kind) ? c.kind : "contains",
      value: String(c.value || "").slice(0, 200),
    };
  }
  if (type === "action") {
    const action = ACTION_KINDS.includes(c.action) ? c.action : "add_tag";
    let value = String(c.value || "").slice(0, 100);
    // set_stage voronka whitelist'ini chetlab o'tmasin
    if (action === "set_stage" && !PIPELINE_STAGES.includes(value)) value = "new";
    return { action, value };
  }
  if (type === "delay") {
    return { minutes: Math.min(Math.max(parseInt(c.minutes, 10) || 5, 1), 10080) };
  }
  return {};
}

router.get("/api/flows", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ flows: await listFlows() });
  } catch (err) {
    next(err);
  }
});

router.post("/api/flows", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    if (!name) return res.status(400).json({ error: "Flow nomi majburiy" });
    const triggerType = TRIGGER_TYPES.includes(req.body?.trigger_type)
      ? req.body.trigger_type
      : "manual";
    const triggerValue = String(req.body?.trigger_value || "").trim().slice(0, 300) || null;
    const projectId = Number(req.body?.project_id) || null;
    const id = await insertFlow({ projectId, name, triggerType, triggerValue });
    console.log(`🔀 Yangi flow yaratildi: "${name}" (#${id})`);
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

// 8.4: Shablonlar ro'yxati va shablondan yaratish
router.get("/api/flow-templates", protect, (req, res) => {
  res.json({
    templates: Object.entries(FLOW_TEMPLATES).map(([key, t]) => ({
      key,
      name: t.name,
      description: t.description,
      emoji: t.emoji,
    })),
  });
});

router.post("/api/flows/from-template", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const key = String(req.body?.template || "");
    if (!FLOW_TEMPLATES[key]) return res.status(400).json({ error: "Shablon topilmadi" });
    const projectId = Number(req.body?.project_id) || null;
    const id = await createFlowFromTemplate(key, projectId);
    console.log(`🔀 Shablondan flow yaratildi: ${key} (#${id})`);
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

router.get("/api/flows/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const id = Number(req.params.id);
    const flow = await getFlow(id);
    if (!flow) return res.status(404).json({ error: "Flow topilmadi" });
    const graph = await getFlowGraph(id);
    res.json({ flow, ...graph });
  } catch (err) {
    next(err);
  }
});

router.post("/api/flows/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    await updateFlow(id, {
      name: b.name != null ? String(b.name).trim().slice(0, 120) : null,
      triggerType: TRIGGER_TYPES.includes(b.trigger_type) ? b.trigger_type : null,
      triggerValue: b.trigger_value != null ? String(b.trigger_value).trim().slice(0, 300) : null,
      isActive: b.is_active != null ? Boolean(b.is_active) : null,
      projectId: b.project_id !== undefined ? Number(b.project_id) || null : null,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Grafni saqlash — muharrir "Saqlash" tugmasi
router.post("/api/flows/:id/graph", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const id = Number(req.params.id);
    const flow = await getFlow(id);
    if (!flow) return res.status(404).json({ error: "Flow topilmadi" });

    const rawNodes = Array.isArray(req.body?.nodes) ? req.body.nodes : [];
    const rawEdges = Array.isArray(req.body?.edges) ? req.body.edges : [];
    if (rawNodes.length > 100) return res.status(400).json({ error: "Maksimum 100 ta node" });
    if (rawEdges.length > 300) return res.status(400).json({ error: "Maksimum 300 ta bog'lanish" });

    const nodes = rawNodes
      .filter((n) => n && NODE_TYPES.includes(n.type))
      .map((n) => ({
        ref: String(n.ref ?? "").slice(0, 64),
        type: n.type,
        config: sanitizeNodeConfig(n.type, n.config),
        x: Number(n.x) || 0,
        y: Number(n.y) || 0,
      }));
    const edges = rawEdges
      .filter((e) => e && e.from != null && e.to != null)
      .map((e) => ({
        from: String(e.from).slice(0, 64),
        to: String(e.to).slice(0, 64),
        label: e.label != null ? String(e.label).slice(0, 60) : null,
      }));

    await saveFlowGraph(id, nodes, edges);
    console.log(`💾 Flow #${id} grafi saqlandi (${nodes.length} node, ${edges.length} edge)`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/api/flows/:id/duplicate", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const newId = await duplicateFlow(Number(req.params.id));
    if (!newId) return res.status(404).json({ error: "Flow topilmadi" });
    res.json({ ok: true, id: newId });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/flows/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await deleteFlow(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// "Sinab ko'rish" — simulyatsiya (haqiqiy yuborilmaydi)
router.get("/api/flows/:id/simulate", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ steps: await simulateFlow(Number(req.params.id)) });
  } catch (err) {
    next(err);
  }
});

export default router;
