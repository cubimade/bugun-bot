// ============================================================
//  TEMPLATES.JS — Dashboard sahifalari (ko'p sahifali platforma)
//  Dizayn tizimi: BUGUN MEDIA brendi (ROADMAP-3 bo'yicha)
//  Har sahifa umumiy layout'dan foydalanadi (sidebar + kontent).
// ============================================================

export const APP_VERSION = "4.0.0";

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
  insights: I('<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>'),
  sparkle: I('<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>'),
};

// ------------------------------------------------------------
//  Sidebar menyu bandlari
// ------------------------------------------------------------
const NAV_ITEMS = [
  { key: "dashboard", label: "Boshqaruv", href: "/dashboard", icon: "dashboard" },
  { key: "inbox", label: "Suhbatlar", href: "/dashboard/inbox", icon: "inbox" },
  { key: "contacts", label: "Kontaktlar", href: "/dashboard/contacts", icon: "contacts" },
  { key: "insights", label: "Tahlil", href: "/dashboard/insights", icon: "insights" },
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
  /* --- Dizayn tizimi v2 (Premium 2026) --- */
  --bg-base: #0a0b10;
  --bg-surface: #12141c;
  --bg-panel: rgba(255,255,255,0.03);
  --bg-panel-hover: rgba(255,255,255,0.06);
  --border-subtle: rgba(255,255,255,0.08);
  --border-glow: rgba(99,102,241,0.35);
  --accent: #6366f1;
  --accent-2: #8b5cf6;
  --accent-3: #22d3ee;
  --gradient-brand: linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #d946ef 100%);
  --gradient-aurora: radial-gradient(60% 50% at 20% 10%, rgba(99,102,241,.14) 0%, transparent 60%),
                     radial-gradient(50% 40% at 85% 20%, rgba(217,70,239,.10) 0%, transparent 60%),
                     radial-gradient(40% 40% at 60% 90%, rgba(34,211,238,.08) 0%, transparent 60%);
  --success: #34d399; --warning: #fbbf24; --danger: #f87171;
  --text-primary: #f4f5f7; --text-secondary: #9ca3b8; --text-muted: #6b7280;
  /* v1 nom aliaslari — sahifalar ichida ishlatiladi */
  --bg: var(--bg-base); --panel: var(--bg-panel); --panel2: rgba(255,255,255,0.05);
  --accent2: var(--accent-2); --warn: var(--warning);
  --text: var(--text-primary); --muted: var(--text-secondary); --border: var(--border-subtle);
  --grad: var(--gradient-brand);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { background: var(--bg-base); background-image: var(--gradient-aurora); background-attachment: fixed; background-size: 160% 160%; color: var(--text-primary); font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.55; animation: aurora 30s ease-in-out infinite alternate; }
@keyframes aurora { from { background-position: 0% 0%; } to { background-position: 100% 100%; } }
@media (prefers-reduced-motion: reduce) { body { animation: none; } * { transition-duration: .01ms !important; animation-duration: .01ms !important; } }
a { color: inherit; text-decoration: none; }
button { font: inherit; }
h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
h3 { font-size: 17px; font-weight: 600; letter-spacing: -0.02em; }
small, .small { font-size: 12px; }
.muted { color: var(--text-secondary); }
.ic { width: 19px; height: 19px; flex-shrink: 0; }
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,.10); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.18); border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-track { background: transparent; }
::selection { background: rgba(99,102,241,.35); }

/* ---------- Layout ---------- */
.sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 240px; background: rgba(18,20,28,.72); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-right: 1px solid var(--border-subtle); display: flex; flex-direction: column; z-index: 50; transition: transform .25s ease; }
.logo { padding: 22px 20px 18px; font-size: 17px; font-weight: 700; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; }
.logo .grad-text, .grad-text { background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; color: transparent; }
.nav { flex: 1; padding: 6px 12px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.nav a { position: relative; display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 10px; color: var(--text-secondary); font-weight: 500; transition: background .18s ease, color .18s ease; }
.nav a:hover { background: var(--bg-panel-hover); color: var(--text-primary); }
.nav a.active { background: rgba(99,102,241,.10); color: var(--text-primary); }
.nav a.active::before { content: ""; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--gradient-brand); }
.nav a.active .ic { color: #a5b4fc; }
.nav a .nav-count { margin-left: auto; }
.sidebar-foot { padding: 14px 20px; border-top: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: 12px; display: flex; align-items: center; justify-content: space-between; }
.main { margin-left: 240px; min-height: 100vh; }
.content { max-width: 1160px; margin: 0 auto; padding: 26px 28px 56px; animation: pageIn .3s ease; }
@keyframes pageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }

/* Mobil top-bar */
.topbar { display: none; position: sticky; top: 0; z-index: 40; background: rgba(10,11,16,.82); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid var(--border-subtle); padding: 12px 16px; align-items: center; gap: 12px; }
.hamburger { background: none; border: none; color: var(--text-primary); cursor: pointer; padding: 4px; display: flex; }
.hamburger .ic { width: 24px; height: 24px; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 45; opacity: 0; pointer-events: none; transition: opacity .25s; }
.overlay.show { opacity: 1; pointer-events: auto; }

