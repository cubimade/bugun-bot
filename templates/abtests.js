// templates/abtests.js — 11.5: A/B testlar sahifasi
// Test yaratish, natijalarni kuzatish, g'olibni doimiy qilish
import { renderLayout } from "./layout.js";
import { ICONS } from "./components.js";

export function renderAbTestsPage() {
  const content = `
  <div class="card glow" style="margin-bottom:14px">
    <h3 style="margin-bottom:4px">Qanday ishlaydi?</h3>
    <p class="small muted" style="line-height:1.7">Ikkita matn variantini yozasiz — yangi mijozlar tasodifiy A yoki B guruhga tushadi va o'sha variantni ko'radi.
    Natijada qaysi matn ko'proq javob/konversiya keltirgani ko'rinadi. G'olibni tanlasangiz — u doimiy sozlamaga yoziladi.</p>
  </div>

  <div class="card" style="margin-bottom:14px">
    <h3 style="margin-bottom:12px">Yangi test</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px" class="ab-cols">
      <div><label class="lbl">Test nomi</label>
        <input class="input" id="abName" maxlength="120" placeholder="Masalan: Salomlashish uslubi"></div>
      <div><label class="lbl">Nima sinaladi?</label>
        <select class="input" id="abType">
          <option value="greeting">Salomlashish matni (yangi mijozga)</option>
          <option value="followup">Follow-up matni</option>
        </select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px" class="ab-cols">
      <div><label class="lbl">Variant A</label>
        <textarea class="input" id="abA" rows="3" maxlength="500" placeholder="Masalan: Assalomu alaykum! Xush kelibsiz 😊"></textarea></div>
      <div><label class="lbl">Variant B</label>
        <textarea class="input" id="abB" rows="3" maxlength="500" placeholder="Masalan: Salom! Sizga qanday yordam beray? 🚀"></textarea></div>
    </div>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <label class="lbl" style="margin:0">A ulushi:</label>
      <select class="input" id="abSplit" style="width:auto">
        <option value="50">50% / 50%</option>
        <option value="30">30% / 70%</option>
        <option value="70">70% / 30%</option>
      </select>
      <button class="btn btn-primary" onclick="createTest(this)">${ICONS.plus} Testni boshlash</button>
    </div>
  </div>

  <div id="testsList"><div class="skeleton" style="height:100px"></div></div>
  <style>@media (max-width:700px){ .ab-cols { grid-template-columns:1fr !important; } }</style>`;

  const script = `
function ic(paths, w) { return '<svg class="ic" style="width:' + (w || 14) + 'px;height:' + (w || 14) + 'px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>'; }
const SVG = {
  alert: ic('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  flask: ic('<path d="M10 2v6L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8V2"/><path d="M8.5 2h7"/><path d="M7 15h10"/>'),
  trendingUp: ic('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  flag: ic('<path d="M4 22V4"/><path d="M4 4h14l-3 4 3 4H4"/>'),
  play: ic('<path d="M6 4l14 8-14 8V4z"/>'),
  pause: ic('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'),
};
let TESTS = [];
const TYPE_LBL = { greeting: "Salomlashish", followup: "Follow-up" };
async function loadTests() {
  try {
    const r = await api("/api/ab-tests");
    TESTS = r.tests || [];
    renderTests();
  } catch (e) { $("testsList").innerHTML = emptyState(SVG.alert, "Yuklashda xatolik: " + e.message); }
}
function pct(part, total) { return total ? Math.round((part / total) * 100) : 0; }
function renderTests() {
  if (!TESTS.length) { $("testsList").innerHTML = emptyState(SVG.flask, "Hali test yo'q — birinchisini yuqorida yarating"); return; }
  $("testsList").innerHTML = TESTS.map(function (t) {
    const r = t.results || { A: { total: 0, replied: 0, converted: 0 }, B: { total: 0, replied: 0, converted: 0 } };
    const aRate = pct(r.A.replied, r.A.total), bRate = pct(r.B.replied, r.B.total);
    const aConv = pct(r.A.converted, r.A.total), bConv = pct(r.B.converted, r.B.total);
    const n = r.A.total + r.B.total;
    let verdict = "";
    if (t.status === "running" || t.status === "stopped") {
      if (n < 20) verdict = '<span class="small muted">Hali ma\\'lumot kam (' + n + ' kontakt) — xulosa uchun kamida 20 kerak</span>';
      else {
        const diff = Math.abs(aRate - bRate);
        const lead = aRate > bRate ? "A" : bRate > aRate ? "B" : null;
        verdict = lead
          ? '<span class="small" style="display:inline-flex;align-items:center;gap:5px">' + SVG.trendingUp + (diff >= 10 ? "<strong>" + lead + " varianti sezilarli yaxshi</strong> (+" + diff + " f.p.)" : lead + " biroz oldinda (+" + diff + " f.p.) — farq hali sezilarli emas") + "</span>"
          : '<span class="small muted">Natijalar teng</span>';
      }
    }
    const varRow = function (v, data, rate, conv, text) {
      return '<div style="background:var(--panel2);border-radius:11px;padding:10px 13px">' +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:5px"><strong>Variant ' + v + '</strong>' +
        '<span class="small muted">' + data.total + " kontakt · javob " + rate + "% · konversiya " + conv + "%</span>" +
        (t.status !== "finished" ? '<span style="flex:1"></span><button class="btn btn-sm btn-secondary" onclick="finishTest(' + t.id + ',\\'' + v + '\\')">' + SVG.flag + " G\\'olib qilish</button>" : "") +
        "</div>" +
        '<div class="small muted" style="white-space:pre-wrap">' + esc(text || "") + "</div></div>";
    };
    return '<div class="card" style="margin-bottom:12px;' + (t.status === "finished" ? "opacity:.65" : "") + '">' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
        "<strong>" + esc(t.name) + "</strong>" +
        '<span class="pill pill-plain">' + (TYPE_LBL[t.test_type] || t.test_type) + "</span>" +
        '<span class="pill ' + (t.status === "running" ? "pill-ok" : t.status === "finished" ? "pill-plain" : "pill-warn") + '">' +
          (t.status === "running" ? "ketmoqda" : t.status === "finished" ? "yakunlangan" : "to'xtatilgan") + "</span>" +
        '<span class="small muted">A ' + t.split_percent + "% / B " + (100 - t.split_percent) + "%</span>" +
        '<span style="flex:1"></span>' +
        (t.status === "running" ? '<button class="btn btn-sm btn-plain" onclick="setTestStatus(' + t.id + ',\\'stopped\\')">' + SVG.pause + " To\\'xtatish</button>" : "") +
        (t.status === "stopped" ? '<button class="btn btn-sm btn-plain" onclick="setTestStatus(' + t.id + ',\\'running\\')">' + SVG.play + " Davom ettirish</button>" : "") +
      "</div>" +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px" class="ab-cols">' +
        varRow("A", r.A, aRate, aConv, t.variant_a) +
        varRow("B", r.B, bRate, bConv, t.variant_b) +
      "</div>" + verdict + "</div>";
  }).join("");
}
async function createTest(btn) {
  const name = $("abName").value.trim();
  const a = $("abA").value.trim(), b = $("abB").value.trim();
  if (!name || !a || !b) return toast("Nom va ikkala variant majburiy", false);
  btn.disabled = true;
  try {
    await postJson("/api/ab-tests", {
      name, test_type: $("abType").value, variant_a: a, variant_b: b,
      split_percent: Number($("abSplit").value),
    });
    toast("Test boshlandi — yangi mijozlar variantlarga bo'linadi");
    $("abName").value = ""; $("abA").value = ""; $("abB").value = "";
    loadTests();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function setTestStatus(id, status) {
  try {
    await postJson("/api/ab-tests/" + id + "/status", { status });
    loadTests();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function finishTest(id, winner) {
  const t = TESTS.find(function (x) { return x.id === id; });
  openModal("G'olibni doimiy qilish", '<p style="line-height:1.7;margin-bottom:14px">"<strong>' + esc(t ? t.name : "") + '</strong>" testida <strong>' + winner + "</strong> varianti " +
    (t && t.test_type === "followup" ? "follow-up matni" : "salomlashish matni") + " sifatida DOIMIY saqlanadi va test yakunlanadi. Davom etasizmi?</p>" +
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-plain" onclick="closeModal()">Bekor</button>' +
    '<button class="btn btn-primary" onclick="doFinish(' + id + ',\\'' + winner + '\\')">Ha, doimiy qilish</button></div>');
}
async function doFinish(id, winner) {
  try {
    await postJson("/api/ab-tests/" + id + "/finish", { winner });
    closeModal();
    toast("G'olib saqlandi — endi doimiy ishlatiladi");
    loadTests();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadTests();`;

  return renderLayout({
    title: "A/B testlar",
    active: "abtests",
    headerAction: "",
    content,
    script,
  });
}
