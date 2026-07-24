// templates/flows.js — 8.3: Flow builder sahifalari
// Ro'yxat (/dashboard/flows) va vizual muharrir (/dashboard/flows/:id)
// Muharrir: sof SVG (edge'lar) + HTML node kartalar + vanilla JS
// (pan/zoom/drag/ulash — pointer events, mobil'da ham ishlaydi)
import { renderLayout } from "./layout.js";
import { esc, ICONS } from "./components.js";

// ============================================================
//  RO'YXAT — /dashboard/flows
// ============================================================
export function renderFlowsPage() {
  const content = `
  <div class="card glow" style="margin-bottom:16px">
    <h3 style="margin-bottom:4px">Suhbat oqimlari (Flow)</h3>
    <p class="small muted" style="line-height:1.7">Vizual suhbat oqimi: trigger (kalit so'z, story, komment, yangi mijoz) ishga tushganda
    bot belgilangan qadamlar bo'yicha yozadi — xabar, tugmalar, shartlar, kutish. Flow faol payt AI aralashmaydi;
    flow tugagach yoki to'xtasa AI qaytadan ishlaydi.</p>
  </div>
  <div id="flowsList">${'<div class="skeleton" style="height:90px;margin-bottom:10px"></div>'.repeat(2)}</div>`;

  const script = `
let FLOWS = [], TEMPLATES = [], PROJECTS = [];
async function loadFlows() {
  try {
    const [f, t, p] = await Promise.all([api("/api/flows"), api("/api/flow-templates"), api("/api/projects")]);
    FLOWS = f.flows || []; TEMPLATES = t.templates || []; PROJECTS = (p.projects || []).filter((x) => x.ig_account_id);
    renderFlows();
  } catch (e) { $("flowsList").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message); }
}
const TRIG_LABELS = { keyword: "🔑 Kalit so'z", story: "📸 Story javobi", comment: "💬 Komment", new_contact: "✨ Yangi mijoz", manual: "🖐 Qo'lda" };
function renderFlows() {
  document.querySelector(".page-head h1").textContent = "Oqimlar · " + FLOWS.length + " ta";
  if (!FLOWS.length) {
    $("flowsList").innerHTML = emptyState("🔀", "Hali flow yo'q — birinchisini yarating", '<button class="btn btn-primary" onclick="openNewFlow()">➕ Yangi flow</button>');
    return;
  }
  $("flowsList").innerHTML = FLOWS.map(function (f) {
    const conv = f.entered ? Math.round((f.completed / f.entered) * 100) : 0;
    return '<div class="card" style="margin-bottom:10px;' + (f.is_active ? "" : "opacity:.6") + '">' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">' +
        '<strong style="font-size:15px">' + esc(f.name) + "</strong>" +
        '<span class="badge b-indigo">' + (TRIG_LABELS[f.trigger_type] || f.trigger_type) + (f.trigger_value ? ": " + esc(f.trigger_value) : "") + "</span>" +
        '<span class="badge ' + (f.is_active ? "b-green" : "b-gray") + '">' + (f.is_active ? "▶️ faol" : "⏸ pauza") + "</span>" +
        '<span class="small muted">· ' + esc(f.project_name || "Barcha akkauntlar") + "</span>" +
        '<span style="flex:1"></span>' +
        '<span class="small muted">' + f.node_count + " qadam</span>" +
      "</div>" +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px" class="small muted">' +
        "<span>👥 Kirgan: <strong>" + f.entered + "</strong></span>" +
        "<span>✅ Tugatgan: <strong>" + f.completed + "</strong></span>" +
        "<span>📈 Konversiya: <strong>" + conv + "%</strong></span>" +
      "</div>" +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<a class="btn btn-sm btn-primary" href="/dashboard/flows/' + f.id + '">✏️ Tahrirlash</a>' +
        '<button class="btn btn-sm" onclick="toggleFlow(' + f.id + "," + !f.is_active + ')">' + (f.is_active ? "⏸ To'xtatish" : "▶️ Yoqish") + "</button>" +
        '<button class="btn btn-sm" onclick="dupFlow(' + f.id + ')">📋 Nusxalash</button>' +
        '<button class="btn btn-sm btn-danger" onclick="delFlow(' + f.id + ')">🗑 O\\'chirish</button>' +
      "</div></div>";
  }).join("");
}
function projectOptions() {
  return '<option value="">Barcha akkauntlar</option>' + PROJECTS.map(function (p) {
    return '<option value="' + p.id + '">' + esc(p.name) + "</option>";
  }).join("");
}
function openNewFlow() {
  openModal("➕ Yangi flow", '' +
    '<div style="display:grid;gap:12px">' +
      '<div><label class="lbl">Shablondan boshlash (ixtiyoriy)</label>' +
      '<div style="display:grid;gap:8px">' + TEMPLATES.map(function (t) {
        return '<button class="btn" style="justify-content:flex-start;text-align:left" onclick="createFromTemplate(\\'' + t.key + '\\')">' +
          t.emoji + " <span><strong>" + esc(t.name) + '</strong><br><span class="small muted">' + esc(t.description) + "</span></span></button>";
      }).join("") + "</div></div>" +
      '<div style="border-top:1px solid var(--border);padding-top:12px"><label class="lbl">Yoki bo\\'sh flow</label>' +
      '<input class="input" id="nfName" maxlength="120" placeholder="Flow nomi (masalan: Narx so\\'rovi)" style="margin-bottom:8px">' +
      '<select class="input" id="nfProject" style="margin-bottom:8px">' + projectOptions() + "</select>" +
      '<button class="btn btn-primary" onclick="createFlow()">Yaratish</button></div>' +
    "</div>");
}
async function createFlow() {
  const name = $("nfName").value.trim();
  if (!name) return toast("Flow nomini kiriting", false);
  try {
    const r = await postJson("/api/flows", { name: name, project_id: $("nfProject").value || null });
    location.href = "/dashboard/flows/" + r.id;
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function createFromTemplate(key) {
  try {
    const r = await postJson("/api/flows/from-template", { template: key });
    location.href = "/dashboard/flows/" + r.id;
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function toggleFlow(id, val) {
  try {
    await postJson("/api/flows/" + id, { is_active: val });
    const f = FLOWS.find(function (x) { return x.id === id; });
    if (f) f.is_active = val;
    renderFlows();
    toast(val ? "Flow yoqildi ▶️" : "Flow to'xtatildi ⏸");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function dupFlow(id) {
  try {
    const r = await postJson("/api/flows/" + id + "/duplicate", {});
    toast("Nusxalandi ✓");
    loadFlows();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function delFlow(id) {
  const f = FLOWS.find(function (x) { return x.id === id; });
  openModal("Flow'ni o'chirish", '<p style="margin-bottom:16px">"<strong>' + esc(f ? f.name : "") + '</strong>" o\\'chirilsinmi? Statistika ham o\\'chadi.</p>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" onclick="closeModal()">Bekor qilish</button>' +
    '<button class="btn btn-danger" onclick="doDelFlow(' + id + ')">Ha, o\\'chirish</button></div>');
}
async function doDelFlow(id) {
  try {
    await api("/api/flows/" + id, { method: "DELETE" });
    closeModal(); toast("Flow o'chirildi");
    loadFlows();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadFlows();`;

  return renderLayout({
    title: "Oqimlar",
    active: "flows",
    headerAction: `<button class="btn btn-primary" onclick="openNewFlow()">${ICONS.plus} Yangi flow</button>`,
    content,
    script,
  });
}