/* ---------- Komponentlar (glassmorphism) ---------- */
.card { position: relative; background: var(--bg-panel); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease; }
.card.hoverable:hover { transform: translateY(-2px); border-color: var(--border-glow); background: var(--bg-panel-hover); box-shadow: 0 10px 30px rgba(0,0,0,.35), 0 0 0 1px rgba(99,102,241,.08); }
.card.glow::before { content: ""; position: absolute; top: 0; left: 14px; right: 14px; height: 1px; border-radius: 999px; background: linear-gradient(90deg, transparent, rgba(139,92,246,.65), rgba(34,211,238,.45), transparent); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 16px; border-radius: 10px; border: 1px solid var(--border-subtle); background: rgba(255,255,255,.04); color: var(--text-primary); font-weight: 500; cursor: pointer; transition: border-color .18s ease, filter .18s ease, background .18s ease, transform .18s ease; white-space: nowrap; }
.btn:hover { border-color: var(--border-glow); background: var(--bg-panel-hover); transform: scale(1.02); }
.btn:active { transform: scale(0.98); }
.btn .ic { width: 16px; height: 16px; }
.btn-primary { background: var(--gradient-brand); border: none; color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,.35); }
.btn-primary:hover { filter: brightness(1.1); }
.btn-danger { background: rgba(248,113,113,.10); border-color: rgba(248,113,113,.35); color: var(--danger); }
.btn-danger:hover { border-color: var(--danger); background: rgba(248,113,113,.18); }
.btn-sm { padding: 6px 11px; font-size: 13px; border-radius: 8px; }
.btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.input { width: 100%; background: rgba(255,255,255,.04); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 9px 12px; color: var(--text-primary); font: inherit; transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
.input:focus { outline: none; border-color: var(--accent); background: rgba(255,255,255,.05); box-shadow: 0 0 0 3px rgba(99,102,241,.16); }
.input::placeholder { color: var(--text-muted); }
select.input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 34px; }
select.input option { background: var(--bg-surface); color: var(--text-primary); }
label.lbl { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin: 0 0 6px; }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.6; }
.b-indigo { background: rgba(99,102,241,.15); color: #a5b4fc; }
.b-green { background: rgba(52,211,153,.14); color: var(--success); }
.b-amber { background: rgba(251,191,36,.14); color: var(--warning); }
.b-red { background: rgba(248,113,113,.14); color: var(--danger); }
.b-cyan { background: rgba(34,211,238,.13); color: var(--accent-3); }
.b-gray { background: rgba(156,163,184,.12); color: var(--text-secondary); }
.avatar { width: 38px; height: 38px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; color: #fff; flex-shrink: 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot-green { background: var(--success); box-shadow: 0 0 8px rgba(52,211,153,.7); }
.dot-amber { background: var(--warning); box-shadow: 0 0 8px rgba(251,191,36,.6); }
.dot-red { background: var(--danger); }
.dot-gray { background: #475569; }

/* Jadval */
.table-wrap { overflow-x: auto; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--bg-panel); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
table.tbl { width: 100%; border-collapse: collapse; min-width: 640px; }
.tbl th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .4px; border-bottom: 1px solid var(--border-subtle); background: rgba(255,255,255,.02); }
.tbl td { padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tbody tr { transition: background .15s; }
.tbl tbody tr:hover { background: rgba(255,255,255,.03); }

/* Modal */
.modal-back { position: fixed; inset: 0; background: rgba(4,5,10,.66); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 100; display: none; align-items: center; justify-content: center; padding: 16px; }
.modal-back.show { display: flex; }
.modal { background: rgba(18,20,28,.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--border-subtle); border-radius: 16px; width: 100%; max-width: 560px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; animation: fadeIn .22s ease; box-shadow: 0 24px 60px rgba(0,0,0,.5); }
.modal-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); }
.modal-head h3 { font-size: 16px; }
.modal-x { background: none; border: none; color: var(--text-secondary); font-size: 20px; line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 8px; transition: color .18s ease, background .18s ease; }
.modal-x:hover { color: var(--text-primary); background: var(--bg-panel-hover); }
.modal-body { padding: 20px; overflow-y: auto; }

/* Toast — o'ng yuqoridan kirib, 3s dan keyin chiqadi */
#toasts { position: fixed; top: 20px; right: 20px; z-index: 200; display: flex; flex-direction: column; gap: 8px; }
.toast { background: rgba(18,20,28,.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-left: 3px solid var(--success); border-radius: 12px; padding: 11px 16px; box-shadow: 0 12px 32px rgba(0,0,0,.45); font-size: 13px; animation: toastIn .3s cubic-bezier(.21,1.02,.73,1); max-width: 320px; }
.toast.err { border-left-color: var(--danger); }
@keyframes toastIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }

/* Skeleton va bo'sh holat */
.skeleton { background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.04) 75%); background-size: 200% 100%; animation: shimmer 1.3s infinite; border-radius: 10px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.empty { text-align: center; padding: 40px 20px; color: var(--text-secondary); }
.empty .emoji { font-size: 36px; display: block; margin-bottom: 10px; filter: saturate(.85); }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; vertical-align: -4px; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulseDot { 0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,.5); } 50% { box-shadow: 0 0 0 7px rgba(34,211,238,0); } }

/* Statistika kartalari */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.stat-card { display: flex; align-items: center; gap: 14px; }
.stat-ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-num { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; color: transparent; line-height: 1.15; font-variant-numeric: tabular-nums; }
.stat-lbl { color: var(--text-secondary); font-size: 12px; }

