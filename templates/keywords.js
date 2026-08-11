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
        <div style="display:flex;gap:8px">
          <input class="input" id="kwMedia" maxlength="500" placeholder="https://..." style="flex:1">
          <button class="btn" type="button" onclick="addMediaFromInput()">+ qo'shish</button>
          <button class="btn" type="button" onclick="openMediaPicker()" data-tip="Media kutubxonasidan tanlash">🖼</button>
        </div>
        <div id="kwMediaList" class="media-strip"></div>
      </div>
    </div>

    <!-- 3.1d: tugmalar (Instagram 3 tagacha ruxsat beradi) -->
    <div style="margin-bottom:12px">
      <label class="lbl">Tugmalar <span class="small muted">— 3 tagacha</span></label>
      <div id="kwButtons"></div>
      <button class="btn btn-sm" type="button" id="addBtnBtn" onclick="addButtonRow()">+ tugma qo'shish</button>
    </div>

    <!-- 3.1e: qo'shimcha sozlamalar -->
    <details style="margin-bottom:12px">
      <summary style="cursor:pointer;font-size:14px;padding:6px 0">⚙️ Qo'shimcha sozlamalar</summary>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px" class="kw-cols">
        <div><label class="lbl">Kechikish (soniya) <span class="small muted">— jonli ko'rinadi</span></label>
          <input class="input" id="kwDelay" type="number" min="0" max="60" value="0"></div>
        <div><label class="lbl">Ustuvorlik <span class="small muted">— katta raqam ustun</span></label>
          <input class="input" id="kwPriority" type="number" min="0" max="999" value="0"></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer">
        <input type="checkbox" id="kwOnce"> <span class="small">Har mijozga faqat bir marta ishlasin</span></label>
      <label style="display:flex;align-items:center;gap:8px;margin-top:6px;cursor:pointer">
        <input type="checkbox" id="kwWorkHours"> <span class="small">Faqat ish vaqtida ishlasin</span></label>
    </details>
    <label class="lbl">Javob matni</label>
    <div id="kwPreview" class="kw-preview"></div>
    <textarea class="input" id="kwReply" rows="3" maxlength="900" oninput="renderPreview()" placeholder="Narxlarimiz: ... To'liq ro'yxat uchun 'HAMMASI' deb yozing 😊" style="margin-bottom:12px"></textarea>
    <!-- ROADMAP-16 (1.1): xato endi JIMGINA yo'qolmaydi — shu yerda ko'rinadi -->
    <div id="kwError" class="kw-error" hidden></div>
    <button class="btn btn-primary" onclick="addRule(this)">${ICONS.plus} Qo'shish</button>
  </div>

  <!-- 3.1f: sinab ko'rish — haqiqiy xabar yuborilmaydi -->
  <div class="card" style="margin-bottom:16px">
    <h3 style="margin-bottom:4px">🧪 Sinab ko'rish</h3>
    <p class="small muted" style="margin-bottom:10px">Mijoz shu matnni yozsa nima bo'lishini ko'rsatadi. Haqiqiy xabar yuborilmaydi.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <input class="input" id="kwTest" placeholder="Masalan: narx qancha?" style="flex:1;min-width:180px"
             onkeydown="if(event.key==='Enter')runTest(document.getElementById('kwTestBtn'))">
      <button class="btn" id="kwTestBtn" onclick="runTest(this)">Tekshirish</button>
    </div>
    <div id="kwTestOut" style="margin-top:12px"></div>
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
  /* 3.1c: media chizig'i va kutubxona tanlagichi */
  .media-strip { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px }
  .media-item { position:relative; display:inline-flex }
  .media-item img { width:56px; height:56px; object-fit:cover; border-radius:9px;
    border:1px solid var(--glass-border) }
  .media-item button { position:absolute; top:-6px; right:-6px; width:20px; height:20px;
    border-radius:50%; border:none; background:var(--danger,#f87171); color:#fff;
    font-size:11px; line-height:1; cursor:pointer }
  .media-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:10px;
    max-height:60vh; overflow:auto }
  .media-pick { border:1px solid var(--glass-border); background:var(--input-bg); border-radius:10px;
    padding:6px; cursor:pointer; display:flex; flex-direction:column; gap:5px; align-items:center; color:inherit }
  .media-pick:hover { border-color:var(--accent) }
  .media-pick img { width:100%; height:70px; object-fit:cover; border-radius:7px }
  /* 3.1d: tugma qatorlari */
  .btn-row { display:grid; grid-template-columns:1.2fr 1fr 1.4fr auto; gap:8px; margin-bottom:8px; align-items:center }
  @media (max-width: 700px) { .btn-row { grid-template-columns:1fr 1fr; } }
  /* 3.1c: telefon maketi (oldindan ko'rish) */
  .kw-preview:empty { display:none }
  .kw-preview { margin-bottom:10px }
  .phone { max-width:260px; border:1px solid var(--glass-border); border-radius:16px; overflow:hidden;
    background:var(--input-bg) }
  .phone-top { font-size:11px; padding:6px 10px; opacity:.65; border-bottom:1px solid var(--glass-border) }
  .phone-body { padding:10px; display:flex; flex-direction:column; gap:6px; align-items:flex-start }
  .ph-img { max-width:100%; border-radius:10px; display:block }
  .ph-bubble { background:rgba(99,102,241,.16); border:1px solid rgba(99,102,241,.3);
    padding:8px 11px; border-radius:14px 14px 14px 4px; font-size:13px; line-height:1.5;
    white-space:pre-wrap; max-width:100% }
  .ph-btn { width:100%; text-align:center; padding:7px; border-radius:9px; font-size:12.5px;
    border:1px solid var(--accent); color:var(--accent) }
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
        \${(r.media_urls || []).length || r.media_url ? \`<span class="small muted">· 🖼 \${(r.media_urls || []).length || 1} ta rasm</span>\` : ""}
        \${(r.buttons || []).length ? \`<span class="small muted">· 🔘 \${r.buttons.length} tugma</span>\` : ""}
        \${r.delay_sec ? \`<span class="small muted">· ⏱ \${r.delay_sec}s</span>\` : ""}
        \${r.once_per_contact ? '<span class="small muted">· 1️⃣ bir marta</span>' : ""}
        \${r.work_hours_only ? '<span class="small muted">· 🕘 ish vaqti</span>' : ""}
        <span style="flex:1"></span>
        \${r.priority ? \`<span class="badge b-gray" data-tip="Ustuvorlik — katta raqam ustun">↑ \${r.priority}</span>\` : ""}
        <span class="badge \${r.hit_count ? "b-green" : ""}" data-tip="Necha marta ishlagan">⚡ \${r.hit_count} marta</span>
        <span class="badge \${r.reply_count ? "b-indigo" : ""}" data-tip="Qoida javobidan keyin necha kishi yozgan">💬 \${r.reply_count || 0} javob</span>
      </div>
      <div class="small" style="line-height:1.6;margin-bottom:10px;white-space:pre-wrap">\${esc(r.reply_text)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" data-tip="Yuqoriga — ustuvorlik oshadi" onclick="moveRule(\${r.id}, -1)">↑</button>
        <button class="btn btn-sm" data-tip="Pastga" onclick="moveRule(\${r.id}, 1)">↓</button>
        <button class="btn btn-sm" onclick="toggleRule(\${r.id}, \${!r.is_active})">\${r.is_active ? "⏸ To'xtatish" : "▶️ Yoqish"}</button>
        <button class="btn btn-sm btn-danger" onclick="deleteRule(\${r.id})">🗑 O'chirish</button>
      </div>
    </div>\`).join("");
}
// ---- 3.1c: MEDIA (kutubxonadan yoki URL) ----
let MEDIA = [];
function renderMedia() {
  $("kwMediaList").innerHTML = MEDIA.map((u, i) =>
    \`<span class="media-item"><img src="\${esc(u)}" alt="" loading="lazy"
      onerror="this.style.display='none'"><button type="button" data-tip="O'chirish"
      onclick="removeMedia(\${i})">✕</button></span>\`
  ).join("");
}
function removeMedia(i) { MEDIA.splice(i, 1); renderMedia(); }
function addMediaFromInput() {
  const v = $("kwMedia").value.trim();
  if (!v) return;
  if (!/^https:\\/\\//.test(v)) return showKwError("Rasm havolasi https:// bilan boshlanishi kerak");
  if (MEDIA.length >= 5) return showKwError("Ko'pi bilan 5 ta rasm");
  MEDIA.push(v); $("kwMedia").value = ""; clearKwError(); renderMedia();
}
// Media kutubxonasidan tanlash — /media/<id> nisbiy, Instagram uchun to'liq havola kerak
async function openMediaPicker() {
  openModal("🖼 Media kutubxonasi", '<div class="skeleton" style="height:90px"></div>');
  try {
    const { media } = await api("/api/media");
    const imgs = (media || []).filter((m) => m.type === "image");
    if (!imgs.length) {
      $("modalBody").innerHTML = emptyState("🖼", "Kutubxona bo'sh — Media sahifasidan rasm yuklang",
        '<a class="btn" href="/dashboard/media">Media sahifasi</a>');
      return;
    }
    $("modalBody").innerHTML = '<div class="media-grid">' + imgs.map((m) =>
      \`<button type="button" class="media-pick" onclick="pickMedia('\${esc(m.url)}')">
         <img src="\${esc(m.url)}" alt="" loading="lazy"><span class="small">\${esc(m.name)}</span></button>\`
    ).join("") + "</div>";
  } catch (e) {
    $("modalBody").innerHTML = emptyState("⚠️", "Yuklanmadi: " + e.message);
  }
}
function pickMedia(url) {
  const abs = url.startsWith("http") ? url : location.origin + url;
  if (MEDIA.length >= 5) return toast("Ko'pi bilan 5 ta rasm", false);
  MEDIA.push(abs); renderMedia(); closeModal();
}

// ---- 3.1d: TUGMALAR (3 tagacha) ----
let BUTTONS = [];
function renderButtons() {
  $("kwButtons").innerHTML = BUTTONS.map((b, i) => \`
    <div class="btn-row">
      <input class="input" placeholder="Tugma matni" maxlength="20" value="\${esc(b.title || "")}"
             oninput="BUTTONS[\${i}].title=this.value; renderPreview()">
      <select class="input" onchange="BUTTONS[\${i}].action=this.value; renderButtons()">
        <option value="link"\${b.action === "link" ? " selected" : ""}>Havola ochish</option>
        <option value="tag"\${b.action === "tag" ? " selected" : ""}>Teg qo'yish</option>
        <option value="handoff"\${b.action === "handoff" ? " selected" : ""}>Operatorga uzatish</option>
      </select>
      \${b.action === "link"
        ? \`<input class="input" placeholder="https://..." value="\${esc(b.url || "")}" oninput="BUTTONS[\${i}].url=this.value">\`
        : b.action === "tag"
        ? \`<input class="input" placeholder="Teg nomi" value="\${esc(b.tag || "")}" oninput="BUTTONS[\${i}].tag=this.value">\`
        : '<span class="small muted" style="align-self:center">Bot pauza qilinadi</span>'}
      <button class="btn btn-sm btn-danger" type="button" onclick="removeButton(\${i})">✕</button>
    </div>\`).join("");
  $("addBtnBtn").style.display = BUTTONS.length >= 3 ? "none" : "";
  renderPreview();
}
function addButtonRow() {
  if (BUTTONS.length >= 3) return;
  BUTTONS.push({ title: "", action: "link", url: "" });
  renderButtons();
}
function removeButton(i) { BUTTONS.splice(i, 1); renderButtons(); }

// ---- 3.1c: oldindan ko'rish (telefon maketi) ----
function renderPreview() {
  const box = $("kwPreview");
  if (!box) return;
  const text = $("kwReply").value.trim();
  if (!text && !MEDIA.length && !BUTTONS.length) { box.innerHTML = ""; return; }
  box.innerHTML = \`
    <div class="phone">
      <div class="phone-top">Mijoz ko'radigan javob</div>
      <div class="phone-body">
        \${MEDIA.map((u) => \`<img class="ph-img" src="\${esc(u)}" alt="" onerror="this.style.display='none'">\`).join("")}
        \${text ? \`<div class="ph-bubble">\${esc(text)}</div>\` : ""}
        \${BUTTONS.filter((b) => b.title).map((b) => \`<div class="ph-btn">\${esc(b.title)}</div>\`).join("")}
      </div>
    </div>\`;
}

// ---- 3.1f: SINAB KO'RISH ----
async function runTest(btn) {
  const text = $("kwTest").value.trim();
  if (!text) return toast("Sinov matnini yozing", false);
  btn.disabled = true;
  try {
    const r = await postJson("/api/keywords/test", { text, project_id: $("kwProject").value || null });
    if (!r.matched) {
      $("kwTestOut").innerHTML = \`<div class="kw-error warn">🤖 \${esc(r.message)}</div>\`;
    } else {
      const rl = r.rule;
      $("kwTestOut").innerHTML = \`
        <div class="card" style="padding:12px;border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.07)">
          <div class="small" style="margin-bottom:8px">✅ Ishga tushadi:
            <span class="badge b-indigo">🔑 \${esc(rl.keyword)}</span>
            <span class="muted">\${MATCH_LABELS[rl.match_type] || ""}</span></div>
          \${(rl.media_urls || []).map((u) => \`<img class="ph-img" src="\${esc(u)}" alt="" onerror="this.style.display='none'">\`).join("")}
          <div class="ph-bubble" style="max-width:100%">\${esc(rl.reply_text)}</div>
          \${(rl.buttons || []).map((b) => \`<div class="ph-btn">\${esc(b.title)}</div>\`).join("")}
          \${(r.notes || []).map((n) => \`<div class="small muted" style="margin-top:6px">\${esc(n)}</div>\`).join("")}
        </div>\`;
    }
  } catch (e) { $("kwTestOut").innerHTML = \`<div class="kw-error">Xatolik: \${esc(e.message)}</div>\`; }
  btn.disabled = false;
}

// ---- 3.1e: ustuvorlikni o'zgartirish (yuqori/quyi) ----
async function moveRule(id, dir) {
  const i = RULES.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= RULES.length) return;
  const tmp = RULES[i]; RULES[i] = RULES[j]; RULES[j] = tmp;
  renderRules();
  try {
    await postJson("/api/keywords/reorder", { ids: RULES.map((r) => r.id) });
  } catch (e) { toast("Tartib saqlanmadi: " + e.message, false); loadRules(); }
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
      media_url: "",
      media_urls: MEDIA,
      buttons: BUTTONS.filter((b) => (b.title || "").trim()),
      delay_sec: Number($("kwDelay").value) || 0,
      priority: Number($("kwPriority").value) || 0,
      once_per_contact: $("kwOnce").checked,
      work_hours_only: $("kwWorkHours").checked,
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
      MEDIA = []; BUTTONS = []; renderMedia(); renderButtons();
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
renderButtons();
renderMedia();
loadRules();`;

  return renderLayout({
    title: "Kalit so'zlar",
    active: "keywords",
    headerAction: "",
    content,
    script,
  });
}
