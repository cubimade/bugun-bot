// ============================================================
//  ROUTES/PUBLIC.JS — ommaviy sahifalar (ROADMAP-6 A3)
//  /, /privacy, /data-deletion, /stats
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { state } from "../state.js";
import { getStats } from "../db.js";
import {
  renderPrivacyPage,
  renderDataDeletionPage,
  renderStatsPage,
} from "../pages.js";
import { APP_VERSION } from "../templates.js";

const router = express.Router();

router.get("/privacy", (req, res) => res.send(renderPrivacyPage()));
router.get("/data-deletion", (req, res) => res.send(renderDataDeletionPage()));

// Statistika ham parol bilan himoyalangan (mijoz xabarlari ko'rinadi)
router.get("/stats", protect, async (req, res, next) => {
  if (!state.DB_READY) {
    res
      .status(503)
      .send("<h1>📊 Statistika mavjud emas</h1><p>Database ulanmagan (DATABASE_URL topilmadi).</p>");
    return;
  }
  try {
    const stats = await getStats();
    res.send(renderStatsPage(stats));
  } catch (err) {
    next(err);
  }
});

router.get("/", (req, res) => {
  res.send(
    `🤖 Bugun-bot ishlayapti! (v${APP_VERSION}) — <a href='/dashboard'>Boshqaruv paneli</a>`
  );
});

export default router;
