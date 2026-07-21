// ============================================================
//  TEMPLATES.JS — Dashboard sahifalari (ko'p sahifali platforma)
//  Dizayn tizimi: BUGUN MEDIA brendi (ROADMAP-3 bo'yicha)
//  Har sahifa umumiy layout'dan foydalanadi (sidebar + kontent).
// ============================================================

export const APP_VERSION = "3.0.0";

// HTML uchun xavfsiz matn (XSS oldini olish)
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ------------------------------------------------------------
//  SVG ikonlar (sidebar va sahifalar uchun) — stroke: currentColor
// ------------------------------------------------------------
const I = (paths, vb = "0 0 24 24") =>
  `<svg class="ic" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  dashboard: I('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  inbox: I('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  contacts: I('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  broadcast: I('<path d="M3 11l18-7-7 18-2.5-7.5L3 11z"/>'),
  knowledge: I('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  accounts: I('<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>'),
  send: I('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  logout: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'),
  alert: I('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  check: I('<path d="M20 6L9 17l-5-5"/>'),
  trash: I('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  tag: I('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none"/>'),
  book: I('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
};

// ------------------------------------------------------------
//  Sidebar menyu bandlari
// ------------------------------------------------------------
const NAV_ITEMS = [
  { key: "dashboard", label: "Boshqaruv", href: "/dashboard", icon: "dashboard" },
  { key: "inbox", label: "Suhbatlar", href: "/dashboard/inbox", icon: "inbox" },
  { key: "contacts", label: "Kontaktlar", href: "/dashboard/contacts", icon: "contacts" },
  { key: "broadcast", label: "Broadcast", href: "/dashboard/broadcast", icon: "broadcast" },
  { key: "knowledge", label: "Bilim bazasi", href: "/dashboard/knowledge", icon: "knowledge" },
  { key: "accounts", label: "Akkauntlar", href: "/dashboard/accounts", icon: "accounts" },
  { key: "settings", label: "Sozlamalar", href: "/dashboard/settings", icon: "settings" },
];

// ------------------------------------------------------------
//  Umumiy CSS — dizayn tizimi (ranglar, komponentlar, layout)
// ------------------------------------------------------------
const BASE_CSS = `
:root {
  --bg: #0f1117; --panel: #1a1d27; --panel2: #232734;
  --accent: #6366f1; --accent2: #8b5cf6;
  --success: #22c55e; --warn: #f59e0b; --danger: #ef4444;
  --text: #f1f5f9; --muted: #94a3b8; --border: #2d3348;
  --grad: linear-gradient(135deg, #6366f1, #8b5cf6);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.55; }
a { color: inherit; text-decoration: none; }
button { font: inherit; }
h1 { font-size: 24px; font-weight: 700; }
h2 { font-size: 20px; font-weight: 600; }
h3 { font-size: 16px; font-weight: 600; }
small, .small { font-size: 12px; }
.muted { color: var(--muted); }
.ic { width: 19px; height: 19px; flex-shrink: 0; }

/* ---------- Layout ---------- */
.sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 240px; background: var(--panel); border-right: 1px solid var(--border); display: flex; flex-direction: column; z-index: 50; transition: transform .25s ease; }
.logo { padding: 20px; font-size: 17px; font-weight: 700; letter-spacing: -.2px; display: flex; align-items: center; gap: 8px; }
.logo .grad-text { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.nav { flex: 1; padding: 6px 12px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.nav a { display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 10px; color: var(--muted); font-weight: 500; transition: background .2s, color .2s; }
.nav a:hover { background: var(--panel2); color: var(--text); }
.nav a.active { background: linear-gradient(90deg, rgba(99,102,241,.95), rgba(139,92,246,.85)); color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,.3); }
.nav a .nav-count { margin-left: auto; }
.sidebar-foot { padding: 14px 20px; border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; display: flex; align-items: center; justify-content: space-between; }
.main { margin-left: 240px; min-height: 100vh; }
.content { max-width: 1160px; margin: 0 auto; padding: 24px 28px 56px; animation: fadeIn .35s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }

/* Mobil top-bar */
.topbar { display: none; position: sticky; top: 0; z-index: 40; background: rgba(15,17,23,.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--border); padding: 12px 16px; align-items: center; gap: 12px; }
.hamburger { background: none; border: none; color: var(--text); cursor: pointer; padding: 4px; display: flex; }
.hamburger .ic { width: 24px; height: 24px; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 45; opacity: 0; pointer-events: none; transition: opacity .25s; }
.overlay.show { opacity: 1; pointer-events: auto; }

/* ---------- Komponentlar ---------- */
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .2s, border-color .2s, box-shadow .2s; }
.card.hoverable:hover { transform: translateY(-2px); border-color: #3a4160; box-shadow: 0 6px 20px rgba(0,0,0,.35); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 16px; border-radius: 10px; border: 1px solid var(--border); background: var(--panel2); color: var(--text); font-weight: 500; cursor: pointer; transition: border-color .2s, filter .2s, background .2s; white-space: nowrap; }
.btn:hover { border-color: var(--accent); }
.btn .ic { width: 16px; height: 16px; }
.btn-primary { background: var(--grad); border: none; color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,.3); }
.btn-primary:hover { filter: brightness(1.12); }
.btn-danger { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.4); color: #f87171; }
.btn-danger:hover { border-color: var(--danger); background: rgba(239,68,68,.2); }
.btn-sm { padding: 6px 11px; font-size: 13px; border-radius: 8px; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.input { width: 100%; background: var(--panel2); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; color: var(--text); font: inherit; transition: border-color .2s; }
.input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.input::placeholder { color: #64748b; }
select.input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 34px; }
label.lbl { display: block; font-size: 13px; font-weight: 500; color: var(--muted); margin: 0 0 6px; }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.6; }
.b-indigo { background: rgba(99,102,241,.15); color: #a5b4fc; }
.b-green { background: rgba(34,197,94,.15); color: #4ade80; }
.b-amber { background: rgba(245,158,11,.15); color: #fbbf24; }
.b-red { background: rgba(239,68,68,.15); color: #f87171; }
.b-gray { background: rgba(148,163,184,.12); color: var(--muted); }
.avatar { width: 38px; height: 38px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; color: #fff; flex-shrink: 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot-green { background: var(--success); box-shadow: 0 0 6px rgba(34,197,94,.7); }
.dot-red { background: var(--danger); }
.dot-gray { background: #475569; }

/* Jadval */
.table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 16px; background: var(--panel); }
table.tbl { width: 100%; border-collapse: collapse; min-width: 640px; }
.tbl th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; border-bottom: 1px solid var(--border); background: rgba(35,39,52,.5); }
.tbl td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tbody tr { transition: background .15s; }
.tbl tbody tr:hover { background: rgba(35,39,52,.45); }

/* Modal */
.modal-back { position: fixed; inset: 0; background: rgba(0,0,0,.62); z-index: 100; display: none; align-items: center; justify-content: center; padding: 16px; }
.modal-back.show { display: flex; }
.modal { background: var(--panel); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 560px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; animation: fadeIn .22s ease; }
.modal-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-head h3 { font-size: 16px; }
.modal-x { background: none; border: none; color: var(--muted); font-size: 20px; line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 8px; }
.modal-x:hover { color: var(--text); background: var(--panel2); }
.modal-body { padding: 20px; overflow-y: auto; }

/* Toast */
#toasts { position: fixed; bottom: 20px; right: 20px; z-index: 200; display: flex; flex-direction: column; gap: 8px; }
.toast { background: var(--panel); border: 1px solid var(--border); border-left: 3px solid var(--success); border-radius: 12px; padding: 11px 16px; box-shadow: 0 8px 24px rgba(0,0,0,.4); font-size: 13px; animation: slideIn .25s ease; max-width: 320px; }
.toast.err { border-left-color: var(--danger); }
@keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }

/* Skeleton va bo'sh holat */
.skeleton { background: linear-gradient(90deg, var(--panel2) 25%, #2a2f3f 50%, var(--panel2) 75%); background-size: 200% 100%; animation: shimmer 1.3s infinite; border-radius: 10px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.empty { text-align: center; padding: 40px 20px; color: var(--muted); }
.empty .emoji { font-size: 34px; display: block; margin-bottom: 10px; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; vertical-align: -4px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Statistika kartalari */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.stat-card { display: flex; align-items: center; gap: 14px; }
.stat-ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-num { font-size: 26px; font-weight: 700; background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; line-height: 1.2; }
.stat-lbl { color: var(--muted); font-size: 12px; }

/* ---------- Mobil ---------- */
@media (max-width: 767px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.open { transform: none; box-shadow: 0 0 40px rgba(0,0,0,.6); }
  .main { margin-left: 0; }
  .topbar { display: flex; }
  .content { padding: 18px 16px 48px; }
  h1 { font-size: 21px; }
}
`;

// ------------------------------------------------------------
//  Umumiy JS yordamchilar (har sahifada mavjud)
// ------------------------------------------------------------
const BASE_JS = `
const $ = (id) => document.getElementById(id);
const esc = (s) => { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; };
const fmt = (d) => d ? new Date(d).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "hozirgina";
  if (s < 3600) return Math.floor(s / 60) + " daqiqa oldin";
  if (s < 86400) return Math.floor(s / 3600) + " soat oldin";
  if (s < 604800) return Math.floor(s / 86400) + " kun oldin";
  return new Date(d).toLocaleDateString("uz-UZ");
}
async function api(path, opts) {
  const r = await fetch(path, opts);
  if (!r.ok) { let m = "HTTP " + r.status; try { m = (await r.json()).error || m; } catch (e) {} throw new Error(m); }
  return r.json();
}
function postJson(path, body) {
  return api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
function toast(msg, ok = true) {
  const t = document.createElement("div");
  t.className = "toast" + (ok ? "" : " err");
  t.textContent = msg;
  $("toasts").appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 320); }, 3200);
}
function openModal(title, bodyHtml) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = bodyHtml;
  $("modalBack").classList.add("show");
}
function closeModal() { $("modalBack").classList.remove("show"); }
$("modalBack").addEventListener("click", (e) => { if (e.target === $("modalBack")) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
const AV_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#f43f5e","#84cc16"];
function avatar(name, size) {
  const n = String(name || "?");
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  const c = AV_COLORS[h % AV_COLORS.length];
  const st = size ? \`width:\${size}px;height:\${size}px;font-size:\${Math.round(size * .42)}px;\` : "";
  return \`<span class="avatar" style="background:\${c};\${st}">\${esc(n.trim().charAt(0).toUpperCase() || "?")}</span>\`;
}
function skeletonRows(n, h) {
  return Array.from({ length: n || 3 }, () => \`<div class="skeleton" style="height:\${h || 56}px;margin-bottom:10px;"></div>\`).join("");
}
function emptyState(emoji, text) {
  return \`<div class="empty"><span class="emoji">\${emoji}</span>\${esc(text)}</div>\`;
}
// Sidebar (mobil)
function toggleSidebar(open) {
  $("sidebar").classList.toggle("open", open);
  $("overlay").classList.toggle("show", open);
}
`;

// ------------------------------------------------------------
//  LAYOUT — barcha dashboard sahifalari uchun umumiy shablon
// ------------------------------------------------------------
export function renderLayout({ title, active, headerAction = "", content, script = "" }) {
  const nav = NAV_ITEMS.map(
    (n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}" data-nav="${n.key}">${ICONS[n.icon]}<span>${n.label}</span><span class="nav-count" data-navcount="${n.key}"></span></a>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Bugun Bot</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${BASE_CSS}</style>
</head>
<body>
  <aside class="sidebar" id="sidebar">
    <div class="logo">🤖 <span class="grad-text">BUGUN BOT</span></div>
    <nav class="nav">${nav}</nav>
    <div class="sidebar-foot">
      <span>v${APP_VERSION}</span>
      <a href="/" class="muted" title="Bosh sahifa">${ICONS.logout}</a>
    </div>
  </aside>
  <div class="overlay" id="overlay" onclick="toggleSidebar(false)"></div>

  <div class="main">
    <div class="topbar">
      <button class="hamburger" onclick="toggleSidebar(true)" aria-label="Menyu">${I('<path d="M3 6h18M3 12h18M3 18h18"/>')}</button>
      <strong>${esc(title)}</strong>
    </div>
    <div class="content">
      <div class="page-head">
        <h1>${esc(title)}</h1>
        <div>${headerAction}</div>
      </div>
      ${content}
    </div>
  </div>

  <div class="modal-back" id="modalBack">
    <div class="modal">
      <div class="modal-head"><h3 id="modalTitle"></h3><button class="modal-x" onclick="closeModal()">✕</button></div>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>
  <div id="toasts"></div>

  <script>${BASE_JS}
${script}</script>
</body>
</html>`;
}

// ------------------------------------------------------------
//  Vaqtinchalik sahifa (keyingi vazifalarda to'ldiriladi)
// ------------------------------------------------------------
function renderPlaceholder(title, active, emoji, note) {
  return renderLayout({
    title,
    active,
    content: `<div class="card"><div class="empty"><span class="emoji">${emoji}</span>${esc(note)}<br><span class="small muted">Bu sahifa tez orada tayyor bo'ladi.</span></div></div>`,
  });
}

// ============================================================
//  1. BOSHQARUV (Dashboard) — /dashboard
//  4 statistika kartasi + 7 kun grafigi + suhbatlar + tezkor amallar
// ============================================================
export function renderDashboardHome() {
  const content = `
  <div id="humanAlert"></div>

  <div class="stat-grid" id="cards">${'<div class="card skeleton" style="height:86px"></div>'.repeat(4)}</div>

  <div class="card" style="margin-top:18px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h3>📈 Oxirgi 7 kun faolligi</h3>
      <span class="small muted">xabarlar soni</span>
    </div>
    <div id="chart" class="skeleton" style="height:150px"></div>
  </div>

  <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px;margin-top:18px" class="two-col">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3>💬 Oxirgi suhbatlar</h3>
        <a href="/dashboard/inbox" class="small" style="color:#a5b4fc">Hammasi →</a>
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
  </div>
  <style>@media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } }</style>`;

  const script = `
const CHART_DAYS = 7;
const DAY_NAMES = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Shan"];

async function loadStats() {
  try {
    const s = await api("/api/stats");
    $("cards").innerHTML =
      statCard("📱", s.projects, "Akkauntlar", "rgba(99,102,241,.14)") +
      statCard("👥", s.contacts, "Jami mijozlar", "rgba(139,92,246,.14)") +
      statCard("💬", s.messages, "Jami xabarlar", "rgba(34,197,94,.12)") +
      statCard("🕒", s.today ?? 0, "Bugungi xabarlar", "rgba(245,158,11,.12)");
    renderChart(s.week || []);
    renderHumanAlert(s.needsHuman || 0);
  } catch (e) {
    $("cards").innerHTML = emptyState("📊", "Statistika yuklanmadi: " + e.message);
    $("chart").classList.remove("skeleton");
    $("chart").innerHTML = emptyState("📈", "Grafik mavjud emas");
  }
}
function statCard(emoji, num, label, bg) {
  return \`<div class="card stat-card hoverable">
    <div class="stat-ic" style="background:\${bg};font-size:20px">\${emoji}</div>
    <div><div class="stat-num">\${num}</div><div class="stat-lbl">\${label}</div></div></div>\`;
}
function renderHumanAlert(n) {
  if (!n) { $("humanAlert").innerHTML = ""; return; }
  $("humanAlert").innerHTML = \`
    <a href="/dashboard/inbox?filter=human" class="card hoverable" style="display:flex;align-items:center;gap:12px;margin-bottom:18px;border-color:rgba(245,158,11,.5);background:rgba(245,158,11,.07)">
      <span style="font-size:22px">🙋</span>
      <span style="flex:1"><strong style="color:#fbbf24">\${n} ta suhbat sizni kutmoqda</strong><br>
      <span class="small muted">Mijozlar jonli operator so'ragan — ko'rib chiqing</span></span>
      <span class="badge b-amber">Ko'rish →</span>
    </a>\`;
}
function renderChart(week) {
  const el = $("chart");
  el.classList.remove("skeleton");
  // Oxirgi 7 kunni to'ldiramiz (bo'sh kunlar 0)
  const map = Object.fromEntries(week.map((w) => [w.day, w.n]));
  const days = [];
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    days.push({ key, label: DAY_NAMES[d.getDay()], n: map[key] || 0, isToday: i === 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.n));
  el.innerHTML = \`<div style="display:flex;align-items:flex-end;gap:10px;height:150px">\` +
    days.map((d) => \`
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end" title="\${d.key}: \${d.n} xabar">
        <span class="small" style="color:\${d.n ? "#a5b4fc" : "var(--muted)"};font-weight:600">\${d.n || ""}</span>
        <div style="width:100%;max-width:46px;height:\${Math.max(4, Math.round((d.n / max) * 100))}px;border-radius:8px 8px 3px 3px;
          background:\${d.n ? "linear-gradient(180deg,#8b5cf6,#6366f1)" : "var(--panel2)"};
          transition:height .5s ease;box-shadow:\${d.n ? "0 4px 12px rgba(99,102,241,.25)" : "none"}"></div>
        <span class="small" style="color:\${d.isToday ? "var(--text)" : "var(--muted)"};font-weight:\${d.isToday ? "600" : "400"}">\${d.label}</span>
      </div>\`).join("") + \`</div>\`;
}
async function loadConversations() {
  try {
    const { contacts } = await api("/api/contacts");
    if (!contacts.length) { $("conversations").innerHTML = emptyState("💬", "Hali suhbatlar yo'q"); return; }
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
loadStats(); loadConversations(); loadAccounts();`;

  return renderLayout({
    title: "Boshqaruv",
    active: "dashboard",
    headerAction: `<a class="btn btn-primary" href="/dashboard/broadcast">${ICONS.broadcast} Broadcast</a>`,
    content,
    script,
  });
}

// ============================================================
//  Qolgan sahifalar — vaqtinchalik (vazifa 3-8'da to'ldiriladi)
// ============================================================
export function renderInboxPage() {
  return renderPlaceholder("Suhbatlar", "inbox", "💬", "Yagona inbox — barcha suhbatlar bir joyda.");
}
export function renderContactsPage() {
  return renderPlaceholder("Kontaktlar", "contacts", "👥", "Barcha mijozlar ro'yxati.");
}
export function renderBroadcastPage() {
  return renderPlaceholder("Broadcast", "broadcast", "📢", "Ommaviy xabar yuborish.");
}
export function renderKnowledgePage() {
  return renderPlaceholder("Bilim bazasi", "knowledge", "🧠", "Har akkaunt uchun biznes ma'lumotlari.");
}
export function renderAccountsPage() {
  return renderPlaceholder("Akkauntlar", "accounts", "📱", "Ulangan Instagram akkauntlar.");
}
export function renderSettingsPage() {
  return renderPlaceholder("Sozlamalar", "settings", "⚙️", "Bot va tizim sozlamalari.");
}
