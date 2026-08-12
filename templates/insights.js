// templates/insights.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
// 13-audit: 521 qatorli fayl bo'lindi — klient JS insights-script.js'da.
import { renderLayout } from "./layout.js";
import { insightsScript } from "./insights-script.js";
import { ICONS } from "./components.js";


// ============================================================
//  8. TAHLIL (AI Insights) — /dashboard/insights
//  Claude suhbatlarni tahlil qiladi: top savollar, sotuvga tayyor
//  mijozlar, bilim bazasi kamchiliklari. ChatPlace'da YO'Q!
// ============================================================
export function renderInsightsPage() {
  const content = `
  <style>
    .ins-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
    .ins-item { display: flex; align-items: flex-start; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--border-subtle); }
    .ins-item:last-child { border-bottom: none; }
    .ins-rank { width: 26px; height: 26px; border-radius: 8px; background: rgba(99,102,241,.14); color: var(--accent-soft); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    /* D: metrikalar bento */
    .m-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }
    .m-num { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; color: transparent; line-height: 1.2; font-variant-numeric: tabular-nums; }
    /* C2: heatmap */
    .heat-scroll { overflow-x: auto; }
    .heat-grid { display: grid; grid-template-columns: 40px repeat(24, minmax(16px, 1fr)); gap: 3px; min-width: 560px; }
    .heat-cell { aspect-ratio: 1; border-radius: 4px; min-height: 15px; }
    .heat-lbl { font-size: 10px; color: var(--text-3); display: flex; align-items: center; }
    /* C3: akkauntlar bar */
    .acc-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
    .two-col-ana { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
    @media (max-width: 900px) { .two-col-ana { grid-template-columns: 1fr; } }
  </style>

  <div id="periodSeg" style="margin-bottom:16px"></div>

  <div class="m-grid stagger" id="metricsGrid">
    ${'<div class="card skeleton" style="height:120px"></div>'.repeat(6)}
  </div>

  <div class="card glow" style="margin-top:16px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <h3 style="display:flex;align-items:center;gap:6px">${ICONS.clock} Qaysi soatda ko'p yozishadi?</h3>
      <span class="small muted">mijoz xabarlari, hafta kuni × soat</span>
    </div>
    <div id="heatmap"><div class="skeleton" style="height:150px"></div></div>
    <div class="small muted" id="heatSummary" style="margin-top:10px"></div>
  </div>

  <div class="two-col-ana">
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3 style="display:flex;align-items:center;gap:6px">${ICONS.funnel} Konversiya voronkasi</h3>
        <span class="small muted">mijoz yo'li</span>
      </div>
      <div id="funnel"><div class="skeleton" style="height:220px"></div></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3 style="display:flex;align-items:center;gap:6px">${ICONS.accounts} Akkauntlar taqqoslashi</h3>
        <span class="small muted">eng faoldan pastga</span>
      </div>
      <div id="accBars"><div class="skeleton" style="height:220px"></div></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3 style="display:flex;align-items:center;gap:6px">${ICONS.inbox} Mijozlar qayerdan kelyapti?</h3>
        <span class="small muted">DM · story · komment</span>
      </div>
      <div id="srcDonut"><div class="skeleton" style="height:180px"></div></div>
    </div>
  </div>

  <div class="card glow" style="margin-top:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <h3 style="display:flex;align-items:center;gap:6px">${ICONS.dollarSign} Moliyaviy natija</h3>
      <span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap" class="small">
        <a class="btn btn-secondary btn-sm" href="/api/report/weekly.html" target="_blank">${ICONS.receipt} Haftalik hisobot</a>
      </span>
    </div>
    <div id="finBody"><div class="skeleton" style="height:120px"></div></div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px;border-top:1px solid var(--border);padding-top:12px" class="small">
      <label class="lbl" style="margin:0">O'rtacha chek (so'm):</label>
      <input class="input" id="finAvg" type="number" min="0" style="width:130px">
      <label class="lbl" style="margin:0">Oylik xarajat:</label>
      <input class="input" id="finCost" type="number" min="0" style="width:130px">
      <button class="btn btn-sm btn-primary" onclick="saveFin(this)">Saqlash</button>
    </div>
  </div>

  <div class="two-col-ana">
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3 style="display:flex;align-items:center;gap:6px">${ICONS.alert} Yo'qotilgan mijozlar</h3>
        <button class="btn-plain btn-sm" onclick="loadLost(true)">↻</button>
      </div>
      <div id="lostBody"><div class="skeleton" style="height:160px"></div></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3 style="display:flex;align-items:center;gap:6px">${ICONS.chartBar} Prognoz</h3>
        <span class="small muted">taxminiy, 60 kun trendi</span>
      </div>
      <div id="fcBody"><div class="skeleton" style="height:160px"></div></div>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
      <h3 style="display:flex;align-items:center;gap:6px">${ICONS.lightbulb} Kontent tavsiyalari</h3>
      <button class="btn-plain btn-sm" onclick="loadContent(true)">↻</button>
    </div>
    <div id="contentBody"><div class="skeleton" style="height:140px"></div></div>
  </div>

  <div class="card glass-featured" style="margin-top:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <h3 style="display:flex;align-items:center;gap:6px">${ICONS.sparkle} Bu hafta nima o'zgardi</h3>
      <span class="small muted" id="changedMeta"></span>
    </div>
    <div id="changedText" style="font-size:15px;line-height:1.65">
      <div class="skeleton" style="height:15px;margin-bottom:9px;width:90%"></div>
      <div class="skeleton" style="height:15px;width:70%"></div>
    </div>
  </div>

  <div class="card glow" style="display:flex;align-items:center;gap:14px;margin:16px 0;flex-wrap:wrap">
    <div class="stat-ic" style="background:rgba(139,92,246,.14)">${ICONS.cpu}</div>
    <div style="flex:1;min-width:220px">
      <strong>AI suhbatlar tahlili</strong>
      <div class="small muted" style="margin-top:2px">Claude oxirgi 7 kunlik mijoz xabarlarini o'qib, sizga xulosa beradi. Kuniga bir marta yangilanadi.</div>
    </div>
    <span class="small muted" id="insMeta"></span>
  </div>

  <div id="insBody">
    <div class="ins-grid">
      ${'<div class="card skeleton" style="height:220px"></div>'.repeat(3)}
    </div>
  </div>`;

  return renderLayout({
    title: "Tahlil",
    active: "insights",
    headerAction: `<button class="btn btn-secondary" onclick="location.href='/api/export/report.csv?period='+PERIOD">${ICONS.receipt} Hisobot</button> <button class="btn btn-secondary" onclick="loadInsights(true)">Yangilash</button>`,
    content,
    script: insightsScript(),
  });
}
