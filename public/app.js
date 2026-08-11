// BUGUN BOT — umumiy klient JS: theme, toast, modal, sparkline, drawer (ROADMAP-6 A2)
// DIQQAT: sahifalar app.min.js ni yuklaydi — bu faylni o'zgartirsangiz `npm run minify` yuriting!
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
    case "operator": return "👤 Operator" + (m.sender_label ? ": " + esc(m.sender_label) : "");
    case "automation": return "⚡ Avtomatlashtirish" + (m.sender_label ? ": " + esc(m.sender_label) : "");
    case "broadcast": return "📢 Ommaviy xabar";
    default: return "🤖 Bot (AI)";
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
function emptyState(emoji, text, actionHtml) {
  return `<div class="empty"><span class="emoji">${emoji}</span>${esc(text)}${actionHtml ? `<div style="margin-top:14px">${actionHtml}</div>` : ""}</div>`;
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
  el.innerHTML = '<div class="seg">' + Object.keys(PERIOD_LABELS).map(function (k) {
    return '<button class="' + (k === PERIOD ? "on" : "") + '" data-p="' + k + '">' + PERIOD_LABELS[k] + "</button>";
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
function trendBadge(pct) {
  if (pct == null) return "";
  const up = pct >= 0;
  return '<span class="trend ' + (up ? "up" : "down") + '" data-tip="o\'tgan davrga nisbatan">' +
    (up ? "↑ +" : "↓ ") + pct + "%</span>";
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
    b.textContent = t === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19";
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
  $("drawerHead").innerHTML = `
    ${avatar(c.name || c.ig_user_id, 44)}
    <div style="min-width:0;flex:1">
      <strong style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px">${esc(c.name || c.ig_user_id)}</strong>
      <span class="small muted">ID: ${esc(c.ig_user_id)}</span>
    </div>
    <button class="modal-x" onclick="closeProfile()" aria-label="Yopish">✕</button>`;
  $("drawerBody").innerHTML = `
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${c.bot_paused ? '<span class="badge b-amber">🔕 bot pauzada</span>' : '<span class="badge b-green">🤖 bot faol</span>'}
      ${c.needs_human ? '<span class="badge b-amber">🙋 odam kerak</span>' : ""}
      ${sentimentBadge(c.sentiment)}
      ${(c.tags || []).map((t) => '<span class="badge b-indigo">' + esc(t) + "</span>").join("")}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Xabarlar</div><strong>${c.msg_count ?? 0} ta</strong></div>
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Akkaunt</div><strong class="small">${esc(c.project_name || "—")}</strong></div>
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Birinchi ko'rilgan</div><strong class="small">${fmt(c.first_seen)}</strong></div>
      <div class="drawer-stat"><div class="small muted" style="margin-bottom:3px">Oxirgi faollik</div><strong class="small">${fmt(c.last_seen)}</strong></div>
    </div>
    ${profileAiBlock(c.profile)}
    <div>
      <label class="lbl">📝 Izoh (faqat sizga ko'rinadi)</label>
      <textarea class="input" id="noteText" rows="4" maxlength="2000" placeholder="Masalan: narx so'radi, ertaga qo'ng'iroq qilish kerak...">${esc(c.note || "")}</textarea>
      <button class="btn btn-sm" style="margin-top:8px" onclick="saveNote(this)">Izohni saqlash</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:6px">
      <a class="btn btn-primary" href="/dashboard/inbox?contact=${c.id}" style="flex:1;min-width:150px">💬 Suhbatga o'tish</a>
      <button class="btn" onclick="toggleProfilePause()">${c.bot_paused ? "▶️ Botni yoqish" : "🔕 Botni pauza"}</button>
      <button class="btn" style="color:var(--danger)" onclick="confirmDeleteContact()" data-tip="Butunlay o'chirish (GDPR)">🗑</button>
    </div>`;
}
// 10.6: AI yig'gan mijoz profili (drawer'da)
function profileAiBlock(p) {
  if (!p || typeof p !== "object" || !Object.keys(p).length) return "";
  const labels = { ism: "👤 Ism", telefon: "📞 Telefon", email: "✉️ Email", ehtiyoj: "🎯 Ehtiyoj", byudjet: "💰 Byudjet", shoshilinchlik: "⚡ Shoshilinchlik" };
  const rows = Object.keys(labels)
    .filter((k) => p[k])
    .map((k) => `<div class="small" style="display:flex;gap:6px;padding:3px 0"><span class="muted" style="min-width:110px">${labels[k]}:</span><span style="word-break:break-word">${esc(p[k])}</span></div>`)
    .join("");
  if (!rows) return "";
  return `<div style="background:var(--panel2);border-radius:12px;padding:11px 13px">
    <div class="small" style="font-weight:700;margin-bottom:5px">🤖 AI profil <span class="muted" style="font-weight:400">(suhbatdan yig'ilgan)</span></div>
    ${rows}</div>`;
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

// ===== F2: Kontaktni butunlay o'chirish (GDPR) — tasdiqlash bilan =====
function confirmDeleteContact() {
  const c = PROFILE;
  if (!c) return;
  openModal("🗑 Kontaktni o'chirish", `
    <p style="line-height:1.7;margin-bottom:16px"><strong>${esc(c.name || c.ig_user_id)}</strong> butunlay o'chiriladi:
    barcha xabarlar (${c.msg_count ?? 0} ta), teglar va izohlar ham o'chadi.<br>
    <strong style="color:var(--danger)">Bu amalni ortga qaytarib bo'lmaydi!</strong></p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Bekor qilish</button>
      <button class="btn" style="background:var(--danger);color:#fff;border-color:var(--danger)" onclick="doDeleteContact(${c.id})">🗑 Ha, o'chirilsin</button>
    </div>`);
}
async function doDeleteContact(id) {
  try {
    await api("/api/contacts/" + id, { method: "DELETE" });
    closeModal();
    closeProfile();
    toast("Kontakt butunlay o'chirildi 🗑");
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
          '<span class="ts-ico">👤</span><span class="ts-body"><strong>' + esc(c.name || c.ig_user_id) + "</strong>" +
          '<span class="small muted">' + esc(c.project_name || "") + " · ID: " + esc(c.ig_user_id) + "</span></span></a>");
      });
      (r.messages || []).forEach((m) => {
        const t = String(m.text || "");
        rows.push('<a class="ts-item" href="/dashboard/inbox?contact=' + m.contact_id + '">' +
          '<span class="ts-ico">💬</span><span class="ts-body"><strong>' + esc(m.name || m.ig_user_id) + "</strong>" +
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

// ===== D2: Bildirishnomalar (🔔 — "odam kerak" suhbatlar) =====
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
      new Notification("Bugun Bot", { body: "🙋 Yangi suhbat operator kutmoqda (" + r.count + " ta)" });
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
        '<span class="ts-ico">🙋</span><span class="ts-body"><strong>' + esc(c.name || c.ig_user_id) + "</strong>" +
        '<span class="small muted">' + esc(c.project_name || "") + " · " + timeAgo(c.last_seen) + "</span></span></a>").join("")
    : '<div class="ts-item muted" style="cursor:default">🎉 Hammasi hal qilingan — kutayotgan suhbat yo\'q</div>';
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
