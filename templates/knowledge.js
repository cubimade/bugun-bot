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
        <button class="btn btn-sm" onclick="insertTemplate()">📋 Shablon qo'yish</button>
      </div>
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
loadCards();`;

  return renderLayout({
    title: "Bilim bazasi",
    active: "knowledge",
    headerAction: `<a class="btn" href="/dashboard/accounts">${ICONS.accounts} Akkauntlar</a>`,
    content,
    script,
  });
}
