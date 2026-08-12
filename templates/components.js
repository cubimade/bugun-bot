// templates/components.js — qayta ishlatiladigan bo'laklar:
// esc (XSS himoya), SVG ikonlar, sidebar menyu, kontakt profili (drawer) HTML
export const APP_VERSION = "12.1.0";

// HTML uchun xavfsiz matn (XSS oldini olish)
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ------------------------------------------------------------
//  SVG ikonlar (sidebar va sahifalar uchun) — stroke: currentColor
// ------------------------------------------------------------
export const I = (paths, vb = "0 0 24 24") =>
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
  key: I('<circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4"/><path d="M18 5l2 2"/><path d="M15 8l2 2"/>'),
  flow: I('<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M5 8.5v2a3 3 0 0 0 3 3h1.5"/><path d="M19 8.5v2a3 3 0 0 1-3 3h-1.5"/><path d="M12 13.5v2"/>'),
  pipeline: I('<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="5" height="7" rx="1.5"/>'),
  media: I('<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/>'),
  calendar: I('<rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  card: I('<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/>'),
  flask: I('<path d="M10 2v6L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8V2"/><path d="M8.5 2h7"/><path d="M7 15h10"/>'),

  // ROADMAP-17 FAZA 2.1 — interfeys chrome va bo'sh holat ikonkalari (emoji o'rniga)
  close: I('<path d="M18 6L6 18M6 6l12 12"/>'),
  sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>'),
  moon: I('<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>'),
  bell: I('<path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 8-2.5 8h17S18 14 18 8z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>'),
  bellOff: I('<path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 8-2.5 8h17S18 14 18 8z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/><path d="M3 3l18 18"/>'),
  chevronRight: I('<path d="M9 18l6-6-6-6"/>'),
  server: I('<rect x="2" y="3" width="20" height="7" rx="1.5"/><rect x="2" y="14" width="20" height="7" rx="1.5"/><circle cx="6" cy="6.5" r=".8" fill="currentColor" stroke="none"/><circle cx="6" cy="17.5" r=".8" fill="currentColor" stroke="none"/>'),
  zap: I('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
  receipt: I('<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 7h6M9 11h6M9 15h4"/>'),
  chartBar: I('<path d="M3 21h18"/><rect x="6" y="11" width="3.5" height="8"/><rect x="13" y="6" width="3.5" height="13"/>'),
  funnel: I('<path d="M3 4h18l-7 9v6l-4 2v-8L3 4z"/>'),
  trendingUp: I('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  helpCircle: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.7"/><path d="M12 17h.01"/>'),
  dollarSign: I('<path d="M12 2v20"/><path d="M17 6.5c0-1.9-2.2-3-5-3s-5 1.2-5 3 2.2 2.6 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"/>'),
  puzzle: I('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>'),
  messageCircle: I('<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 20l1.1-5.5a8.4 8.4 0 0 1-1-4A8.5 8.5 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z"/>'),
  chartPie: I('<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>'),
  lightbulb: I('<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>'),
  phone: I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2.1z"/>'),
  mail: I('<rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="M2 7l10 6 10-6"/>'),
  target: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>'),
  cpu: I('<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>'),
  person: I('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"/>'),
  play: I('<path d="M6 4l14 8-14 8V4z"/>'),
  pencil: I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
  thumbsUp: I('<path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3z"/><path d="M7 10l4.5-7a1.7 1.7 0 0 1 3 1.4L14 9h5.3a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.9 20H7"/>'),
  flag: I('<path d="M4 22V4"/><path d="M4 4h14l-3 4 3 4H4"/>'),
};

// ------------------------------------------------------------
//  Sidebar menyu bandlari
// ------------------------------------------------------------
export const NAV_ITEMS = [
  { key: "dashboard", label: "Boshqaruv", href: "/dashboard", icon: "dashboard" },
  { key: "inbox", label: "Suhbatlar", href: "/dashboard/inbox", icon: "inbox" },
  { key: "contacts", label: "Kontaktlar", href: "/dashboard/contacts", icon: "contacts" },
  { key: "insights", label: "Tahlil", href: "/dashboard/insights", icon: "insights" },
  { key: "abtests", label: "A/B test", href: "/dashboard/ab-tests", icon: "flask" },
  { key: "flows", label: "Oqimlar", href: "/dashboard/flows", icon: "flow" },
  { key: "pipeline", label: "Voronka", href: "/dashboard/pipeline", icon: "pipeline" },
  { key: "bookings", label: "Bronlar", href: "/dashboard/bookings", icon: "calendar" },
  { key: "sales", label: "Sotuv", href: "/dashboard/sales", icon: "card" },
  { key: "broadcast", label: "Broadcast", href: "/dashboard/broadcast", icon: "broadcast" },
  { key: "knowledge", label: "Bilim bazasi", href: "/dashboard/knowledge", icon: "knowledge" },
  { key: "media", label: "Media", href: "/dashboard/media", icon: "media" },
  { key: "keywords", label: "Kalit so'zlar", href: "/dashboard/keywords", icon: "key" },
  { key: "accounts", label: "Akkauntlar", href: "/dashboard/accounts", icon: "accounts" },
  { key: "settings", label: "Sozlamalar", href: "/dashboard/settings", icon: "settings" },
];

// ROADMAP-17 FAZA 3.1 — yon menyu guruhlari (bo'lim yorliqlari bilan)
export const NAV_GROUPS = [
  { label: "Ish", keys: ["dashboard", "inbox", "contacts", "pipeline", "bookings"] },
  { label: "Avtomatlashtirish", keys: ["flows", "keywords", "knowledge", "broadcast"] },
  { label: "Tahlil", keys: ["insights", "abtests", "sales"] },
  { label: "Sozlash", keys: ["media", "accounts", "settings"] },
];

// ------------------------------------------------------------
//  KONTAKT PROFILI (drawer) — HTML karkasi.
//  CSS/JS qismi public/app.css va public/app.js da (global).
// ------------------------------------------------------------
export const DRAWER_HTML = `
  <div class="drawer-back" id="drawerBack" onclick="closeProfile()"></div>
  <aside class="drawer" id="drawer" aria-label="Kontakt profili">
    <div class="drawer-head" id="drawerHead"></div>
    <div class="drawer-body" id="drawerBody"></div>
  </aside>`;
