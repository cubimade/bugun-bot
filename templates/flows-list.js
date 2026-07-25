// templates/flows-list.js — 8.3: Flow ro'yxati sahifasi (/dashboard/flows)
// (13-audit: flows.js 633 qator edi — ro'yxat qismi shu faylga ajratildi)
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
