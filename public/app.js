// BUGUN BOT — umumiy klient JS: theme, toast, modal, sparkline, drawer (ROADMAP-6 A2)
// DIQQAT: sahifalar app.min.js ni yuklaydi — bu faylni o'zgartirsangiz `npm run minify` yuriting!
// ROADMAP-17 FAZA 2.1 — app.js server ICONS'ni import qila olmaydi (module emas), shu uchun
// bu yerda ishlatiladigan bir nechta ikonka client tomonda takrorlanadi.
const JI = (paths) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const JICONS = {
  sun: JI('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>'),
  moon: JI('<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>'),
  close: JI('<path d="M18 6L6 18M6 6l12 12"/>'),
  person: JI('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"/>'),
  chat: JI('<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 20l1.1-5.5a8.4 8.4 0 0 1-1-4A8.5 8.5 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z"/>'),
  phone: JI('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2.1z"/>'),
  mail: JI('<rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="M2 7l10 6 10-6"/>'),
  target: JI('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>'),
  dollar: JI('<path d="M12 2v20"/><path d="M17 6.5c0-1.9-2.2-3-5-3s-5 1.2-5 3 2.2 2.6 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"/>'),
  zap: JI('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
  cpu: JI('<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>'),
  bellOff: JI('<path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 8-2.5 8h17S18 14 18 8z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/><path d="M3 3l18 18"/>'),
  play: JI('<path d="M6 4l14 8-14 8V4z"/>'),
  pencil: JI('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
  trash: JI('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  flag: JI('<path d="M4 22V4"/><path d="M4 4h14l-3 4 3 4H4"/>'),
  alert: JI('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
};
const $ = (id) => document.getElementById(id);
const esc = (s) => { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; };
// ROADMAP-18 FAZA 5.2: sanalar brauzer zonasida emas, sozlangan zonada
// (sukut bo'yicha Asia/Tashkent) ko'rsatiladi — window.TZ layout'dan keladi
const fmt = (d) => {
  if (!d) return "—";
  const o = { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" };
  try { return new Date(d).toLocaleString("uz-UZ", { ...o, timeZone: window.TZ || "Asia/Tashkent" }); }
  catch (e) { return new Date(d).toLocaleString("uz-UZ", o); }
};
function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "hozirgina";
  if (s < 3600) return Math.floor(s / 60) + " daqiqa oldin";
  if (s < 86400) return Math.floor(s / 3600) + " soat oldin";
  if (s < 604800) return Math.floor(s / 86400) + " kun oldin";
  return new Date(d).toLocaleDateString("uz-UZ");
}
// ROADMAP-18 FAZA 4: AI blok 48 soatdan eski bo'lsa — sariq ogohlantirish
// lentasi + "Hozir yangilash" tugmasi. refreshJs — bosilganda bajariladigan
// JS ifoda (masalan "loadInsights(true)"). Yangi bo'lsa bo'sh satr qaytadi.
function staleBanner(cachedAt, refreshJs) {
  if (!cachedAt) return "";
  const ageH = (Date.now() - new Date(cachedAt).getTime()) / 3600000;
  if (ageH < 48) return "";
  const days = Math.floor(ageH / 24);
  return '<div class="stale-banner">⚠ ' + (days >= 1 ? days + " kun" : Math.floor(ageH) + " soat") +
    ' oldin yangilangan — ma\'lumot eskirgan' +
    (refreshJs ? ' <button class="btn btn-sm" style="margin-left:8px" onclick="' + refreshJs.replace(/"/g, "&quot;") + '">Hozir yangilash</button>' : "") +
    "</div>";
}
async function api(path, opts) {
  const r = await fetch(path, opts);
  if (!r.ok) {
    let m = "HTTP " + r.status, body = null;
    try { body = await r.json(); m = body.error || m; } catch (e) {}
    const err = new Error(m);
    // 16: to'liq javob ham qo'shiladi (masalan flow tekshiruv xatolari ro'yxati)
    err.body = body;
    if (body && Array.isArray(body.problems)) err.problems = body.problems;
    throw err;
  }
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
  const st = size ? `width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px;` : "";
  return `<span class="avatar" style="background:${c};${st}">${esc(n.trim().charAt(0).toUpperCase() || "?")}</span>`;
}
// ===== Mijozni ko'rsatish (ROADMAP-16 2.1) =====
// Kontaktlar, Suhbatlar, Voronka, Broadcast — HAMMASI shu 3 ta funksiyani
// ishlatadi, shuning uchun mijoz hamma joyda bir xil ko'rinadi.
// Tartib: @username → to'liq ism → operator qo'ygan nom → qisqartirilgan ID.
function contactTitle(c) {
  if (!c) return "Noma'lum";
  if (c.username) return "@" + c.username;
  if (c.full_name) return c.full_name;
  if (c.name && !/^[0-9]+$/.test(String(c.name))) return c.name;
  const id = String(c.ig_user_id || "");
  return id ? "…" + id.slice(-6) : "Noma'lum"; // raqamli ID — qisqartirilgan
}
// Ikkinchi qator: ism (username bo'lsa) yoki qisqartirilgan ID
function contactSubtitle(c) {
  if (!c) return "";
  if (c.username && c.full_name) return c.full_name;
  const id = String(c.ig_user_id || "");
  return id ? "…" + id.slice(-6) : "";
}
// Profil rasmi bo'lsa — rasm, bo'lmasa harfli avatar (eski ko'rinish)
function contactAvatar(c, size) {
  const s = size || 38;
  if (c && c.profile_pic) {
    // Meta profil rasmi URL'i vaqtinchalik — muddati tugasa rasm ochilmaydi.
    // Shunday holatda harfli avatarga qaytamiz (bo'sh kvadrat qolmasin).
    const fallback = avatar(contactTitle(c), s).replace(/"/g, "&quot;");
    return `<img class="avatar" src="${esc(c.profile_pic)}" alt="" referrerpolicy="no-referrer" loading="lazy"
      style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover"
      onerror="this.outerHTML='${fallback.replace(/'/g, "&#39;")}'">`;
  }
  return avatar(contactTitle(c), s);
}

// ===== Xabarni kim yozgani (ROADMAP-16 2.2) =====
function senderLabel(m, contact) {
  const type = m.sender_type || (m.role === "user" ? "contact" : m.is_operator ? "operator" : "ai");
  switch (type) {
    case "contact": return esc(contactTitle(contact));
    case "operator": return JICONS.person + " Operator" + (m.sender_label ? ": " + esc(m.sender_label) : "");
    case "automation": return JICONS.zap + " Avtomatlashtirish" + (m.sender_label ? ": " + esc(m.sender_label) : "");
    case "broadcast": return "Ommaviy xabar";
    default: return JICONS.cpu + " Bot (AI)";
  }
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
  return Array.from({ length: n || 3 }, () => `<div class="skeleton" style="height:${h || 56}px;margin-bottom:10px;"></div>`).join("");
}
// ROADMAP-17 FAZA 2/3 — icon endi SVG (masalan ICONS.contacts), emoji emas
function emptyState(icon, text, actionHtml) {
  return `<div class="empty"><span class="empty-ic">${icon}</span>${esc(text)}${actionHtml ? `<div style="margin-top:14px">${actionHtml}</div>` : ""}</div>`;
}
// Sidebar (mobil)
function toggleSidebar(open) {
  $("sidebar").classList.toggle("open", open);
  $("overlay").classList.toggle("show", open);
}
// 5-bosqich: vaqt filtri — tanlov localStorage'da saqlanadi
let PERIOD = "7d";
try { PERIOD = localStorage.getItem("period") || "7d"; } catch (e) {}
const PERIOD_LABELS = { today: "Bugun", "7d": "7 kun", "30d": "30 kun", all: "Hammasi" };
function renderPeriodSeg(el, onChange) {
  if (!el) return;
  el.innerHTML = '<div class="segmented">' + Object.keys(PERIOD_LABELS).map(function (k) {
    return '<button aria-pressed="' + (k === PERIOD) + '" data-p="' + k + '">' + PERIOD_LABELS[k] + "</button>";
  }).join("") + "</div>";
  el.querySelectorAll("button").forEach(function (b) {
    b.onclick = function () {
      PERIOD = b.dataset.p;
      try { localStorage.setItem("period", PERIOD); } catch (e) {}
      renderPeriodSeg(el, onChange);
      onChange(PERIOD);
    };
  });
}
// Trend belgisi: ↑ +12% (yashil) / ↓ -5% (qizil)
// ROADMAP-18 FAZA 5.3: kichik bazada foiz aldamchi (+14425%) — server endi
// {kind:"pct"|"abs"|"new", value} obyektini yuboradi. Eski son formati ham ishlaydi.
function trendBadge(t) {
  if (t == null) return "";
  if (typeof t === "number") t = { kind: "pct", value: t };
  if (t.kind === "new") return '<span class="trend up" data-tip="o\'tgan davrda 0 edi">yangi</span>';
  const up = t.value >= 0;
  const label = t.kind === "abs"
    ? (up ? "↑ +" : "↓ ") + t.value + " ta"
    : (up ? "↑ +" : "↓ ") + t.value + "%";
  return '<span class="trend ' + (up ? "up" : "down") + '" data-tip="o\'tgan davrga nisbatan' +
    (t.kind === "abs" ? " (baza kichik — foiz o\'rniga son)" : "") + '">' + label + "</span>";
}
// Sparkline — 7 kunlik mini-grafik (sof SVG, 40px, gradient)
let SPARK_SEQ = 0;
function sparkline(values, colorVar) {
  const v = (values && values.length > 1) ? values : [0, 0];
  const W = 120, H = 36;
  const max = Math.max(1, Math.max.apply(null, v));
  const pts = v.map(function (n, i) {
    return (i * (W / (v.length - 1))).toFixed(1) + "," + (H - 3 - (n / max) * (H - 8)).toFixed(1);
  }).join(" ");
  const gid = "sg" + (++SPARK_SEQ);
  const c = colorVar || "var(--accent)";
  return '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="40" preserveAspectRatio="none" style="display:block;overflow:visible">' +
    '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" style="stop-color:' + c + ';stop-opacity:.28"/>' +
    '<stop offset="100%" style="stop-color:' + c + ';stop-opacity:0"/></linearGradient></defs>' +
    '<polygon points="0,' + H + " " + pts + " " + W + "," + H + '" fill="url(#' + gid + ')"/>' +
    '<polyline points="' + pts + '" fill="none" style="stroke:' + c + '" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
}
// Light/Dark theme almashtirgich (A0) — localStorage'da saqlanadi
function updateThemeBtns() {
  const t = document.documentElement.getAttribute("data-theme");
  document.querySelectorAll(".theme-btn").forEach((b) => {
    b.innerHTML = t === "dark" ? JICONS.sun : JICONS.moon;
    b.setAttribute("data-tip", t === "dark" ? "Yorug' rejim" : "Tungi rejim");
  });
}
function toggleTheme() {
  const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch (e) {}
  updateThemeBtns();
}
updateThemeBtns();
// ===== Tooltip (ROADMAP-16 1.2) =====
// Kursorni kuzatuvchi ko'k glow OLIB TASHLANDI (foydalanuvchi "keraksiz" dedi).
// O'rniga: brauzerning native title tooltip'i o'rniga o'z bubble'imiz.
// Elementlarda title= emas, data-tip= ishlatiladi.
let TIP_EL = null;
function hideTip() {
  if (TIP_EL) TIP_EL.classList.remove("show");
}
function showTip(target) {
  const text = target.getAttribute("data-tip");
  if (!text) return;
  if (!TIP_EL) {
    TIP_EL = document.createElement("div");
    TIP_EL.className = "tip-bubble";
    document.body.appendChild(TIP_EL);
  }
  TIP_EL.textContent = text;
  TIP_EL.classList.add("show");
  // Joylashuv: element ustida markazda, ekrandan chiqib ketmasin
  const r = target.getBoundingClientRect();
  const b = TIP_EL.getBoundingClientRect();
  let left = r.left + r.width / 2 - b.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - b.width - 8));
  let top = r.top - b.height - 8;
  if (top < 8) top = r.bottom + 8; // joy bo'lmasa — ostiga
  TIP_EL.style.left = Math.round(left) + "px";
  TIP_EL.style.top = Math.round(top) + "px";
}
document.addEventListener("mouseover", (e) => {
  const t = e.target.closest && e.target.closest("[data-tip]");
  if (t) showTip(t);
});
document.addEventListener("mouseout", (e) => {
  if (e.target.closest && e.target.closest("[data-tip]")) hideTip();
});
document.addEventListener("focusin", (e) => {
  const t = e.target.closest && e.target.closest("[data-tip]");
  if (t) showTip(t);
});
document.addEventListener("focusout", hideTip);
window.addEventListener("scroll", hideTip, true);

// ===== Kontakt profili (drawer) =====
let PROFILE = null;
function sentimentBadge(s) {
  if (s === "positive") return '<span class="pill pill-ok">ijobiy</span>';
  if (s === "negative") return '<span class="pill pill-danger">salbiy</span>';
  if (s === "neutral") return '<span class="pill pill-plain">neytral</span>';
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
    $("drawerBody").innerHTML = emptyState(JICONS.alert, "Profil yuklanmadi: " + e.message);
  }
}
function renderProfile() {
  const c = PROFILE;
  $("drawerHead").innerHTML = `
    ${avatar(c.name || c.ig_user_id, 44)}
    <div style="min-width:0;flex:1">
      <strong style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px">${esc(c.name || c.ig_user_id)}</strong>
      <span class="small muted">ID: ${esc(c.ig_user_id)}</span>
    </div>
    <button class="modal-x" onclick="closeProfile()" aria-label="Yopish">${JICONS.close}</button>`;
  $("drawerBody").innerHTML = `
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${c.bot_paused ? '<span class="pill pill-warn">bot pauzada</span>' : '<span class="pill pill-ok">bot faol</span>'}
      ${c.needs_human ? '<span class="pill pill-warn">odam kerak</span>' : ""}
      ${sentimentBadge(c.sentiment)}
      ${(c.tags || []).map((t) => '<span class="pill pill-plain">' + esc(t) + "</span>").join("")}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Xabarlar</div><strong>${c.msg_count ?? 0} ta</strong></div>
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Akkaunt</div><strong class="small">${esc(c.project_name || "—")}</strong></div>
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Birinchi ko'rilgan</div><strong class="small">${fmt(c.first_seen)}</strong></div>
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Oxirgi faollik</div><strong class="small">${fmt(c.last_seen)}</strong></div>
    </div>
    ${profileAiBlock(c.profile)}
    <div>
      <label class="lbl">Izoh (faqat sizga ko'rinadi)</label>
      <textarea class="input" id="noteText" rows="4" maxlength="2000" placeholder="Masalan: narx so'radi, ertaga qo'ng'iroq qilish kerak...">${esc(c.note || "")}</textarea>
      <button class="btn btn-sm" style="margin-top:8px" onclick="saveNote(this)">Izohni saqlash</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:6px">
      <a class="btn btn-primary" href="/dashboard/inbox?contact=${c.id}" style="flex:1;min-width:150px">${JICONS.chat} Suhbatga o'tish</a>
      <button class="btn" onclick="toggleProfilePause()">${c.bot_paused ? JICONS.play + " Botni yoqish" : JICONS.bellOff + " Botni pauza"}</button>
      <button class="btn" style="color:var(--danger)" onclick="confirmDeleteContact()" data-tip="Butunlay o'chirish (GDPR)">${JICONS.trash}</button>
    </div>`;
}
// 10.6: AI yig'gan mijoz profili (drawer'da)
function profileAiBlock(p) {
  if (!p || typeof p !== "object" || !Object.keys(p).length) return "";
  const labels = { ism: "Ism", telefon: "Telefon", email: "Email", ehtiyoj: "Ehtiyoj", byudjet: "Byudjet", shoshilinchlik: "Shoshilinchlik" };
  const rows = Object.keys(labels)
    .filter((k) => p[k])
    .map((k) => `<div class="small" style="display:flex;gap:6px;padding:3px 0"><span class="muted" style="min-width:110px">${labels[k]}:</span><span style="word-break:break-word">${esc(p[k])}</span></div>`)
    .join("");
  if (!rows) return "";
  return `<div style="background:var(--panel2);border-radius:12px;padding:11px 13px">
    <div class="small" style="font-weight:600;margin-bottom:5px;display:flex;align-items:center;gap:6px">${JICONS.cpu} AI profil <span class="muted" style="font-weight:400">(suhbatdan yig'ilgan)</span></div>
    ${rows}</div>`;
}
async function saveNote(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/contacts/" + PROFILE.id + "/note", { note: $("noteText").value });
    toast("Izoh saqlandi");
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
    toast(v ? "Bot pauza qilindi — endi siz gaplashasiz" : "Bot qayta yoqildi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function closeProfile() {
  $("drawerBack").classList.remove("show");
  $("drawer").classList.remove("show");
}

// ===== F2: Kontaktni butunlay o'chirish (GDPR) — tasdiqlash bilan =====
function confirmDeleteContact() {
  const c = PROFILE;
  if (!c) return;
  openModal("Kontaktni o'chirish", `
    <p style="line-height:1.7;margin-bottom:16px"><strong>${esc(c.name || c.ig_user_id)}</strong> butunlay o'chiriladi:
    barcha xabarlar (${c.msg_count ?? 0} ta), teglar va izohlar ham o'chadi.<br>
    <strong style="color:var(--danger)">Bu amalni ortga qaytarib bo'lmaydi!</strong></p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Bekor qilish</button>
      <button class="btn" style="background:var(--danger);color:#fff;border-color:var(--danger)" onclick="doDeleteContact(${c.id})">Ha, o'chirilsin</button>
    </div>`);
}
async function doDeleteContact(id) {
  try {
    await api("/api/contacts/" + id, { method: "DELETE" });
    closeModal();
    closeProfile();
    toast("Kontakt butunlay o'chirildi");
    setTimeout(() => location.reload(), 700);
  } catch (e) { toast("Xatolik: " + e.message, false); }
}

// ===== D1: Global qidiruv (topbar) =====
let SEARCH_TIMER = null;
function onGlobalSearch() {
  clearTimeout(SEARCH_TIMER);
  const q = ($("globalSearch")?.value || "").trim();
  const drop = $("searchDrop");
  if (!drop) return;
  if (q.length < 2) { drop.classList.remove("show"); return; }
  SEARCH_TIMER = setTimeout(async () => {
    try {
      const r = await api("/api/search?q=" + encodeURIComponent(q));
      const rows = [];
      (r.contacts || []).forEach((c) => {
        rows.push('<a class="ts-item" href="/dashboard/inbox?contact=' + c.id + '">' +
          '<span class="ts-ico">' + JICONS.person + '</span><span class="ts-body"><strong>' + esc(c.name || c.ig_user_id) + "</strong>" +
          '<span class="small muted">' + esc(c.project_name || "") + " · ID: " + esc(c.ig_user_id) + "</span></span></a>");
      });
      (r.messages || []).forEach((m) => {
        const t = String(m.text || "");
        rows.push('<a class="ts-item" href="/dashboard/inbox?contact=' + m.contact_id + '">' +
          '<span class="ts-ico">' + JICONS.chat + '</span><span class="ts-body"><strong>' + esc(m.name || m.ig_user_id) + "</strong>" +
          '<span class="small muted">' + esc(t.length > 70 ? t.slice(0, 70) + "…" : t) + "</span></span></a>");
      });
      drop.innerHTML = rows.length ? rows.join("") :
        '<div class="ts-item muted" style="cursor:default">Hech narsa topilmadi</div>';
      drop.classList.add("show");
    } catch (e) { /* jim */ }
  }, 300);
}
document.addEventListener("click", (e) => {
  const box = $("topSearch");
  if (box && !box.contains(e.target)) $("searchDrop")?.classList.remove("show");
});
// E2: klaviatura yorliqlari — "/" yoki Ctrl+K: qidiruv, Esc: hammasi yopiladi
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) {
    e.preventDefault();
    $("globalSearch")?.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    $("globalSearch")?.focus();
  }
  if (e.key === "Escape") {
    $("searchDrop")?.classList.remove("show");
    $("notifDrop")?.classList.remove("show");
    if (typeof closeProfile === "function") closeProfile();
  }
});

// ===== D2: Bildirishnomalar ("odam kerak" suhbatlar) =====
let NOTIF_LAST_COUNT = null;
async function refreshNotifs() {
  const btn = $("notifBtn");
  if (!btn) return;
  try {
    const r = await api("/api/notifications");
    const cnt = $("notifCount");
    if (r.count > 0) {
      cnt.textContent = r.count > 9 ? "9+" : r.count;
      cnt.style.display = "";
    } else cnt.style.display = "none";
    // Brauzer bildirishnomasi — soni oshganda (ruxsat berilgan bo'lsa)
    if (NOTIF_LAST_COUNT != null && r.count > NOTIF_LAST_COUNT &&
        typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Bugun Bot", { body: "Yangi suhbat operator kutmoqda (" + r.count + " ta)" });
    }
    NOTIF_LAST_COUNT = r.count;
    window.NOTIF_ITEMS = r.items || [];
  } catch (e) { /* jim */ }
}
function toggleNotifs() {
  const drop = $("notifDrop");
  if (!drop) return;
  if (drop.classList.contains("show")) { drop.classList.remove("show"); return; }
  // Birinchi ochilishda brauzer ruxsatini so'raymiz (ixtiyoriy)
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
  const items = window.NOTIF_ITEMS || [];
  drop.innerHTML = items.length
    ? items.map((c) => '<a class="ts-item" href="/dashboard/inbox?contact=' + c.id + '">' +
        '<span class="ts-ico">' + JICONS.flag + '</span><span class="ts-body"><strong>' + esc(c.name || c.ig_user_id) + "</strong>" +
        '<span class="small muted">' + esc(c.project_name || "") + " · " + timeAgo(c.last_seen) + "</span></span></a>").join("")
    : '<div class="ts-item muted" style="cursor:default">Hammasi hal qilingan — kutayotgan suhbat yo\'q</div>';
  drop.classList.add("show");
}
document.addEventListener("click", (e) => {
  const btn = $("notifBtn"), drop = $("notifDrop");
  if (drop && btn && !btn.contains(e.target) && !drop.contains(e.target)) drop.classList.remove("show");
});
if ($("notifBtn")) { refreshNotifs(); setInterval(refreshNotifs, 30000); }

// ===== 12.1: joriy foydalanuvchi va rolga qarab nav =====
window.ME = null;
(async () => {
  if (!document.querySelector(".nav")) return;
  try {
    const r = await api("/api/me");
    window.ME = r.user;
    if (r.user.role === "operator") {
      document.querySelectorAll(".nav a").forEach((a) => {
        const k = a.dataset.nav;
        if (k && !["inbox", "contacts"].includes(k)) a.style.display = "none";
      });
    }
  } catch (e) { /* legacy rejim — hammasi ko'rinadi */ }
})();
