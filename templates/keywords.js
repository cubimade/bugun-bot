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
    <h3 style="margin-bottom:12px">➕ Yangi qoida</h3>
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
    $("rulesList").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message);
  }
}
function renderRules() {
  document.querySelector(".page-head h1").textContent = "Kalit so'zlar · " + RULES.length + " ta";
  if (!RULES.length) {
    $("rulesList").innerHTML = emptyState("🔑", "Hali qoida yo'q — birinchisini yuqorida qo'shing");
    return;
  }
  $("rulesList").innerHTML = RULES.map((r) => \`
    <div class="card" style="margin-bottom:10px;\${r.is_active ? "" : "opacity:.55"}">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        <span class="badge b-indigo" style="font-size:13px;padding:4px 12px">🔑 \${esc(r.keyword)}</span>
        <span class="small muted">\${r.match_type === "exact" ? "aynan shu so'z" : "ichida bo'lsa"}</span>
        <span class="small muted">· \${esc(r.project_name || "Barcha akkauntlar")}</span>
        \${r.media_url ? '<span class="small muted">· 🖼 rasm bilan</span>' : ""}
        <span style="flex:1"></span>
        <span class="badge \${r.hit_count ? "b-green" : ""}" title="Necha marta ishlagan">⚡ \${r.hit_count} marta</span>
      </div>
      <div class="small" style="line-height:1.6;margin-bottom:10px;white-space:pre-wrap">\${esc(r.reply_text)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="toggleRule(\${r.id}, \${!r.is_active})">\${r.is_active ? "⏸ To'xtatish" : "▶️ Yoqish"}</button>
        <button class="btn btn-sm btn-danger" onclick="deleteRule(\${r.id})">🗑 O'chirish</button>
      </div>
    </div>\`).join("");
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
    toast("Qoida qo'shildi ✓ (1 daqiqagacha kuchga kiradi)");
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
    toast(val ? "Qoida yoqildi ▶️" : "Qoida to'xtatildi ⏸");
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
