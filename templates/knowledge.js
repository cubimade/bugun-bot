// templates/knowledge.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";

// ============================================================
//  5. BILIM BAZASI — /dashboard/knowledge
//  Akkaunt kartalari → katta tahrirlash ko'rinishi + shablon
// ============================================================
export function renderKnowledgePage() {
  const content = `
  <div id="listView">
    <p class="muted" style="margin-bottom:16px">Har akkaunt uchun biznes ma'lumotlari — bot mijozlarga shu ma'lumot asosida javob beradi.</p>
    <div id="cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
      ${'<div class="card skeleton" style="height:130px"></div>'.repeat(3)}
    </div>
  </div>

  <div id="editView" style="display:none">
    <button class="btn btn-sm" onclick="backToList()" style="margin-bottom:14px">← Orqaga</button>
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <h3 id="editTitle" style="flex:1"></h3>
        <button class="btn btn-sm" onclick="reviewKb(this)">🔍 Sifatni tekshirish</button>
        <button class="btn btn-sm" onclick="insertTemplate()">📋 Shablon qo'yish</button>
      </div>
      <div id="kbReview" style="display:none;margin-bottom:14px"></div>
      <p class="small muted" style="margin-bottom:10px">
        Nima yozish kerak: <strong>xizmatlar, narxlar, aloqa ma'lumotlari, ish vaqti, manzil, FAQ</strong>.
        Bot faqat shu yerda yozilgan ma'lumotdan foydalanadi — qanchalik to'liq bo'lsa, javoblar shunchalik aniq.
      </p>
      <textarea class="input" id="kbText" rows="18" style="font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.6" placeholder="BIZ HAQIMIZDA:\n..."></textarea>
      <div style="display:flex;align-items:center;gap:12px;margin-top:14px">
        <button class="btn btn-primary" id="saveBtn" onclick="saveKb()">${ICONS.check} Saqlash</button>
        <span class="small muted"><span id="kbChars">0</span> belgi</span>
      </div>
    </div>
  </div>`;

  const script = `
const TEMPLATE = [
  "BIZ HAQIMIZDA:",
  "(Biznes nomi, nima bilan shug'ullanadi, necha yildan beri, nimasi bilan ajralib turadi)",
  "",
  "XIZMATLAR / MAHSULOTLAR:",
  "1. (Xizmat nomi) — (qisqa tavsif)",
  "2. ...",
  "",
  "NARXLAR:",
  "- (Xizmat): (narx yoki narx oralig'i)",
  "- Chegirmalar: ...",
  "",
  "ALOQA:",
  "- Telefon: ",
  "- Telegram: ",
  "- Manzil: ",
  "- Ish vaqti: Dush-Shan 9:00-18:00",
  "",
  "FAQ (ko'p so'raladigan savollar):",
  "S: (Savol)?",
  "J: (Javob)",
].join("\\n");

let PROJECTS = [];
let CURRENT_ID = null;

async function loadCards() {
  try {
    const { projects } = await api("/api/projects");
    PROJECTS = projects;
    if (!projects.length) { $("cards").innerHTML = emptyState("📱", "Hali akkaunt yo'q — avval akkaunt qo'shing"); return; }
    $("cards").innerHTML = projects.map((p) => {
      const len = (p.knowledge_base || "").length;
      return \`
      <div class="card hoverable" style="cursor:pointer" onclick="openEditor(\${p.id})">
        <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px">
          \${avatar(p.name, 38)}
          <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(p.name)}</strong>
        </div>
        \${len
          ? \`<span class="badge b-green">To'ldirilgan ✅</span> <span class="small muted" style="margin-left:6px">\${len} belgi</span>\`
          : '<span class="badge b-amber">Bo\\'sh ⚠️</span> <span class="small muted" style="margin-left:6px">bot umumiy javob beradi</span>'}
        <div class="small muted" style="margin-top:10px;height:38px;overflow:hidden;\${len ? "" : "font-style:italic"}">\${len ? esc((p.knowledge_base || "").slice(0, 110)) + "…" : "Bosib to'ldiring — bot aqlliroq bo'ladi"}</div>
      </div>\`;
    }).join("");
  } catch (e) { $("cards").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message); }
}
async function openEditor(id) {
  CURRENT_ID = id;
  const p = PROJECTS.find((x) => x.id === id);
  $("editTitle").textContent = "🧠 " + (p ? p.name : "Akkaunt");
  $("listView").style.display = "none";
  $("editView").style.display = "";
  $("kbReview").style.display = "none"; $("kbReview").innerHTML = "";
  $("kbText").value = ""; updateChars();
  try {
    const { knowledge } = await api("/api/knowledge/" + id);
    $("kbText").value = knowledge || "";
    updateChars();
  } catch (e) { toast("Yuklashda xatolik: " + e.message, false); }
}
function backToList() {
  $("editView").style.display = "none";
  $("listView").style.display = "";
  loadCards();
}
function updateChars() { $("kbChars").textContent = $("kbText").value.length; }
$("kbText").addEventListener("input", updateChars);
function insertTemplate() {
  const cur = $("kbText").value.trim();
  if (cur && !confirm("Matn bor — shablon oxiriga qo'shilsinmi?")) return;
  $("kbText").value = cur ? cur + "\\n\\n" + TEMPLATE : TEMPLATE;
  updateChars();
  toast("Shablon qo'yildi — o'z ma'lumotlaringiz bilan to'ldiring");
}
async function saveKb() {
  const btn = $("saveBtn");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saqlanmoqda...';
  try {
    await postJson("/api/knowledge/" + CURRENT_ID, { knowledge: $("kbText").value });
    toast("Bilim bazasi saqlandi ✓");
    const p = PROJECTS.find((x) => x.id === CURRENT_ID);
    if (p) p.knowledge_base = $("kbText").value;
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false; btn.innerHTML = "Saqlash";
}
// 7.7: Bilim bazasi sifatini AI bilan baholash
const SECTION_LABELS = {
  xizmatlar: "Xizmatlar", narxlar: "Narxlar", aloqa: "Aloqa",
  ish_vaqti: "Ish vaqti", faq: "FAQ",
};
const SECTION_ICONS = { ok: "✅", partial: "⚠️", missing: "❌" };
async function reviewKb(btn) {
  if (!CURRENT_ID) return;
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Baholanmoqda...';
  $("kbReview").style.display = ""; $("kbReview").innerHTML = skeletonRows(2, 60);
  try {
    const { review: r, cachedAt } = await api("/api/knowledge/" + CURRENT_ID + "/review");
    const scoreColor = r.score >= 70 ? "var(--success)" : r.score >= 40 ? "var(--warning)" : "var(--danger)";
    $("kbReview").innerHTML = \`
      <div class="card glow" style="padding:16px">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:12px">
          <div style="text-align:center">
            <div style="font-size:34px;font-weight:800;color:\${scoreColor};line-height:1">\${r.score}</div>
            <div class="small muted">/ 100 ball</div>
          </div>
          <div style="flex:1;min-width:180px;display:flex;gap:8px;flex-wrap:wrap">
            \${Object.keys(SECTION_LABELS).map((k) =>
              \`<span class="badge" title="\${SECTION_LABELS[k]}">\${SECTION_ICONS[(r.sections || {})[k]] || "❔"} \${SECTION_LABELS[k]}</span>\`).join("")}
          </div>
        </div>
        \${(r.tips || []).length ? \`
          <strong class="small">Tavsiyalar:</strong>
          <ul class="small" style="margin:6px 0 0 18px;line-height:1.8">
            \${r.tips.map((t) => "<li>" + esc(t) + "</li>").join("")}
          </ul>\` : ""}
        \${r.unanswered_note ? \`<div class="small" style="margin-top:10px;color:var(--warning)">🤷 \${esc(r.unanswered_note)}</div>\` : ""}
        \${(r.unanswered_samples || []).length ? \`
          <details style="margin-top:10px"><summary class="small muted" style="cursor:pointer">Bot javob berolmagan savollar (\${r.unanswered_samples.length})</summary>
          <ul class="small muted" style="margin:6px 0 0 18px;line-height:1.7">
            \${r.unanswered_samples.map((q) => "<li>" + esc(q) + "</li>").join("")}
          </ul></details>\` : ""}
        <div class="small muted" style="margin-top:10px">Baholangan: \${fmt(cachedAt)} · matn o'zgarsa qayta baholanadi</div>
      </div>\`;
  } catch (e) {
    $("kbReview").innerHTML = '<div class="card">' + emptyState("⚠️", "Baholab bo'lmadi: " + e.message) + "</div>";
  }
  btn.disabled = false; btn.innerHTML = "🔍 Sifatni tekshirish";
}
loadCards();`;

  return renderLayout({
    title: "Bilim bazasi",
    active: "knowledge",
    headerAction: `<a class="btn" href="/dashboard/accounts">${ICONS.accounts} Akkauntlar</a>`,
    content,
    script,
  });
}
