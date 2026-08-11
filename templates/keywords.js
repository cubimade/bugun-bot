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
      <div><label class="lbl">Kalit so'zlar <span class="small muted">— vergul yoki Enter bilan ajrating</span></label>
        <div class="chip-box" id="kwChipBox" onclick="document.getElementById('kwWord').focus()">
          <span id="kwChips"></span>
          <input id="kwWord" maxlength="100" placeholder="Masalan: NARX" autocomplete="off">
        </div>
        <div class="small muted" style="margin-top:4px">Har so'z uchun alohida qoida yaratiladi</div>
      </div>
      <div><label class="lbl">Moslik turi</label>
        <select class="input" id="kwType">
          <option value="contains">Ichida bo'lsa (tavsiya)</option>
          <option value="exact">Aynan shu so'z bo'lsa</option>
          <option value="starts">Shu so'z bilan boshlansa</option>
          <option value="regex">Regex (ilg'or)</option>
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
    <!-- ROADMAP-16 (1.1): xato endi JIMGINA yo'qolmaydi — shu yerda ko'rinadi -->
    <div id="kwError" class="kw-error" hidden></div>
    <button class="btn btn-primary" onclick="addRule(this)">${ICONS.plus} Qo'shish</button>
  </div>

  <div id="rulesList"><div class="skeleton" style="height:70px;margin-bottom:10px"></div><div class="skeleton" style="height:70px"></div></div>

  <style>
  @media (max-width: 640px) { .kw-cols { grid-template-columns: 1fr !important; } }
  /* Chip'li kiritish maydoni (ROADMAP-16 3.1a) */
  .chip-box { display:flex; flex-wrap:wrap; align-items:center; gap:6px; min-height:44px;
    padding:7px 10px; border-radius:10px; border:1px solid var(--glass-border);
    background:var(--input-bg); cursor:text; }
  .chip-box:focus-within { border-color:var(--accent); box-shadow:0 0 0 3px rgba(99,102,241,.18); }
  .chip-box input { flex:1; min-width:110px; border:none; background:transparent; outline:none;
    color:var(--text-1); font-size:14px; padding:4px 2px; font-family:inherit; }
  .kw-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 8px 4px 10px;
    border-radius:999px; background:rgba(99,102,241,.16); border:1px solid rgba(99,102,241,.4);
    font-size:13px; white-space:nowrap; }
  .kw-chip button { border:none; background:transparent; color:inherit; cursor:pointer;
    font-size:14px; line-height:1; padding:0 2px; opacity:.7; }
  .kw-chip button:hover { opacity:1 }
  .kw-error { margin-bottom:12px; padding:10px 12px; border-radius:10px; font-size:13.5px;
    line-height:1.6; border:1px solid rgba(248,113,113,.5); background:rgba(248,113,113,.1); }
  .kw-error.warn { border-color:rgba(251,191,36,.5); background:rgba(251,191,36,.1); }
  </style>`;

  const script = `
