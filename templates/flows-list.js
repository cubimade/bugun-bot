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
const SVG_ALERT = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const SVG_FLOW = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M5 8.5v2a3 3 0 0 0 3 3h1.5"/><path d="M19 8.5v2a3 3 0 0 1-3 3h-1.5"/><path d="M12 13.5v2"/></svg>';
const SVG_PLUS = '<svg class="ic" style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const SVG_PLAY = '<svg class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4l14 8-14 8V4z"/></svg>';
const SVG_PAUSE = '<svg class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
const SVG_COPY = '<svg class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const SVG_TRASH = '<svg class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const SVG_CHEVRON = '<svg class="ic chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
let FLOWS = [], TEMPLATES = [], PROJECTS = [];
async function loadFlows() {
  try {
    const [f, t, p] = await Promise.all([api("/api/flows"), api("/api/flow-templates"), api("/api/projects")]);
    FLOWS = f.flows || []; TEMPLATES = t.templates || []; PROJECTS = (p.projects || []).filter((x) => x.ig_account_id);
    renderFlows();
  } catch (e) { $("flowsList").innerHTML = emptyState(SVG_ALERT, "Yuklashda xatolik: " + e.message); }
}
const TRIG_LABELS = { keyword: "Kalit so'z", story: "Story javobi", comment: "Komment", new_contact: "Yangi mijoz", manual: "Qo'lda" };
function renderFlows() {
  document.querySelector(".page-head h1").textContent = "Oqimlar · " + FLOWS.length + " ta";
  if (!FLOWS.length) {
    $("flowsList").innerHTML = emptyState(SVG_FLOW, "Hali flow yo'q — birinchisini yarating", '<button class="btn btn-secondary" onclick="openNewFlow()">' + SVG_PLUS + " Yangi flow</button>");
    return;
  }
  $("flowsList").innerHTML = '<div class="group-list">' + FLOWS.map(function (f) {
    const conv = f.entered ? Math.round((f.completed / f.entered) * 100) : 0;
    const trig = (TRIG_LABELS[f.trigger_type] || f.trigger_type) + (f.trigger_value ? ": " + esc(f.trigger_value) : "");
    return '<div class="group-row" style="align-items:flex-start;cursor:pointer' + (f.is_active ? "" : ";opacity:.6") + '" onclick="location.href=\\'/dashboard/flows/' + f.id + '\\'">' +
      '<div class="row-body">' +
        '<p class="row-title">' + esc(f.name) + "</p>" +
        '<p class="row-sub">' + esc(trig) + " · " + esc(f.project_name || "Barcha akkauntlar") + " · " + f.node_count + " qadam</p>" +
        '<p class="row-sub">Kirgan: <strong>' + f.entered + "</strong> · Tugatgan: <strong>" + f.completed + "</strong> · Konversiya: <strong>" + conv + "%</strong></p>" +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px" onclick="event.stopPropagation()">' +
          '<button class="btn btn-sm btn-plain" onclick="toggleFlow(' + f.id + "," + !f.is_active + ')">' + (f.is_active ? SVG_PAUSE + " To'xtatish" : SVG_PLAY + " Yoqish") + "</button>" +
          '<button class="btn btn-sm btn-plain" onclick="dupFlow(' + f.id + ')">' + SVG_COPY + " Nusxalash</button>" +
          '<button class="btn btn-sm btn-plain" onclick="delFlow(' + f.id + ')" style="color:var(--danger)">' + SVG_TRASH + " O\\'chirish</button>" +
        "</div>" +
      "</div>" +
      '<span class="pill ' + (f.is_active ? "pill-ok" : "pill-plain") + '">' + (f.is_active ? "Faol" : "Pauza") + "</span>" +
      SVG_CHEVRON +
    "</div>" +
    '<div class="separator no-avatar"></div>';
  }).join("") + "</div>";
}
function projectOptions() {
  return '<option value="">Barcha akkauntlar</option>' + PROJECTS.map(function (p) {
    return '<option value="' + p.id + '">' + esc(p.name) + "</option>";
  }).join("");
}
function openNewFlow() {
  openModal("Yangi flow", '' +
    '<div style="display:grid;gap:12px">' +
      '<div><label class="lbl">Shablondan boshlash (ixtiyoriy)</label>' +
      '<div style="display:grid;gap:8px">' + TEMPLATES.map(function (t) {
        return '<button class="btn btn-secondary" style="justify-content:flex-start;text-align:left" onclick="createFromTemplate(\\'' + t.key + '\\')">' +
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
    toast(val ? "Flow yoqildi" : "Flow to'xtatildi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function dupFlow(id) {
  try {
    const r = await postJson("/api/flows/" + id + "/duplicate", {});
    toast("Nusxalandi");
    loadFlows();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function delFlow(id) {
  const f = FLOWS.find(function (x) { return x.id === id; });
  openModal("Flow'ni o'chirish", '<p style="margin-bottom:16px">"<strong>' + esc(f ? f.name : "") + '</strong>" o\\'chirilsinmi? Statistika ham o\\'chadi.</p>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-plain" onclick="closeModal()">Bekor qilish</button>' +
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
