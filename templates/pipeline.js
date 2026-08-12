// templates/pipeline.js — 8.5: Sotuv voronkasi (kanban) sahifasi
// 5 ustun: Yangi / Qiziqqan / Muzokara / Sotildi / Yo'q
// Sudrab ko'chirish — pointer events (mobil'da ham ishlaydi)
import { renderLayout } from "./layout.js";
import { DRAWER_HTML } from "./components.js";

export function renderPipelinePage() {
  const content = `
  <div id="pipeStats" style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px" class="small muted"></div>
  <div class="pipe-board" id="pipeBoard">
    <div class="skeleton" style="height:300px;flex:1"></div>
    <div class="skeleton" style="height:300px;flex:1"></div>
    <div class="skeleton" style="height:300px;flex:1"></div>
  </div>
  ${DRAWER_HTML}

  <style>
    .pipe-board { display:flex; gap:10px; align-items:flex-start; overflow-x:auto; padding-bottom:14px; }
    .pipe-col { min-width:230px; width:230px; flex-shrink:0; background:var(--panel); border:1px solid var(--border);
      border-radius:14px; display:flex; flex-direction:column; max-height:calc(100vh - 240px); }
    .pipe-col.dragover { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent); }
    .pipe-col-head { padding:10px 12px; border-bottom:1px solid var(--border); }
    .pipe-col-body { padding:8px; overflow-y:auto; display:grid; gap:8px; min-height:60px; }
    .pipe-card { background:var(--panel2); border:1px solid var(--border); border-radius:11px; padding:9px 11px;
      cursor:grab; user-select:none; touch-action:none; }
    .pipe-card.ghost { position:fixed; z-index:99; width:214px; opacity:.9; pointer-events:none;
      box-shadow:0 10px 30px rgba(0,0,0,.35); cursor:grabbing; transform:rotate(2deg); }
    .pipe-card.lifting { opacity:.35; }
    .pipe-sum { font-weight:600; }
  </style>`;

  const script = `
function ic(paths, w) { return '<svg class="ic" style="width:' + (w || 14) + 'px;height:' + (w || 14) + 'px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>'; }
const SVG = {
  sparkle: ic('<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>'),
  zap: ic('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
  message: ic('<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 20l1.1-5.5a8.4 8.4 0 0 1-1-4A8.5 8.5 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z"/>'),
  check: ic('<path d="M20 6L9 17l-5-5"/>'),
  close: ic('<path d="M18 6L6 18M6 6l12 12"/>'),
  person: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"/>'),
  trendingUp: ic('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  dollar: ic('<path d="M12 2v20"/><path d="M17 6.5c0-1.9-2.2-3-5-3s-5 1.2-5 3 2.2 2.6 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"/>'),
  clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
  cpu: ic('<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>'),
  alert: ic('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
};
const STAGE_META = {
  new:         { label: "Yangi",     icon: SVG.sparkle,    color: "var(--muted)" },
  interested:  { label: "Qiziqqan",  icon: SVG.zap,         color: "#f59e0b" },
  negotiation: { label: "Muzokara",  icon: SVG.message,     color: "#6366f1" },
  won:         { label: "Sotildi",   icon: SVG.check,       color: "#10b981" },
  lost:        { label: "Yo'q",      icon: SVG.close,       color: "#f43f5e" },
};
let CONTACTS = [], STATS = [];
const fmtSum = function (n) { return n ? Number(n).toLocaleString("uz-UZ") + " so'm" : ""; };

async function loadPipeline() {
  try {
    const r = await api("/api/pipeline");
    CONTACTS = r.contacts || [];
    STATS = r.stats || [];
    renderBoard();
  } catch (e) { $("pipeBoard").innerHTML = emptyState(SVG.alert, "Yuklashda xatolik: " + e.message); }
}
function renderBoard() {
  const byStage = {};
  Object.keys(STAGE_META).forEach(function (s) { byStage[s] = []; });
  CONTACTS.forEach(function (c) { (byStage[c.stage] || byStage.new).push(c); });

  // Yuqori statistika: konversiya va jami summa
  const total = CONTACTS.length;
  const won = byStage.won.length, lost = byStage.lost.length;
  const conv = (won + lost) ? Math.round((won / (won + lost)) * 100) : 0;
  const allSum = CONTACTS.reduce(function (a, c) { return a + (Number(c.deal_amount) || 0); }, 0);
  const wonSum = byStage.won.reduce(function (a, c) { return a + (Number(c.deal_amount) || 0); }, 0);
  $("pipeStats").innerHTML =
    '<span style="display:inline-flex;align-items:center;gap:5px">' + SVG.person + "Jami: <strong>" + total + "</strong></span>" +
    '<span style="display:inline-flex;align-items:center;gap:5px">' + SVG.trendingUp + "Konversiya (sotildi/yakunlangan): <strong>" + conv + "%</strong></span>" +
    '<span style="display:inline-flex;align-items:center;gap:5px">' + SVG.dollar + "Voronkada: <strong>" + (fmtSum(allSum) || "0") + "</strong></span>" +
    '<span style="display:inline-flex;align-items:center;gap:5px">' + SVG.check + "Sotilgan summa: <strong>" + (fmtSum(wonSum) || "0") + "</strong></span>";

  $("pipeBoard").innerHTML = Object.keys(STAGE_META).map(function (s) {
    const meta = STAGE_META[s];
    const list = byStage[s];
    const sum = list.reduce(function (a, c) { return a + (Number(c.deal_amount) || 0); }, 0);
    const st = STATS.find(function (x) { return x.stage === s; });
    const avgD = st && st.avg_days ? Math.round(st.avg_days * 10) / 10 : null;
    return '<div class="pipe-col" data-stage="' + s + '">' +
      '<div class="pipe-col-head">' +
        '<div style="display:flex;align-items:center;gap:8px"><strong style="color:' + meta.color + ';display:inline-flex;align-items:center;gap:5px">' + meta.icon + meta.label + '</strong>' +
        '<span class="pill pill-plain">' + list.length + "</span></div>" +
        '<div class="small muted" style="margin-top:3px;display:flex;align-items:center;gap:4px">' + (sum ? SVG.dollar + fmtSum(sum) : "—") +
        (avgD != null ? " · " + SVG.clock + "o'rt. " + avgD + " kun" : "") + "</div>" +
      "</div>" +
      '<div class="pipe-col-body" data-stage="' + s + '">' +
        (list.length ? list.map(cardHtml).join("") : '<div class="small muted" style="text-align:center;padding:14px 0">Bo\\'sh</div>') +
      "</div></div>";
  }).join("");
}
function cardHtml(c) {
  const t = String(c.last_text || "");
  return '<div class="pipe-card" data-cid="' + c.id + '">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">' + avatar(c.name || c.ig_user_id, 26) +
      '<strong class="small" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.name || c.ig_user_id) + "</strong>" +
      '<span class="pipe-money" data-amid="' + c.id + '" title="Summa" style="cursor:pointer;display:inline-flex">' + SVG.dollar + "</span></div>" +
    (t ? '<div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:5px">' + esc(t.length > 42 ? t.slice(0, 42) + "…" : t) + "</div>" : "") +
    (c.profile && (c.profile.ehtiyoj || c.profile.byudjet)
      ? '<div class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:5px;display:flex;align-items:center;gap:4px" title="AI profil">' + SVG.cpu +
        esc([c.profile.ehtiyoj, c.profile.byudjet].filter(Boolean).join(" · ").slice(0, 46)) + "</div>"
      : "") +
    '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">' +
      (c.deal_amount ? '<span class="pill pill-ok">' + fmtSum(c.deal_amount) + "</span>" : "") +
      (c.tags || []).slice(0, 3).map(function (tg) { return '<span class="pill pill-plain">' + esc(tg) + "</span>"; }).join("") +
      '<span style="flex:1"></span><span class="small muted">' + timeAgo(c.last_seen) + "</span>" +
    "</div></div>";
}

// ---------- Drag & drop (pointer events) ----------
let DND = null;
document.addEventListener("pointerdown", function (e) {
  const money = e.target.closest(".pipe-money");
  if (money) return; // summa tugmasi — drag emas
  const card = e.target.closest(".pipe-card");
  if (!card || card.classList.contains("ghost")) return;
  DND = { cid: Number(card.dataset.cid), card: card, sx: e.clientX, sy: e.clientY, ghost: null, moved: false };
});
document.addEventListener("pointermove", function (e) {
  if (!DND) return;
  const dx = e.clientX - DND.sx, dy = e.clientY - DND.sy;
  if (!DND.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
  if (!DND.ghost) {
    DND.moved = true;
    DND.ghost = DND.card.cloneNode(true);
    DND.ghost.classList.add("ghost");
    document.body.appendChild(DND.ghost);
    DND.card.classList.add("lifting");
  }
  DND.ghost.style.left = (e.clientX - 107) + "px";
  DND.ghost.style.top = (e.clientY - 20) + "px";
  document.querySelectorAll(".pipe-col").forEach(function (col) {
    const r = col.getBoundingClientRect();
    col.classList.toggle("dragover",
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
  });
  e.preventDefault();
});
document.addEventListener("pointerup", async function (e) {
  if (!DND) return;
  const d = DND; DND = null;
  if (d.ghost) d.ghost.remove();
  d.card.classList.remove("lifting");
  const target = document.querySelector(".pipe-col.dragover");
  document.querySelectorAll(".pipe-col").forEach(function (c) { c.classList.remove("dragover"); });
  if (!d.moved) {
    // Oddiy bosish — kontakt profili (drawer)
    openProfile(d.cid);
    return;
  }
  if (!target) return;
  const stage = target.dataset.stage;
  const c = CONTACTS.find(function (x) { return x.id === d.cid; });
  if (!c || c.stage === stage) return;
  const old = c.stage;
  c.stage = stage;
  renderBoard();
  try {
    await postJson("/api/contacts/" + d.cid + "/stage", { stage: stage });
    toast("Bosqich o'zgardi");
  } catch (err) {
    c.stage = old;
    renderBoard();
    toast("Xatolik: " + err.message, false);
  }
});
// Summa tahrirlash
document.addEventListener("click", function (e) {
  const money = e.target.closest(".pipe-money");
  if (!money) return;
  const cid = Number(money.dataset.amid);
  const c = CONTACTS.find(function (x) { return x.id === cid; });
  openModal("Potensial summa", '<p class="small muted" style="margin-bottom:10px">' + esc((c && (c.name || c.ig_user_id)) || "") + " uchun taxminiy bitim summasi (so'm). Bo'sh qoldirsangiz — o'chadi.</p>" +
    '<input class="input" id="amountInp" type="number" min="0" value="' + ((c && c.deal_amount) ? Number(c.deal_amount) : "") + '" style="margin-bottom:12px">' +
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-plain" onclick="closeModal()">Bekor</button>' +
    '<button class="btn btn-primary" onclick="saveAmount(' + cid + ')">Saqlash</button></div>');
});
async function saveAmount(cid) {
  try {
    const val = $("amountInp").value.trim();
    await postJson("/api/contacts/" + cid + "/amount", { amount: val });
    const c = CONTACTS.find(function (x) { return x.id === cid; });
    if (c) c.deal_amount = val ? Number(val) : null;
    closeModal();
    renderBoard();
    toast("Summa saqlandi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadPipeline();`;

  return renderLayout({
    title: "Voronka",
    active: "pipeline",
    headerAction: "",
    content,
    script,
  });
}
