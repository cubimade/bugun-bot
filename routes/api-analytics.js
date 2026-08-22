// ============================================================
//  ROUTES/API-ANALYTICS.JS — statistika, diagrammalar, AI tahlil,
//  CSV eksport (ROADMAP-6 A3 da index.js dan ajratilgan)
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import {
  normalizePeriod,
  getStatsForPeriod,
  getDonutData,
  getHeatmapData,
  getAccountsComparison,
  getFunnelData,
  getMetrics,
  getSourceBreakdown,
  listContactsForExport,
  getDailyDigest,
  getRecentUserMessages,
  listContacts,
  listProjects,
} from "../db.js";
import { getDailySummary, getInsights, getWhatsChanged } from "../claude.js";
import { swrCache } from "../services/ai-cache.js";

const router = express.Router();

// Og'ir analitik SQL uchun 5 daqiqalik kesh (G4)
const ANALYTICS_TTL_MS = 5 * 60 * 1000;
const ANALYTICS_CACHE = new Map();
export async function cachedAnalytics(key, fn) {
  const hit = ANALYTICS_CACHE.get(key);
  if (hit && Date.now() - hit.at < ANALYTICS_TTL_MS) return hit.data;
  const data = await fn();
  ANALYTICS_CACHE.set(key, { data, at: Date.now() });
  return data;
}

// Stats — eski nomlar bilan moslik (contacts = faol mijozlar davrda, all'da jami)
async function statsShaped(period) {
  const s = await cachedAnalytics("stats:" + period, () => getStatsForPeriod(period));
  return {
    ...s,
    contacts: period === "all" ? s.contactsTotal : s.contactsActive,
    week: s.series.map((r) => ({ day: r.x, n: r.n })),
  };
}

router.get("/api/stats", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json(await statsShaped(normalizePeriod(req.query.period)));
  } catch (err) {
    next(err);
  }
});

// --- 5-bosqich: diagrammalar (donut, heatmap, taqqoslash, voronka) ---
function analyticsBundle(period) {
  return cachedAnalytics("analytics:" + period, async () => {
    const [donut, heatmap, accounts, funnel, sources] = await Promise.all([
      getDonutData(period),
      getHeatmapData(period),
      getAccountsComparison(period),
      getFunnelData(period),
      getSourceBreakdown(period),
    ]);
    return { donut, heatmap, accounts, funnel, sources };
  });
}

router.get("/api/analytics", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const period = normalizePeriod(req.query.period);
    res.json({ period, ...(await analyticsBundle(period)) });
  } catch (err) {
    next(err);
  }
});

// --- 5-bosqich: 6 metrika ---
router.get("/api/metrics", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const period = normalizePeriod(req.query.period);
    res.json(await cachedAnalytics("metrics:" + period, () => getMetrics(period)));
  } catch (err) {
    next(err);
  }
});

// --- E4: "Bu hafta nima o'zgardi" (Haiku, kunlik kesh, bloklamaydi) ---
const CHANGED_TTL_MS = 24 * 60 * 60 * 1000;

router.get("/api/whats-changed", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const force = req.query.refresh === "1";
    const r = await swrCache("whats-changed", CHANGED_TTL_MS, async () => {
      const [s, m] = await Promise.all([
        getStatsForPeriod("7d"),
        cachedAnalytics("metrics:7d", () => getMetrics("7d")),
      ]);
      const comparison = {
        messages: s.messages, messagesPrev: s.prevRaw.messages,
        activeContacts: s.contactsActive, activeContactsPrev: s.prevRaw.contactsActive,
        newContacts: s.contactsNew, unanswered: m.unanswered, needsHuman: s.needsHuman,
      };
      let text = await getWhatsChanged(comparison);
      // Haiku ba'zan markdown sarlavha qo'shadi — oddiy matnga tozalaymiz
      text = (text || "")
        .replace(/\*\*/g, "")
        .replace(/^#+\s*/gm, "")
        .replace(/^bu hafta nima o'zgardi[:\s]*/i, "")
        .trim();
      if (!text) {
        const d = s.trends.messages;
        text = `Bu hafta ${s.messages} ta xabar keldi` +
          (d != null ? ` (o'tgan haftaga nisbatan ${d >= 0 ? "+" : ""}${d}%)` : "") +
          `, ${s.contactsActive} mijoz faol bo'ldi, ${s.contactsNew} tasi yangi.`;
      }
      return { text };
    }, { force });
    if (r.pending || r.data == null) return res.json({ text: null, pending: true });
    res.json({ text: r.data.text, cachedAt: r.cachedAt });
  } catch (err) {
    next(err);
  }
});

// --- F: CSV eksport (server tomonda, fayl nomi sanali) ---
function csvCell(v) {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csvSend(res, filename, rows) {
  const body = "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(body);
}
const today10 = () => new Date().toISOString().slice(0, 10);

router.get("/api/export/contacts.csv", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const period = normalizePeriod(req.query.period);
    const rows = await listContactsForExport(period);
    csvSend(res, `kontaktlar-${today10()}.csv`, [
      ["Ism", "Instagram ID", "Akkaunt", "Teglar", "Xabarlar", "Birinchi ko'rilgan", "Oxirgi ko'rilgan", "Izoh"],
      ...rows.map((c) => [
        c.name || "", c.ig_user_id, c.project_name, c.tags || "",
        c.msg_count,
        c.first_seen ? new Date(c.first_seen).toLocaleString("uz-UZ") : "",
        c.last_seen ? new Date(c.last_seen).toLocaleString("uz-UZ") : "",
        c.note || "",
      ]),
    ]);
  } catch (err) {
    next(err);
  }
});

