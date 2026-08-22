// templates/insights-script.js — Tahlil (AI Insights) sahifasi klient JS
// (13-audit: insights.js 521 qator edi — klient JS shu faylga ajratildi)

export function insightsScript() {
  return `
const DAY_FULL = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const DAY_SHORT = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Shan"];

// ROADMAP-17 FAZA 2.1 — interfeys chrome ikonkalari (emoji o'rniga). Bu fayl brauzerda
// ishlaydi va serverdagi ICONS'ga ega emas, shuning uchun SVG'lar shu yerda inline.
function ico(paths) { return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>'; }
const ICO = {
  zap: ico('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
  message: ico('<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 20l1.1-5.5a8.4 8.4 0 0 1-1-4A8.5 8.5 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z"/>'),
  calendar: ico('<rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  help: ico('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.7"/><path d="M12 17h.01"/>'),
  repeat: ico('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
  flag: ico('<path d="M4 22V4"/><path d="M4 4h14l-3 4 3 4H4"/>'),
  star: ico('<path d="M12 2l2.9 6.4 6.9.7-5.2 4.7 1.5 6.8L12 17.3 5.9 20.6l1.5-6.8-5.2-4.7 6.9-.7z"/>'),
  clock: ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
  chart: ico('<path d="M3 21h18"/><rect x="6" y="11" width="3.5" height="8"/><rect x="13" y="6" width="3.5" height="13"/>'),
  funnel: ico('<path d="M3 4h18l-7 9v6l-4 2v-8L3 4z"/>'),
  accounts: ico('<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>'),
  inbox: ico('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  money: ico('<path d="M12 2v20"/><path d="M17 6.5c0-1.9-2.2-3-5-3s-5 1.2-5 3 2.2 2.6 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"/>'),
  puzzle: ico('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>'),
  warn: ico('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  lightbulb: ico('<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>'),
  check: ico('<path d="M20 6L9 17l-5-5"/>'),
  contacts: ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  target: ico('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>'),
  knowledge: ico('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
};

// D: 6 metrika
async function loadMetrics() {
  try {
    const m = await api("/api/metrics?period=" + PERIOD);
    const wd = m.weekdays || [];
    const topDay = wd.length ? wd.reduce((a, b) => (b.n > a.n ? b : a)) : null;
    const cards = [
      { e: ICO.zap, num: m.avgResponseSec != null ? m.avgResponseSec + " s" : "—",
        lbl: "O'rtacha javob vaqti",
        sub: m.avgResponseSec != null ? "bot shu tezlikda javob beradi (" + m.avgResponseSample + " javob)" : "hali javoblar yo'q" },
      { e: ICO.message, num: m.avgConversationMsgs || "—", lbl: "O'rtacha suhbat",
        sub: "bitta mijoz bilan o'rtacha xabar" },
      { e: ICO.calendar, num: topDay ? DAY_SHORT[topDay.dow] : "—", lbl: "Eng faol kun",
        sub: topDay ? DAY_FULL[topDay.dow] + " — " + topDay.n + " xabar" : "ma'lumot yig'ilmoqda" },
      { e: ICO.help, num: m.unanswered, lbl: "Javobsiz savollar",
        sub: m.unanswered ? "bilim bazasini to'ldirish kerak" : "bot hammasiga javob berdi" },
      { e: ICO.repeat, num: m.repeatCustomers.pct + "%", lbl: "Takroriy mijozlar",
        sub: m.repeatCustomers.count + " ta mijoz qaytib yozgan" },
      { e: ICO.flag, num: m.newVsReturning.fresh + " / " + m.newVsReturning.returning, lbl: "Yangi / qaytgan",
        sub: "davr ichida yangi va eski mijozlar" },
    ];
    // D5: baholangan javoblar bo'lsa — sifat kartasi
    if (m.ratings && m.ratings.rated > 0) {
      cards.push({ e: ICO.star, num: m.ratings.pct + "%", lbl: "Ijobiy baholangan",
        sub: m.ratings.pos + " ijobiy · " + m.ratings.neg + " salbiy (inbox'da baholanadi)" });
    }
    // 7.5: follow-up yuborilgan bo'lsa — konversiya kartasi
    if (m.followup && m.followup.sent > 0) {
      cards.push({ e: ICO.clock, num: m.followup.pct + "%", lbl: "Follow-up konversiyasi",
        sub: m.followup.sent + " ta eslatma → " + m.followup.replied + " tasi javob berdi" });
    }
    $("metricsGrid").innerHTML = cards.map(function (c) {
      return '<div class="card hoverable glass-glow">' +
        '<div style="margin-bottom:6px">' + c.e + "</div>" +
        '<div class="m-num">' + c.num + "</div>" +
        '<div class="stat-lbl" style="margin-top:2px">' + c.lbl + "</div>" +
        '<div class="stat-ctx">' + c.sub + "</div></div>";
    }).join("");
  } catch (e) {
    $("metricsGrid").innerHTML = '<div class="card" style="grid-column:1/-1">' + emptyState(ICO.chart, "Metrikalar yuklanmadi: " + e.message) + "</div>";
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
    $("heatmap").innerHTML = emptyState(ICO.clock, "Yuklanmadi: " + e.message);
    $("funnel").innerHTML = emptyState(ICO.funnel, "Yuklanmadi");
    $("accBars").innerHTML = emptyState(ICO.accounts, "Yuklanmadi");
    $("srcDonut").innerHTML = emptyState(ICO.inbox, "Yuklanmadi");
  }
}

// 7.3: mijoz manbalari donut — dm / story / komment
function renderSources(src) {
  const items = [
    { k: "dm", lbl: "To'g'ridan-to'g'ri DM", c: "var(--accent)", n: src.dm || 0 },
    { k: "story_reply", lbl: "Story javoblari", c: "var(--accent-2)", n: src.story_reply || 0 },
    { k: "comment", lbl: "Kommentdan kelgan", c: "var(--accent-3)", n: src.comment || 0 },
  ];
  const total = items.reduce((s, x) => s + x.n, 0);
  if (!total) { $("srcDonut").innerHTML = emptyState(ICO.inbox, "Ma'lumot yig'ilmoqda — bu davrda mijoz yo'q"); return; }
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
  if (!max) { $("heatmap").innerHTML = emptyState(ICO.clock, "Ma'lumot yig'ilmoqda — mijoz xabarlari kelganda to'ladi"); $("heatSummary").textContent = ""; return; }
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
        (n ? "rgba(99,102,241," + alpha + ")" : "var(--input-bg)") + '" data-tip="' +
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
  $("heatSummary").innerHTML = ICO.lightbulb + " Eng faol vaqt: <strong style='color:var(--text-1)'>" + best + ":00–" + (best + 2) + ":00</strong> — shu paytda onlayn bo'lish eng foydali";
}

// C4: konversiya voronkasi (SVG trapetsiyalar)
function renderFunnel(f) {
  const stages = [
    { lbl: "Yozgan", n: f.wrote || 0, c: "var(--accent)" },
    { lbl: "Suhbatlashgan (2+ xabar)", n: f.engaged || 0, c: "var(--accent-2)" },
    { lbl: "Qiziqqan (narx/xizmat)", n: f.interested || 0, c: "var(--accent-3)" },
    { lbl: "Aloqaga chiqqan", n: f.contacted || 0, c: "var(--success)" },
  ];
  if (!stages[0].n) { $("funnel").innerHTML = emptyState(ICO.funnel, "Ma'lumot yig'ilmoqda — bu davrda mijoz yo'q"); return; }
  const W = 400, SH = 54, GAP = 8, max = stages[0].n;
  const widths = stages.map(function (s) { return Math.max(0.14, s.n / max) * W; });
  let svg = '<svg viewBox="0 0 ' + W + " " + (stages.length * (SH + GAP)) + '" width="100%" style="display:block">';
  stages.forEach(function (s, i) {
    const y = i * (SH + GAP);
    const wTop = widths[i];
    const wBot = i < stages.length - 1 ? widths[i + 1] : widths[i] * 0.72;
    const x1 = (W - wTop) / 2, x2 = (W + wTop) / 2;
    const x3 = (W + wBot) / 2, x4 = (W - wBot) / 2;
    // ROADMAP-18 FAZA 5.1: foiz UMUMIY bazadan (Yozgan) — bosqichlar ketma-ket
    // qism to'plam emas, oldingi bosqichdan hisoblash 625% kabi ma'nosiz
    // raqamlar chiqarardi (25/4 o'rniga 25/91).
    const pct = i === 0 ? 100 : (max ? Math.round((s.n / max) * 100) : 0);
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
  if (!list.length) { $("accBars").innerHTML = emptyState(ICO.accounts, "Ma'lumot yig'ilmoqda — bu davrda faollik yo'q"); return; }
  const max = Math.max.apply(null, list.map(function (a) { return a.messages; }));
  const total = list.reduce(function (s, a) { return s + a.messages; }, 0);
  $("accBars").innerHTML = list.map(function (a) {
    const w = max ? Math.max(2, Math.round((a.messages / max) * 100)) : 2;
    const pct = total ? Math.round((a.messages / total) * 100) : 0;
    return '<div class="acc-row">' +
      '<span class="small" style="width:110px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-tip="' + esc(a.name) + '">' + esc(a.name) + "</span>" +
      '<svg viewBox="0 0 100 14" preserveAspectRatio="none" style="flex:1;height:14px;display:block">' +
      '<defs><linearGradient id="ab' + a.id + '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" style="stop-color:var(--accent)"/><stop offset="100%" style="stop-color:var(--accent-2)"/></linearGradient></defs>' +
      '<rect x="0" y="0" width="100" height="14" rx="7" style="fill:var(--input-bg)"/>' +
      '<rect x="0" y="0" width="' + w + '" height="14" rx="7" fill="url(#ab' + a.id + ')"/></svg>' +
      '<span class="small" style="flex-shrink:0;min-width:86px;text-align:right"><strong>' + a.messages + "</strong> xabar · " + pct + "%</span></div>" +
      '<div class="small muted" style="margin:-4px 0 4px 120px">' + a.contacts + " mijoz</div>";
  }).join("");
}

// E4: Bu hafta nima o'zgardi (bo'sh bo'lsa AI orqa fonda tayyorlaydi)
async function loadChanged(attempt, force) {
  attempt = attempt || 0;
  if (force) $("changedText").textContent = "AI taqqoslash yangilanmoqda…";
  try {
    const { text, cachedAt, pending } = await api("/api/whats-changed" + (force ? "?refresh=1" : ""));
    if (pending) {
      $("changedText").textContent = "AI taqqoslash tayyorlanmoqda…";
      if (attempt < 10) setTimeout(function () { loadChanged(attempt + 1); }, 4000);
      return;
    }
    $("changedText").innerHTML = renderAiText(text); // markdown → HTML (xavfsiz)
    $("changedMeta").innerHTML = "AI taqqoslash · " + fmt(cachedAt) + staleBanner(cachedAt, "loadChanged(0, true)");
  } catch (e) {
    $("changedText").textContent = "Taqqoslash hozircha tayyor emas — ma'lumot yig'ilganda paydo bo'ladi.";
  }
}

async function loadInsights(force, attempt) {
  attempt = attempt || 0;
  if (force) {
    $("insBody").innerHTML = '<div class="ins-grid">' + '<div class="card skeleton" style="height:220px"></div>'.repeat(3) + "</div>";
    $("insMeta").innerHTML = '<span class="spinner" style="width:13px;height:13px"></span> tahlil qilinmoqda...';
  }
  try {
    const { insights, sample, cachedAt, pending } = await api("/api/insights" + (force ? "?refresh=1" : ""));
    if (pending) {
      $("insBody").innerHTML = '<div class="ins-grid">' + '<div class="card skeleton" style="height:220px"></div>'.repeat(3) + "</div>";
      $("insMeta").innerHTML = '<span class="spinner" style="width:13px;height:13px"></span> AI tahlil orqa fonda tayyorlanmoqda...';
      if (attempt < 12) setTimeout(function () { loadInsights(false, attempt + 1); }, 5000);
      return;
    }
    if (!insights) {
      $("insBody").innerHTML = '<div class="card">' + emptyState(ICO.chart, "Hali tahlil uchun xabar yo'q — mijozlar yozganda AI tahlil paydo bo'ladi") + "</div>";
      $("insMeta").textContent = "";
      return;
    }
    $("insMeta").innerHTML = sample + " ta xabar tahlil qilindi · " + fmt(cachedAt) + staleBanner(cachedAt, "loadInsights(true)");
    const tq = insights.top_questions || [];
    const sr = insights.sales_ready || [];
    const kg = insights.kb_gaps || [];
    $("insBody").innerHTML = \`
    <div class="ins-grid">
      <div class="card hoverable glass-glow">
        <h3 style="margin-bottom:6px;display:flex;align-items:center;gap:6px">\${ICO.help} Eng ko'p so'ralgan savollar</h3>
        <p class="small muted" style="margin-bottom:8px">Mijozlar nimani so'rayapti</p>
        \${tq.length ? tq.map((q, i) => \`
          <div class="ins-item">
            <span class="ins-rank">\${i + 1}</span>
            <span style="flex:1">\${renderAiText(q.question)}</span>
            \${q.count ? \`<span class="pill pill-plain">\${q.count}×</span>\` : ""}
          </div>\`).join("") : emptyState(ICO.help, "Aniq takrorlanuvchi savollar topilmadi")}
      </div>

      <div class="card hoverable glass-glow">
        <h3 style="margin-bottom:6px;display:flex;align-items:center;gap:6px">\${ICO.money} Sotuvga tayyor mijozlar</h3>
        <p class="small muted" style="margin-bottom:8px">Narx so'raganlar va qiziqqanlar — tezroq bog'laning!</p>
        \${sr.length ? sr.map((c) => \`
          <div class="ins-item">
            \${avatar(c.name || "?", 30)}
            <span style="flex:1;min-width:0">
              <strong class="small" style="display:block">\${esc(c.name || "Mijoz #" + c.contact_id)}</strong>
              <span class="small muted">\${renderAiText(c.reason || "")}</span>
            </span>
            \${c.contact_id ? \`<a class="btn-plain btn-sm" href="/dashboard/inbox?contact=\${Number(c.contact_id)}">\${ICO.message}</a>\` : ""}
          </div>\`).join("") : emptyState(ICO.money, "Hozircha sotuvga tayyor mijoz aniqlanmadi")}
      </div>

      <div class="card hoverable glass-glow">
        <h3 style="margin-bottom:6px;display:flex;align-items:center;gap:6px">\${ICO.puzzle} Bilim bazasi kamchiliklari</h3>
        <p class="small muted" style="margin-bottom:8px">Bot yaxshi javob berishi uchun nima qo'shish kerak</p>
        \${kg.length ? kg.map((g) => \`
          <div class="ins-item">
            <span style="flex-shrink:0">\${ICO.lightbulb}</span>
            <span style="flex:1">\${renderAiText(g)}</span>
          </div>\`).join("") : emptyState(ICO.puzzle, "Kamchilik topilmadi — bilim bazasi yetarli ko'rinadi")}
        \${kg.length ? '<a class="btn btn-secondary btn-sm" href="/dashboard/knowledge" style="margin-top:10px">' + ICO.knowledge + " Bilim bazasini to'ldirish</a>" : ""}
      </div>
    </div>\`;
  } catch (e) {
    $("insBody").innerHTML = '<div class="card">' + emptyState(ICO.warn, "Tahlil yuklanmadi: " + e.message) + "</div>";
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
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px" data-tip="' + m.month + ": " + fmtS(m.revenue) + " (" + m.won + ' sotuv)">' +
        '<div style="width:70%;max-width:26px;height:' + Math.max(h, 2) + 'px;background:var(--grad);border-radius:5px 5px 0 0;opacity:' + (m.revenue ? 1 : 0.25) + '"></div>' +
        '<span class="small muted" style="font-size:9.5px">' + m.month.slice(5) + "</span></div>";
    }).join("");
    $("finBody").innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:14px">' +
        finStat(ICO.money + " Daromad" + (f.revenueIsEstimate ? " (taxminiy)" : ""), fmtS(f.revenue)) +
        finStat(ICO.check + " Sotilgan", f.won + " ta") +
        finStat(ICO.chart + " Konversiya", f.conversion + "%") +
        finStat(ICO.target + " LTV", fmtS(f.ltv)) +
        (f.roi != null ? finStat(ICO.chart + " ROI", f.roi + "%") : "") +
      "</div>" +
      '<div class="small muted" style="margin-bottom:6px">Oylar bo\\'yicha daromad:</div>' +
      '<div style="display:flex;align-items:flex-end;gap:3px;height:90px">' + bars + "</div>";
  } catch (e) { $("finBody").innerHTML = emptyState(ICO.money, "Yuklanmadi: " + e.message); }
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
async function loadLost(force, attempt) {
  attempt = attempt || 0;
  if (force) $("lostBody").innerHTML = skeletonRows(3, 40);
  try {
    const r = await api("/api/insights/lost" + (force ? "?refresh=1" : ""));
    if (r.pending) {
      $("lostBody").innerHTML = skeletonRows(3, 40);
      if (attempt < 12) setTimeout(function () { loadLost(false, attempt + 1); }, 5000);
      return;
    }
    const fn = r.funnel || {};
    const stages = [["new", "Yangi", "plain"], ["interested", "Qiziqqan", "warn"], ["negotiation", "Muzokara", "plain"], ["won", "Sotildi", "ok"], ["lost", "Yo'q", "danger"]];
    let html = staleBanner(r.cachedAt, "loadLost(true)") +
      '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">' +
      stages.map(function (s) { return '<span class="pill pill-' + s[2] + '">' + s[1] + ": <strong>" + (fn[s[0]] || 0) + "</strong></span>"; }).join("") + "</div>";
    if (r.ai && (r.ai.reasons || []).length) {
      html += '<strong class="small">Yo\\'qotish sabablari (AI):</strong><ul class="small" style="margin:6px 0 10px 18px;line-height:1.8">' +
        r.ai.reasons.map(function (x) { return "<li>" + renderAiText(x.reason) + (x.count ? ' <span class="muted">(~' + x.count + " mijoz)</span>" : "") + "</li>"; }).join("") + "</ul>" +
        '<strong class="small">Tavsiyalar:</strong><ul class="small" style="margin:6px 0 0 18px;line-height:1.8">' +
        (r.ai.tips || []).map(function (t) { return "<li>" + renderAiText(t) + "</li>"; }).join("") + "</ul>";
    } else {
      html += '<span class="small muted">Tahlil uchun yetarli yo\\'qotilgan mijoz yo\\'q (yaxshi belgi!)</span>';
    }
    $("lostBody").innerHTML = html;
  } catch (e) { $("lostBody").innerHTML = emptyState(ICO.warn, "Yuklanmadi: " + e.message); }
}
// ===== 11.4: Prognoz =====
async function loadForecast() {
  try {
    const r = await api("/api/forecast");
    const f = r.forecast;
    const vals = (r.days || []).map(function (d) { return d.newContacts; });
    $("fcBody").innerHTML =
      (r.warning ? '<div class="card" style="padding:10px 12px;border-color:rgba(251,191,36,.5);background:rgba(251,191,36,.08);margin-bottom:10px" class="small">' + ICO.warn + " " + esc(r.warning) + "</div>" : "") +
      '<div class="small" style="line-height:1.9;margin-bottom:10px">Shu tempda oyiga taxminan:<br>' +
        ICO.contacts + " <strong>~" + f.monthlyContacts + "</strong> yangi mijoz · " +
        ICO.check + " <strong>~" + f.monthlyWon + "</strong> sotuv" +
        (f.monthlyRevenue ? ' · ' + ICO.money + ' <strong>~' + Number(f.monthlyRevenue).toLocaleString("uz-UZ") + "</strong> so'm" : "") +
      "</div>" +
      '<div class="small muted" style="margin-bottom:4px">Kunlik yangi mijozlar (60 kun):</div>' +
      sparkline(vals, "var(--accent)") +
      '<div class="small muted" style="margin-top:8px">' + esc(f.note) + "</div>";
  } catch (e) { $("fcBody").innerHTML = emptyState(ICO.warn, "Yuklanmadi: " + e.message); }
}
// ===== 11.6: Kontent tavsiyalari =====
async function loadContent(force, attempt) {
  attempt = attempt || 0;
  if (force) $("contentBody").innerHTML = skeletonRows(3, 40);
  try {
    const r = await api("/api/insights/content" + (force ? "?refresh=1" : ""));
    if (r.pending) {
      $("contentBody").innerHTML = skeletonRows(3, 40);
      if (attempt < 12) setTimeout(function () { loadContent(false, attempt + 1); }, 5000);
      return;
    }
    if (!r.ai) { $("contentBody").innerHTML = emptyState(ICO.lightbulb, r.note || "Tahlil uchun xabar kam — mijozlar yozganda paydo bo'ladi"); return; }
    $("contentBody").innerHTML =
      staleBanner(r.cachedAt, "loadContent(true)") +
      (r.bestTime ? '<div class="small" style="margin-bottom:10px">' + ICO.clock + ' Auditoriyangiz <strong>' + r.bestTime + "</strong> oralig'ida faol — post/story shu vaqtda chiqaring.</div>" : "") +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' +
        (r.ai.topics || []).map(function (t) { return '<span class="pill pill-plain">' + esc(t.topic) + " · " + (t.count || "?") + "</span>"; }).join("") + "</div>" +
      '<div style="display:grid;gap:8px">' +
        (r.ai.ideas || []).map(function (i) {
          return '<div style="background:var(--panel2);border-radius:11px;padding:10px 13px"><strong class="small">' + renderAiText(i.title) + '</strong><div class="small muted" style="margin-top:3px">' + renderAiText(i.desc) + "</div></div>";
        }).join("") + "</div>";
  } catch (e) { $("contentBody").innerHTML = emptyState(ICO.warn, "Yuklanmadi: " + e.message); }
}
renderPeriodSeg($("periodSeg"), () => { loadMetrics(); loadAnalytics(); });
loadMetrics(); loadAnalytics(); loadChanged(); loadInsights(false);
loadFinance(); loadLost(false); loadForecast(); loadContent(false);`;
}
