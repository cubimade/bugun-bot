// BUGUN BOT — umumiy klient JS: theme, toast, modal, sparkline, drawer (ROADMAP-6 A2)
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
  return '<span class="trend ' + (up ? "up" : "down") + '" title="o\'tgan davrga nisbatan">' +
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
    b.title = t === "dark" ? "Yorug' rejim" : "Tungi rejim";
  });
}
function toggleTheme() {
  const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch (e) {}
  updateThemeBtns();
}
updateThemeBtns();
// Kursorni kuzatuvchi glow (A5) — delegation, dinamik kartalarda ham ishlaydi
document.addEventListener("mousemove", (e) => {
  const card = e.target.closest && e.target.closest(".glass-glow");
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty("--mx", (e.clientX - r.left) + "px");
  card.style.setProperty("--my", (e.clientY - r.top) + "px");
});

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
    <div>
      <label class="lbl">📝 Izoh (faqat sizga ko'rinadi)</label>
      <textarea class="input" id="noteText" rows="4" maxlength="2000" placeholder="Masalan: narx so'radi, ertaga qo'ng'iroq qilish kerak...">${esc(c.note || "")}</textarea>
      <button class="btn btn-sm" style="margin-top:8px" onclick="saveNote(this)">Izohni saqlash</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:6px">
      <a class="btn btn-primary" href="/dashboard/inbox?contact=${c.id}" style="flex:1;min-width:150px">💬 Suhbatga o'tish</a>
      <button class="btn" onclick="toggleProfilePause()">${c.bot_paused ? "▶️ Botni yoqish" : "🔕 Botni pauza"}</button>
      <button class="btn" style="color:var(--danger)" onclick="confirmDeleteContact()" title="Butunlay o'chirish (GDPR)">🗑</button>
    </div>`;
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
