// templates/insights.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";


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
      <h3>🕒 Qaysi soatda ko'p yozishadi?</h3>
      <span class="small muted">mijoz xabarlari, hafta kuni × soat</span>
    </div>
    <div id="heatmap"><div class="skeleton" style="height:150px"></div></div>
    <div class="small muted" id="heatSummary" style="margin-top:10px"></div>
  </div>

  <div class="two-col-ana">
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3>🔻 Konversiya voronkasi</h3>
        <span class="small muted">mijoz yo'li</span>
      </div>
      <div id="funnel"><div class="skeleton" style="height:220px"></div></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3>📱 Akkauntlar taqqoslashi</h3>
        <span class="small muted">eng faoldan pastga</span>
      </div>
      <div id="accBars"><div class="skeleton" style="height:220px"></div></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3>📥 Mijozlar qayerdan kelyapti?</h3>
        <span class="small muted">DM · story · komment</span>
      </div>
      <div id="srcDonut"><div class="skeleton" style="height:180px"></div></div>
    </div>
  </div>

  <div class="card glow" style="margin-top:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <h3>💰 Moliyaviy natija</h3>
      <span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap" class="small">
        <a class="btn btn-sm" href="/api/report/weekly.html" target="_blank">🖨 Haftalik hisobot</a>
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
        <h3>📉 Yo'qotilgan mijozlar</h3>
        <button class="btn btn-sm" onclick="loadLost(true)">↻</button>
      </div>
      <div id="lostBody"><div class="skeleton" style="height:160px"></div></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3>🔮 Prognoz</h3>
        <span class="small muted">taxminiy, 60 kun trendi</span>
      </div>
      <div id="fcBody"><div class="skeleton" style="height:160px"></div></div>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px">
      <h3>💡 Kontent tavsiyalari</h3>
      <button class="btn btn-sm" onclick="loadContent(true)">↻</button>
    </div>
    <div id="contentBody"><div class="skeleton" style="height:140px"></div></div>
  </div>

  <div class="card glass-featured" style="margin-top:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <h3>✨ Bu hafta nima o'zgardi</h3>
      <span class="small muted" id="changedMeta"></span>
    </div>
    <div id="changedText" style="font-size:15px;line-height:1.65">
      <div class="skeleton" style="height:15px;margin-bottom:9px;width:90%"></div>
      <div class="skeleton" style="height:15px;width:70%"></div>
    </div>
  </div>

  <div class="card glow" style="display:flex;align-items:center;gap:14px;margin:16px 0;flex-wrap:wrap">
    <div class="stat-ic" style="background:rgba(139,92,246,.14);font-size:20px">🧠</div>
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

  const script = `
const DAY_FULL = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const DAY_SHORT = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Shan"];

// D: 6 metrika
async function loadMetrics() {
  try {
    const m = await api("/api/metrics?period=" + PERIOD);
    const wd = m.weekdays || [];
    const topDay = wd.length ? wd.reduce((a, b) => (b.n > a.n ? b : a)) : null;
    const cards = [
      { e: "⚡", num: m.avgResponseSec != null ? m.avgResponseSec + " s" : "—",
        lbl: "O'rtacha javob vaqti",
        sub: m.avgResponseSec != null ? "bot shu tezlikda javob beradi (" + m.avgResponseSample + " javob)" : "hali javoblar yo'q" },
      { e: "💬", num: m.avgConversationMsgs || "—", lbl: "O'rtacha suhbat",
        sub: "bitta mijoz bilan o'rtacha xabar" },
      { e: "📅", num: topDay ? DAY_SHORT[topDay.dow] : "—", lbl: "Eng faol kun",
        sub: topDay ? DAY_FULL[topDay.dow] + " — " + topDay.n + " xabar" : "ma'lumot yig'ilmoqda" },
      { e: "🤷", num: m.unanswered, lbl: "Javobsiz savollar",
        sub: m.unanswered ? "bilim bazasini to'ldirish kerak" : "bot hammasiga javob berdi" },
      { e: "🔁", num: m.repeatCustomers.pct + "%", lbl: "Takroriy mijozlar",
        sub: m.repeatCustomers.count + " ta mijoz qaytib yozgan" },
      { e: "🆕", num: m.newVsReturning.fresh + " / " + m.newVsReturning.returning, lbl: "Yangi / qaytgan",
        sub: "davr ichida yangi va eski mijozlar" },
    ];
    // D5: baholangan javoblar bo'lsa — sifat kartasi
    if (m.ratings && m.ratings.rated > 0) {
      cards.push({ e: "⭐", num: m.ratings.pct + "%", lbl: "Ijobiy baholangan",
        sub: "👍 " + m.ratings.pos + " · 👎 " + m.ratings.neg + " (inbox'da baholanadi)" });
    }
    // 7.5: follow-up yuborilgan bo'lsa — konversiya kartasi
    if (m.followup && m.followup.sent > 0) {
      cards.push({ e: "⏰", num: m.followup.pct + "%", lbl: "Follow-up konversiyasi",
        sub: m.followup.sent + " ta eslatma → " + m.followup.replied + " tasi javob berdi" });
    }
    $("metricsGrid").innerHTML = cards.map(function (c) {
      return '<div class="card hoverable glass-glow">' +
        '<div style="font-size:20px;margin-bottom:6px">' + c.e + "</div>" +
        '<div class="m-num">' + c.num + "</div>" +
        '<div class="stat-lbl" style="margin-top:2px">' + c.lbl + "</div>" +
        '<div class="stat-ctx">' + c.sub + "</div></div>";
    }).join("");
  } catch (e) {
    $("metricsGrid").innerHTML = '<div class="card" style="grid-column:1/-1">' + emptyState("📊", "Metrikalar yuklanmadi: " + e.message) + "</div>";
  }
}

// C2-C4: diagrammalar
async function loadAnalytics() {
  try {
    const a = await api("/api/analytics?period=" + PERIOD);
    renderHeatmap(a.heatmap || []);
    renderFunnel(a.funnel || {});
    renderAccBars(a.accounts || []);
    renderSources(a.sources || {});
  } catch (e) {
    $("heatmap").innerHTML = emptyState("🕒", "Yuklanmadi: " + e.message);
    $("funnel").innerHTML = emptyState("🔻", "Yuklanmadi");
    $("accBars").innerHTML = emptyState("📱", "Yuklanmadi");
    $("srcDonut").innerHTML = emptyState("📥", "Yuklanmadi");
  }
}

// 7.3: mijoz manbalari donut — dm / story / komment
function renderSources(src) {
  const items = [
    { k: "dm", lbl: "To'g'ridan-to'g'ri DM", c: "var(--accent)", n: src.dm || 0 },
    { k: "story_reply", lbl: "📸 Story javoblari", c: "var(--accent-2)", n: src.story_reply || 0 },
    { k: "comment", lbl: "💬 Kommentdan kelgan", c: "var(--accent-3)", n: src.comment || 0 },
  ];
  const total = items.reduce((s, x) => s + x.n, 0);
  if (!total) { $("srcDonut").innerHTML = emptyState("📥", "Ma'lumot yig'ilmoqda — bu davrda mijoz yo'q"); return; }
  const R = 52, CX = 70, CY = 70, CIRC = 2 * Math.PI * R;
  let off = 0;
  let segs = "";
  items.forEach(function (x) {
    if (!x.n) return;
    const frac = x.n / total;
    segs += '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="none" stroke="' + x.c +
      '" stroke-width="17" stroke-dasharray="' + (frac * CIRC - 2).toFixed(1) + " " + (CIRC - frac * CIRC + 2).toFixed(1) +
      '" stroke-dashoffset="' + (-off * CIRC).toFixed(1) + '" transform="rotate(-90 ' + CX + " " + CY + ')">' +
      "<title>" + x.lbl + ": " + x.n + " (" + Math.round(frac * 100) + "%)</title></circle>";
    off += frac;
  });
  $("srcDonut").innerHTML =
    '<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">' +
    '<svg viewBox="0 0 140 140" width="140" style="flex-shrink:0">' + segs +
    '<text x="' + CX + '" y="' + (CY - 2) + '" text-anchor="middle" style="fill:var(--text-1);font-size:22px;font-weight:700">' + total + "</text>" +
    '<text x="' + CX + '" y="' + (CY + 15) + '" text-anchor="middle" style="fill:var(--text-3);font-size:9px">mijoz</text></svg>' +
    '<div style="display:grid;gap:8px;min-width:170px">' +
    items.map(function (x) {
      return '<div style="display:flex;align-items:center;gap:8px" class="small">' +
        '<span style="width:10px;height:10px;border-radius:3px;background:' + x.c + ';flex-shrink:0"></span>' +
        '<span style="flex:1">' + x.lbl + "</span><strong>" + x.n + "</strong>" +
        '<span class="muted">' + Math.round((x.n / total) * 100) + "%</span></div>";
    }).join("") +
    "</div></div>";
}

// C2: 7 kun × 24 soat heatmap
function renderHeatmap(rows) {
  const grid = {};
  let max = 0;
  rows.forEach(function (r) { grid[r.dow + ":" + r.hour] = r.n; if (r.n > max) max = r.n; });
  if (!max) { $("heatmap").innerHTML = emptyState("🕒", "Ma'lumot yig'ilmoqda — mijoz xabarlari kelganda to'ladi"); $("heatSummary").textContent = ""; return; }
  const dows = [1, 2, 3, 4, 5, 6, 0]; // Du...Yak
  let html = '<div class="heat-scroll"><div class="heat-grid">';
  html += '<div></div>';
  for (let h = 0; h < 24; h++) html += '<div class="heat-lbl" style="justify-content:center">' + (h % 3 === 0 ? h : "") + "</div>";
  dows.forEach(function (d) {
    html += '<div class="heat-lbl">' + DAY_SHORT[d] + "</div>";
    for (let h = 0; h < 24; h++) {
      const n = grid[d + ":" + h] || 0;
      const alpha = n ? (0.12 + 0.78 * (n / max)).toFixed(2) : 0;
      html += '<div class="heat-cell" style="background:' +
        (n ? "rgba(99,102,241," + alpha + ")" : "var(--input-bg)") + '" title="' +
        DAY_FULL[d] + " " + h + ':00 — ' + n + ' xabar"></div>';
    }
  });
  html += "</div></div>";
  $("heatmap").innerHTML = html;
  // Eng faol 2 soatlik oyna (kunlar yig'indisi bo'yicha)
  const hourTotals = Array.from({ length: 24 }, function (_, h) {
    return dows.reduce(function (s, d) { return s + (grid[d + ":" + h] || 0); }, 0);
  });
  let best = 0, bestSum = -1;
  for (let h = 0; h < 23; h++) {
    const s = hourTotals[h] + hourTotals[h + 1];
    if (s > bestSum) { bestSum = s; best = h; }
  }
  $("heatSummary").innerHTML = "💡 Eng faol vaqt: <strong style='color:var(--text-1)'>" + best + ":00–" + (best + 2) + ":00</strong> — shu paytda onlayn bo'lish eng foydali";
}

// C4: konversiya voronkasi (SVG trapetsiyalar)
function renderFunnel(f) {
  const stages = [
    { lbl: "Yozgan", n: f.wrote || 0, c: "var(--accent)" },
    { lbl: "Suhbatlashgan (2+ xabar)", n: f.engaged || 0, c: "var(--accent-2)" },
    { lbl: "Qiziqqan (narx/xizmat)", n: f.interested || 0, c: "var(--accent-3)" },
    { lbl: "Aloqaga chiqqan", n: f.contacted || 0, c: "var(--success)" },
  ];
  if (!stages[0].n) { $("funnel").innerHTML = emptyState("🔻", "Ma'lumot yig'ilmoqda — bu davrda mijoz yo'q"); return; }
  const W = 400, SH = 54, GAP = 8, max = stages[0].n;
  const widths = stages.map(function (s) { return Math.max(0.14, s.n / max) * W; });
  let svg = '<svg viewBox="0 0 ' + W + " " + (stages.length * (SH + GAP)) + '" width="100%" style="display:block">';
  stages.forEach(function (s, i) {
    const y = i * (SH + GAP);
    const wTop = widths[i];
    const wBot = i < stages.length - 1 ? widths[i + 1] : widths[i] * 0.72;
    const x1 = (W - wTop) / 2, x2 = (W + wTop) / 2;
    const x3 = (W + wBot) / 2, x4 = (W - wBot) / 2;
    const pct = i === 0 ? 100 : (stages[i - 1].n ? Math.round((s.n / stages[i - 1].n) * 100) : 0);
    svg += '<path d="M' + x1.toFixed(1) + " " + y + " L" + x2.toFixed(1) + " " + y +
      " L" + x3.toFixed(1) + " " + (y + SH) + " L" + x4.toFixed(1) + " " + (y + SH) +
      ' Z" style="fill:' + s.c + '" opacity="' + (0.92 - i * 0.07) + '">' +
      "<title>" + s.lbl + ": " + s.n + " (" + pct + "%)</title></path>" +
      '<text x="' + W / 2 + '" y="' + (y + SH / 2 - 4) + '" text-anchor="middle" style="fill:#fff;font-size:13px;font-weight:700">' + s.n + (i > 0 ? " · " + pct + "%" : "") + "</text>" +
      '<text x="' + W / 2 + '" y="' + (y + SH / 2 + 13) + '" text-anchor="middle" style="fill:rgba(255,255,255,.85);font-size:10.5px">' + s.lbl + "</text>";
  });
  svg += "</svg>";
  $("funnel").innerHTML = svg;
}

// C3: akkauntlar taqqoslashi — gorizontal gradient barlar (SVG)
function renderAccBars(accounts) {
  const list = accounts.filter(function (a) { return a.messages || a.contacts; });
  if (!list.length) { $("accBars").innerHTML = emptyState("📱", "Ma'lumot yig'ilmoqda — bu davrda faollik yo'q"); return; }
  const max = Math.max.apply(null, list.map(function (a) { return a.messages; }));
  const total = list.reduce(function (s, a) { return s + a.messages; }, 0);
  $("accBars").innerHTML = list.map(function (a) {
    const w = max ? Math.max(2, Math.round((a.messages / max) * 100)) : 2;
    const pct = total ? Math.round((a.messages / total) * 100) : 0;
    return '<div class="acc-row">' +
      '<span class="small" style="width:110px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(a.name) + '">' + esc(a.name) + "</span>" +
      '<svg viewBox="0 0 100 14" preserveAspectRatio="none" style="flex:1;height:14px;display:block">' +
      '<defs><linearGradient id="ab' + a.id + '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" style="stop-color:var(--accent)"/><stop offset="100%" style="stop-color:var(--accent-2)"/></linearGradient></defs>' +
      '<rect x="0" y="0" width="100" height="14" rx="7" style="fill:var(--input-bg)"/>' +
      '<rect x="0" y="0" width="' + w + '" height="14" rx="7" fill="url(#ab' + a.id + ')"/></svg>' +
      '<span class="small" style="flex-shrink:0;min-width:86px;text-align:right"><strong>' + a.messages + "</strong> xabar · " + pct + "%</span></div>" +
      '<div class="small muted" style="margin:-4px 0 4px 120px">' + a.contacts + " mijoz</div>";
  }).join("");
}

// E4: Bu hafta nima o'zgardi
async function loadChanged() {
  try {
    const { text, cachedAt } = await api("/api/whats-changed");
    $("changedText").textContent = text;
    $("changedMeta").textContent = "✨ AI taqqoslash · " + fmt(cachedAt);
  } catch (e) {
    $("changedText").textContent = "Taqqoslash hozircha tayyor emas — ma'lumot yig'ilganda paydo bo'ladi.";
  }
}

async function loadInsights(force) {
  if (force) {
    $("insBody").innerHTML = '<div class="ins-grid">' + '<div class="card skeleton" style="height:220px"></div>'.repeat(3) + "</div>";
    $("insMeta").innerHTML = '<span class="spinner" style="width:13px;height:13px"></span> tahlil qilinmoqda...';
  }
  try {
    const { insights, sample, cachedAt } = await api("/api/insights" + (force ? "?refresh=1" : ""));
    if (!insights) {
      $("insBody").innerHTML = '<div class="card">' + emptyState("📈", "Hali tahlil uchun xabar yo'q — mijozlar yozganda AI tahlil paydo bo'ladi") + "</div>";
      $("insMeta").textContent = "";
      return;
    }
    $("insMeta").textContent = sample + " ta xabar tahlil qilindi · " + fmt(cachedAt);
    const tq = insights.top_questions || [];
    const sr = insights.sales_ready || [];
    const kg = insights.kb_gaps || [];
    $("insBody").innerHTML = \`
    <div class="ins-grid">
      <div class="card hoverable glass-glow">
        <h3 style="margin-bottom:6px">❓ Eng ko'p so'ralgan savollar</h3>
        <p class="small muted" style="margin-bottom:8px">Mijozlar nimani so'rayapti</p>
        \${tq.length ? tq.map((q, i) => \`
          <div class="ins-item">
            <span class="ins-rank">\${i + 1}</span>
            <span style="flex:1">\${esc(q.question)}</span>
            \${q.count ? \`<span class="badge b-indigo">\${q.count}×</span>\` : ""}
          </div>\`).join("") : emptyState("❓", "Aniq takrorlanuvchi savollar topilmadi")}
      </div>

      <div class="card hoverable glass-glow">
        <h3 style="margin-bottom:6px">💰 Sotuvga tayyor mijozlar</h3>
        <p class="small muted" style="margin-bottom:8px">Narx so'raganlar va qiziqqanlar — tezroq bog'laning!</p>
        \${sr.length ? sr.map((c) => \`
          <div class="ins-item">
            \${avatar(c.name || "?", 30)}
            <span style="flex:1;min-width:0">
              <strong class="small" style="display:block">\${esc(c.name || "Mijoz #" + c.contact_id)}</strong>
              <span class="small muted">\${esc(c.reason || "")}</span>
            </span>
            \${c.contact_id ? \`<a class="btn btn-sm" href="/dashboard/inbox?contact=\${Number(c.contact_id)}">💬</a>\` : ""}
          </div>\`).join("") : emptyState("💰", "Hozircha sotuvga tayyor mijoz aniqlanmadi")}
      </div>

      <div class="card hoverable glass-glow">
        <h3 style="margin-bottom:6px">🧩 Bilim bazasi kamchiliklari</h3>
        <p class="small muted" style="margin-bottom:8px">Bot yaxshi javob berishi uchun nima qo'shish kerak</p>
        \${kg.length ? kg.map((g) => \`
          <div class="ins-item">
            <span style="flex-shrink:0">💡</span>
            <span style="flex:1">\${esc(g)}</span>
          </div>\`).join("") : emptyState("🧩", "Kamchilik topilmadi — bilim bazasi yetarli ko'rinadi")}
        \${kg.length ? '<a class="btn btn-sm" href="/dashboard/knowledge" style="margin-top:10px">🧠 Bilim bazasini to\\'ldirish</a>' : ""}
      </div>
    </div>\`;
  } catch (e) {
    $("insBody").innerHTML = '<div class="card">' + emptyState("⚠️", "Tahlil yuklanmadi: " + e.message) + "</div>";
    $("insMeta").textContent = "";
  }
}
// ===== 11.1: Moliyaviy natija =====
async function loadFinance() {
  try {
    const [f, s] = await Promise.all([api("/api/finance"), api("/api/settings")]);
    $("finAvg").value = s.settings.avg_check || "";
    $("finCost").value = s.settings.monthly_cost || "";
    const fmtS = function (n) { return Number(n || 0).toLocaleString("uz-UZ") + " so'm"; };
    const maxRev = Math.max(1, Math.max.apply(null, f.monthly.map(function (m) { return m.revenue; })));
    const bars = f.monthly.map(function (m) {
      const h = Math.round((m.revenue / maxRev) * 70);
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px" title="' + m.month + ": " + fmtS(m.revenue) + " (" + m.won + ' sotuv)">' +
        '<div style="width:70%;max-width:26px;height:' + Math.max(h, 2) + 'px;background:var(--grad);border-radius:5px 5px 0 0;opacity:' + (m.revenue ? 1 : 0.25) + '"></div>' +
        '<span class="small muted" style="font-size:9.5px">' + m.month.slice(5) + "</span></div>";
    }).join("");
    $("finBody").innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:14px">' +
        finStat("💰 Daromad" + (f.revenueIsEstimate ? " (taxminiy)" : ""), fmtS(f.revenue)) +
        finStat("✅ Sotilgan", f.won + " ta") +
        finStat("📈 Konversiya", f.conversion + "%") +
        finStat("🧲 LTV", fmtS(f.ltv)) +
        (f.roi != null ? finStat("📊 ROI", f.roi + "%") : "") +
      "</div>" +
      '<div class="small muted" style="margin-bottom:6px">Oylar bo\\'yicha daromad:</div>' +
      '<div style="display:flex;align-items:flex-end;gap:3px;height:90px">' + bars + "</div>";
  } catch (e) { $("finBody").innerHTML = emptyState("💰", "Yuklanmadi: " + e.message); }
}
function finStat(lbl, val) {
  return '<div style="background:var(--panel2);border-radius:12px;padding:11px"><div class="small muted" style="margin-bottom:3px">' + lbl + '</div><strong style="font-size:15px">' + val + "</strong></div>";
}
async function saveFin(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", { avg_check: $("finAvg").value || "0", monthly_cost: $("finCost").value || "0" });
    toast("Saqlandi ✓");
    loadFinance();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
// ===== 11.3: Yo'qotilgan mijozlar =====
async function loadLost(force) {
  if (force) $("lostBody").innerHTML = skeletonRows(3, 40);
  try {
    const r = await api("/api/insights/lost" + (force ? "?refresh=1" : ""));
    const fn = r.funnel || {};
    const stages = [["new", "🆕 Yangi"], ["interested", "🔥 Qiziqqan"], ["negotiation", "🤝 Muzokara"], ["won", "✅ Sotildi"], ["lost", "❌ Yo'q"]];
    let html = '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">' +
      stages.map(function (s) { return '<span class="badge">' + s[1] + ": <strong>" + (fn[s[0]] || 0) + "</strong></span>"; }).join("") + "</div>";
    if (r.ai && (r.ai.reasons || []).length) {
      html += '<strong class="small">Yo\\'qotish sabablari (AI):</strong><ul class="small" style="margin:6px 0 10px 18px;line-height:1.8">' +
        r.ai.reasons.map(function (x) { return "<li>" + esc(x.reason) + (x.count ? ' <span class="muted">(~' + x.count + " mijoz)</span>" : "") + "</li>"; }).join("") + "</ul>" +
        '<strong class="small">Tavsiyalar:</strong><ul class="small" style="margin:6px 0 0 18px;line-height:1.8">' +
        (r.ai.tips || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
    } else {
      html += '<span class="small muted">Tahlil uchun yetarli yo\\'qotilgan mijoz yo\\'q (yaxshi belgi! 🎉)</span>';
    }
    $("lostBody").innerHTML = html;
  } catch (e) { $("lostBody").innerHTML = emptyState("⚠️", "Yuklanmadi: " + e.message); }
}
// ===== 11.4: Prognoz =====
async function loadForecast() {
  try {
    const r = await api("/api/forecast");
    const f = r.forecast;
    const vals = (r.days || []).map(function (d) { return d.newContacts; });
    $("fcBody").innerHTML =
      (r.warning ? '<div class="card" style="padding:10px 12px;border-color:rgba(251,191,36,.5);background:rgba(251,191,36,.08);margin-bottom:10px" class="small">⚠️ ' + esc(r.warning) + "</div>" : "") +
      '<div class="small" style="line-height:1.9;margin-bottom:10px">Shu tempda oyiga taxminan:<br>' +
        "👥 <strong>~" + f.monthlyContacts + "</strong> yangi mijoz · " +
        "✅ <strong>~" + f.monthlyWon + "</strong> sotuv" +
        (f.monthlyRevenue ? ' · 💰 <strong>~' + Number(f.monthlyRevenue).toLocaleString("uz-UZ") + "</strong> so'm" : "") +
      "</div>" +
      '<div class="small muted" style="margin-bottom:4px">Kunlik yangi mijozlar (60 kun):</div>' +
      sparkline(vals, "var(--accent)") +
      '<div class="small muted" style="margin-top:8px">' + esc(f.note) + "</div>";
  } catch (e) { $("fcBody").innerHTML = emptyState("⚠️", "Yuklanmadi: " + e.message); }
}
// ===== 11.6: Kontent tavsiyalari =====
async function loadContent(force) {
  if (force) $("contentBody").innerHTML = skeletonRows(3, 40);
  try {
    const r = await api("/api/insights/content" + (force ? "?refresh=1" : ""));
    if (!r.ai) { $("contentBody").innerHTML = emptyState("💡", r.note || "Tahlil uchun xabar kam — mijozlar yozganda paydo bo'ladi"); return; }
    $("contentBody").innerHTML =
      (r.bestTime ? '<div class="small" style="margin-bottom:10px">🕗 Auditoriyangiz <strong>' + r.bestTime + "</strong> oralig'ida faol — post/story shu vaqtda chiqaring.</div>" : "") +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' +
        (r.ai.topics || []).map(function (t) { return '<span class="badge b-indigo">' + esc(t.topic) + " · " + (t.count || "?") + "</span>"; }).join("") + "</div>" +
      '<div style="display:grid;gap:8px">' +
        (r.ai.ideas || []).map(function (i) {
          return '<div style="background:var(--panel2);border-radius:11px;padding:10px 13px"><strong class="small">' + esc(i.title) + '</strong><div class="small muted" style="margin-top:3px">' + esc(i.desc) + "</div></div>";
        }).join("") + "</div>";
  } catch (e) { $("contentBody").innerHTML = emptyState("⚠️", "Yuklanmadi: " + e.message); }
}
renderPeriodSeg($("periodSeg"), () => { loadMetrics(); loadAnalytics(); });
loadMetrics(); loadAnalytics(); loadChanged(); loadInsights(false);
loadFinance(); loadLost(false); loadForecast(); loadContent(false);`;

  return renderLayout({
    title: "Tahlil",
    active: "insights",
    headerAction: `<button class="btn" onclick="location.href='/api/export/report.csv?period='+PERIOD">⬇ Hisobot</button> <button class="btn" onclick="loadInsights(true)">🔄 Yangilash</button>`,
    content,
    script,
  });
}
