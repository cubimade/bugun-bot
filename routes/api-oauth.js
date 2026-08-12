// ============================================================
//  ROUTES/API-OAUTH.JS — OAuth yordamchi endpointlari (ROADMAP-15)
//    GET  /api/oauth/status                  → tugma faolmi (env sozlanganmi)
//    POST /api/accounts/:projectId/refresh-token → tokenni hozir uzaytirish
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import { isConfigured, missingConfig } from "../services/instagram-oauth.js";
import { getOAuthProject, logAudit } from "../db.js";
import { refreshProjectToken } from "../services/token-refresh.js";

const router = express.Router();

// "Instagram bilan ulash" tugmasi faol bo'lishi kerakmi?
router.get("/api/oauth/status", protect, (req, res) => {
  res.json({ configured: isConfigured(), missing: missingConfig() });
});

// Tokenni qo'lda uzaytirish (akkaunt kartochkasidagi tugma)
router.post("/api/accounts/:projectId/refresh-token", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: "Noto'g'ri loyiha ID" });
    }

    const project = await getOAuthProject(projectId);
    if (!project) return res.status(404).json({ error: "Akkaunt topilmadi" });
    if (project.token_source !== "oauth" || !project.access_token) {
      return res.status(400).json({
        error: "Bu akkaunt OAuth orqali ulanmagan — tokenni uzaytirib bo'lmaydi. " +
          "\"Instagram bilan ulash\" orqali qayta ulang.",
      });
    }

    const r = await refreshProjectToken(project);
    if (!r.ok) return res.status(502).json({ error: r.error });

    logAudit(req.user?.email || "owner", "token_refresh", `loyiha #${projectId}`).catch(() => {});
    res.json({ ok: true, expiresAt: r.expiresAt });
  } catch (err) {
    next(err);
  }
});

export default router;
