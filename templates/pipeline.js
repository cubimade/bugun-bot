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
const STAGE_META = {
  new:         { label: "🆕 Yangi",     color: "var(--muted)" },
  interested:  { label: "🔥 Qiziqqan",  color: "#f59e0b" },
  negotiation: { label: "🤝 Muzokara",  color: "#6366f1" },
  won:         { label: "✅ Sotildi",   color: "#10b981" },
  lost:        { label: "❌ Yo'q",      color: "#f43f5e" },
};
let CONTACTS = [], STATS = [];
const fmtSum = function (n) { return n ? Number(n).toLocaleString("uz-UZ") + " so'm" : ""; };

async function loadPipeline() {
  try {
    const r = await api("/api/pipeline");
    CONTACTS = r.contacts || [];
    STATS = r.stats || [];
    renderBoard();
  } catch (e) { $("pipeBoard").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message); }
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
    "<span>👥 Jami: <strong>" + total + "</strong></span>" +
    "<span>📈 Konversiya (sotildi/yakunlangan): <strong>" + conv + "%</strong></span>" +
    "<span>💰 Voronkada: <strong>" + (fmtSum(allSum) || "0") + "</strong></span>" +
    "<span>✅ Sotilgan summa: <strong>" + (fmtSum(wonSum) || "0") + "</strong></span>";

  $("pipeBoard").innerHTML = Object.keys(STAGE_META).map(function (s) {
    const meta = STAGE_META[s];
    const list = byStage[s];
    const sum = list.reduce(function (a, c) { return a + (Number(c.deal_amount) || 0); }, 0);
    const st = STATS.find(function (x) { return x.stage === s; });
    const avgD = st && st.avg_days ? Math.round(st.avg_days * 10) / 10 : null;
    return '<div class="pipe-col" data-stage="' + s + '">' +
      '<div class="pipe-col-head">' +
        '<div style="display:flex;align-items:center;gap:8px"><strong style="color:' + meta.color + '">' + meta.label + '</strong>' +
        '<span class="badge">' + list.length + "</span></div>" +
        '<div class="small muted" style="margin-top:3px">' + (sum ? "💰 " + fmtSum(sum) : "—") +
        (avgD != null ? " · ⏳ o'rt. " + avgD + " kun" : "") + "</div>" +
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
      '<span class="pipe-money" data-amid="' + c.id + '" title="Summa" style="cursor:pointer">💰</span></div>' +
    (t ? '<div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:5px">' + esc(t.length > 42 ? t.slice(0, 42) + "…" : t) + "</div>" : "") +
    (c.profile && (c.profile.ehtiyoj || c.profile.byudjet)
      ? '<div class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:5px" title="AI profil">🤖 ' +
        esc([c.profile.ehtiyoj, c.profile.byudjet].filter(Boolean).join(" · ").slice(0, 46)) + "</div>"
      : "") +
    '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">' +
      (c.deal_amount ? '<span class="badge b-green pipe-sum">' + fmtSum(c.deal_amount) + "</span>" : "") +
      (c.tags || []).slice(0, 3).map(function (tg) { return '<span class="badge b-indigo">' + esc(tg) + "</span>"; }).join("") +
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
    toast("Bosqich o'zgardi ✓");
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
  openModal("💰 Potensial summa", '<p class="small muted" style="margin-bottom:10px">' + esc((c && (c.name || c.ig_user_id)) || "") + " uchun taxminiy bitim summasi (so'm). Bo'sh qoldirsangiz — o'chadi.</p>" +
    '<input class="input" id="amountInp" type="number" min="0" value="' + ((c && c.deal_amount) ? Number(c.deal_amount) : "") + '" style="margin-bottom:12px">' +
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" onclick="closeModal()">Bekor</button>' +
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
    toast("Summa saqlandi ✓");
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
