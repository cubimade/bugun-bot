// templates/keywords.js — 7.4: Kalit so'z → avto-javob qoidalari sahifasi
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";

// ============================================================
//  9. KALIT SO'ZLAR — /dashboard/keywords
//  Postda "NARX deb yozing" → kim yozsa avtomatik javob (AI'siz)
// ============================================================
export function renderKeywordsPage() {
  const content = `
  <div class="card glow" style="margin-bottom:16px">
    <h3 style="margin-bottom:4px">Qanday ishlaydi?</h3>
    <p class="small muted" style="line-height:1.7">Postingizda "<strong>NARX</strong> deb yozing" deng — kim DM'da yoki kommentda shu so'zni yozsa,
    bot <strong>AI'siz, bir zumda</strong> siz belgilagan javobni yuboradi (kommentga — avtomatik DM). Bu tejamkor va aniq.
    Qoida bitta akkauntga yoki hammasiga tegishli bo'lishi mumkin.</p>
  </div>

  <div class="card" style="margin-bottom:16px">
    <h3 style="margin-bottom:12px;display:flex;align-items:center;gap:8px">${ICONS.plus} Yangi qoida</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px" class="kw-cols">
      <div><label class="lbl">Kalit so'z</label>
        <input class="input" id="kwWord" maxlength="100" placeholder="Masalan: NARX"></div>
      <div><label class="lbl">Moslik turi</label>
        <select class="input" id="kwType">
          <option value="contains">Ichida bo'lsa (tavsiya)</option>
          <option value="exact">Aynan shu so'z bo'lsa</option>
        </select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px" class="kw-cols">
      <div><label class="lbl">Akkaunt</label>
        <select class="input" id="kwProject"><option value="">Barcha akkauntlar</option></select></div>
      <div><label class="lbl">Rasm URL (ixtiyoriy, https://...)</label>
        <input class="input" id="kwMedia" maxlength="500" placeholder="Javob bilan birga rasm yuboriladi"></div>
    </div>
    <label class="lbl">Javob matni</label>
    <textarea class="input" id="kwReply" rows="3" maxlength="900" placeholder="Narxlarimiz: ... To'liq ro'yxat uchun 'HAMMASI' deb yozing 😊" style="margin-bottom:12px"></textarea>
    <button class="btn btn-primary" onclick="addRule(this)">${ICONS.plus} Qo'shish</button>
  </div>

  <div id="rulesList"><div class="skeleton" style="height:70px;margin-bottom:10px"></div><div class="skeleton" style="height:70px"></div></div>

  <style>@media (max-width: 640px) { .kw-cols { grid-template-columns: 1fr !important; } }</style>`;

  const script = `
let RULES = [];
async function loadRules() {
  try {
    const [r, p] = await Promise.all([api("/api/keywords"), api("/api/projects")]);
    RULES = r.rules || [];
    $("kwProject").innerHTML = '<option value="">Barcha akkauntlar</option>' +
      (p.projects || []).filter((x) => x.ig_account_id).map((x) =>
        \`<option value="\${x.id}">\${esc(x.name)}</option>\`).join("");
    renderRules();
  } catch (e) {
    $("rulesList").innerHTML = emptyState('${ICONS.alert}', "Yuklashda xatolik: " + e.message);
  }
}
function renderRules() {
  document.querySelector(".page-head h1").textContent = "Kalit so'zlar · " + RULES.length + " ta";
  if (!RULES.length) {
    $("rulesList").innerHTML = emptyState('${ICONS.key}', "Hali qoida yo'q — birinchisini yuqorida qo'shing");
    return;
  }
  $("rulesList").innerHTML = '<div class="group-list">' + RULES.map((r, i) => \`
    <div class="group-row" style="\${r.is_active ? "" : "opacity:.55"}">
      <div class="row-body">
        <p class="row-title" style="display:flex;align-items:center;gap:6px">${ICONS.key} \${esc(r.keyword)}</p>
        <p class="row-sub">\${r.match_type === "exact" ? "aynan shu so'z" : "ichida bo'lsa"} · \${esc(r.project_name || "Barcha akkauntlar")}\${r.media_url ? " · rasm bilan" : ""}</p>
        <p class="row-sub" style="white-space:pre-wrap;overflow:visible;text-overflow:clip;margin-top:4px">\${esc(r.reply_text)}</p>
      </div>
      <span class="pill \${r.hit_count ? "pill-ok" : "pill-plain"}" title="Necha marta ishlagan">\${r.hit_count} marta</span>
      <button class="btn btn-plain btn-sm" onclick="toggleRule(\${r.id}, \${!r.is_active})">\${r.is_active ? "To'xtatish" : "Yoqish"}</button>
      <button class="btn btn-plain btn-sm" onclick="deleteRule(\${r.id})" title="O'chirish">${ICONS.trash}</button>
    </div>\${i < RULES.length - 1 ? '<div class="separator no-avatar"></div>' : ""}\`).join("") + '</div>';
}
async function addRule(btn) {
  const keyword = $("kwWord").value.trim();
  const reply_text = $("kwReply").value.trim();
  if (!keyword || !reply_text) return toast("Kalit so'z va javob matni majburiy", false);
  btn.disabled = true;
  try {
    await postJson("/api/keywords", {
      keyword, reply_text,
      match_type: $("kwType").value,
      media_url: $("kwMedia").value.trim(),
      project_id: $("kwProject").value || null,
    });
    toast("Qoida qo'shildi (1 daqiqagacha kuchga kiradi)");
    $("kwWord").value = ""; $("kwReply").value = ""; $("kwMedia").value = "";
    loadRules();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function toggleRule(id, val) {
  try {
    await postJson("/api/keywords/" + id, { is_active: val });
    const r = RULES.find((x) => x.id === id);
    if (r) r.is_active = val;
    renderRules();
    toast(val ? "Qoida yoqildi" : "Qoida to'xtatildi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function deleteRule(id) {
  const r = RULES.find((x) => x.id === id);
  openModal("Qoidani o'chirish", \`
    <p style="margin-bottom:16px">"<strong>\${esc(r?.keyword || "")}</strong>" qoidasi o'chirilsinmi?</p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Bekor qilish</button>
      <button class="btn btn-danger" onclick="doDeleteRule(\${id})">Ha, o'chirish</button>
    </div>\`);
}
async function doDeleteRule(id) {
  try {
    await api("/api/keywords/" + id, { method: "DELETE" });
    closeModal(); toast("Qoida o'chirildi");
    loadRules();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadRules();`;

  return renderLayout({
    title: "Kalit so'zlar",
    active: "keywords",
    headerAction: "",
    content,
    script,
  });
}
