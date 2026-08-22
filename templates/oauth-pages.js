// ============================================================
//  TEMPLATES/OAUTH-PAGES.JS — OAuth natija sahifalari (ROADMAP-15)
//  Bu sahifalar Instagram'dan qaytgandan keyin ko'rsatiladi, shuning uchun
//  dashboard karkasisiz (sidebar'siz) mustaqil sahifa — lekin bir xil
//  Liquid Glass uslubida (public/app.min.css).
// ============================================================
import { esc, APP_VERSION, ICONS } from "./components.js";

// Umumiy karkas — markazlashtirilgan bitta karta
function shell({ title, body, refreshTo = null, refreshSec = 3 }) {
  return `<!DOCTYPE html>
<html lang="uz" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Bugun Bot</title>
  ${refreshTo ? `<meta http-equiv="refresh" content="${refreshSec};url=${esc(refreshTo)}">` : ""}
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/app.min.css?v=${APP_VERSION}">
  <script>(function(){var t;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)})()</script>
</head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px">
  <div class="card glass-glow" style="max-width:440px;width:100%;padding:32px 28px;text-align:center">
    ${body}
  </div>
</body>
</html>`;
}

// ------------------------------------------------------------
//  MUVAFFAQIYAT — profil rasmi, @username, webhook holati
// ------------------------------------------------------------
export function renderOAuthSuccessPage(profile, subscribed) {
  const handle = profile.username ? "@" + profile.username : profile.name || "Akkaunt";
  const avatar = profile.picture
    ? `<img src="${esc(profile.picture)}" alt="" width="76" height="76" referrerpolicy="no-referrer"
         style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.18)">`
    : `<div class="stat-ic" style="width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#833AB4,#FD1D1D,#FCAF45);color:#fff"><span style="transform:scale(1.6);display:flex">${ICONS.media}</span></div>`;

  const warn = subscribed
    ? ""
    : `<div class="card" style="padding:11px 13px;margin-top:16px;text-align:left;border-color:rgba(251,191,36,.5);background:rgba(251,191,36,.08)">
         <strong class="small" style="display:flex;gap:8px;align-items:center"><span style="color:var(--warn-ap);flex-shrink:0">${ICONS.alert}</span> Webhook obunasi avtomatik yoqilmadi</strong>
         <div class="small muted" style="margin-top:3px">Meta panelida qo'lda yoqish kerak: Instagram → API setup → akkaunt qatorida <strong>Webhook Subscription = On</strong>. Busiz xabarlar botga kelmaydi.</div>
       </div>`;

  // ROADMAP-18 davomi: profil to'liq olinmagan bo'lsa — akkaunt baribir ulandi,
  // faqat username/rasm keyin to'ldirilishini aytamiz (oqim to'xtamaydi)
  const partialNote = profile.partial
    ? `<div class="small muted" style="margin-top:10px">Profil ma'lumotlari (username, rasm) hozircha olinmadi — akkaunt ishlayveradi, ma'lumotlar keyinroq avtomatik to'ldiriladi.</div>`
    : "";

  return shell({
    title: "Ulandi",
    refreshTo: "/dashboard/accounts",
    body: `
    <div style="display:flex;justify-content:center;margin-bottom:14px">${avatar}</div>
    <h1 style="font-size:22px;margin-bottom:4px">${esc(handle)}</h1>
    <div style="display:inline-flex;align-items:center;gap:6px;margin:8px 0 6px;padding:5px 12px;border-radius:99px;
                background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.45);color:#4ade80;font-weight:600;font-size:14px">
      <span class="dot dot-green"></span> Ulandi
    </div>
    <p class="small muted" style="line-height:1.7;margin-top:8px">
      Endi bu akkauntga kelgan DM va kommentlarga bot javob beradi.<br>
      Bilim bazasini to'ldirishni unutmang!
    </p>
    ${partialNote}
    ${warn}
    <div style="display:flex;gap:9px;justify-content:center;margin-top:20px;flex-wrap:wrap">
      <a class="btn btn-primary" href="/dashboard/accounts">Akkauntlarga qaytish</a>
      <a class="btn btn-secondary" href="/dashboard/knowledge">${ICONS.knowledge} Bilim bazasi</a>
    </div>
    <p class="small muted" style="margin-top:14px">3 soniyadan keyin avtomatik qaytamiz…</p>`,
  });
}

// ------------------------------------------------------------
//  XATO — sarlavha, sabab, keyingi qadam
// ------------------------------------------------------------
export function renderOAuthErrorPage(title, message, hint = "") {
  return shell({
    title,
    body: `
    <div style="display:flex;justify-content:center;color:var(--danger);margin-bottom:10px"><span style="transform:scale(1.8);display:flex">${ICONS.alert}</span></div>
    <h1 style="font-size:21px;margin-bottom:8px">${esc(title)}</h1>
    <div class="card" style="padding:11px 13px;margin:12px 0;text-align:left;border-color:rgba(248,113,113,.5);background:rgba(248,113,113,.08)">
      <div class="small">${esc(message)}</div>
    </div>
    ${hint ? `<p class="small muted" style="line-height:1.7;text-align:left">${hint}</p>` : ""}
    <div style="display:flex;gap:9px;justify-content:center;margin-top:18px;flex-wrap:wrap">
      <a class="btn btn-primary" href="/dashboard/connect/instagram">${ICONS.refresh} Qayta urinish</a>
      <a class="btn btn-secondary" href="/dashboard/accounts">Akkauntlar</a>
    </div>`,
  });
}
