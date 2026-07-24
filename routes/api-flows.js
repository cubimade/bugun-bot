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

    const nodes = rawNodes
      .filter((n) => n && NODE_TYPES.includes(n.type))
      .map((n) => ({
        ref: n.ref,
        type: n.type,
        config: typeof n.config === "object" && n.config ? n.config : {},
        x: Number(n.x) || 0,
        y: Number(n.y) || 0,
      }));
    const edges = rawEdges
      .filter((e) => e && e.from != null && e.to != null)
      .map((e) => ({
        from: e.from,
        to: e.to,
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
