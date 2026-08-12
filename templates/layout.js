// templates/layout.js — umumiy karkas: sidebar, head, theme (ROADMAP-6 A1)
// Dizayn CSS/JS endi statik: public/app.css va public/app.js
import { esc, I, ICONS, NAV_ITEMS, NAV_GROUPS, APP_VERSION } from "./components.js";
import { state } from "../state.js";

export function renderLayout({ title, subtitle = "", active, headerAction = "", content, script = "" }) {
  const byKey = Object.fromEntries(NAV_ITEMS.map((n) => [n.key, n]));
  const nav = NAV_GROUPS.map((g) => `
    <div class="nav-label">${esc(g.label)}</div>
    ${g.keys.map((k) => byKey[k]).filter(Boolean).map(
      (n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}" data-nav="${n.key}">${ICONS[n.icon]}<span>${n.label}</span><span class="nav-count" data-navcount="${n.key}"></span></a>`
    ).join("")}`
  ).join("");

  return `<!DOCTYPE html>
<html lang="uz" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Bugun Bot</title>
  <script>(function(){var t;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t);
  // Kuchsiz qurilma yoki reduced-motion: og'ir effektlar (aurora, blur, glow) o'chiriladi
  var lite=false;try{lite=(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory&&navigator.deviceMemory<=4)||(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)}catch(e){}
  if(lite)document.documentElement.classList.add("perf-lite")})()</script>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/app.min.css?v=${APP_VERSION}">
</head>
<body>
  <aside class="sidebar" id="sidebar">
    <div class="logo"><span class="grad-text">${esc((state.SETTINGS.brand_name || "").trim() || "BUGUN BOT")}</span></div>
    <nav class="nav">${nav}</nav>
    <div class="sidebar-foot">
      <span>v${APP_VERSION}</span>
      <span style="display:flex;align-items:center;gap:8px">
        <button class="theme-btn" onclick="toggleTheme()" aria-label="Rejimni almashtirish"></button>
        <a href="/logout" class="muted" data-tip="Chiqish (logout)">${ICONS.logout}</a>
      </span>
    </div>
  </aside>
  <div class="overlay" id="overlay" onclick="toggleSidebar(false)"></div>

  <div class="main">
    <div class="topbar">
      <button class="hamburger" onclick="toggleSidebar(true)" aria-label="Menyu">${I('<path d="M3 6h18M3 12h18M3 18h18"/>')}</button>
      <strong style="flex:1">${esc(title)}</strong>
      <div class="topsearch" id="topSearch">
        ${ICONS.search}
        <input class="input" id="globalSearch" placeholder="Qidirish... ( / )" autocomplete="off"
          oninput="onGlobalSearch()" onfocus="onGlobalSearch()">
        <div class="topsearch-drop" id="searchDrop"></div>
      </div>
      <button class="notif-btn" id="notifBtn" onclick="toggleNotifs()" aria-label="Bildirishnomalar" data-tip="Odam kerak suhbatlar">
        ${ICONS.bell}<span class="notif-count" id="notifCount" style="display:none"></span>
      </button>
      <div class="notif-drop" id="notifDrop"></div>
      <button class="theme-btn" onclick="toggleTheme()" aria-label="Rejimni almashtirish"></button>
    </div>
    <div class="content">
      <div class="page-head">
        <div>
          ${subtitle ? `<p class="page-context">${esc(subtitle)}</p>` : ""}
          <h1>${esc(title)}</h1>
        </div>
        <div>${headerAction}</div>
      </div>
      ${content}
    </div>
  </div>

  <div class="modal-back" id="modalBack">
    <div class="modal">
      <div class="modal-head"><h3 id="modalTitle"></h3><button class="modal-x" onclick="closeModal()" aria-label="Yopish">${ICONS.close}</button></div>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>
  <div id="toasts"></div>

  <script src="/app.min.js?v=${APP_VERSION}"></script>
  <script>${script}</script>
</body>
</html>`;
}