// ============================================================
//  MUHARRIR — /dashboard/flows/:id
// ============================================================
export function renderFlowEditorPage(flowId) {
  const content = `
  <div class="card" style="padding:10px 12px;margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center" id="metaBar">
    <a class="btn btn-sm" href="/dashboard/flows">←</a>
    <input class="input" id="fName" maxlength="120" style="max-width:200px" placeholder="Flow nomi">
    <select class="input" id="fTrigger" style="max-width:150px" onchange="onTriggerChange()">
      <option value="keyword">🔑 Kalit so'z</option>
      <option value="story">📸 Story javobi</option>
      <option value="comment">💬 Komment</option>
      <option value="new_contact">✨ Yangi mijoz</option>
      <option value="manual">🖐 Qo'lda</option>
    </select>
    <input class="input" id="fTrigVal" maxlength="300" style="max-width:200px" placeholder="Kalit so'zlar (vergul bilan)">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer" class="small">
      <input type="checkbox" id="fActive"> Faol
    </label>
    <span style="flex:1"></span>
    <button class="btn btn-sm" onclick="testFlow()">🧪 Sinab ko'rish</button>
    <button class="btn btn-sm btn-primary" onclick="saveAll(this)">💾 Saqlash</button>
  </div>

  <div class="fb-wrap">
    <div class="fb-palette card">
      <div class="small muted" style="margin-bottom:8px">Qadam qo'shish:</div>
      <button class="btn btn-sm" onclick="addNode('message')">💬 Xabar</button>
      <button class="btn btn-sm" onclick="addNode('buttons')">🔘 Tugmalar</button>
      <button class="btn btn-sm" onclick="addNode('condition')">❓ Shart</button>
      <button class="btn btn-sm" onclick="addNode('action')">⚡ Amal</button>
      <button class="btn btn-sm" onclick="addNode('delay')">⏱ Kutish</button>
      <div style="border-top:1px solid var(--border);margin:8px 0"></div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-sm" onclick="zoomBy(-0.15)">−</button>
        <span class="small muted" id="zoomLbl" style="min-width:40px;text-align:center">100%</span>
        <button class="btn btn-sm" onclick="zoomBy(0.15)">+</button>
      </div>
      <div class="small muted" style="margin-top:8px;line-height:1.5">Ulash: node o'ng chetidagi ⚪ dan boshqa nodega torting. Chiziqni o'chirish: ustiga bosing.</div>
    </div>

    <div class="fb-canvas card" id="fbCanvas">
      <div class="fb-world" id="fbWorld">
        <svg id="fbSvg" style="position:absolute;left:0;top:0;width:10px;height:10px;overflow:visible"></svg>
        <div id="fbNodes"></div>
      </div>
    </div>

    <div class="fb-panel card" id="fbPanel" style="display:none">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <strong id="fbPanelTitle" style="flex:1"></strong>
        <button class="modal-x" onclick="closePanel()">✕</button>
      </div>
      <div id="fbPanelBody"></div>
    </div>
  </div>

  <style>
    .fb-wrap { display:flex; gap:10px; align-items:stretch; height: calc(100vh - 210px); min-height:420px; }
    .fb-palette { width:150px; flex-shrink:0; display:flex; flex-direction:column; gap:6px; padding:12px; overflow-y:auto; }
    .fb-palette .btn { justify-content:flex-start; }
    .fb-canvas { flex:1; position:relative; overflow:hidden; padding:0 !important; touch-action:none; cursor:grab;
      background-image: radial-gradient(circle, var(--border) 1px, transparent 1px); background-size:24px 24px; }
    .fb-canvas.panning { cursor:grabbing; }
    .fb-world { position:absolute; left:0; top:0; transform-origin:0 0; }
    #fbNodes { position:absolute; left:0; top:0; }
    .fnode { position:absolute; width:210px; background:var(--panel); border:1.5px solid var(--border);
      border-radius:12px; box-shadow:0 4px 14px rgba(0,0,0,.18); user-select:none; cursor:move; }
    .fnode.sel { border-color:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent); }
    .fnode-head { display:flex; align-items:center; gap:6px; padding:8px 10px; font-weight:600; font-size:13px;
      border-bottom:1px solid var(--border); }
    .fnode-head .fx { margin-left:auto; cursor:pointer; opacity:.5; font-size:12px; padding:2px 4px; }
    .fnode-head .fx:hover { opacity:1; color:var(--danger); }
    .fnode-body { padding:6px 10px 8px; font-size:12px; color:var(--muted); }
    .fnode-sum { line-height:1.45; margin-bottom:4px; word-break:break-word; max-height:54px; overflow:hidden; }
    .fport-row { display:flex; align-items:center; justify-content:flex-end; gap:6px; position:relative;
      height:24px; font-size:11.5px; color:var(--text); }
    .fport-row .fdot { position:absolute; right:-17px; width:13px; height:13px; border-radius:50%;
      background:var(--accent); border:2px solid var(--panel); cursor:crosshair; }
    .fdot-in { position:absolute; left:-7px; top:16px; width:13px; height:13px; border-radius:50%;
      background:var(--muted); border:2px solid var(--panel); }
    .fedge { stroke:var(--accent); stroke-width:2.2; fill:none; opacity:.85; }
    .fedge-hit { stroke:transparent; stroke-width:16; fill:none; cursor:pointer; }
    .fedge-lbl { font-size:11px; fill:var(--muted); }
    .fb-panel { width:270px; flex-shrink:0; padding:14px; overflow-y:auto; }
    @media (max-width: 900px) {
      .fb-wrap { flex-direction:column; height:auto; }
      .fb-palette { width:100%; flex-direction:row; flex-wrap:wrap; }
      .fb-canvas { height:55vh; min-height:340px; }
      .fb-panel { width:100%; }
    }
  </style>`;

  const script = `
const FLOW_ID = ${Number(flowId)};
let FLOW = null, NODES = [], EDGES = [], SEQ = 1;
let VIEW = { x: 40, y: 20, z: 1 };
let SEL = null, DRAG = null, PAN = null, CONNECT = null, DIRTY = false;
const TYPE_META = {
  message: { emoji: "💬", label: "Xabar" },
  buttons: { emoji: "🔘", label: "Tugmalar" },
  condition: { emoji: "❓", label: "Shart" },
  action: { emoji: "⚡", label: "Amal" },
  delay: { emoji: "⏱", label: "Kutish" },
};
const ACTION_LABELS = { add_tag: "Teg qo'shish", remove_tag: "Tegni olib tashlash", handoff: "Operatorga uzatish", pause_bot: "Botni pauza qilish", set_stage: "Voronka bosqichi", give_promo: "Chegirma kodi berish" };

function ports(n) {
  if (n.type === "buttons") return (n.config.buttons || []).map(String);
  if (n.type === "condition") return ["ha", "yo'q"];
  return [null];
}
function summary(n) {
  const c = n.config || {};
  if (n.type === "message") return c.text ? esc(c.text) : '<i class="muted">matn kiriting…</i>';
  if (n.type === "buttons") return (c.text ? esc(c.text) : '<i class="muted">savol matni…</i>');
  if (n.type === "condition") return (c.kind === "has_tag" ? "Teg bor: " : c.kind === "subscribed" ? "Kanalga obuna (TG): " : "Xabarda so'z bor: ") + "<strong>" + esc(c.value || "?") + "</strong>";
  if (n.type === "action") return (ACTION_LABELS[c.action] || "amal tanlang…") + (c.value ? ": <strong>" + esc(c.value) + "</strong>" : "");
  if (n.type === "delay") {
    const warn = c.unit === "soat" && Number(c.amount) > 24;
    return (c.amount || 1) + " " + (c.unit || "daqiqa") + " kutish" + (warn ? ' <span style="color:var(--danger)">⚠️ 24h+</span>' : "");
  }
  return "";
}

async function load() {
  try {
    const r = await api("/api/flows/" + FLOW_ID);
    FLOW = r.flow;
    NODES = (r.nodes || []).map(function (n) {
      return { ref: "s" + n.id, type: n.type, config: n.config || {}, x: n.position_x, y: n.position_y };
    });
    EDGES = (r.edges || []).map(function (e) {
      return { from: "s" + e.from_node_id, to: "s" + e.to_node_id, label: e.condition_label };
    });
    $("fName").value = FLOW.name;
    $("fTrigger").value = FLOW.trigger_type;
    $("fTrigVal").value = FLOW.trigger_value || "";
    $("fActive").checked = FLOW.is_active;
    onTriggerChange();
    document.querySelector(".page-head h1").textContent = "Muharrir: " + FLOW.name;
    renderAll();
  } catch (e) { toast("Yuklashda xatolik: " + e.message, false); }
}
function onTriggerChange() {
  const t = $("fTrigger").value;
  $("fTrigVal").style.display = (t === "keyword" || t === "comment" || t === "story") ? "" : "none";
  $("fTrigVal").placeholder = t === "story" ? "Kalit so'z (bo'sh = har qanday story javobi)" : "Kalit so'zlar (vergul bilan)";
}

// ---------- RENDER ----------
function applyView() {
  $("fbWorld").style.transform = "translate(" + VIEW.x + "px," + VIEW.y + "px) scale(" + VIEW.z + ")";
  $("zoomLbl").textContent = Math.round(VIEW.z * 100) + "%";
}
function renderAll() { renderNodes(); renderEdges(); applyView(); }
function renderNodes() {
  $("fbNodes").innerHTML = NODES.map(function (n) {
    const m = TYPE_META[n.type];
    const pr = ports(n).map(function (p, i) {
      return '<div class="fport-row"><span>' + (p === null ? "keyingi" : esc(p)) + ' →</span>' +
        '<span class="fdot" data-ref="' + n.ref + '" data-port="' + (p === null ? "" : esc(p)) + '"></span></div>';
    }).join("");
    return '<div class="fnode' + (SEL === n.ref ? " sel" : "") + '" data-ref="' + n.ref + '" style="left:' + n.x + "px;top:" + n.y + 'px">' +
      '<div class="fdot-in" data-ref="' + n.ref + '"></div>' +
      '<div class="fnode-head">' + m.emoji + " " + m.label +
        '<span class="fx" data-del="' + n.ref + '" title="O\\'chirish">✕</span></div>' +
      '<div class="fnode-body"><div class="fnode-sum">' + summary(n) + "</div>" + pr + "</div>" +
    "</div>";
  }).join("");
}
function portPos(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const w = $("fbWorld").getBoundingClientRect();
  return { x: (r.left + r.width / 2 - w.left) / VIEW.z, y: (r.top + r.height / 2 - w.top) / VIEW.z };
}
function edgePath(a, b) {
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  return "M" + a.x + "," + a.y + " C" + (a.x + dx) + "," + a.y + " " + (b.x - dx) + "," + b.y + " " + b.x + "," + b.y;
}
function renderEdges() {
  let html = "";
  EDGES.forEach(function (e, i) {
    const a = portPos('.fdot[data-ref="' + e.from + '"][data-port="' + (e.label || "") + '"]') ||
              portPos('.fdot[data-ref="' + e.from + '"]');
    const b = portPos('.fdot-in[data-ref="' + e.to + '"]');
    if (!a || !b) return;
    const d = edgePath(a, b);
    html += '<path class="fedge" d="' + d + '"/>' +
            '<path class="fedge-hit" data-ei="' + i + '" d="' + d + '"/>';
  });
  if (CONNECT && CONNECT.cur) {
    const a = portPos('.fdot[data-ref="' + CONNECT.from + '"][data-port="' + (CONNECT.label || "") + '"]');
    if (a) html += '<path class="fedge" style="opacity:.5;stroke-dasharray:6 4" d="' + edgePath(a, CONNECT.cur) + '"/>';
  }
  $("fbSvg").innerHTML = html;
}

// ---------- NODE QO'SHISH / O'CHIRISH ----------
function addNode(type) {
  const cv = $("fbCanvas").getBoundingClientRect();
  const x = Math.round((cv.width / 2 - VIEW.x) / VIEW.z - 105 + Math.random() * 40);
  const y = Math.round((cv.height / 2 - VIEW.y) / VIEW.z - 40 + Math.random() * 40);
  const defaults = {
    message: { text: "" },
    buttons: { text: "", buttons: ["Variant 1", "Variant 2"] },
    condition: { kind: "contains", value: "" },
    action: { action: "add_tag", value: "" },
    delay: { amount: 30, unit: "daqiqa" },
  };
  const n = { ref: "n" + SEQ++, type: type, config: defaults[type], x: x, y: y };
  NODES.push(n); DIRTY = true;
  renderAll();
  selectNode(n.ref);
}
function deleteNode(ref) {
  NODES = NODES.filter(function (n) { return n.ref !== ref; });
  EDGES = EDGES.filter(function (e) { return e.from !== ref && e.to !== ref; });
  if (SEL === ref) closePanel();
  DIRTY = true;
  renderAll();
}

// ---------- TANLASH / PANEL ----------
function selectNode(ref) {
  SEL = ref;
  renderNodes(); renderEdges();
  const n = NODES.find(function (x) { return x.ref === ref; });
  if (!n) return;
  $("fbPanel").style.display = "";
  $("fbPanelTitle").textContent = TYPE_META[n.type].emoji + " " + TYPE_META[n.type].label;
  $("fbPanelBody").innerHTML = panelForm(n);
}
function closePanel() {
  SEL = null;
  $("fbPanel").style.display = "none";
  renderNodes(); renderEdges();
}
function panelForm(n) {
  const c = n.config;
  if (n.type === "message") {
    return '<label class="lbl">Xabar matni ({ism} ishlaydi)</label>' +
      '<textarea class="input" rows="5" maxlength="900" oninput="cfg(\\'text\\', this.value)">' + esc(c.text || "") + "</textarea>" +
      '<label class="lbl" style="margin-top:10px">Rasm URL (ixtiyoriy, https://...)</label>' +
      '<input class="input" id="pnMediaUrl" maxlength="500" value="' + esc(c.media_url || "") + '" oninput="cfg(\\'media_url\\', this.value)">' +
      '<button class="btn btn-sm" style="margin-top:6px" onclick="pickMedia()">📎 Kutubxonadan tanlash</button>';
  }
  if (n.type === "buttons") {
    const btns = (c.buttons || []).map(function (b, i) {
      return '<div style="display:flex;gap:6px;margin-bottom:6px">' +
        '<input class="input" maxlength="20" value="' + esc(b) + '" oninput="renameBtn(' + i + ', this.value)">' +
        '<button class="btn btn-sm" onclick="delBtn(' + i + ')">🗑</button></div>';
    }).join("");
    const urlRaw = (c.url_buttons || []).map(function (u) { return u.title + " | " + u.url; }).join("\\n");
    return '<label class="lbl">Savol matni</label>' +
      '<textarea class="input" rows="3" maxlength="900" oninput="cfg(\\'text\\', this.value)">' + esc(c.text || "") + "</textarea>" +
      '<label class="lbl" style="margin-top:10px">Tugmalar (2-5 ta, maks 20 belgi)</label>' + btns +
      '<button class="btn btn-sm" onclick="addBtn()">➕ Tugma</button>' +
      '<label class="lbl" style="margin-top:12px">🔗 URL tugmalar (ixtiyoriy, har qatorda: Sarlavha | https://...)</label>' +
      '<textarea class="input" rows="2" placeholder="Saytimiz | https://example.uz" oninput="setUrlButtons(this.value)">' + esc(urlRaw) + "</textarea>" +
      '<p class="small muted" style="margin-top:8px">Har tugmadan alohida chiziq torting — bosilganda o\\'sha yo\\'l davom etadi. URL tugmalar Telegram\\'da inline ochiladi, Instagram\\'da matn havola bo\\'lib boradi.</p>';
  }
  if (n.type === "condition") {
    return '<label class="lbl">Shart turi</label>' +
      '<select class="input" onchange="cfg(\\'kind\\', this.value)">' +
        '<option value="contains"' + (c.kind === "contains" ? " selected" : "") + '>Xabarda so\\'z bor</option>' +
        '<option value="has_tag"' + (c.kind === "has_tag" ? " selected" : "") + ">Kontaktda teg bor</option>" +
        '<option value="subscribed"' + (c.kind === "subscribed" ? " selected" : "") + ">Kanalga obuna (faqat Telegram)</option>" +
      "</select>" +
      '<label class="lbl" style="margin-top:10px">Qiymat (so\\'z, teg yoki @kanal)</label>' +
      '<input class="input" maxlength="100" value="' + esc(c.value || "") + '" oninput="cfg(\\'value\\', this.value)">' +
      '<p class="small muted" style="margin-top:8px">"ha" va "yo\\'q" chiqishlaridan mos yo\\'llarga chiziq torting. Obuna tekshirish uchun bot kanalda ADMIN bo\\'lishi shart.</p>';
  }
  if (n.type === "action") {
    return '<label class="lbl">Amal</label>' +
      '<select class="input" onchange="cfg(\\'action\\', this.value); selectNode(SEL)">' +
        Object.keys(ACTION_LABELS).map(function (k) {
          return '<option value="' + k + '"' + (c.action === k ? " selected" : "") + ">" + ACTION_LABELS[k] + "</option>";
        }).join("") +
      "</select>" +
      ((c.action === "add_tag" || c.action === "remove_tag" || c.action === "set_stage" || c.action === "give_promo")
        ? '<label class="lbl" style="margin-top:10px">' + (c.action === "set_stage" ? "Bosqich (new/interested/negotiation/won/lost)" : c.action === "give_promo" ? "Chegirma foizi (masalan: 10)" : "Teg nomi") + "</label>" +
          '<input class="input" maxlength="50" value="' + esc(c.value || "") + '" oninput="cfg(\\'value\\', this.value)">'
        : "");
  }
  if (n.type === "delay") {
    return '<label class="lbl">Qancha kutsin?</label>' +
      '<div style="display:flex;gap:8px">' +
        '<input class="input" type="number" min="1" max="10080" value="' + (c.amount || 30) + '" oninput="cfg(\\'amount\\', this.value)">' +
        '<select class="input" onchange="cfg(\\'unit\\', this.value)">' +
          '<option value="daqiqa"' + (c.unit !== "soat" ? " selected" : "") + ">daqiqa</option>" +
          '<option value="soat"' + (c.unit === "soat" ? " selected" : "") + ">soat</option>" +
        "</select>" +
      "</div>" +
      '<p class="small muted" style="margin-top:8px">⚠️ 24 soatdan uzun kutish: Instagram 24-soat qoidasi tufayli xabar yuborilmasligi mumkin. Mijoz kutish paytida yozsa — flow to\\'xtaydi, AI javob beradi.</p>';
  }
  return "";
}
function cfg(key, val) {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  n.config[key] = val;
  DIRTY = true;
  renderNodes(); renderEdges();
}
// 9.5: kutubxonadan rasm tanlash (message node uchun)
async function pickMedia() {
  try {
    const { media } = await api("/api/media");
    const imgs = (media || []).filter(function (m) { return m.type === "image"; });
    if (!imgs.length) return toast("Kutubxonada rasm yo'q — Media sahifasida yuklang", false);
    openModal("📎 Rasm tanlash", '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;max-height:55vh;overflow-y:auto">' +
      imgs.map(function (m) {
        return '<div onclick="useMedia(' + m.id + ')" style="cursor:pointer"><img src="' + m.url + '" style="width:100%;height:76px;object-fit:cover;border-radius:8px" loading="lazy">' +
          '<div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px">' + esc(m.name) + "</div></div>";
      }).join("") + "</div>");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function useMedia(id) {
  const url = location.origin + "/media/" + id;
  cfg("media_url", url);
  const inp = $("pnMediaUrl");
  if (inp) inp.value = url;
  closeModal();
  toast("Rasm tanlandi ✓");
}
function setUrlButtons(raw) {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  n.config.url_buttons = raw.split("\\n").map(function (line) {
    const i = line.indexOf("|");
    if (i < 1) return null;
    const title = line.slice(0, i).trim(), url = line.slice(i + 1).trim();
    return title && /^https?:\\/\\//.test(url) ? { title: title, url: url } : null;
  }).filter(Boolean);
  DIRTY = true;
}
function addBtn() {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  n.config.buttons = n.config.buttons || [];
  if (n.config.buttons.length >= 5) return toast("Maksimum 5 ta tugma", false);
  n.config.buttons.push("Variant " + (n.config.buttons.length + 1));
  DIRTY = true;
  selectNode(SEL);
}
function delBtn(i) {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  const old = n.config.buttons[i];
  n.config.buttons.splice(i, 1);
  EDGES = EDGES.filter(function (e) { return !(e.from === n.ref && e.label === old); });
  DIRTY = true;
  selectNode(SEL);
}
function renameBtn(i, val) {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  const old = n.config.buttons[i];
  n.config.buttons[i] = val;
  EDGES.forEach(function (e) { if (e.from === n.ref && e.label === old) e.label = val; });
  DIRTY = true;
  renderNodes(); renderEdges();
}

// ---------- POINTER: drag / pan / ulash ----------
const cv = $("fbCanvas");
cv.addEventListener("pointerdown", function (e) {
  const dot = e.target.closest(".fdot");
  const del = e.target.closest("[data-del]");
  const nodeEl = e.target.closest(".fnode");
  if (del) { deleteNode(del.dataset.del); return; }
  if (dot) {
    CONNECT = { from: dot.dataset.ref, label: dot.dataset.port || null, cur: null };
    cv.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  const hit = e.target.closest(".fedge-hit");
  if (hit) {
    const i = Number(hit.dataset.ei);
    const eg = EDGES[i];
    openModal("Chiziqni o'chirish", '<p style="margin-bottom:16px">Bu ulanish o\\'chirilsinmi?' + (eg && eg.label ? ' ("' + esc(eg.label) + '")' : "") + "</p>" +
      '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" onclick="closeModal()">Yo\\'q</button>' +
      '<button class="btn btn-danger" onclick="EDGES.splice(' + i + ',1);DIRTY=true;renderEdges();closeModal()">Ha, o\\'chirish</button></div>');
    return;
  }
  if (nodeEl && !e.target.closest("input,textarea,select,button")) {
    const n = NODES.find(function (x) { return x.ref === nodeEl.dataset.ref; });
    DRAG = { n: n, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
    cv.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  PAN = { sx: e.clientX, sy: e.clientY, ox: VIEW.x, oy: VIEW.y };
  cv.classList.add("panning");
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener("pointermove", function (e) {
  if (CONNECT) {
    const w = $("fbWorld").getBoundingClientRect();
    CONNECT.cur = { x: (e.clientX - w.left) / VIEW.z, y: (e.clientY - w.top) / VIEW.z };
    renderEdges();
  } else if (DRAG) {
    const dx = (e.clientX - DRAG.sx) / VIEW.z, dy = (e.clientY - DRAG.sy) / VIEW.z;
    if (Math.abs(dx) + Math.abs(dy) > 3) DRAG.moved = true;
    DRAG.n.x = Math.round(DRAG.ox + dx);
    DRAG.n.y = Math.round(DRAG.oy + dy);
    const el = document.querySelector('.fnode[data-ref="' + DRAG.n.ref + '"]');
    if (el) { el.style.left = DRAG.n.x + "px"; el.style.top = DRAG.n.y + "px"; }
    renderEdges();
  } else if (PAN) {
    VIEW.x = PAN.ox + (e.clientX - PAN.sx);
    VIEW.y = PAN.oy + (e.clientY - PAN.sy);
    applyView();
  }
});
cv.addEventListener("pointerup", function (e) {
  if (CONNECT) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const nodeEl = target && target.closest ? target.closest(".fnode, .fdot-in") : null;
    if (nodeEl && nodeEl.dataset.ref && nodeEl.dataset.ref !== CONNECT.from) {
      // Bitta portdan bitta chiziq — eskisini almashtiramiz
      EDGES = EDGES.filter(function (eg) { return !(eg.from === CONNECT.from && (eg.label || null) === CONNECT.label); });
      EDGES.push({ from: CONNECT.from, to: nodeEl.dataset.ref, label: CONNECT.label });
      DIRTY = true;
    }
    CONNECT = null;
    renderEdges();
  }
  if (DRAG) { if (!DRAG.moved) selectNode(DRAG.n.ref); else DIRTY = true; DRAG = null; }
  if (PAN) { PAN = null; cv.classList.remove("panning"); }
});
cv.addEventListener("wheel", function (e) {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 0.12 : -0.12);
}, { passive: false });
function zoomAt(cx, cy, dz) {
  const r = cv.getBoundingClientRect();
  const px = cx - r.left, py = cy - r.top;
  const wx = (px - VIEW.x) / VIEW.z, wy = (py - VIEW.y) / VIEW.z;
  VIEW.z = Math.min(2, Math.max(0.35, VIEW.z + dz));
  VIEW.x = px - wx * VIEW.z;
  VIEW.y = py - wy * VIEW.z;
  applyView(); renderEdges();
}
function zoomBy(dz) {
  const r = cv.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, dz);
}

// ---------- SAQLASH / SINASH ----------
async function saveAll(btn) {
  if (btn) btn.disabled = true;
  try {
    await postJson("/api/flows/" + FLOW_ID, {
      name: $("fName").value.trim() || "Nomsiz flow",
      trigger_type: $("fTrigger").value,
      trigger_value: $("fTrigVal").value.trim(),
      is_active: $("fActive").checked,
    });
    await postJson("/api/flows/" + FLOW_ID + "/graph", {
      nodes: NODES.map(function (n) { return { ref: n.ref, type: n.type, config: n.config, x: n.x, y: n.y }; }),
      edges: EDGES,
    });
    DIRTY = false;
    toast("Flow saqlandi ✓");
    await load(); // server ID'lari bilan qayta sinxron
  } catch (e) { toast("Xatolik: " + e.message, false); }
  if (btn) btn.disabled = false;
}
async function testFlow() {
  try {
    if (DIRTY) await saveAll(null);
    const r = await api("/api/flows/" + FLOW_ID + "/simulate");
    const icons = { message: "💬", buttons: "🔘", condition: "❓", action: "⚡", delay: "⏱", info: "↪️", done: "🏁", error: "⚠️" };
    openModal("🧪 Simulyatsiya", '<div style="display:grid;gap:8px;max-height:60vh;overflow-y:auto">' +
      (r.steps || []).map(function (s) {
        return '<div style="background:var(--panel2);border-radius:10px;padding:9px 12px" class="small">' +
          (icons[s.type] || "•") + " " + esc(s.text) +
          (s.buttons && s.buttons.length ? '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">' + s.buttons.map(function (b) { return '<span class="badge b-indigo">' + esc(b) + "</span>"; }).join("") + "</div>" : "") +
        "</div>";
      }).join("") + "</div>");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
window.addEventListener("beforeunload", function (e) {
  if (DIRTY) { e.preventDefault(); e.returnValue = ""; }
});
load();`;

  return renderLayout({
    title: "Flow muharriri",
    active: "flows",
    headerAction: "",
    content,
    script,
  });
}
