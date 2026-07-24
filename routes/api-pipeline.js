// ============================================================
//  ROUTES/API-PIPELINE.JS — 8.5: sotuv voronkasi (kanban) API
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import {
  listPipelineContacts,
  pipelineStats,
  setContactStage,
  setDealAmount,
  STAGES,
} from "../db.js";

const router = express.Router();

router.get("/api/pipeline", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const [contacts, stats] = await Promise.all([listPipelineContacts(), pipelineStats()]);
    res.json({ contacts, stats, stages: STAGES });
  } catch (err) {
    next(err);
  }
});

router.post("/api/contacts/:id/stage", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const stage = String(req.body?.stage || "");
    if (!STAGES.includes(stage)) {
      return res.status(400).json({ error: "Noto'g'ri bosqich" });
    }
    await setContactStage(Number(req.params.id), stage);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/api/contacts/:id/amount", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const raw = req.body?.amount;
    let amount = null;
    if (raw != null && String(raw).trim() !== "") {
      amount = Number(String(raw).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) {
        return res.status(400).json({ error: "Summa noto'g'ri" });
      }
    }
    await setDealAmount(Number(req.params.id), amount);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
