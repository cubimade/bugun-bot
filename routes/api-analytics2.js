// ============================================================
//  ROUTES/API-ANALYTICS2.JS — 11-bosqich API:
//  moliya (11.1), segmentlar (11.2), yo'qotish (11.3),
//  prognoz (11.4), A/B (11.5), kontent (11.6), hisobot (11.7)
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb, state } from "../state.js";
import {
  getFinance,
  segmentCounts,
  recomputeSegments,
  getFunnelDrop,
  getLostSamples,
  getDailyTrend,
  listAbTests,
  insertAbTest,
  setAbTestStatus,
  getAbTest,
  getAbResults,
  getRecentUserMessages,
  saveSettings,
} from "../db.js";
import { getLostAnalysis, getContentIdeas } from "../claude.js";
import { swrCache } from "../services/ai-cache.js";
import { reloadSettings } from "../state.js";
import { buildWeeklyReportData, reportToText } from "../services/report.js";
import { esc } from "../templates/components.js";

const router = express.Router();

// Kunlik AI kesh (og'ir chaqiruvlar kuniga 1 marta, bloklamaydi)
const DAY_TTL_MS = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------
//  11.1: MOLIYA
// ------------------------------------------------------------
router.get("/api/finance", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const avgCheck = Number(state.SETTINGS.avg_check) || 0;
    const finance = await getFinance(avgCheck);
    const monthlyCost = Number(state.SETTINGS.monthly_cost) || 0;
    res.json({
      ...finance,
      avgCheck,
      monthlyCost,
      roi: monthlyCost > 0 ? Math.round(((finance.revenue - monthlyCost) / monthlyCost) * 100) : null,
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  11.2: SEGMENTLAR
// ------------------------------------------------------------
router.get("/api/segments", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ counts: await segmentCounts() });
  } catch (err) {
    next(err);
  }
});

