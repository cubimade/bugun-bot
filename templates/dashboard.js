// templates/dashboard.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";


// ============================================================
//  1. BOSHQARUV (Dashboard) — /dashboard
//  4 statistika kartasi + 7 kun grafigi + suhbatlar + tezkor amallar
// ============================================================
export function renderDashboardHome() {
  const content = `
  <style>
    /* Bento: 1 katta (xulosa) + 2 o'rta (grafik, donut) + 4 kichik (stat) */
    .bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 14px; }
    .bento-xl { grid-column: span 12; }
    .bento-big { grid-column: span 6; }
    .bento-sm { grid-column: span 3; }
    .summary-text { font-size: 15px; line-height: 1.65; min-height: 72px; }
    .ai-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .ai-ok { background: rgba(52,211,153,.12); color: var(--success); }
    .ai-warn { background: rgba(251,191,36,.12); color: var(--warning); }
    .chart-box { position: relative; }
    .chart-tip { position: absolute; pointer-events: none; background: var(--surface-2); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid var(--border-glow); border-radius: 10px; padding: 6px 11px; font-size: 12px; white-space: nowrap; transform: translate(-50%, -115%); opacity: 0; transition: opacity .15s; z-index: 5; box-shadow: var(--shadow-glass); }
    .chart-tip.show { opacity: 1; }
    .chart-tip strong { color: var(--accent-soft); }
    .donut-seg { transition: stroke-width .2s ease; cursor: pointer; }
    .donut-seg:hover { stroke-width: 26; }
    @media (max-width: 1000px) { .bento-big { grid-column: span 12; } .bento-sm { grid-column: span 6; } }
    @media (max-width: 560px) { .bento-sm { grid-column: span 12; } }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } }
  </style>

  <div id="periodSeg" style="margin-bottom:16px"></div>

  <div class="bento stagger">
    <div class="card glass-featured glass-glow bento-xl" id="summaryCard">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <h3>✨ Bugungi xulosa</h3>
        <span id="aiStatus"></span>
      </div>
      <div id="summaryText" class="summary-text">
        <div class="skeleton" style="height:15px;margin-bottom:9px;width:95%"></div>
        <div class="skeleton" style="height:15px;margin-bottom:9px;width:80%"></div>
        <div class="skeleton" style="height:15px;width:60%"></div>
      </div>
      <div class="small muted" id="summaryMeta" style="margin-top:10px"></div>
    </div>

    <div class="card glow glass-glow bento-big">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px">
        <h3>📈 Xabarlar</h3>
        <span class="small muted" id="chartSub">oxirgi 7 kun</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
        <span class="stat-num" id="todayNum">0</span>
        <span id="msgTrend"></span>
      </div>
      <div class="chart-box">
        <div id="chart" class="skeleton" style="height:130px"></div>
        <div class="chart-tip" id="chartTip"></div>
      </div>
    </div>

    <div class="card glow glass-glow bento-big">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:10px">
        <h3>🍩 Suhbatlar holati</h3>
        <span class="small muted">davr bo'yicha</span>
      </div>
      <div id="donut" class="skeleton" style="height:170px"></div>
    </div>

    <a href="/dashboard/inbox?filter=human" class="card hoverable glass-glow bento-sm" id="humanCard">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div class="stat-ic" style="background:rgba(251,191,36,.13);font-size:20px">🙋</div>
        <div style="flex:1;min-width:0">
          <div class="stat-num" id="humanNum">0</div>
          <div class="stat-lbl">Odam kerak</div>
          <div class="stat-ctx" id="humanCtx"></div>
        </div>
      </div>
      <div class="spark" id="humanSpark"></div>
    </a>
    <div class="card hoverable glass-glow bento-sm">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div class="stat-ic" style="background:rgba(99,102,241,.14);font-size:20px">📱</div>
        <div style="flex:1;min-width:0">
          <div class="stat-num" id="projNum">0</div>
          <div class="stat-lbl">Akkauntlar</div>
          <div class="stat-ctx" id="projCtx"></div>
        </div>
      </div>
    </div>
    <div class="card hoverable glass-glow bento-sm">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div class="stat-ic" style="background:rgba(139,92,246,.14);font-size:20px">👥</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span class="stat-num" id="contactNum">0</span><span id="contactTrend"></span></div>
          <div class="stat-lbl" id="contactLbl">Mijozlar</div>
          <div class="stat-ctx" id="contactCtx"></div>
        </div>
      </div>
      <div class="spark" id="contactSpark"></div>
    </div>
    <div class="card hoverable glass-glow bento-sm">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div class="stat-ic" style="background:rgba(34,211,238,.12);font-size:20px">💬</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span class="stat-num" id="msgNum">0</span><span id="msgTrend2"></span></div>
          <div class="stat-lbl">Xabarlar</div>
          <div class="stat-ctx" id="msgCtx"></div>
        </div>
      </div>
      <div class="spark" id="msgSpark"></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px;margin-top:18px" class="two-col">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3>💬 Oxirgi suhbatlar</h3>
        <a href="/dashboard/inbox" class="small" style="color:var(--accent-soft)">Hammasi →</a>
      </div>
      <div id="conversations">${'<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(4)}</div>
    </div>
    <div class="card">
      <h3 style="margin-bottom:12px">⚡ Tezkor amallar</h3>
      <div style="display:flex;flex-direction:column;gap:9px">
        <a class="btn" href="/dashboard/broadcast" style="justify-content:flex-start">${ICONS.broadcast} Broadcast yuborish</a>
        <a class="btn" href="/dashboard/knowledge" style="justify-content:flex-start">${ICONS.knowledge} Bilim bazasini tahrirlash</a>
        <a class="btn" href="/dashboard/accounts" style="justify-content:flex-start">${ICONS.plus} Yangi akkaunt qo'shish</a>
        <a class="btn" href="/dashboard/contacts" style="justify-content:flex-start">${ICONS.contacts} Kontaktlarni ko'rish</a>
      </div>
      <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
        <h3 style="margin-bottom:10px">📱 Akkauntlar</h3>
        <div id="accounts"><div class="skeleton" style="height:44px"></div></div>
      </div>
    </div>
  </div>`;

  const script = `
const DAY_NAMES = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Shan"];

// B1: AI kunlik xulosa (serverda 1 soat kesh)
async function loadSummary() {
  try {
    const { text, digest, cachedAt } = await api("/api/summary");
    $("summaryText").textContent = text;
    const warn = digest && digest.needsHuman > 0;
    $("aiStatus").innerHTML = warn
      ? '<span class="ai-badge ai-warn"><span class="dot dot-amber"></span>E\\'tibor kerak</span>'
      : '<span class="ai-badge ai-ok"><span class="dot dot-green"></span>Hammasi ishlayapti</span>';
    $("summaryMeta").textContent = "✨ AI xulosa · yangilangan: " + fmt(cachedAt);
  } catch (e) {
    $("summaryText").textContent = "Xulosa hozircha tayyor emas — birinchi xabarlar kelganda paydo bo'ladi.";
    $("summaryMeta").textContent = "";
  }
}

const PERIOD_SUB = { today: "bugun, soatlar bo'yicha", "7d": "oxirgi 7 kun", "30d": "oxirgi 30 kun", all: "oxirgi 30 kun" };

async function loadStats() {
  try {
    const s = await api("/api/stats?period=" + PERIOD);
    $("chartSub").textContent = PERIOD_SUB[s.period] || "";
    // Grafik kartasi: davrdagi xabarlar + trend
    countUp($("todayNum"), s.messages ?? 0);
    $("msgTrend").innerHTML = trendBadge(s.trends && s.trends.messages);
    // Odam kerak
    countUp($("humanNum"), s.needsHuman || 0);
    $("humanCtx").textContent = s.needsHuman ? "javob kutmoqda" : "hammasi javoblangan";
    $("humanSpark").innerHTML = sparkline(s.sparks.human, "var(--warning)");
    // Akkauntlar
    countUp($("projNum"), s.projects);
    $("projCtx").textContent = "ulangan akkaunt";
    // Mijozlar (davrda faol; "hammasi"da jami)
    countUp($("contactNum"), s.contacts ?? 0);
    $("contactLbl").textContent = s.period === "all" ? "Jami mijozlar" : "Faol mijozlar";
    $("contactTrend").innerHTML = trendBadge(s.trends && s.trends.contacts);
    $("contactCtx").textContent = (s.contactsNew ?? 0) + " tasi yangi · jami " + (s.contactsTotal ?? 0);
    $("contactSpark").innerHTML = sparkline(s.sparks.active, "var(--accent-2)");
    // Xabarlar
    countUp($("msgNum"), s.messages ?? 0);
    $("msgTrend2").innerHTML = trendBadge(s.trends && s.trends.messages);
    $("msgCtx").textContent = "bugun " + (s.today ?? 0) + " ta";
    $("msgSpark").innerHTML = sparkline(s.sparks.msgs, "var(--accent-3)");
    if (s.needsHuman) $("humanCard").style.borderColor = "rgba(251,191,36,.45)";
    renderChart(s.series || [], s.period);
  } catch (e) {
    $("chart").classList.remove("skeleton");
    $("chart").innerHTML = emptyState("📈", "Statistika yuklanmadi: " + e.message);
  }
}

// Silliq gradient area-chart — sof SVG; davrga qarab soatlik yoki kunlik
function renderChart(series, period) {
  const el = $("chart");
  el.classList.remove("skeleton");
  const map = Object.fromEntries(series.map((w) => [String(w.x), w.n]));
  const days = [];
  if (period === "today") {
    for (let h = 0; h < 24; h++) {
      days.push({ key: h + ":00", label: h % 4 === 0 ? String(h) : "", n: map[String(h)] || 0, tip: h + ":00" });
    }
  } else {
    const nDays = period === "7d" ? 7 : 30;
    for (let i = nDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const label = nDays === 7 ? DAY_NAMES[d.getDay()] : (i % 5 === 0 ? String(d.getDate()) : "");
      days.push({ key, label, n: map[key] || 0, tip: nDays === 7 ? DAY_NAMES[d.getDay()] + " (" + key.slice(5) + ")" : key.slice(5) });
    }
  }
  const W = 560, H = 106, PX = 14, TOP = 12, BOT = 8;
  const max = Math.max(1, ...days.map((d) => d.n));
  const pts = days.map((d, i) => ({
    x: PX + (i * (W - 2 * PX)) / (days.length - 1),
    y: TOP + (1 - d.n / max) * (H - TOP - BOT),
  }));
  // Catmull-Rom → bezier (silliq chiziq)
  let line = "M " + pts[0].x + " " + pts[0].y;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    line += " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + ", " + c2x.toFixed(1) + " " + c2y.toFixed(1) + ", " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
  }
  const area = line + " L " + pts[pts.length - 1].x + " " + (H - BOT) + " L " + pts[0].x + " " + (H - BOT) + " Z";
  const last = pts[pts.length - 1];
  el.innerHTML = \`
  <svg viewBox="0 0 \${W} \${H}" width="100%" height="106" preserveAspectRatio="none" style="display:block;overflow:visible">
    <defs>
      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity=".30"/>
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#6366f1"/><stop offset="60%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#22d3ee"/>
      </linearGradient>
    </defs>
    <path d="\${area}" fill="url(#areaFill)"/>
    <path d="\${line}" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <line id="guide" x1="0" x2="0" y1="\${TOP}" y2="\${H - BOT}" style="opacity:0;stroke:var(--glass-border)"/>
    <circle id="hoverDot" r="4" fill="#fff" stroke="#8b5cf6" stroke-width="2" style="opacity:0"/>
    <circle cx="\${last.x}" cy="\${last.y}" r="4.5" fill="#22d3ee">
      <animate attributeName="opacity" values="1;.45;1" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="\${last.x}" cy="\${last.y}" r="4.5" fill="none" stroke="#22d3ee" stroke-width="1.5" opacity=".6">
      <animate attributeName="r" values="4.5;12" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".6;0" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    \${days.map((d, i) => \`<rect x="\${(pts[i].x - ((W - 2 * PX) / (days.length - 1)) / 2).toFixed(1)}" y="0" width="\${((W - 2 * PX) / (days.length - 1)).toFixed(1)}" height="\${H}" fill="transparent" data-di="\${i}"/>\`).join("")}
  </svg>
  <div style="display:flex;justify-content:space-between;padding:4px 4px 0" class="small">
    \${days.map((d, i) => \`<span style="color:\${i === days.length - 1 ? "var(--text)" : "var(--muted)"};font-weight:\${i === days.length - 1 ? "600" : "400"}">\${d.label}</span>\`).join("")}
  </div>\`;
  const svg = el.querySelector("svg");
  const tip = $("chartTip");
  svg.addEventListener("mousemove", (ev) => {
    const di = ev.target.dataset ? ev.target.dataset.di : null;
    if (di == null) return;
    const i = Number(di);
    const sx = el.getBoundingClientRect().width / W;
    tip.innerHTML = "<strong>" + days[i].n + " xabar</strong> · " + days[i].tip;
    tip.style.left = pts[i].x * sx + "px";
    tip.style.top = pts[i].y + "px";
    tip.classList.add("show");
    const g = svg.querySelector("#guide"); g.setAttribute("x1", pts[i].x); g.setAttribute("x2", pts[i].x); g.style.opacity = 1;
    const hd = svg.querySelector("#hoverDot"); hd.setAttribute("cx", pts[i].x); hd.setAttribute("cy", pts[i].y); hd.style.opacity = 1;
  });
  svg.addEventListener("mouseleave", () => {
    tip.classList.remove("show");
    svg.querySelector("#guide").style.opacity = 0;
    svg.querySelector("#hoverDot").style.opacity = 0;
  });
}
async function loadConversations() {
  try {
    const { contacts } = await api("/api/contacts");
    if (!contacts.length) { $("conversations").innerHTML = emptyState("💬", "Hali suhbatlar yo'q — bot birinchi xabarni kutmoqda"); return; }
    $("conversations").innerHTML = contacts.slice(0, 5).map((c) => \`
      <a href="/dashboard/inbox?contact=\${c.id}" style="display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:12px;transition:background .15s"
         onmouseover="this.style.background='var(--panel2)'" onmouseout="this.style.background=''">
        \${avatar(c.name || c.ig_user_id, 36)}
        <span style="min-width:0;flex:1">
          <span style="display:flex;align-items:center;gap:6px">
            <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(c.name || c.ig_user_id)}</strong>
            \${c.needs_human ? '<span class="badge b-amber">🙋 odam kerak</span>' : ""}
          </span>
          <span class="small muted" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(c.last_text || "")}</span>
        </span>
        <span class="small muted" style="flex-shrink:0">\${timeAgo(c.last_seen)}</span>
      </a>\`).join("");
  } catch (e) { $("conversations").innerHTML = emptyState("💬", "Suhbatlar yuklanmadi"); }
}
async function loadAccounts() {
  try {
    const { projects } = await api("/api/projects");
    if (!projects.length) { $("accounts").innerHTML = emptyState("📱", "Hali akkaunt yo'q"); return; }
    $("accounts").innerHTML = projects.map((p) => \`
      <div style="display:flex;align-items:center;gap:10px;padding:7px 4px">
        \${avatar(p.name, 32)}
        <span style="min-width:0;flex:1">
          <strong class="small" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(p.name)}</strong>
          <span class="small muted">\${p.contacts} mijoz · \${p.messages} xabar</span>
        </span>
        \${p.knowledge_base ? '<span class="badge b-green">✓</span>' : '<span class="badge b-gray">bo\\'sh</span>'}
      </div>\`).join("");
  } catch (e) { $("accounts").innerHTML = emptyState("📱", "Yuklanmadi"); }
}
// C1: Donut — suhbatlar holati (sof SVG, kutubxonasiz)
async function loadDonut() {
  try {
    const a = await api("/api/analytics?period=" + PERIOD);
    renderDonut(a.donut);
  } catch (e) {
    $("donut").classList.remove("skeleton");
    $("donut").innerHTML = emptyState("🍩", "Ma'lumot yig'ilmoqda...");
  }
}
function renderDonut(d) {
  const el = $("donut");
  el.classList.remove("skeleton");
  const items = [
    { label: "Javob berilgan", n: d.answered || 0, c: "var(--accent)" },
    { label: "Odam kerak", n: d.human || 0, c: "var(--warning)" },
    { label: "Bot pauzada", n: d.paused || 0, c: "var(--accent-3)" },
    { label: "Javobsiz", n: d.silent || 0, c: "var(--text-3)" },
  ];
  const total = items.reduce((s, x) => s + x.n, 0);
  if (!total) { el.innerHTML = emptyState("🍩", "Ma'lumot yig'ilmoqda — bu davrda suhbat yo'q"); return; }
  const R = 62, CX = 80, CY = 80, C2 = 2 * Math.PI * R;
  let off = 0;
  const segs = items.filter((x) => x.n).map((x) => {
    const frac = x.n / total;
    const dash = Math.max(frac * C2 - 2, 0.5);
    const seg = '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="none" style="stroke:' + x.c + '" stroke-width="20" stroke-linecap="butt"' +
      ' stroke-dasharray="' + dash.toFixed(1) + " " + (C2 - dash).toFixed(1) + '"' +
      ' stroke-dashoffset="' + (-off * C2).toFixed(1) + '" transform="rotate(-90 ' + CX + " " + CY + ')" class="donut-seg">' +
      "<title>" + x.label + ": " + x.n + "</title></circle>";
    off += frac;
    return seg;
  }).join("");
  el.innerHTML = '<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">' +
    '<svg viewBox="0 0 160 160" width="150" height="150" style="flex-shrink:0">' + segs +
    '<text x="80" y="78" text-anchor="middle" style="fill:var(--text-1);font-size:26px;font-weight:700">' + total + "</text>" +
    '<text x="80" y="98" text-anchor="middle" style="fill:var(--text-3);font-size:11px">suhbat</text></svg>' +
    '<div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:8px">' +
    items.map((x) => '<div style="display:flex;align-items:center;gap:8px" class="small">' +
      '<span class="dot" style="background:' + x.c + '"></span><span style="flex:1">' + x.label + "</span>" +
      "<strong>" + x.n + '</strong><span class="muted" style="min-width:36px;text-align:right">' +
      Math.round((x.n / total) * 100) + "%</span></div>").join("") +
    "</div></div>";
}

renderPeriodSeg($("periodSeg"), () => { loadStats(); loadDonut(); });
loadSummary(); loadStats(); loadDonut(); loadConversations(); loadAccounts();`;

  return renderLayout({
    title: "Boshqaruv",
    active: "dashboard",
    headerAction: `<a class="btn btn-primary" href="/dashboard/broadcast">${ICONS.broadcast} Broadcast</a>`,
    content,
    script,
  });
}
