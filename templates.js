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
// ============================================================
//  2. SUHBATLAR (Inbox) — /dashboard/inbox
//  Chap: suhbatlar ro'yxati (qidiruv + filtrlar). O'ng: to'liq chat.
// ============================================================
export function renderInboxPage() {
  const content = `
  <style>
    .inbox-wrap { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 170px); min-height: 460px; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; background: var(--panel); }
    .conv-list { border-right: 1px solid var(--border); display: flex; flex-direction: column; min-width: 0; }
    .conv-tools { padding: 12px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 9px; }
    .filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; background: var(--panel2); color: var(--muted); border: 1px solid var(--border); cursor: pointer; transition: all .18s; }
    .chip:hover { color: var(--text); }
    .chip.on { background: var(--grad); color: #fff; border-color: transparent; }
    .conv-items { flex: 1; overflow-y: auto; }
    .conv-item { display: flex; gap: 10px; padding: 11px 12px; cursor: pointer; border-left: 3px solid transparent; transition: background .15s; align-items: center; }
    .conv-item:hover { background: var(--panel2); }
    .conv-item.sel { background: rgba(99,102,241,.12); border-left-color: var(--accent); }
    .conv-item.human { border-left-color: var(--warn); }
    .conv-item.human.sel { border-left-color: var(--accent); }
    .chat-pane { display: flex; flex-direction: column; min-width: 0; background: var(--bg); }
    .chat-head { padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--panel); display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
    .chat-msgs { flex: 1; overflow-y: auto; padding: 18px 16px; display: flex; flex-direction: column; gap: 4px; }
    .bubble-row { display: flex; margin-bottom: 6px; }
    .bubble { max-width: 74%; padding: 9px 13px; border-radius: 16px; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
    .bubble .t { font-size: 10px; opacity: .6; margin-top: 3px; text-align: right; }
    .from-user { justify-content: flex-start; }
    .from-user .bubble { background: var(--panel2); border-bottom-left-radius: 5px; }
    .from-bot { justify-content: flex-end; }
    .from-bot .bubble { background: linear-gradient(135deg, #6366f1, #7c5ff0); color: #fff; border-bottom-right-radius: 5px; }
    .composer { padding: 12px; border-top: 1px solid var(--border); background: var(--panel); display: flex; gap: 9px; align-items: flex-end; }
    .composer textarea { resize: none; max-height: 120px; min-height: 42px; }
    .back-btn { display: none; }
    @media (max-width: 900px) {
      .inbox-wrap { grid-template-columns: 1fr; height: calc(100vh - 150px); }
      .chat-pane { display: none; }
      .inbox-wrap.chat-open .conv-list { display: none; }
      .inbox-wrap.chat-open .chat-pane { display: flex; }
      .back-btn { display: inline-flex; }
    }
  </style>

  <div class="inbox-wrap" id="inboxWrap">
    <div class="conv-list">
      <div class="conv-tools">
        <input class="input" id="search" placeholder="🔍 Qidirish (ism, xabar)..." oninput="renderList()">
        <div class="filters" id="filters"></div>
      </div>
      <div class="conv-items" id="convItems">${'<div class="skeleton" style="height:58px;margin:8px 10px"></div>'.repeat(5)}</div>
    </div>
    <div class="chat-pane" id="chatPane">
      <div id="chatEmpty" class="empty" style="margin:auto"><span class="emoji">💬</span>Suhbatni tanlang<br><span class="small muted">Chapdagi ro'yxatdan mijozni bosing</span></div>
      <div class="chat-head" id="chatHead" style="display:none"></div>
      <div class="chat-msgs" id="chatMsgs" style="display:none"></div>
      <div class="composer" id="composer" style="display:none">
        <textarea class="input" id="replyText" rows="1" placeholder="Qo'lda javob yozish... (bot o'rniga siz)"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendReply();}"></textarea>
        <button class="btn btn-primary" id="sendBtn" onclick="sendReply()">${ICONS.send} Yuborish</button>
      </div>
    </div>
  </div>`;

  const script = `
let CONTACTS = [];
let ALL_TAGS = [];
let FILTER = new URLSearchParams(location.search).get("filter") || "all";
let SELECTED = Number(new URLSearchParams(location.search).get("contact")) || null;
let CURRENT = null; // ochiq suhbat kontakti

async function loadData() {
  try {
    const [c, t] = await Promise.all([api("/api/contacts?limit=300"), api("/api/tags")]);
    CONTACTS = c.contacts; ALL_TAGS = t.tags || [];
    renderFilters(); renderList();
    if (SELECTED) openChat(SELECTED, true);
  } catch (e) {
    $("convItems").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message);
  }
}
function renderFilters() {
  const chips = [
    { k: "all", label: "Hammasi" },
    { k: "human", label: "🙋 Odam kerak" },
    ...ALL_TAGS.map((t) => ({ k: "tag:" + t, label: "🏷 " + t })),
  ];
  $("filters").innerHTML = chips.map((c) =>
    \`<button class="chip \${FILTER === c.k ? "on" : ""}" onclick="setFilter('\${esc(c.k).replace(/'/g, "\\\\'")}')">\${esc(c.label)}</button>\`
  ).join("");
}
function setFilter(k) { FILTER = k; renderFilters(); renderList(); }
function matchesFilter(c) {
  if (FILTER === "human") return c.needs_human;
  if (FILTER.startsWith("tag:")) return (c.tags || []).includes(FILTER.slice(4));
  return true;
}
function renderList() {
  const q = ($("search").value || "").toLowerCase().trim();
  const items = CONTACTS.filter(matchesFilter).filter((c) =>
    !q || String(c.name || "").toLowerCase().includes(q) ||
    String(c.ig_user_id).includes(q) || String(c.last_text || "").toLowerCase().includes(q)
  );
  if (!items.length) { $("convItems").innerHTML = emptyState("💬", q ? "Topilmadi" : "Hali suhbatlar yo'q"); return; }
  $("convItems").innerHTML = items.map((c) => \`
    <div class="conv-item \${c.needs_human ? "human" : ""} \${c.id === SELECTED ? "sel" : ""}" onclick="openChat(\${c.id})">
      \${avatar(c.name || c.ig_user_id, 40)}
      <div style="min-width:0;flex:1">
        <div style="display:flex;align-items:center;gap:6px">
          <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px">\${esc(c.name || c.ig_user_id)}</strong>
          \${c.needs_human ? '<span title="Odam kerak">🙋</span>' : ""}
        </div>
        <div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(c.last_text || "—")}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="small muted">\${timeAgo(c.last_seen)}</span>
        \${c.unread ? \`<span class="badge" style="background:var(--grad);color:#fff">\${c.unread}</span>\` : ""}
      </div>
    </div>\`).join("");
}

async function openChat(contactId, silent) {
  SELECTED = contactId;
  history.replaceState(null, "", "/dashboard/inbox?contact=" + contactId + (FILTER !== "all" ? "&filter=" + FILTER : ""));
  $("inboxWrap").classList.add("chat-open");
  $("chatEmpty").style.display = "none";
  ["chatHead", "chatMsgs"].forEach((id) => $(id).style.display = "");
  $("composer").style.display = "flex";
  if (!silent) renderList();
  $("chatMsgs").innerHTML = skeletonRows(4, 40);
  try {
    const { contact, messages } = await api("/api/conversation/" + contactId);
    CURRENT = contact;
    const local = CONTACTS.find((c) => c.id === contactId);
    if (local) { local.unread = 0; local.needs_human = contact.needs_human; }
    renderChatHead();
    renderMessages(messages);
    renderList();
  } catch (e) { $("chatMsgs").innerHTML = emptyState("⚠️", "Suhbat yuklanmadi: " + e.message); }
}
function renderChatHead() {
  const c = CURRENT;
  $("chatHead").innerHTML = \`
    <button class="btn btn-sm back-btn" onclick="closeChat()">←</button>
    \${avatar(c.name || c.ig_user_id, 36)}
    <div style="min-width:0;flex:1">
      <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
        <strong>\${esc(c.name || c.ig_user_id)}</strong>
        \${c.needs_human ? '<span class="badge b-amber">🙋 odam kerak</span>' : ""}
      </div>
      <div class="small muted" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        \${esc(c.project_name || "")} · ID: \${esc(c.ig_user_id)}
        <span id="tagBadges">\${(c.tags || []).map((t) => \`<span class="badge b-indigo">\${esc(t)}</span>\`).join(" ")}</span>
      </div>
    </div>
    <button class="btn btn-sm" onclick="openTagEditor()">🏷 Teg qo'shish</button>
    \${c.needs_human ? '<button class="btn btn-sm" onclick="resolveHuman()" title="Hal qilindi deb belgilash">✓ Hal qilindi</button>' : ""}\`;
}
function renderMessages(messages) {
  if (!messages.length) { $("chatMsgs").innerHTML = emptyState("💬", "Xabarlar yo'q"); return; }
  $("chatMsgs").innerHTML = messages.map((m) => \`
    <div class="bubble-row \${m.role === "assistant" ? "from-bot" : "from-user"}">
      <div class="bubble">\${esc(m.text)}<div class="t">\${fmt(m.created_at)}</div></div>
    </div>\`).join("");
  $("chatMsgs").scrollTop = $("chatMsgs").scrollHeight;
}
function closeChat() {
  $("inboxWrap").classList.remove("chat-open");
  SELECTED = null; CURRENT = null;
  history.replaceState(null, "", "/dashboard/inbox");
  renderList();
}

async function sendReply() {
  const text = $("replyText").value.trim();
  if (!text || !SELECTED) return;
  const btn = $("sendBtn");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    await postJson("/api/reply", { contactId: SELECTED, text });
    $("replyText").value = "";
    toast("Javob yuborildi ✓");
    const { contact, messages } = await api("/api/conversation/" + SELECTED);
    CURRENT = contact; renderChatHead(); renderMessages(messages);
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) { local.last_text = text; local.needs_human = false; }
    renderList();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false; btn.innerHTML = 'Yuborish';
}

async function resolveHuman() {
  try {
    await postJson("/api/contacts/" + SELECTED + "/needs-human", { value: false });
    CURRENT.needs_human = false;
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) local.needs_human = false;
    renderChatHead(); renderList();
    toast("Hal qilindi deb belgilandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}

function openTagEditor() {
  const tags = CURRENT.tags || [];
  openModal("Teglar — " + (CURRENT.name || CURRENT.ig_user_id), \`
    <div id="tagList" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      \${tags.length ? "" : '<span class="muted small">Hali teg yo\\'q</span>'}
      \${tags.map((t) => \`<span class="badge b-indigo" style="font-size:12px;padding:4px 11px">\${esc(t)}
        <button onclick="removeTag('\${esc(t).replace(/'/g, "\\\\'")}')" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 4px">✕</button></span>\`).join("")}
    </div>
    <div style="display:flex;gap:8px">
      <input class="input" id="newTag" placeholder="Yangi teg (masalan: VIP, qiziqqan)" list="tagSuggest"
        onkeydown="if(event.key==='Enter'){event.preventDefault();addTag();}">
      <datalist id="tagSuggest">\${ALL_TAGS.map((t) => \`<option value="\${esc(t)}">\`).join("")}</datalist>
      <button class="btn btn-primary" onclick="addTag()">Qo'shish</button>
    </div>\`);
}
async function saveTags(tags) {
  const r = await postJson("/api/contacts/" + SELECTED + "/tags", { tags });
  CURRENT.tags = r.tags;
  const local = CONTACTS.find((c) => c.id === SELECTED);
  if (local) local.tags = r.tags;
  r.tags.forEach((t) => { if (!ALL_TAGS.includes(t)) ALL_TAGS.push(t); });
  renderChatHead(); renderFilters(); renderList(); openTagEditor();
}
async function addTag() {
  const t = $("newTag").value.trim();
  if (!t) return;
  try { await saveTags([...(CURRENT.tags || []), t]); toast("Teg qo'shildi ✓"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
async function removeTag(t) {
  try { await saveTags((CURRENT.tags || []).filter((x) => x !== t)); toast("Teg o'chirildi"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}

// Yengil avto-yangilash: ro'yxat har 20 soniyada (ochiq suhbatga tegmaydi)
setInterval(async () => {
  try {
    const { contacts } = await api("/api/contacts?limit=300");
    const openUnread = SELECTED ? (CONTACTS.find((c) => c.id === SELECTED)?.unread || 0) : 0;
    CONTACTS = contacts;
    if (SELECTED) {
      const cur = CONTACTS.find((c) => c.id === SELECTED);
      if (cur && cur.unread > openUnread) {
        // Ochiq suhbatga yangi xabar keldi — chatni yangilaymiz
        const { contact, messages } = await api("/api/conversation/" + SELECTED);
        CURRENT = contact; renderChatHead(); renderMessages(messages);
        cur.unread = 0;
      } else if (cur) cur.unread = 0;
    }
    renderList();
  } catch (e) { /* jim — keyingi urinishda */ }
}, 20000);

loadData();`;

  return renderLayout({
    title: "Suhbatlar",
    active: "inbox",
    headerAction: `<a class="btn" href="/dashboard/contacts">${ICONS.contacts} Kontaktlar</a>`,
    content,
    script,
  });
}
// ============================================================
//  3. KONTAKTLAR — /dashboard/contacts
//  Jadval: avatar, ism/ID, akkaunt, teglar, xabarlar, faollik, amallar
// ============================================================
export function renderContactsPage() {
  const content = `
  <div class="card" style="padding:14px;margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    <input class="input" id="search" placeholder="🔍 Qidirish (ism yoki ID)..." style="flex:1;min-width:180px" oninput="renderTable()">
    <select class="input" id="tagFilter" style="width:auto;min-width:150px" onchange="renderTable()">
      <option value="">Barcha teglar</option>
    </select>
    <select class="input" id="accFilter" style="width:auto;min-width:150px" onchange="renderTable()">
      <option value="">Barcha akkauntlar</option>
    </select>
  </div>
  <div class="table-wrap">
    <table class="tbl">
      <thead><tr>
        <th>Mijoz</th><th>Akkaunt</th><th>Teglar</th>
        <th style="text-align:center">Xabarlar</th><th>Oxirgi faollik</th><th></th>
      </tr></thead>
      <tbody id="rows"><tr><td colspan="6">${'<div class="skeleton" style="height:44px;margin:6px 0"></div>'.repeat(4)}</td></tr></tbody>
    </table>
  </div>`;

  const script = `
let CONTACTS = [];
let ALL_TAGS = [];
let EDITING = null;

async function loadData() {
  try {
    const [c, t] = await Promise.all([api("/api/contacts?limit=300"), api("/api/tags")]);
    CONTACTS = c.contacts; ALL_TAGS = t.tags || [];
    fillFilters(); renderTable();
  } catch (e) {
    $("rows").innerHTML = \`<tr><td colspan="6">\${emptyState("⚠️", "Yuklashda xatolik: " + e.message)}</td></tr>\`;
  }
}
function fillFilters() {
  $("tagFilter").innerHTML = '<option value="">Barcha teglar</option>' +
    ALL_TAGS.map((t) => \`<option value="\${esc(t)}">\${esc(t)}</option>\`).join("");
  const accs = [...new Set(CONTACTS.map((c) => c.project_name).filter(Boolean))];
  $("accFilter").innerHTML = '<option value="">Barcha akkauntlar</option>' +
    accs.map((a) => \`<option value="\${esc(a)}">\${esc(a)}</option>\`).join("");
}
function filtered() {
  const q = ($("search").value || "").toLowerCase().trim();
  const tag = $("tagFilter").value;
  const acc = $("accFilter").value;
  return CONTACTS.filter((c) =>
    (!q || String(c.name || "").toLowerCase().includes(q) || String(c.ig_user_id).includes(q)) &&
    (!tag || (c.tags || []).includes(tag)) &&
    (!acc || c.project_name === acc)
  );
}
function renderTable() {
  const items = filtered();
  document.querySelector(".page-head h1").textContent = "Kontaktlar · " + CONTACTS.length + " ta";
  if (!items.length) {
    $("rows").innerHTML = \`<tr><td colspan="6">\${emptyState("👥", CONTACTS.length ? "Filtrga mos kontakt topilmadi" : "Hali kontaktlar yo'q — birinchi mijoz yozganda shu yerda ko'rinadi")}</td></tr>\`;
    return;
  }
  $("rows").innerHTML = items.map((c) => \`
    <tr>
      <td>
        <a href="/dashboard/inbox?contact=\${c.id}" style="display:flex;align-items:center;gap:10px">
          \${avatar(c.name || c.ig_user_id, 34)}
          <span style="min-width:0">
            <strong style="display:flex;align-items:center;gap:6px">\${esc(c.name || c.ig_user_id)}
              \${c.needs_human ? '<span title="Odam kerak">🙋</span>' : ""}
              \${c.unread ? \`<span class="badge" style="background:var(--grad);color:#fff">\${c.unread}</span>\` : ""}</strong>
            <span class="small muted">ID: \${esc(c.ig_user_id)}</span>
          </span>
        </a>
      </td>
      <td class="small muted">\${esc(c.project_name || "—")}</td>
      <td>
        <span style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
          \${(c.tags || []).map((t) => \`<span class="badge b-indigo">\${esc(t)}</span>\`).join("")}
          <button class="chip-add" onclick="openTagEditor(\${c.id})" title="Teg qo'shish/o'chirish"
            style="background:none;border:1px dashed var(--border);border-radius:999px;color:var(--muted);font-size:11px;padding:2px 8px;cursor:pointer">+ teg</button>
        </span>
      </td>
      <td style="text-align:center">\${c.msg_count}</td>
      <td class="small muted" title="\${fmt(c.last_seen)}">\${timeAgo(c.last_seen)}</td>
      <td><a class="btn btn-sm" href="/dashboard/inbox?contact=\${c.id}">💬 Suhbat</a></td>
    </tr>\`).join("");
}

function openTagEditor(contactId) {
  EDITING = CONTACTS.find((c) => c.id === contactId);
  if (!EDITING) return;
  const tags = EDITING.tags || [];
  openModal("Teglar — " + (EDITING.name || EDITING.ig_user_id), \`
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      \${tags.length ? "" : '<span class="muted small">Hali teg yo\\'q</span>'}
      \${tags.map((t) => \`<span class="badge b-indigo" style="font-size:12px;padding:4px 11px">\${esc(t)}
        <button onclick="removeTag('\${esc(t).replace(/'/g, "\\\\'")}')" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 4px">✕</button></span>\`).join("")}
    </div>
    <div style="display:flex;gap:8px">
      <input class="input" id="newTag" placeholder="Yangi teg (masalan: VIP)" list="tagSuggest"
        onkeydown="if(event.key==='Enter'){event.preventDefault();addTag();}">
      <datalist id="tagSuggest">\${ALL_TAGS.map((t) => \`<option value="\${esc(t)}">\`).join("")}</datalist>
      <button class="btn btn-primary" onclick="addTag()">Qo'shish</button>
    </div>\`);
}
async function saveTags(tags) {
  const r = await postJson("/api/contacts/" + EDITING.id + "/tags", { tags });
  EDITING.tags = r.tags;
  r.tags.forEach((t) => { if (!ALL_TAGS.includes(t)) ALL_TAGS.push(t); });
  fillFilters(); renderTable(); openTagEditor(EDITING.id);
}
async function addTag() {
  const t = $("newTag").value.trim();
  if (!t) return;
  try { await saveTags([...(EDITING.tags || []), t]); toast("Teg qo'shildi ✓"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
async function removeTag(t) {
  try { await saveTags((EDITING.tags || []).filter((x) => x !== t)); toast("Teg o'chirildi"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
loadData();`;

  return renderLayout({
    title: "Kontaktlar",
    active: "contacts",
    headerAction: `<a class="btn" href="/dashboard/inbox">${ICONS.inbox} Inbox</a>`,
    content,
    script,
  });
}
// ============================================================
//  4. BROADCAST — /dashboard/broadcast
//  Forma + oldindan ko'rish + 24 soat ogohlantirishi + progress + tarix
// ============================================================
export function renderBroadcastPage() {
  const content = `
  <div class="card" style="display:flex;gap:12px;align-items:flex-start;border-color:rgba(245,158,11,.45);background:rgba(245,158,11,.06);margin-bottom:18px">
    <span style="font-size:20px">⚠️</span>
    <div>
      <strong style="color:#fbbf24">Instagram 24 soat qoidasi</strong>
      <div class="small muted" style="margin-top:2px">Xabar faqat oxirgi 24 soat ichida sizga yozgan mijozlarga yuboriladi. Boshqalarga Instagram ruxsat bermaydi.</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px" class="two-col">
    <div class="card">
      <h3 style="margin-bottom:14px">📢 Yangi broadcast</h3>
      <label class="lbl">Akkaunt</label>
      <select class="input" id="account" onchange="updateCount()" style="margin-bottom:12px"></select>
      <label class="lbl">Auditoriya</label>
      <select class="input" id="audience" onchange="updateCount()" style="margin-bottom:12px">
        <option value="">Hammasi (24 soat ichida yozganlar)</option>
      </select>
      <label class="lbl">Xabar matni</label>
      <textarea class="input" id="message" rows="5" maxlength="900" placeholder="Salom! Sizga maxsus taklifimiz bor..." oninput="updatePreview()"></textarea>
      <div class="small muted" style="text-align:right;margin:4px 0 14px"><span id="charCount">0</span>/900</div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" id="sendBtn" onclick="confirmSend()">${ICONS.broadcast} Yuborish</button>
        <span class="small muted" id="countInfo"></span>
      </div>
      <div id="progressWrap" style="display:none;margin-top:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px" class="small">
          <span id="progressLabel">Yuborilmoqda...</span><span id="progressNums"></span>
        </div>
        <div style="height:10px;background:var(--panel2);border-radius:999px;overflow:hidden">
          <div id="progressBar" style="height:100%;width:0%;background:var(--grad);border-radius:999px;transition:width .4s"></div>
        </div>
        <div id="progressResult" class="small" style="margin-top:8px"></div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <h3 style="margin-bottom:12px">👁 Oldindan ko'rish</h3>
        <div style="background:var(--bg);border-radius:12px;padding:16px;min-height:90px;display:flex;justify-content:flex-end">
          <div id="preview" style="max-width:85%;padding:9px 13px;border-radius:16px;border-bottom-right-radius:5px;background:linear-gradient(135deg,#6366f1,#7c5ff0);color:#fff;font-size:14px;white-space:pre-wrap;word-break:break-word">
            <span class="muted" style="color:rgba(255,255,255,.65)">Xabar matni shu yerda ko'rinadi...</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">🕓 Oldingi broadcastlar</h3>
        <div id="history"><div class="skeleton" style="height:48px"></div></div>
      </div>
    </div>
  </div>
  <style>@media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } }</style>`;

  const script = `
let PROJECTS = [];
async function loadData() {
  try {
    const [p, t] = await Promise.all([api("/api/projects"), api("/api/tags")]);
    PROJECTS = p.projects;
    $("account").innerHTML = PROJECTS.length
      ? PROJECTS.map((x) => \`<option value="\${x.id}">\${esc(x.name)}</option>\`).join("")
      : '<option value="">Akkaunt yo\\'q</option>';
    $("audience").innerHTML = '<option value="">Hammasi (24 soat ichida yozganlar)</option>' +
      (t.tags || []).map((x) => \`<option value="\${esc(x)}">🏷 Teg: \${esc(x)}</option>\`).join("");
    updateCount();
  } catch (e) { toast("Yuklashda xatolik: " + e.message, false); }
  loadHistory();
}
async function loadHistory() {
  try {
    const { broadcasts } = await api("/api/broadcasts");
    if (!broadcasts.length) { $("history").innerHTML = emptyState("📢", "Hali broadcast yo'q"); return; }
    $("history").innerHTML = broadcasts.map((b) => \`
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <strong class="small">\${esc(b.project_name || "—")}</strong>
          <span class="small muted">\${timeAgo(b.created_at)}</span>
        </div>
        <div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:3px 0">\${esc(b.message)}</div>
        <div style="display:flex;gap:6px">
          <span class="badge b-gray">\${esc(b.audience)}</span>
          <span class="badge b-green">✓ \${b.sent}/\${b.total}</span>
          \${b.failed ? \`<span class="badge b-red">✕ \${b.failed}</span>\` : ""}
        </div>
      </div>\`).join("");
  } catch (e) { $("history").innerHTML = emptyState("📢", "Tarix yuklanmadi"); }
}
let COUNT = 0;
async function updateCount() {
  const pid = $("account").value;
  if (!pid) { $("countInfo").textContent = ""; return; }
  $("countInfo").innerHTML = '<span class="spinner" style="width:13px;height:13px"></span> hisoblanmoqda...';
  try {
    const tag = $("audience").value;
    const { count } = await api("/api/broadcast/recipients?projectId=" + pid + (tag ? "&tag=" + encodeURIComponent(tag) : ""));
    COUNT = count;
    $("countInfo").innerHTML = count
      ? \`<strong style="color:#4ade80">\${count} ta mijozga</strong> yuboriladi\`
      : '<span style="color:var(--warn)">Hozircha mos mijoz yo\\'q (24 soat qoidasi)</span>';
  } catch (e) { $("countInfo").textContent = ""; }
}
function updatePreview() {
  const v = $("message").value;
  $("charCount").textContent = v.length;
  $("preview").innerHTML = v ? esc(v) : '<span style="color:rgba(255,255,255,.65)">Xabar matni shu yerda ko\\'rinadi...</span>';
}
function confirmSend() {
  const msg = $("message").value.trim();
  if (!$("account").value) return toast("Akkaunt tanlang", false);
  if (!msg) return toast("Xabar matnini yozing", false);
  if (!COUNT) return toast("Yuborish uchun mijoz yo'q (24 soat qoidasi)", false);
  openModal("Tasdiqlash", \`
    <p style="margin-bottom:8px"><strong>\${COUNT} ta mijozga</strong> quyidagi xabar yuboriladi:</p>
    <div style="background:var(--panel2);border-radius:12px;padding:12px;margin-bottom:16px;white-space:pre-wrap;font-size:13px">\${esc(msg)}</div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Bekor qilish</button>
      <button class="btn btn-primary" onclick="closeModal();doSend()">Ha, yuborish</button>
    </div>\`);
}
async function doSend() {
  const btn = $("sendBtn");
  btn.disabled = true;
  $("progressWrap").style.display = "";
  $("progressResult").textContent = "";
  $("progressBar").style.width = "0%";
  $("progressLabel").textContent = "Yuborilmoqda...";
  try {
    const { jobId, total } = await postJson("/api/broadcast", {
      projectId: Number($("account").value),
      tag: $("audience").value || null,
      message: $("message").value.trim(),
    });
    $("progressNums").textContent = "0/" + total;
    const timer = setInterval(async () => {
      try {
        const j = await api("/api/broadcast/status/" + jobId);
        const donePct = Math.round(((j.sent + j.failed) / j.total) * 100);
        $("progressBar").style.width = donePct + "%";
        $("progressNums").textContent = (j.sent + j.failed) + "/" + j.total;
        if (j.done) {
          clearInterval(timer);
          $("progressLabel").textContent = "Tugadi ✓";
          $("progressResult").innerHTML =
            \`<span style="color:#4ade80">✓ \${j.sent} ta yuborildi</span>\` +
            (j.failed ? \` · <span style="color:#f87171">✕ \${j.failed} ta xato</span>\` : "");
          toast("Broadcast tugadi: " + j.sent + "/" + j.total + " yuborildi ✓");
          btn.disabled = false;
          $("message").value = ""; updatePreview();
          loadHistory(); updateCount();
        }
      } catch (e) { clearInterval(timer); btn.disabled = false; }
    }, 1000);
  } catch (e) {
    toast("Xatolik: " + e.message, false);
    $("progressWrap").style.display = "none";
    btn.disabled = false;
  }
}
loadData();`;

  return renderLayout({
    title: "Broadcast",
    active: "broadcast",
    headerAction: "",
    content,
    script,
  });
}
// ============================================================
//  5. BILIM BAZASI — /dashboard/knowledge
//  Akkaunt kartalari → katta tahrirlash ko'rinishi + shablon
// ============================================================
export function renderKnowledgePage() {
  const content = `
  <div id="listView">
    <p class="muted" style="margin-bottom:16px">Har akkaunt uchun biznes ma'lumotlari — bot mijozlarga shu ma'lumot asosida javob beradi.</p>
    <div id="cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
      ${'<div class="card skeleton" style="height:130px"></div>'.repeat(3)}
    </div>
  </div>

  <div id="editView" style="display:none">
    <button class="btn btn-sm" onclick="backToList()" style="margin-bottom:14px">← Orqaga</button>
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <h3 id="editTitle" style="flex:1"></h3>
        <button class="btn btn-sm" onclick="insertTemplate()">📋 Shablon qo'yish</button>
      </div>
      <p class="small muted" style="margin-bottom:10px">
        Nima yozish kerak: <strong>xizmatlar, narxlar, aloqa ma'lumotlari, ish vaqti, manzil, FAQ</strong>.
        Bot faqat shu yerda yozilgan ma'lumotdan foydalanadi — qanchalik to'liq bo'lsa, javoblar shunchalik aniq.
      </p>
      <textarea class="input" id="kbText" rows="18" style="font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.6" placeholder="BIZ HAQIMIZDA:\n..."></textarea>
      <div style="display:flex;align-items:center;gap:12px;margin-top:14px">
        <button class="btn btn-primary" id="saveBtn" onclick="saveKb()">${ICONS.check} Saqlash</button>
        <span class="small muted"><span id="kbChars">0</span> belgi</span>
      </div>
    </div>
  </div>`;

  const script = `
const TEMPLATE = [
  "BIZ HAQIMIZDA:",
  "(Biznes nomi, nima bilan shug'ullanadi, necha yildan beri, nimasi bilan ajralib turadi)",
  "",
  "XIZMATLAR / MAHSULOTLAR:",
  "1. (Xizmat nomi) — (qisqa tavsif)",
  "2. ...",
  "",
  "NARXLAR:",
  "- (Xizmat): (narx yoki narx oralig'i)",
  "- Chegirmalar: ...",
  "",
  "ALOQA:",
  "- Telefon: ",
  "- Telegram: ",
  "- Manzil: ",
  "- Ish vaqti: Dush-Shan 9:00-18:00",
  "",
  "FAQ (ko'p so'raladigan savollar):",
  "S: (Savol)?",
  "J: (Javob)",
].join("\\n");

let PROJECTS = [];
let CURRENT_ID = null;

async function loadCards() {
  try {
    const { projects } = await api("/api/projects");
    PROJECTS = projects;
    if (!projects.length) { $("cards").innerHTML = emptyState("📱", "Hali akkaunt yo'q — avval akkaunt qo'shing"); return; }
    $("cards").innerHTML = projects.map((p) => {
      const len = (p.knowledge_base || "").length;
      return \`
      <div class="card hoverable" style="cursor:pointer" onclick="openEditor(\${p.id})">
        <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px">
          \${avatar(p.name, 38)}
          <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(p.name)}</strong>
        </div>
        \${len
          ? \`<span class="badge b-green">To'ldirilgan ✅</span> <span class="small muted" style="margin-left:6px">\${len} belgi</span>\`
          : '<span class="badge b-amber">Bo\\'sh ⚠️</span> <span class="small muted" style="margin-left:6px">bot umumiy javob beradi</span>'}
        <div class="small muted" style="margin-top:10px;height:38px;overflow:hidden;\${len ? "" : "font-style:italic"}">\${len ? esc((p.knowledge_base || "").slice(0, 110)) + "…" : "Bosib to'ldiring — bot aqlliroq bo'ladi"}</div>
      </div>\`;
    }).join("");
  } catch (e) { $("cards").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message); }
}
async function openEditor(id) {
  CURRENT_ID = id;
  const p = PROJECTS.find((x) => x.id === id);
  $("editTitle").textContent = "🧠 " + (p ? p.name : "Akkaunt");
  $("listView").style.display = "none";
  $("editView").style.display = "";
  $("kbText").value = ""; updateChars();
  try {
    const { knowledge } = await api("/api/knowledge/" + id);
    $("kbText").value = knowledge || "";
    updateChars();
  } catch (e) { toast("Yuklashda xatolik: " + e.message, false); }
}
function backToList() {
  $("editView").style.display = "none";
  $("listView").style.display = "";
  loadCards();
}
function updateChars() { $("kbChars").textContent = $("kbText").value.length; }
$("kbText").addEventListener("input", updateChars);
function insertTemplate() {
  const cur = $("kbText").value.trim();
  if (cur && !confirm("Matn bor — shablon oxiriga qo'shilsinmi?")) return;
  $("kbText").value = cur ? cur + "\\n\\n" + TEMPLATE : TEMPLATE;
  updateChars();
  toast("Shablon qo'yildi — o'z ma'lumotlaringiz bilan to'ldiring");
}
async function saveKb() {
  const btn = $("saveBtn");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saqlanmoqda...';
  try {
    await postJson("/api/knowledge/" + CURRENT_ID, { knowledge: $("kbText").value });
    toast("Bilim bazasi saqlandi ✓");
    const p = PROJECTS.find((x) => x.id === CURRENT_ID);
    if (p) p.knowledge_base = $("kbText").value;
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false; btn.innerHTML = "Saqlash";
}
loadCards();`;

  return renderLayout({
    title: "Bilim bazasi",
    active: "knowledge",
    headerAction: `<a class="btn" href="/dashboard/accounts">${ICONS.accounts} Akkauntlar</a>`,
    content,
    script,
  });
}
// ============================================================
//  6. AKKAUNTLAR — /dashboard/accounts
//  Kartalar + yangi akkaunt qo'shish modali (yo'riqnoma bilan)
// ============================================================
export function renderAccountsPage() {
  const content = `
  <div id="cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
    ${'<div class="card skeleton" style="height:150px"></div>'.repeat(2)}
  </div>`;

  const script = `
let PROJECTS = [];
async function loadAccounts() {
  try {
    const { projects } = await api("/api/projects");
    PROJECTS = projects;
    if (!projects.length) {
      $("cards").innerHTML = \`<div class="card" style="grid-column:1/-1">\${emptyState("📱", "Hali akkaunt yo'q — birinchisini qo'shing")}</div>\`;
      return;
    }
    $("cards").innerHTML = projects.map((p) => \`
      <div class="card hoverable">
        <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px">
          <div class="stat-ic" style="background:linear-gradient(135deg,#f43f5e,#8b5cf6);font-size:19px">📸</div>
          <div style="min-width:0;flex:1">
            <strong style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(p.name)}</strong>
            <span class="small muted">ID: \${esc(p.ig_account_id || "asosiy loyiha")}</span>
          </div>
          <span title="\${p.active ? "Faol — token bor" : "Nofaol — token yo'q"}" style="display:flex;align-items:center;gap:5px" class="small \${p.active ? "" : "muted"}">
            <span class="dot \${p.active ? "dot-green" : "dot-red"}"></span>\${p.active ? "faol" : "nofaol"}
          </span>
        </div>
        <div style="display:flex;gap:14px;margin-bottom:14px" class="small muted">
          <span>👥 \${p.contacts} mijoz</span>
          <span>💬 \${p.messages} xabar</span>
          <span>\${p.knowledge_base ? '🧠 <span style="color:#4ade80">bor</span>' : '🧠 bo\\'sh'}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn btn-sm" href="/dashboard/knowledge">🧠 Bilim bazasi</a>
          <button class="btn btn-sm btn-danger" onclick="confirmDelete(\${p.id})">🗑 O'chirish</button>
        </div>
      </div>\`).join("");
  } catch (e) { $("cards").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message); }
}

function addAccountModal() {
  openModal("Yangi Instagram akkaunt", \`
    <div class="card" style="padding:12px;background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.35);margin-bottom:14px">
      <strong class="small">📖 Token qanday olinadi?</strong>
      <ol class="small muted" style="margin:6px 0 0 18px;line-height:1.8">
        <li><a href="https://developers.facebook.com" target="_blank" style="color:#a5b4fc">developers.facebook.com</a> — ilovangizni oching</li>
        <li>Instagram → API setup with Instagram login</li>
        <li>Akkauntni ulang va <strong>Access token</strong> generatsiya qiling</li>
        <li>Shu sahifadagi <strong>Instagram account ID</strong> ni ham nusxalang</li>
        <li>Webhooks bo'limida <code>messages</code> va <code>comments</code> obunasini yoqing</li>
      </ol>
    </div>
    <label class="lbl">Akkaunt nomi</label>
    <input class="input" id="acName" placeholder="Masalan: Ikkinchi biznes" style="margin-bottom:12px">
    <label class="lbl">Instagram akkaunt IDsi</label>
    <input class="input" id="acId" placeholder="17841..." style="margin-bottom:12px">
    <label class="lbl">Access token</label>
    <input class="input" id="acToken" placeholder="IGAA..." style="margin-bottom:16px">
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Bekor qilish</button>
      <button class="btn btn-primary" id="acBtn" onclick="submitAccount()">${ICONS.plus} Qo'shish</button>
    </div>\`);
}
async function submitAccount() {
  const name = $("acName").value.trim();
  const ig_account_id = $("acId").value.trim();
  const token = $("acToken").value.trim();
  if (!ig_account_id || !token) return toast("ID va token majburiy", false);
  const btn = $("acBtn");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    await postJson("/api/accounts", { name, ig_account_id, token });
    toast("Akkaunt qo'shildi ✓");
    closeModal(); loadAccounts();
  } catch (e) { toast("Xatolik: " + e.message, false); btn.disabled = false; btn.textContent = "Qo'shish"; }
}
function confirmDelete(id) {
  const p = PROJECTS.find((x) => x.id === id);
  openModal("Akkauntni o'chirish", \`
    <p style="margin-bottom:8px"><strong>\${esc(p?.name || "")}</strong> o'chirilsinmi?</p>
    <p class="small" style="color:#f87171;margin-bottom:16px">⚠️ Diqqat: bu akkauntning barcha mijozlari (\${p?.contacts ?? 0}) va xabarlari (\${p?.messages ?? 0}) ham butunlay o'chadi. Bu amalni qaytarib bo'lmaydi!</p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Bekor qilish</button>
      <button class="btn btn-danger" onclick="doDelete(\${id})">Ha, o'chirish</button>
    </div>\`);
}
async function doDelete(id) {
  try {
    await api("/api/accounts/" + id, { method: "DELETE" });
    toast("Akkaunt o'chirildi");
    closeModal(); loadAccounts();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadAccounts();`;

  return renderLayout({
    title: "Akkauntlar",
    active: "accounts",
    headerAction: `<button class="btn btn-primary" onclick="addAccountModal()">${ICONS.plus} Yangi akkaunt</button>`,
    content,
    script,
  });
}
export function renderSettingsPage() {
  return renderPlaceholder("Sozlamalar", "settings", "⚙️", "Bot va tizim sozlamalari.");
}
