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
  renderFlowsPage,
  renderFlowEditorPage,
  renderPipelinePage,
  renderMediaPage,
  renderBookingsPage,
  renderSalesPage,
  renderAbTestsPage,
  renderConnectPage,
  renderConnectInstagramPage,
  renderSetupWizardPage,
} from "../templates.js";

const router = express.Router();

router.get("/dashboard", protect, (req, res) => res.send(renderDashboardHome()));
router.get("/dashboard/inbox", protect, (req, res) => res.send(renderInboxPage()));
router.get("/dashboard/contacts", protect, (req, res) => res.send(renderContactsPage()));
router.get("/dashboard/insights", protect, (req, res) => res.send(renderInsightsPage()));
router.get("/dashboard/flows", protect, (req, res) => res.send(renderFlowsPage()));
router.get("/dashboard/flows/:id", protect, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.redirect("/dashboard/flows");
  res.send(renderFlowEditorPage(id));
});
router.get("/dashboard/pipeline", protect, (req, res) => res.send(renderPipelinePage()));
router.get("/dashboard/media", protect, (req, res) => res.send(renderMediaPage()));
router.get("/dashboard/bookings", protect, (req, res) => res.send(renderBookingsPage()));
router.get("/dashboard/sales", protect, (req, res) => res.send(renderSalesPage()));
router.get("/dashboard/ab-tests", protect, (req, res) => res.send(renderAbTestsPage()));
router.get("/dashboard/broadcast", protect, (req, res) => res.send(renderBroadcastPage()));
router.get("/dashboard/knowledge", protect, (req, res) => res.send(renderKnowledgePage()));
router.get("/dashboard/keywords", protect, (req, res) => res.send(renderKeywordsPage()));
router.get("/dashboard/accounts", protect, (req, res) => res.send(renderAccountsPage()));
// 15: kanal tanlash → Instagram ulash (OAuth yoki qo'lda)
router.get("/dashboard/connect", protect, (req, res) => res.send(renderConnectPage()));
router.get("/dashboard/connect/instagram", protect, (req, res) =>
  res.send(renderConnectInstagramPage())
);
// ROADMAP-19 FAZA 4: sozlash sehrgari — mijoz o'z Meta ilovasini ulaydi
router.get("/dashboard/connect/instagram/setup", protect, (req, res) =>
  res.send(renderSetupWizardPage())
);
router.get("/dashboard/settings", protect, (req, res) => res.send(renderSettingsPage()));

export default router;