/* ---------- Mobil ---------- */
@media (max-width: 767px) {
  .sidebar { transform: translateX(-100%); background: rgba(14,15,22,.97); }
  .sidebar.open { transform: none; box-shadow: 0 0 40px rgba(0,0,0,.6); }
  .main { margin-left: 0; }
  .topbar { display: flex; }
  .content { padding: 18px 16px 48px; }
  h1 { font-size: 21px; }
  #toasts { left: 16px; right: 16px; top: 64px; }
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
// Statistika raqamlari: 0 dan haqiqiy songacha "sanash" animatsiyasi (0.8s)
function countUp(el, target, dur = 800) {
  const t = Number(target) || 0;
  if (!t) { el.textContent = "0"; return; }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(t * eased).toLocaleString("uz-UZ");
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function runCountUps(root) {
  (root || document).querySelectorAll("[data-count]").forEach((el) => {
    countUp(el, el.dataset.count);
    el.removeAttribute("data-count");
  });
}
function skeletonRows(n, h) {
  return Array.from({ length: n || 3 }, () => \`<div class="skeleton" style="height:\${h || 56}px;margin-bottom:10px;"></div>\`).join("");
}
function emptyState(emoji, text, actionHtml) {
  return \`<div class="empty"><span class="emoji">\${emoji}</span>\${esc(text)}\${actionHtml ? \`<div style="margin-top:14px">\${actionHtml}</div>\` : ""}</div>\`;
}
// Sidebar (mobil)
function toggleSidebar(open) {
  $("sidebar").classList.toggle("open", open);
  $("overlay").classList.toggle("show", open);
}
`;

// ------------------------------------------------------------
//  KONTAKT PROFILI (drawer) — mini-CRM, inbox va kontaktlarda ishlatiladi
// ------------------------------------------------------------
const DRAWER_CSS = `
  .drawer-back { position: fixed; inset: 0; background: rgba(4,5,10,.5); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); z-index: 90; opacity: 0; pointer-events: none; transition: opacity .25s; }
  .drawer-back.show { opacity: 1; pointer-events: auto; }
  .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 380px; max-width: 100vw; background: rgba(18,20,28,.96); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-left: 1px solid var(--border-subtle); z-index: 95; transform: translateX(100%); transition: transform .28s cubic-bezier(.22,1,.36,1); display: flex; flex-direction: column; box-shadow: -20px 0 60px rgba(0,0,0,.45); }
  .drawer.show { transform: none; }
  .drawer-head { padding: 18px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 12px; }
  .drawer-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 16px; }
  .drawer-stat { background: rgba(255,255,255,.04); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 10px 12px; }
  @media (max-width: 560px) { .drawer { width: 100vw; } }
`;

const DRAWER_HTML = `
  <div class="drawer-back" id="drawerBack" onclick="closeProfile()"></div>
  <aside class="drawer" id="drawer" aria-label="Kontakt profili">
    <div class="drawer-head" id="drawerHead"></div>
    <div class="drawer-body" id="drawerBody"></div>
  </aside>`;

const DRAWER_JS = `
let PROFILE = null;
function sentimentBadge(s) {
  if (s === "positive") return '<span class="badge b-green">😊 ijobiy</span>';
  if (s === "negative") return '<span class="badge b-red">😟 salbiy</span>';
  if (s === "neutral") return '<span class="badge b-gray">😐 neytral</span>';
  return "";
}
async function openProfile(contactId) {
  $("drawerBack").classList.add("show");
  $("drawer").classList.add("show");
  $("drawerHead").innerHTML = '<div class="skeleton" style="height:44px;width:100%"></div>';
  $("drawerBody").innerHTML = skeletonRows(4, 62);
  try {
    const { contact } = await api("/api/contacts/" + contactId + "/profile");
    PROFILE = contact;
    renderProfile();
  } catch (e) {
    $("drawerBody").innerHTML = emptyState("⚠️", "Profil yuklanmadi: " + e.message);
  }
}
function renderProfile() {
  const c = PROFILE;
  $("drawerHead").innerHTML = \`
    \${avatar(c.name || c.ig_user_id, 44)}
    <div style="min-width:0;flex:1">
      <strong style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px">\${esc(c.name || c.ig_user_id)}</strong>
      <span class="small muted">ID: \${esc(c.ig_user_id)}</span>
    </div>
    <button class="modal-x" onclick="closeProfile()" aria-label="Yopish">✕</button>\`;
  $("drawerBody").innerHTML = \`
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      \${c.bot_paused ? '<span class="badge b-amber">🔕 bot pauzada</span>' : '<span class="badge b-green">🤖 bot faol</span>'}
      \${c.needs_human ? '<span class="badge b-amber">🙋 odam kerak</span>' : ""}
      \${sentimentBadge(c.sentiment)}
      \${(c.tags || []).map((t) => '<span class="badge b-indigo">' + esc(t) + "</span>").join("")}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Xabarlar</div><strong>\${c.msg_count ?? 0} ta</strong></div>
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Akkaunt</div><strong class="small">\${esc(c.project_name || "—")}</strong></div>
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Birinchi ko'rilgan</div><strong class="small">\${fmt(c.first_seen)}</strong></div>
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Oxirgi faollik</div><strong class="small">\${fmt(c.last_seen)}</strong></div>
    </div>
    <div>
      <label class="lbl">📝 Izoh (faqat sizga ko'rinadi)</label>
      <textarea class="input" id="noteText" rows="4" maxlength="2000" placeholder="Masalan: narx so'radi, ertaga qo'ng'iroq qilish kerak...">\${esc(c.note || "")}</textarea>
      <button class="btn btn-sm" style="margin-top:8px" onclick="saveNote(this)">Izohni saqlash</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:6px">
      <a class="btn btn-primary" href="/dashboard/inbox?contact=\${c.id}" style="flex:1;min-width:150px">💬 Suhbatga o'tish</a>
      <button class="btn" onclick="toggleProfilePause()">\${c.bot_paused ? "▶️ Botni yoqish" : "🔕 Botni pauza"}</button>
    </div>\`;
}
async function saveNote(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/contacts/" + PROFILE.id + "/note", { note: $("noteText").value });
    toast("Izoh saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function toggleProfilePause() {
  try {
    const v = !PROFILE.bot_paused;
    await postJson("/api/contacts/" + PROFILE.id + "/pause", { value: v });
    PROFILE.bot_paused = v; PROFILE.paused_until = null;
    renderProfile();
    if (typeof onPauseChanged === "function") onPauseChanged(PROFILE.id, v);
    toast(v ? "Bot pauza qilindi — endi siz gaplashasiz 🔕" : "Bot qayta yoqildi ▶️");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function closeProfile() {
  $("drawerBack").classList.remove("show");
  $("drawer").classList.remove("show");
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

// ============================================================
//  1. BOSHQARUV (Dashboard) — /dashboard
//  4 statistika kartasi + 7 kun grafigi + suhbatlar + tezkor amallar
// ============================================================
export function renderDashboardHome() {
  const content = `
  <style>
    .bento { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .bento-big { grid-column: span 2; }
    .summary-text { font-size: 15px; line-height: 1.65; min-height: 72px; }
    .ai-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .ai-ok { background: rgba(52,211,153,.12); color: var(--success); }
    .ai-warn { background: rgba(251,191,36,.12); color: var(--warning); }
    .chart-box { position: relative; }
    .chart-tip { position: absolute; pointer-events: none; background: rgba(18,20,28,.95); border: 1px solid var(--border-glow); border-radius: 10px; padding: 6px 11px; font-size: 12px; white-space: nowrap; transform: translate(-50%, -115%); opacity: 0; transition: opacity .15s; z-index: 5; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
    .chart-tip.show { opacity: 1; }
    .chart-tip strong { color: #a5b4fc; }
    @media (max-width: 1000px) { .bento-big { grid-column: span 4; } .bento-sm { grid-column: span 2; } }
    @media (max-width: 560px) { .bento-sm { grid-column: span 4; } }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } }
  </style>

  <div class="bento">
    <div class="card glow bento-big" id="summaryCard">
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

    <div class="card glow bento-big">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px">
        <h3>📈 Xabarlar</h3>
        <span class="small muted">oxirgi 7 kun</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
        <span class="stat-num" id="todayNum">0</span>
        <span class="small muted">bugun</span>
      </div>
      <div class="chart-box">
        <div id="chart" class="skeleton" style="height:130px"></div>
        <div class="chart-tip" id="chartTip"></div>
      </div>
    </div>

    <a href="/dashboard/inbox?filter=human" class="card hoverable bento-sm stat-card" id="humanCard">
      <div class="stat-ic" style="background:rgba(251,191,36,.13);font-size:20px">🙋</div>
      <div><div class="stat-num" id="humanNum">0</div><div class="stat-lbl">Odam kerak suhbatlar</div></div>
    </a>
    <div class="card hoverable bento-sm stat-card">
      <div class="stat-ic" style="background:rgba(99,102,241,.14);font-size:20px">📱</div>
      <div><div class="stat-num" id="projNum">0</div><div class="stat-lbl">Akkauntlar</div></div>
    </div>
    <div class="card hoverable bento-sm stat-card">
      <div class="stat-ic" style="background:rgba(139,92,246,.14);font-size:20px">👥</div>
      <div><div class="stat-num" id="contactNum">0</div><div class="stat-lbl">Jami mijozlar</div></div>
    </div>
    <div class="card hoverable bento-sm stat-card">
      <div class="stat-ic" style="background:rgba(34,211,238,.12);font-size:20px">💬</div>
      <div><div class="stat-num" id="msgNum">0</div><div class="stat-lbl">Jami xabarlar</div></div>
    </div>
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

async function loadStats() {
  try {
    const s = await api("/api/stats");
    countUp($("todayNum"), s.today ?? 0);
    countUp($("humanNum"), s.needsHuman || 0);
    countUp($("projNum"), s.projects);
    countUp($("contactNum"), s.contacts);
    countUp($("msgNum"), s.messages);
    if (s.needsHuman) $("humanCard").style.borderColor = "rgba(251,191,36,.45)";
    renderChart(s.week || []);
  } catch (e) {
    $("chart").classList.remove("skeleton");
    $("chart").innerHTML = emptyState("📈", "Statistika yuklanmadi: " + e.message);
  }
}

// B3: silliq gradient area-chart — sof SVG, kutubxonasiz
function renderChart(week) {
  const el = $("chart");
  el.classList.remove("skeleton");
  const map = Object.fromEntries(week.map((w) => [w.day, w.n]));
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    days.push({ key, label: DAY_NAMES[d.getDay()], n: map[key] || 0 });
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
    <line id="guide" x1="0" x2="0" y1="\${TOP}" y2="\${H - BOT}" stroke="rgba(255,255,255,.14)" style="opacity:0"/>
    <circle id="hoverDot" r="4" fill="#fff" stroke="#8b5cf6" stroke-width="2" style="opacity:0"/>
    <circle cx="\${last.x}" cy="\${last.y}" r="4.5" fill="#22d3ee">
      <animate attributeName="opacity" values="1;.45;1" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="\${last.x}" cy="\${last.y}" r="4.5" fill="none" stroke="#22d3ee" stroke-width="1.5" opacity=".6">
      <animate attributeName="r" values="4.5;12" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".6;0" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    \${days.map((d, i) => \`<rect x="\${(pts[i].x - (W - 2 * PX) / 12).toFixed(1)}" y="0" width="\${((W - 2 * PX) / 6).toFixed(1)}" height="\${H}" fill="transparent" data-di="\${i}"/>\`).join("")}
  </svg>
  <div style="display:flex;justify-content:space-between;padding:4px 4px 0" class="small">
    \${days.map((d, i) => \`<span style="color:\${i === 6 ? "var(--text)" : "var(--muted)"};font-weight:\${i === 6 ? "600" : "400"}">\${d.label}</span>\`).join("")}
  </div>\`;
  const svg = el.querySelector("svg");
  const tip = $("chartTip");
  svg.addEventListener("mousemove", (ev) => {
    const di = ev.target.dataset ? ev.target.dataset.di : null;
    if (di == null) return;
    const i = Number(di);
    const sx = el.getBoundingClientRect().width / W;
    tip.innerHTML = "<strong>" + days[i].n + " xabar</strong> · " + days[i].label + " (" + days[i].key.slice(5) + ")";
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
loadSummary(); loadStats(); loadConversations(); loadAccounts();`;

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
  <style>${DRAWER_CSS}
    .inbox-wrap { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 170px); min-height: 460px; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; background: var(--bg-panel); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
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
    .chat-pane { display: flex; flex-direction: column; min-width: 0; background: rgba(10,11,16,.55); }
    .chat-head { padding: 12px 16px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,.02); display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
    .chat-msgs { flex: 1; overflow-y: auto; padding: 18px 16px; display: flex; flex-direction: column; gap: 4px; }
    .bubble-row { display: flex; margin-bottom: 6px; }
    .bubble { max-width: 74%; padding: 9px 13px; border-radius: 16px; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
    .bubble .t { font-size: 10px; opacity: .6; margin-top: 3px; text-align: right; }
    .from-user { justify-content: flex-start; }
    .from-user .bubble { background: var(--panel2); border-bottom-left-radius: 5px; }
    .from-bot { justify-content: flex-end; }
    .from-bot .bubble { background: linear-gradient(135deg, #6366f1, #7c5ff0); color: #fff; border-bottom-right-radius: 5px; }
    .composer { padding: 12px; border-top: 1px solid var(--border); background: rgba(255,255,255,.02); display: flex; gap: 9px; align-items: flex-end; }
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
        <button class="btn" onclick="openQuickReplies()" title="Tezkor javoblar" style="padding:9px 12px">⚡</button>
        <textarea class="input" id="replyText" rows="1" placeholder="Qo'lda javob yozish... (bot o'rniga siz)"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendReply();}"></textarea>
        <button class="btn btn-primary" id="sendBtn" onclick="sendReply()">${ICONS.send} Yuborish</button>
      </div>
    </div>
  </div>
  ${DRAWER_HTML}`;

  const script = `
let CONTACTS = [];
let ALL_TAGS = [];
let FILTER = new URLSearchParams(location.search).get("filter") || "all";
let SELECTED = Number(new URLSearchParams(location.search).get("contact")) || null;
let CURRENT = null; // ochiq suhbat kontakti

let SAVED_REPLIES = [];
async function loadData() {
  try {
    const [c, t] = await Promise.all([api("/api/contacts?limit=300"), api("/api/tags")]);
    CONTACTS = c.contacts; ALL_TAGS = t.tags || [];
    renderFilters(); renderList();
    if (SELECTED) openChat(SELECTED, true);
  } catch (e) {
    $("convItems").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message);
  }
  try { SAVED_REPLIES = (await api("/api/saved-replies")).replies || []; } catch (e) { /* jim */ }
}

// C2: Tezkor javoblar — bir bosishda tayyor matn
function openQuickReplies() {
  if (!SAVED_REPLIES.length) {
    openModal("⚡ Tezkor javoblar", '<p class="muted" style="line-height:1.7">Hali tezkor javob yo\\'q.<br><a href="/dashboard/settings" style="color:#a5b4fc">Sozlamalar</a> sahifasida "Tezkor javoblar" bo\\'limidan qo\\'shing.</p>');
    return;
  }
  openModal("⚡ Tezkor javoblar", SAVED_REPLIES.map((r) => \`
    <button class="btn" style="width:100%;justify-content:flex-start;text-align:left;margin-bottom:8px;white-space:normal;padding:11px 14px" onclick="useQuickReply(\${r.id})">
      <span style="min-width:0"><strong style="display:block;margin-bottom:2px">\${esc(r.title)}</strong>
      <span class="small muted">\${esc(r.text.length > 90 ? r.text.slice(0, 90) + "…" : r.text)}</span></span>
    </button>\`).join(""));
}
function useQuickReply(id) {
  const r = SAVED_REPLIES.find((x) => x.id === id);
  if (!r) return;
  $("replyText").value = r.text;
  closeModal();
  $("replyText").focus();
  $("replyText").dispatchEvent(new Event("input"));
}

// C1: Bot pauza (operator rejimi)
async function togglePause() {
  try {
    const v = !CURRENT.bot_paused;
    await postJson("/api/contacts/" + SELECTED + "/pause", { value: v });
    CURRENT.bot_paused = v; CURRENT.paused_until = null;
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) { local.bot_paused = v; local.paused_until = null; }
    renderChatHead(); renderList();
    toast(v ? "Bot pauza qilindi — endi siz gaplashasiz 🔕" : "Bot qayta yoqildi ▶️");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
// Drawer'dan pauza o'zgarsa — inbox ro'yxatini ham yangilaymiz
function onPauseChanged(id, v) {
  const local = CONTACTS.find((c) => c.id === id);
  if (local) { local.bot_paused = v; local.paused_until = null; }
  if (CURRENT && CURRENT.id === id) { CURRENT.bot_paused = v; renderChatHead(); }
  renderList();
}
function renderFilters() {
  const chips = [
    { k: "all", label: "Hammasi" },
    { k: "human", label: "🙋 Odam kerak" },
    { k: "negative", label: "😟 Salbiy" },
    { k: "paused", label: "🔕 Pauzada" },
    ...ALL_TAGS.map((t) => ({ k: "tag:" + t, label: "🏷 " + t })),
  ];
  $("filters").innerHTML = chips.map((c) =>
    \`<button class="chip \${FILTER === c.k ? "on" : ""}" onclick="setFilter('\${esc(c.k).replace(/'/g, "\\\\'")}')">\${esc(c.label)}</button>\`
  ).join("");
}
function setFilter(k) { FILTER = k; renderFilters(); renderList(); }
function matchesFilter(c) {
  if (FILTER === "human") return c.needs_human;
  if (FILTER === "negative") return c.sentiment === "negative";
  if (FILTER === "paused") return c.bot_paused;
  if (FILTER.startsWith("tag:")) return (c.tags || []).includes(FILTER.slice(4));
  return true;
}
function renderList() {
  const q = ($("search").value || "").toLowerCase().trim();
  const items = CONTACTS.filter(matchesFilter).filter((c) =>
    !q || String(c.name || "").toLowerCase().includes(q) ||
    String(c.ig_user_id).includes(q) || String(c.last_text || "").toLowerCase().includes(q)
  );
  if (!items.length) { $("convItems").innerHTML = emptyState("💬", q ? "Topilmadi" : "Hali suhbatlar yo'q — bot birinchi xabarni kutmoqda"); return; }
  $("convItems").innerHTML = items.map((c) => \`
    <div class="conv-item \${c.needs_human ? "human" : ""} \${c.id === SELECTED ? "sel" : ""}" onclick="openChat(\${c.id})">
      \${avatar(c.name || c.ig_user_id, 40)}
      <div style="min-width:0;flex:1">
        <div style="display:flex;align-items:center;gap:6px">
          <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px">\${esc(c.name || c.ig_user_id)}</strong>
          \${c.needs_human ? '<span title="Odam kerak">🙋</span>' : ""}
          \${c.bot_paused ? '<span title="Bot pauzada — operator gaplashadi">🔕</span>' : ""}
          \${c.sentiment === "negative" ? '<span title="Salbiy kayfiyat — tez aralashing!">😟</span>' : ""}
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
        \${c.bot_paused ? '<span class="badge b-amber">🔕 bot pauzada</span>' : ""}
        \${sentimentBadge(c.sentiment)}
      </div>
      <div class="small muted" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        \${esc(c.project_name || "")} · ID: \${esc(c.ig_user_id)}
        <span id="tagBadges">\${(c.tags || []).map((t) => \`<span class="badge b-indigo">\${esc(t)}</span>\`).join(" ")}</span>
      </div>
    </div>
    <button class="btn btn-sm" onclick="togglePause()" title="\${c.bot_paused ? "Bot bu suhbatda yana javob beradi" : "Bot bu suhbatda javob bermaydi — siz gaplashasiz"}">\${c.bot_paused ? "▶️ Botni yoqish" : "🔕 Botni pauza"}</button>
    <button class="btn btn-sm" onclick="openProfile(SELECTED)">👤 Profil</button>
    <button class="btn btn-sm" onclick="openTagEditor()" title="Teg qo'shish">🏷</button>
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
    toast("Javob yuborildi ✓ — bot 30 daqiqa pauzada 🔕");
    const { contact, messages } = await api("/api/conversation/" + SELECTED);
    CURRENT = contact; renderChatHead(); renderMessages(messages);
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) { local.last_text = text; local.needs_human = false; local.bot_paused = contact.bot_paused; }
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

loadData();
${DRAWER_JS}`;

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
  </div>
  <style>${DRAWER_CSS}</style>
  ${DRAWER_HTML}`;

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
              \${c.bot_paused ? '<span title="Bot pauzada">🔕</span>' : ""}
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
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="openProfile(\${c.id})">👤 Profil</button>
        <a class="btn btn-sm" href="/dashboard/inbox?contact=\${c.id}">💬 Suhbat</a>
      </td>
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
// Drawer'dan pauza o'zgarsa — jadvalni yangilaymiz
function onPauseChanged(id, v) {
  const local = CONTACTS.find((c) => c.id === id);
  if (local) { local.bot_paused = v; local.paused_until = null; }
  renderTable();
}
loadData();
${DRAWER_JS}`;

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
      <label class="lbl">Qachon yuborilsin?</label>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <select class="input" id="whenSel" style="width:auto" onchange="toggleSchedule()">
          <option value="now">Hozir yuborish</option>
          <option value="later">🗓 Rejalashtirish</option>
        </select>
        <input type="datetime-local" class="input" id="schedAt" style="display:none;width:auto;color-scheme:dark">
      </div>
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
          <span class="small muted">\${b.status === "scheduled" ? "" : timeAgo(b.created_at)}</span>
        </div>
        <div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:3px 0">\${esc(b.message)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <span class="badge b-gray">\${esc(b.audience)}</span>
          \${broadcastStatus(b)}
        </div>
      </div>\`).join("");
  } catch (e) { $("history").innerHTML = emptyState("📢", "Tarix yuklanmadi"); }
}
function broadcastStatus(b) {
  if (b.status === "scheduled") {
    return \`<span class="badge b-cyan">🗓 \${fmt(b.scheduled_at)}</span>
      <button class="btn btn-sm btn-danger" style="padding:2px 9px;font-size:11px" onclick="cancelScheduled(\${b.id})">Bekor qilish</button>\`;
  }
  if (b.status === "sending") return '<span class="badge b-amber">⏳ yuborilmoqda...</span>';
  if (b.status === "failed") return '<span class="badge b-red">✕ xato</span>';
  return \`<span class="badge b-green">✓ \${b.sent}/\${b.total}</span>\` +
    (b.failed ? \` <span class="badge b-red">✕ \${b.failed}</span>\` : "");
}
async function cancelScheduled(id) {
  try {
    await api("/api/broadcasts/" + id, { method: "DELETE" });
    toast("Rejalashtirilgan broadcast bekor qilindi");
    loadHistory();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function toggleSchedule() {
  const later = $("whenSel").value === "later";
  $("schedAt").style.display = later ? "" : "none";
  if (later && !$("schedAt").value) {
    // Standart: 1 soat keyin (lokal vaqt, datetime-local formatida)
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const p = (n) => String(n).padStart(2, "0");
    $("schedAt").value = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  $("sendBtn").innerHTML = later ? "🗓 Rejalashtirish" : "Yuborish";
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
  const later = $("whenSel").value === "later";
  if (later) {
    const v = $("schedAt").value;
    if (!v) return toast("Sana va vaqtni tanlang", false);
    const when = new Date(v);
    if (isNaN(when.getTime()) || when.getTime() < Date.now() + 60 * 1000) {
      return toast("Vaqt kamida 1 daqiqa kelajakda bo'lishi kerak", false);
    }
    openModal("Rejalashtirishni tasdiqlash", \`
      <p style="margin-bottom:8px"><strong>\${fmt(when)}</strong> da yuboriladi — o'sha paytda 24 soat qoidasiga mos mijozlarga:</p>
      <div style="background:var(--panel2);border-radius:12px;padding:12px;margin-bottom:16px;white-space:pre-wrap;font-size:13px">\${esc(msg)}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn" onclick="closeModal()">Bekor qilish</button>
        <button class="btn btn-primary" onclick="closeModal();doSend()">🗓 Rejalashtirish</button>
      </div>\`);
    return;
  }
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
  const later = $("whenSel").value === "later";
  btn.disabled = true;

  // Rejalashtirish: server o'zi vaqtida yuboradi, progress kerak emas
  if (later) {
    try {
      const r = await postJson("/api/broadcast", {
        projectId: Number($("account").value),
        tag: $("audience").value || null,
        message: $("message").value.trim(),
        scheduledAt: new Date($("schedAt").value).toISOString(),
      });
      toast("Broadcast rejalashtirildi 🗓 " + fmt(r.scheduledAt));
      $("message").value = ""; updatePreview();
      loadHistory();
    } catch (e) { toast("Xatolik: " + e.message, false); }
    btn.disabled = false;
    return;
  }

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
// ============================================================
//  7. SOZLAMALAR — /dashboard/settings
//  Bot sozlamalari · AI sozlamalari · Tizim holati
// ============================================================
export function renderSettingsPage() {
  const content = `
  <div style="display:grid;gap:14px;max-width:760px">

    <div class="card">
      <h3 style="margin-bottom:4px">🤖 Bot sozlamalari</h3>
      <p class="small muted" style="margin-bottom:16px">Ish vaqti va salomlashish — botning mijozlar bilan muomalasi.</p>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <label class="switch">
          <input type="checkbox" id="whEnabled" onchange="$('whFields').style.opacity=this.checked?'1':'.45'">
          <span class="slider"></span>
        </label>
        <div><strong class="small">Ish vaqti rejimi</strong>
        <div class="small muted">Yoqilsa — ish vaqtidan tashqari bot AI o'rniga tayyor xabar yuboradi</div></div>
      </div>
      <div id="whFields" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div><label class="lbl">Boshlanishi (soat)</label>
          <select class="input" id="whStart">${Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
        <div><label class="lbl">Tugashi (soat)</label>
          <select class="input" id="whEnd">${Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
      </div>
      <label class="lbl">Ish vaqtidan tashqari xabar</label>
      <textarea class="input" id="offMsg" rows="2" maxlength="500" style="margin-bottom:14px"></textarea>
      <label class="lbl">Salomlashish uslubi (birinchi xabarda, ixtiyoriy)</label>
      <input class="input" id="greetMsg" maxlength="300" placeholder="Masalan: Assalomu alaykum! BUGUN MEDIA'ga xush kelibsiz 👋" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="saveBotSettings(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🧠 AI sozlamalari</h3>
      <p class="small muted" style="margin-bottom:16px">Bot ikki modelni aqlli almashtiradi — xarajat va sifat muvozanati.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px" class="ai-cols">
        <div style="background:var(--panel2);border-radius:12px;padding:14px">
          <span class="badge b-green">Haiku 4.5</span>
          <div class="small muted" style="margin-top:8px">Oddiy, qisqa savollar — tez va tejamkor javob</div>
        </div>
        <div style="background:var(--panel2);border-radius:12px;padding:14px">
          <span class="badge b-indigo">Sonnet 5</span>
          <div class="small muted" style="margin-top:8px">Murakkab savollar (nega, taqqosla, strategiya...) va uzun xabarlar</div>
        </div>
      </div>
      <label class="lbl">Javob uzunligi</label>
      <select class="input" id="replyLen" style="margin-bottom:16px">
        <option value="qisqa">Qisqa (1-2 gap)</option>
        <option value="orta">O'rtacha (2-4 gap) — tavsiya</option>
        <option value="batafsil">Batafsil (4-6 gap)</option>
      </select>
      <button class="btn btn-primary" onclick="saveAiSettings(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">⚡ Tezkor javoblar</h3>
      <p class="small muted" style="margin-bottom:14px">Inbox'da bir bosishda qo'yiladigan tayyor javoblar (masalan "Narxlar haqida", "Aloqa ma'lumoti").</p>
      <div id="qrList"><div class="skeleton" style="height:44px"></div></div>
      <div style="display:grid;gap:8px;margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        <input class="input" id="qrTitle" placeholder="Sarlavha (masalan: Narxlar haqida)" maxlength="80">
        <textarea class="input" id="qrText" rows="3" maxlength="1000" placeholder="Javob matni — inbox'da shu matn qo'yiladi..."></textarea>
        <button class="btn btn-primary" style="justify-self:start" onclick="addQuickReply(this)">${ICONS.plus} Qo'shish</button>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🖥 Tizim</h3>
      <p class="small muted" style="margin-bottom:16px">Server va database holati.</p>
      <div id="sysInfo"><div class="skeleton" style="height:100px"></div></div>
    </div>
  </div>

  <style>
    .switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; display: inline-block; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; inset: 0; background: var(--panel2); border: 1px solid var(--border); border-radius: 999px; cursor: pointer; transition: .25s; }
    .slider:before { content: ""; position: absolute; width: 18px; height: 18px; left: 2px; top: 2px; background: var(--muted); border-radius: 50%; transition: .25s; }
    .switch input:checked + .slider { background: var(--grad); border-color: transparent; }
    .switch input:checked + .slider:before { transform: translateX(20px); background: #fff; }
    @media (max-width: 600px) { .ai-cols { grid-template-columns: 1fr !important; } }
  </style>`;

  const script = `
async function loadSettings() {
  try {
    const { settings: s } = await api("/api/settings");
    $("whEnabled").checked = s.work_hours_enabled === "true";
    $("whFields").style.opacity = $("whEnabled").checked ? "1" : ".45";
    $("whStart").value = String(parseInt(s.work_start, 10) || 9);
    $("whEnd").value = String(parseInt(s.work_end, 10) || 21);
    $("offMsg").value = s.off_hours_message || "";
    $("greetMsg").value = s.greeting_message || "";
    $("replyLen").value = s.reply_length || "orta";
  } catch (e) { toast("Sozlamalar yuklanmadi: " + e.message, false); }
}
async function saveBotSettings(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      work_hours_enabled: String($("whEnabled").checked),
      work_start: $("whStart").value,
      work_end: $("whEnd").value,
      off_hours_message: $("offMsg").value.trim(),
      greeting_message: $("greetMsg").value.trim(),
    });
    toast("Bot sozlamalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function saveAiSettings(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", { reply_length: $("replyLen").value });
    toast("AI sozlamalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
function fmtUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return (d ? d + " kun " : "") + (h ? h + " soat " : "") + m + " daqiqa";
}
async function loadSystem() {
  try {
    const s = await api("/api/system");
    $("sysInfo").innerHTML = \`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
        \${sysRow("Versiya", "v" + s.version)}
        \${sysRow("Server", '<span class="dot dot-green"></span> ishlayapti')}
        \${sysRow("Database", s.db ? '<span class="dot dot-green"></span> ulangan' : '<span class="dot dot-red"></span> uzilgan')}
        \${sysRow("Akkauntlar", s.accounts + " ta faol")}
        \${sysRow("Oxirgi deploy", fmt(s.startedAt))}
        \${sysRow("Ishlash vaqti", fmtUptime(s.uptimeSec))}
        \${sysRow("Node.js", s.node)}
      </div>\`;
  } catch (e) { $("sysInfo").innerHTML = emptyState("🖥", "Tizim ma'lumoti yuklanmadi"); }
}
function sysRow(label, valueHtml) {
  return \`<div style="background:var(--panel2);border-radius:12px;padding:12px">
    <div class="small muted" style="margin-bottom:4px">\${label}</div>
    <div style="display:flex;align-items:center;gap:7px;font-weight:600;font-size:13px">\${valueHtml}</div></div>\`;
}
// C2: Tezkor javoblarni boshqarish
async function loadQuickReplies() {
  try {
    const { replies } = await api("/api/saved-replies");
    if (!replies.length) {
      $("qrList").innerHTML = emptyState("⚡", "Hali tezkor javob yo'q — birinchisini qo'shing");
      return;
    }
    $("qrList").innerHTML = replies.map((r) => \`
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="min-width:0;flex:1">
          <strong class="small" style="display:block">\${esc(r.title)}</strong>
          <span class="small muted" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(r.text)}</span>
        </div>
        <button class="btn btn-sm btn-danger" onclick="deleteQuickReply(\${r.id})" title="O'chirish">✕</button>
      </div>\`).join("");
  } catch (e) { $("qrList").innerHTML = emptyState("⚡", "Yuklanmadi: " + e.message); }
}
async function addQuickReply(btn) {
  const title = $("qrTitle").value.trim();
  const text = $("qrText").value.trim();
  if (!title || !text) return toast("Sarlavha va matn majburiy", false);
  btn.disabled = true;
  try {
    await postJson("/api/saved-replies", { title, text });
    $("qrTitle").value = ""; $("qrText").value = "";
    toast("Tezkor javob qo'shildi ✓");
    loadQuickReplies();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function deleteQuickReply(id) {
  try {
    await api("/api/saved-replies/" + id, { method: "DELETE" });
    toast("O'chirildi");
    loadQuickReplies();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadSettings(); loadSystem(); loadQuickReplies();`;

  return renderLayout({
    title: "Sozlamalar",
    active: "settings",
    headerAction: "",
    content,
    script,
  });
}

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
    .ins-rank { width: 26px; height: 26px; border-radius: 8px; background: rgba(99,102,241,.14); color: #a5b4fc; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  </style>

  <div class="card glow" style="display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap">
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
      <div class="card hoverable">
        <h3 style="margin-bottom:6px">❓ Eng ko'p so'ralgan savollar</h3>
        <p class="small muted" style="margin-bottom:8px">Mijozlar nimani so'rayapti</p>
        \${tq.length ? tq.map((q, i) => \`
          <div class="ins-item">
            <span class="ins-rank">\${i + 1}</span>
            <span style="flex:1">\${esc(q.question)}</span>
            \${q.count ? \`<span class="badge b-indigo">\${q.count}×</span>\` : ""}
          </div>\`).join("") : emptyState("❓", "Aniq takrorlanuvchi savollar topilmadi")}
      </div>

      <div class="card hoverable">
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

      <div class="card hoverable">
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
loadInsights(false);`;

  return renderLayout({
    title: "Tahlil",
    active: "insights",
    headerAction: `<button class="btn" onclick="loadInsights(true)">🔄 Yangilash</button>`,
    content,
    script,
  });
}
