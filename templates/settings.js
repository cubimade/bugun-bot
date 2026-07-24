// templates/settings.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";

// ============================================================
//  7. SOZLAMALAR — /dashboard/settings
//  Bot sozlamalari · AI sozlamalari · Tizim holati
// ============================================================
export function renderSettingsPage() {
  const content = `
  <div style="display:grid;gap:14px;max-width:760px">

    <div class="card">
      <h3 style="margin-bottom:4px">🤖 Bot sozlamalari</h3>
      <p class="small muted" style="margin-bottom:16px">Ish vaqti va salomlashish — botning mijozlar bilan muomalasi.</p>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <label class="switch">
          <input type="checkbox" id="whEnabled" onchange="$('whFields').style.opacity=this.checked?'1':'.45'">
          <span class="slider"></span>
        </label>
        <div><strong class="small">Ish vaqti rejimi</strong>
        <div class="small muted">Yoqilsa — ish vaqtidan tashqari bot AI o'rniga tayyor xabar yuboradi</div></div>
      </div>
      <div id="whFields" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div><label class="lbl">Boshlanishi (soat)</label>
          <select class="input" id="whStart">${Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
        <div><label class="lbl">Tugashi (soat)</label>
          <select class="input" id="whEnd">${Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
      </div>
      <label class="lbl">Ish vaqtidan tashqari xabar</label>
      <textarea class="input" id="offMsg" rows="2" maxlength="500" style="margin-bottom:14px"></textarea>
      <label class="lbl">Salomlashish uslubi (birinchi xabarda, ixtiyoriy)</label>
      <input class="input" id="greetMsg" maxlength="300" placeholder="Masalan: Assalomu alaykum! BUGUN MEDIA'ga xush kelibsiz 👋" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="saveBotSettings(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🧠 AI sozlamalari</h3>
      <p class="small muted" style="margin-bottom:16px">Bot ikki modelni aqlli almashtiradi — xarajat va sifat muvozanati.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px" class="ai-cols">
        <div style="background:var(--panel2);border-radius:12px;padding:14px">
          <span class="badge b-green">Haiku 4.5</span>
          <div class="small muted" style="margin-top:8px">Oddiy, qisqa savollar — tez va tejamkor javob</div>
        </div>
        <div style="background:var(--panel2);border-radius:12px;padding:14px">
          <span class="badge b-indigo">Sonnet 5</span>
          <div class="small muted" style="margin-top:8px">Murakkab savollar (nega, taqqosla, strategiya...) va uzun xabarlar</div>
        </div>
      </div>
      <label class="lbl">Javob uzunligi</label>
      <select class="input" id="replyLen" style="margin-bottom:16px">
        <option value="qisqa">Qisqa (1-2 gap)</option>
        <option value="orta">O'rtacha (2-4 gap) — tavsiya</option>
        <option value="batafsil">Batafsil (4-6 gap)</option>
      </select>
      <button class="btn btn-primary" onclick="saveAiSettings(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">⚡ Tezkor javoblar</h3>
      <p class="small muted" style="margin-bottom:14px">Inbox'da bir bosishda qo'yiladigan tayyor javoblar (masalan "Narxlar haqida", "Aloqa ma'lumoti").</p>
      <div id="qrList"><div class="skeleton" style="height:44px"></div></div>
      <div style="display:grid;gap:8px;margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        <input class="input" id="qrTitle" placeholder="Sarlavha (masalan: Narxlar haqida)" maxlength="80">
        <textarea class="input" id="qrText" rows="3" maxlength="1000" placeholder="Javob matni — inbox'da shu matn qo'yiladi..."></textarea>
        <button class="btn btn-primary" style="justify-self:start" onclick="addQuickReply(this)">${ICONS.plus} Qo'shish</button>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🖥 Tizim</h3>
      <p class="small muted" style="margin-bottom:16px">Server va database holati.</p>
      <div id="sysInfo"><div class="skeleton" style="height:100px"></div></div>
    </div>
  </div>

  <style>
    .switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; display: inline-block; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; inset: 0; background: var(--panel2); border: 1px solid var(--border); border-radius: 999px; cursor: pointer; transition: .25s; }
    .slider:before { content: ""; position: absolute; width: 18px; height: 18px; left: 2px; top: 2px; background: var(--muted); border-radius: 50%; transition: .25s; }
    .switch input:checked + .slider { background: var(--grad); border-color: transparent; }
    .switch input:checked + .slider:before { transform: translateX(20px); background: #fff; }
    @media (max-width: 600px) { .ai-cols { grid-template-columns: 1fr !important; } }
  </style>`;

  const script = `
async function loadSettings() {
  try {
    const { settings: s } = await api("/api/settings");
    $("whEnabled").checked = s.work_hours_enabled === "true";
    $("whFields").style.opacity = $("whEnabled").checked ? "1" : ".45";
    $("whStart").value = String(parseInt(s.work_start, 10) || 9);
    $("whEnd").value = String(parseInt(s.work_end, 10) || 21);
    $("offMsg").value = s.off_hours_message || "";
    $("greetMsg").value = s.greeting_message || "";
    $("replyLen").value = s.reply_length || "orta";
  } catch (e) { toast("Sozlamalar yuklanmadi: " + e.message, false); }
}
async function saveBotSettings(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      work_hours_enabled: String($("whEnabled").checked),
      work_start: $("whStart").value,
      work_end: $("whEnd").value,
      off_hours_message: $("offMsg").value.trim(),
      greeting_message: $("greetMsg").value.trim(),
    });
    toast("Bot sozlamalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function saveAiSettings(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", { reply_length: $("replyLen").value });
    toast("AI sozlamalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
function fmtUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return (d ? d + " kun " : "") + (h ? h + " soat " : "") + m + " daqiqa";
}
async function loadSystem() {
  try {
    const s = await api("/api/system");
    $("sysInfo").innerHTML = \`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
        \${sysRow("Versiya", "v" + s.version)}
        \${sysRow("Server", '<span class="dot dot-green"></span> ishlayapti')}
        \${sysRow("Database", s.db ? '<span class="dot dot-green"></span> ulangan' : '<span class="dot dot-red"></span> uzilgan')}
        \${sysRow("Akkauntlar", s.accounts + " ta faol")}
        \${sysRow("Oxirgi deploy", fmt(s.startedAt))}
        \${sysRow("Ishlash vaqti", fmtUptime(s.uptimeSec))}
        \${sysRow("Node.js", s.node)}
      </div>\`;
  } catch (e) { $("sysInfo").innerHTML = emptyState("🖥", "Tizim ma'lumoti yuklanmadi"); }
}
function sysRow(label, valueHtml) {
  return \`<div style="background:var(--panel2);border-radius:12px;padding:12px">
    <div class="small muted" style="margin-bottom:4px">\${label}</div>
    <div style="display:flex;align-items:center;gap:7px;font-weight:600;font-size:13px">\${valueHtml}</div></div>\`;
}
// C2: Tezkor javoblarni boshqarish
async function loadQuickReplies() {
  try {
    const { replies } = await api("/api/saved-replies");
    if (!replies.length) {
      $("qrList").innerHTML = emptyState("⚡", "Hali tezkor javob yo'q — birinchisini qo'shing");
      return;
    }
    $("qrList").innerHTML = replies.map((r) => \`
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="min-width:0;flex:1">
          <strong class="small" style="display:block">\${esc(r.title)}</strong>
          <span class="small muted" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(r.text)}</span>
        </div>
        <button class="btn btn-sm btn-danger" onclick="deleteQuickReply(\${r.id})" title="O'chirish">✕</button>
      </div>\`).join("");
  } catch (e) { $("qrList").innerHTML = emptyState("⚡", "Yuklanmadi: " + e.message); }
}
async function addQuickReply(btn) {
  const title = $("qrTitle").value.trim();
  const text = $("qrText").value.trim();
  if (!title || !text) return toast("Sarlavha va matn majburiy", false);
  btn.disabled = true;
  try {
    await postJson("/api/saved-replies", { title, text });
    $("qrTitle").value = ""; $("qrText").value = "";
    toast("Tezkor javob qo'shildi ✓");
    loadQuickReplies();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function deleteQuickReply(id) {
  try {
    await api("/api/saved-replies/" + id, { method: "DELETE" });
    toast("O'chirildi");
    loadQuickReplies();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadSettings(); loadSystem(); loadQuickReplies();`;

  return renderLayout({
    title: "Sozlamalar",
    active: "settings",
    headerAction: "",
    content,
    script,
  });
}
