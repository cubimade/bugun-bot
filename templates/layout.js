// templates/layout.js — umumiy karkas: sidebar, head, theme (ROADMAP-6 A1)
// Dizayn CSS/JS endi statik: public/app.css va public/app.js
import { esc, I, ICONS, NAV_ITEMS, APP_VERSION } from "./components.js";

export function renderLayout({ title, active, headerAction = "", content, script = "" }) {
  const nav = NAV_ITEMS.map(
    (n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}" data-nav="${n.key}">${ICONS[n.icon]}<span>${n.label}</span><span class="nav-count" data-navcount="${n.key}"></span></a>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="uz" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Bugun Bot</title>
  <script>(function(){var t;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)})()</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/app.css?v=${APP_VERSION}">
</head>
<body>
  <aside class="sidebar" id="sidebar">
    <div class="logo">🤖 <span class="grad-text">BUGUN BOT</span></div>
    <nav class="nav">${nav}</nav>
    <div class="sidebar-foot">
      <span>v${APP_VERSION}</span>
      <span style="display:flex;align-items:center;gap:8px">
        <button class="theme-btn" onclick="toggleTheme()" aria-label="Rejimni almashtirish"></button>
        <a href="/" class="muted" title="Bosh sahifa">${ICONS.logout}</a>
      </span>
    </div>
  </aside>
  <div class="overlay" id="overlay" onclick="toggleSidebar(false)"></div>

  <div class="main">
    <div class="topbar">
      <button class="hamburger" onclick="toggleSidebar(true)" aria-label="Menyu">${I('<path d="M3 6h18M3 12h18M3 18h18"/>')}</button>
      <strong style="flex:1">${esc(title)}</strong>
      <div class="topsearch" id="topSearch">
        <input class="input" id="globalSearch" placeholder="🔍 Qidirish... ( / )" autocomplete="off"
          oninput="onGlobalSearch()" onfocus="onGlobalSearch()">
        <div class="topsearch-drop" id="searchDrop"></div>
      </div>
      <button class="notif-btn" id="notifBtn" onclick="toggleNotifs()" aria-label="Bildirishnomalar" title="Odam kerak suhbatlar">
        🔔<span class="notif-count" id="notifCount" style="display:none"></span>
      </button>
      <div class="notif-drop" id="notifDrop"></div>
      <button class="theme-btn" onclick="toggleTheme()" aria-label="Rejimni almashtirish"></button>
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

  <script src="/app.js?v=${APP_VERSION}"></script>
  <script>${script}</script>
</body>
</html>`;
}
