// ============================================================
//  ROUTES/DASHBOARD.JS — boshqaruv paneli sahifalari (ROADMAP-6 A3)
//  Barcha /dashboard* yo'llar Basic Auth bilan himoyalangan.
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import {
  renderDashboardHome,
  renderInboxPage,
  renderContactsPage,
  renderBroadcastPage,
  renderKnowledgePage,
  renderKeywordsPage,
  renderAccountsPage,
  renderSettingsPage,
  renderInsightsPage,
} from "../templates.js";

const router = express.Router();

router.get("/dashboard", protect, (req, res) => res.send(renderDashboardHome()));
router.get("/dashboard/inbox", protect, (req, res) => res.send(renderInboxPage()));
router.get("/dashboard/contacts", protect, (req, res) => res.send(renderContactsPage()));
router.get("/dashboard/insights", protect, (req, res) => res.send(renderInsightsPage()));
router.get("/dashboard/broadcast", protect, (req, res) => res.send(renderBroadcastPage()));
router.get("/dashboard/knowledge", protect, (req, res) => res.send(renderKnowledgePage()));
router.get("/dashboard/keywords", protect, (req, res) => res.send(renderKeywordsPage()));
router.get("/dashboard/accounts", protect, (req, res) => res.send(renderAccountsPage()));
router.get("/dashboard/settings", protect, (req, res) => res.send(renderSettingsPage()));

export default router;