router.post("/api/segments/recompute", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const n = await recomputeSegments();
    res.json({ ok: true, updated: n });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  11.3: YO'QOTISH TAHLILI (AI, kunlik kesh)
// ------------------------------------------------------------
router.get("/api/insights/lost", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const force = req.query.refresh === "1";
    const r = await swrCache(
      "insights-lost",
      DAY_TTL_MS,
      async () => {
        const [funnel, samples] = await Promise.all([getFunnelDrop(), getLostSamples(25)]);
        let ai = null;
        if (samples.length >= 3) {
          const text = samples.map((s) => `[${s.stage}]\n${s.convo_tail || ""}`).join("\n---\n");
          ai = await getLostAnalysis(text);
        }
        return { funnel, lostCount: samples.length, ai };
      },
      { force }
    );
    if (r.pending) return res.json({ pending: true });
    res.json({ ...r.data, cachedAt: r.cachedAt });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  11.4: PROGNOZ — chiziqli trend (taxminiy!)
// ------------------------------------------------------------
router.get("/api/forecast", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const days = await getDailyTrend();
    const xs = days.map((_, i) => i);
    const linreg = (ys) => {
      const n = ys.length;
      if (!n) return { a: 0, b: 0 };
      const sx = xs.reduce((a, b) => a + b, 0);
      const sy = ys.reduce((a, b) => a + b, 0);
      const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
      const sxx = xs.reduce((a, x) => a + x * x, 0);
      const b = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
      return { a: (sy - b * sx) / n, b };
    };
    const ncSeries = days.map((d) => d.new_contacts);
    const wonSeries = days.map((d) => d.won);
    const rc = linreg(ncSeries);
    const rw = linreg(wonSeries);
    const proj = (r, from, len) => {
      let total = 0;
      for (let i = 0; i < len; i++) total += Math.max(0, r.a + r.b * (from + i));
      return Math.round(total);
    };
    const monthlyContacts = proj(rc, days.length, 30);
    const monthlyWon = proj(rw, days.length, 30);
    const avgCheck = Number(state.SETTINGS.avg_check) || 0;
    // Ogohlantirish: oxirgi 7 kun o'tgan 7 kundan 20%+ past bo'lsa
    const last7 = ncSeries.slice(-7).reduce((a, b) => a + b, 0);
    const prev7 = ncSeries.slice(-14, -7).reduce((a, b) => a + b, 0);
    const dropPct = prev7 > 0 ? Math.round(((prev7 - last7) / prev7) * 100) : 0;
    res.json({
      days: days.map((d) => ({ day: d.day, newContacts: d.new_contacts, won: d.won })),
      forecast: {
        monthlyContacts,
        monthlyWon,
        monthlyRevenue: monthlyWon * avgCheck,
        note: "Taxminiy prognoz — oxirgi 60 kun trendi asosida",
      },
      warning:
        dropPct >= 20
          ? `O'tgan haftaga nisbatan yangi mijozlar ${dropPct}% kam (${last7} vs ${prev7}). Kontent faolligini va reklamani tekshiring.`
          : null,
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  11.5: A/B TESTLAR
// ------------------------------------------------------------
router.get("/api/ab-tests", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const tests = await listAbTests();
    const withResults = [];
    for (const t of tests) {
      const results = t.status === "running" || t.ended_at ? await getAbResults(t) : null;
      withResults.push({ ...t, results });
    }
    res.json({ tests: withResults });
  } catch (err) {
    next(err);
  }
});

router.post("/api/ab-tests", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim().slice(0, 120);
    const testType = ["greeting", "followup"].includes(b.test_type) ? b.test_type : "greeting";
    const variantA = String(b.variant_a || "").trim().slice(0, 500);
    const variantB = String(b.variant_b || "").trim().slice(0, 500);
    if (!name || !variantA || !variantB) {
      return res.status(400).json({ error: "Nom va ikkala variant matni majburiy" });
    }
    const id = await insertAbTest({
      projectId: Number(b.project_id) || null,
      name,
      testType,
      variantA,
      variantB,
      splitPercent: Math.min(Math.max(Number(b.split_percent) || 50, 10), 90),
    });
    console.log(`🧪 A/B test yaratildi: "${name}" (${testType})`);
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

router.post("/api/ab-tests/:id/status", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const status = String(req.body?.status || "");
    if (!["running", "stopped"].includes(status)) {
      return res.status(400).json({ error: "Noto'g'ri holat" });
    }
    await setAbTestStatus(Number(req.params.id), status);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// G'olibni doimiy qilish: matn sozlamaga yoziladi, test yakunlanadi
router.post("/api/ab-tests/:id/finish", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const winner = String(req.body?.winner || "");
    if (!["A", "B"].includes(winner)) return res.status(400).json({ error: "winner A yoki B" });
    const test = await getAbTest(Number(req.params.id));
    if (!test) return res.status(404).json({ error: "Test topilmadi" });
    const text = winner === "A" ? test.variant_a : test.variant_b;
    const key = test.test_type === "followup" ? "followup_text" : "greeting_message";
    await saveSettings({ [key]: text || "" });
    await reloadSettings();
    await setAbTestStatus(test.id, "finished");
    console.log(`🏆 A/B test yakunlandi: "${test.name}" — g'olib ${winner}`);
    res.json({ ok: true, applied: key });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  11.6: KONTENT TAVSIYALARI (AI, kunlik kesh)
// ------------------------------------------------------------
router.get("/api/insights/content", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const force = req.query.refresh === "1";
    const r = await swrCache(
      "insights-content",
      DAY_TTL_MS,
      async () => {
        const msgs = await getRecentUserMessages(200);
        if (msgs.length < 5) {
          return { ai: null, bestTime: null, note: "Tahlil uchun xabar kam" };
        }
        const text = msgs.map((m) => m.text).join("\n");
        const ai = await getContentIdeas(text);
        // Eng yaxshi vaqt: xabarlar soati bo'yicha top oynasi
        const { pool } = await import("../db/pool.js");
        const { tzName } = await import("../db/analytics.js");
        // ROADMAP-18 FAZA 5.2: qattiq +5 o'rniga sozlangan zona (whitelist'dan)
        const { rows } = await pool.query(
          `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE '${tzName()}')::int AS h, COUNT(*)::int AS n
             FROM messages WHERE role = 'user' AND created_at >= now() - interval '30 days'
            GROUP BY 1 ORDER BY n DESC LIMIT 1`
        );
        const topHour = rows[0]?.h;
        const bestTime =
          topHour != null ? `${String(topHour).padStart(2, "0")}:00-${String((topHour + 2) % 24).padStart(2, "0")}:00` : null;
        return { ai, bestTime };
      },
      { force }
    );
    if (r.pending) return res.json({ pending: true });
    res.json({ ...r.data, cachedAt: r.cachedAt });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
//  11.7: HAFTALIK HISOBOT — HTML eksport (chop etsa bo'ladigan)
// ------------------------------------------------------------
router.get("/api/report/weekly.html", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const d = await buildWeeklyReportData();
    const f = d.finance;
    const stamp = new Date().toLocaleDateString("uz-UZ");
    const rows = (pairs) =>
      pairs.map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right"><strong>${esc(String(v))}</strong></td></tr>`).join("");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html lang="uz"><head><meta charset="UTF-8">
<title>Bugun Bot — haftalik hisobot</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 640px; margin: 32px auto; padding: 0 16px; color: #111; }
  h1 { font-size: 22px; } h2 { font-size: 16px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 7px 4px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
  .muted { color: #777; font-size: 12px; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>📊 Bugun Bot — haftalik hisobot</h1>
<p class="muted">${esc(stamp)} · avtomatik tayyorlangan</p>
<h2>Faollik (7 kun)</h2>
<table>${rows([
      ["Xabarlar", d.week.messages ?? 0],
      ["Yangi mijozlar", d.week.contactsNew ?? 0],
      ["Faol mijozlar", d.week.contactsActive ?? 0],
      ["Operator kutayotganlar", d.week.needsHuman ?? 0],
    ])}</table>
<h2>Moliya (jami)</h2>
<table>${rows([
      ["Mijozlar (leads)", f.leads],
      ["Sotilgan", f.won + " ta"],
      ["Konversiya", f.conversion + "%"],
      [`Daromad${f.revenueIsEstimate ? " (taxminiy)" : ""}`, Number(f.revenue).toLocaleString("uz-UZ") + " so'm"],
      ["LTV (mijoz qiymati)", Number(f.ltv).toLocaleString("uz-UZ") + " so'm"],
    ])}</table>
<h2>Segmentlar</h2>
<table>${rows([
      ["🌟 VIP", d.segments?.vip || 0],
      ["🔥 Faol", d.segments?.faol || 0],
      ["😴 Uxlagan", d.segments?.uxlagan || 0],
      ["❄️ Sovuq", d.segments?.sovuq || 0],
    ])}</table>
<p class="muted" style="margin-top:24px">Chop etish: Ctrl+P → PDF sifatida saqlash</p>
</body></html>`);
  } catch (err) {
    next(err);
  }
});

export default router;