router.get("/api/export/report.csv", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const period = normalizePeriod(req.query.period);
    const [s, m, a] = await Promise.all([
      cachedAnalytics("stats:" + period, () => getStatsForPeriod(period)),
      cachedAnalytics("metrics:" + period, () => getMetrics(period)),
      cachedAnalytics("analytics:" + period, async () => {
        const [donut, heatmap, accounts, funnel] = await Promise.all([
          getDonutData(period), getHeatmapData(period),
          getAccountsComparison(period), getFunnelData(period),
        ]);
        return { donut, heatmap, accounts, funnel };
      }),
    ]);
    const P = { today: "Bugun", "7d": "7 kun", "30d": "30 kun", all: "Hammasi" }[period];
    csvSend(res, `hisobot-${today10()}.csv`, [
      ["BUGUN BOT — statistika hisoboti", today10(), "Davr: " + P],
      [],
      ["Ko'rsatkich", "Qiymat"],
      ["Xabarlar", s.messages],
      ["Faol mijozlar", s.contactsActive],
      ["Yangi mijozlar", s.contactsNew],
      ["Jami mijozlar", s.contactsTotal],
      ["Odam kerak", s.needsHuman],
      ["O'rtacha javob vaqti (soniya)", m.avgResponseSec ?? "—"],
      ["O'rtacha suhbat (xabar)", m.avgConversationMsgs],
      ["Javobsiz savollar", m.unanswered],
      ["Takroriy mijozlar", `${m.repeatCustomers.count} (${m.repeatCustomers.pct}%)`],
      ["Yangi / qaytgan", `${m.newVsReturning.fresh} / ${m.newVsReturning.returning}`],
      [],
      ["Voronka", "Soni"],
      ["Yozgan", a.funnel.wrote],
      ["Suhbatlashgan (2+ xabar)", a.funnel.engaged],
      ["Qiziqqan (narx/xizmat)", a.funnel.interested],
      ["Aloqaga chiqqan", a.funnel.contacted],
      [],
      ["Akkaunt", "Mijozlar", "Xabarlar"],
      ...a.accounts.map((x) => [x.name, x.contacts, x.messages]),
    ]);
  } catch (err) {
    next(err);
  }
});

// --- Bugungi AI xulosa (Haiku, 1 soatlik kesh, bloklamaydi) ---
const SUMMARY_TTL_MS = 60 * 60 * 1000;

function buildSummaryFallback(d) {
  const parts = [`Bugun ${d.todayMessages} ta xabar keldi`];
  if (d.newContacts) parts.push(`${d.newContacts} ta yangi mijoz qo'shildi`);
  if (d.priceAsks) parts.push(`${d.priceAsks} ta mijoz narx so'radi`);
  let text = parts.join(", ") + ".";
  if (d.needsHuman) text += ` ${d.needsHuman} ta suhbat sizni kutmoqda — ko'rib chiqing.`;
  if (d.topAccount) text += ` Eng faol akkaunt: ${d.topAccount}.`;
  return text;
}

async function summaryPayload(force = false) {
  const r = await swrCache(
    "summary",
    SUMMARY_TTL_MS,
    async () => {
      const digest = await getDailyDigest();
      const text = (await getDailySummary(digest)) || buildSummaryFallback(digest);
      return { text, digest };
    },
    { force }
  );
  if (r.pending || r.data == null) return { text: null, digest: null, pending: true };
  return { text: r.data.text, digest: r.data.digest, cachedAt: r.cachedAt };
}

router.get("/api/summary", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    // ROADMAP-18 FAZA 4: qo'lda yangilash (?refresh=1) — cron yiqilsa ham
    res.json(await summaryPayload(req.query.refresh === "1"));
  } catch (err) {
    next(err);
  }
});

// --- Dashboard: hamma ma'lumot BITTA so'rovda (7 ta alohida fetch o'rniga) ---
// summary (SWR kesh), stats, donut, oxirgi suhbatlar, akkauntlar — server ichida
// parallel yig'iladi; sahifa bitta HTTP so'rov bilan to'liq chiziladi.
router.get("/api/dashboard-data", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const period = normalizePeriod(req.query.period);
    const [summary, stats, analytics, contacts, projects] = await Promise.all([
      summaryPayload(),
      statsShaped(period),
      analyticsBundle(period),
      listContacts(6, 0, null),
      listProjects(),
    ]);
    res.json({ period, summary, stats, donut: analytics.donut, contacts, projects });
  } catch (err) {
    next(err);
  }
});

// --- D1: AI Insights (Haiku, 24 soatlik kesh, bloklamaydi) ---
const INSIGHTS_TTL_MS = 24 * 60 * 60 * 1000;

router.get("/api/insights", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const force = req.query.refresh === "1";
    const r = await swrCache(
      "insights",
      INSIGHTS_TTL_MS,
      async () => {
        const messages = await getRecentUserMessages(250);
        if (!messages.length) return { insights: null, sample: 0 };
        const lines = messages
          .map((m) => `[${m.contact_id}] ${m.name || m.ig_user_id}: ${String(m.text).slice(0, 120)}`)
          .join("\n")
          .slice(0, 18000);
        const insights = await getInsights(lines);
        if (!insights) return null; // AI xato — keshlanmaydi, keyin qayta uriniladi
        return { insights, sample: messages.length };
      },
      { force }
    );
    if (force && r.data == null) {
      return res.status(502).json({ error: "AI tahlilni tayyorlab bo'lmadi — birozdan keyin urinib ko'ring" });
    }
    if (r.pending) return res.json({ insights: null, sample: 0, pending: true });
    res.json({ insights: r.data.insights, sample: r.data.sample, cachedAt: r.cachedAt });
  } catch (err) {
    next(err);
  }
});

export default router;