let RULES = [];
const MATCH_LABELS = {
  exact: "aynan shu so'z", contains: "ichida bo'lsa",
  starts: "shu so'z bilan boshlansa", regex: "regex",
};
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
        <span class="small muted">\${MATCH_LABELS[r.match_type] || "ichida bo'lsa"}</span>
        <span class="small muted">· \${esc(r.project_name || "Barcha akkauntlar")}</span>
        \${r.media_url ? '<span class="small muted">· 🖼 rasm bilan</span>' : ""}
        <span style="flex:1"></span>
        <span class="badge \${r.hit_count ? "b-green" : ""}" data-tip="Necha marta ishlagan">⚡ \${r.hit_count} marta</span>
      </div>
      <div class="small" style="line-height:1.6;margin-bottom:10px;white-space:pre-wrap">\${esc(r.reply_text)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="toggleRule(\${r.id}, \${!r.is_active})">\${r.is_active ? "⏸ To'xtatish" : "▶️ Yoqish"}</button>
        <button class="btn btn-sm btn-danger" onclick="deleteRule(\${r.id})">🗑 O'chirish</button>
      </div>
    </div>\`).join("");
}
// ---- Chip'lar (ROADMAP-16 3.1a): har kalit so'z alohida qoida ----
let CHIPS = [];
function renderChips() {
  $("kwChips").innerHTML = CHIPS.map((k, i) =>
    \`<span class="kw-chip">\${esc(k)}<button type="button" data-tip="O'chirish" onclick="removeChip(\${i})">✕</button></span>\`
  ).join("");
}
function removeChip(i) { CHIPS.splice(i, 1); renderChips(); }
function addChip(raw) {
  // Bir vaqtda vergul bilan bir nechta so'z tashlansa ham to'g'ri bo'linadi
  let added = false;
  String(raw || "").split(",").forEach((part) => {
    const k = part.trim().slice(0, 100);
    if (!k) return;
    if (CHIPS.some((x) => x.toLowerCase() === k.toLowerCase())) return; // takror
    CHIPS.push(k); added = true;
  });
  if (added) renderChips();
  return added;
}
function setupChipInput() {
  const inp = $("kwWord");
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (addChip(inp.value)) inp.value = "";
    } else if (e.key === "Backspace" && !inp.value && CHIPS.length) {
      CHIPS.pop(); renderChips();
    }
  });
  // Fokus yo'qolganda yozilgan so'z YO'QOLMASIN — chip bo'lib qo'shiladi
  inp.addEventListener("blur", () => { if (addChip(inp.value)) inp.value = ""; });
  inp.addEventListener("paste", (e) => {
    const txt = (e.clipboardData || window.clipboardData).getData("text");
    if (txt && txt.includes(",")) { e.preventDefault(); addChip(txt); inp.value = ""; }
  });
}
function showKwError(html, warn) {
  const box = $("kwError");
  box.innerHTML = html;
  box.className = "kw-error" + (warn ? " warn" : "");
  box.hidden = false;
}
function clearKwError() { $("kwError").hidden = true; }

async function addRule(btn) {
  clearKwError();
  // Enter bosilmagan bo'lsa ham, yozilgan so'z hisobga olinsin
  addChip($("kwWord").value); $("kwWord").value = "";
  const keywords = CHIPS.slice();
  const reply_text = $("kwReply").value.trim();

  if (!keywords.length) return showKwError("Kamida bitta kalit so'z kiriting.");
  if (!reply_text) return showKwError("Javob matni bo'sh — bot nima yozishini belgilang.");

  btn.disabled = true;
  try {
    const r = await postJson("/api/keywords", {
      keywords, reply_text,
      match_type: $("kwType").value,
      media_url: $("kwMedia").value.trim(),
      project_id: $("kwProject").value || null,
    });
    const n = (r.created || []).length;
    toast(n + " ta qoida qo'shildi ✓ (1 daqiqagacha kuchga kiradi)");
    // Qisman muvaffaqiyat: qo'shilmaganlari sababi bilan ko'rsatiladi
    if (r.skipped && r.skipped.length) {
      showKwError("Qo'shilmadi: " + r.skipped.map((s) => "<strong>" + esc(s.keyword) + "</strong> — " + esc(s.reason)).join(", "), true);
      CHIPS = r.skipped.map((s) => s.keyword);
    } else {
      CHIPS = [];
      $("kwReply").value = ""; $("kwMedia").value = "";
    }
    renderChips();
    loadRules(); // sahifa qayta yuklanmaydi — ro'yxat o'zi yangilanadi
  } catch (e) {
    // Endi xato JIMGINA yutilmaydi: formada ham, toast'da ham ko'rinadi
    showKwError("Qo'shilmadi: " + esc(e.message));
    toast("Qo'shilmadi: " + e.message, false);
  }
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
setupChipInput();
loadRules();`;

  return renderLayout({
    title: "Kalit so'zlar",
    active: "keywords",
    headerAction: "",
    content,
    script,
  });
}
