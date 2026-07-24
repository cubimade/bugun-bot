// templates/accounts.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";

// ============================================================
//  6. AKKAUNTLAR — /dashboard/accounts
//  Kartalar + yangi akkaunt qo'shish modali (yo'riqnoma bilan)
// ============================================================
export function renderAccountsPage() {
  const content = `
  <div id="cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
    ${'<div class="card skeleton" style="height:150px"></div>'.repeat(2)}
  </div>`;

  const script = `
let PROJECTS = [];
async function loadAccounts() {
  try {
    const { projects } = await api("/api/projects");
    PROJECTS = projects;
    if (!projects.length) {
      $("cards").innerHTML = \`<div class="card" style="grid-column:1/-1">\${emptyState("📱", "Hali akkaunt yo'q — birinchisini qo'shing")}</div>\`;
      return;
    }
    $("cards").innerHTML = projects.map((p) => \`
      <div class="card hoverable glass-glow">
        <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px">
          <div class="stat-ic" style="background:linear-gradient(135deg,#f43f5e,#8b5cf6);font-size:19px">📸</div>
          <div style="min-width:0;flex:1">
            <strong style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(p.name)}</strong>
            <span class="small muted">ID: \${esc(p.ig_account_id || "asosiy loyiha")}</span>
          </div>
          <span title="\${p.active ? "Faol — token bor" : "Nofaol — token yo'q"}" style="display:flex;align-items:center;gap:5px" class="small \${p.active ? "" : "muted"}">
            <span class="dot \${p.active ? "dot-green" : "dot-red"}"></span>\${p.active ? "faol" : "nofaol"}
          </span>
        </div>
        <div style="display:flex;gap:14px;margin-bottom:14px" class="small muted">
          <span>👥 \${p.contacts} mijoz</span>
          <span>💬 \${p.messages} xabar</span>
          <span>\${p.knowledge_base ? '🧠 <span style="color:#4ade80">bor</span>' : '🧠 bo\\'sh'}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn btn-sm" href="/dashboard/knowledge">🧠 Bilim bazasi</a>
          <button class="btn btn-sm btn-danger" onclick="confirmDelete(\${p.id})">🗑 O'chirish</button>
        </div>
      </div>\`).join("");
  } catch (e) { $("cards").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message); }
}

function addAccountModal() {
  openModal("Yangi Instagram akkaunt", \`
    <div class="card" style="padding:12px;background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.35);margin-bottom:14px">
      <strong class="small">📖 Token qanday olinadi?</strong>
      <ol class="small muted" style="margin:6px 0 0 18px;line-height:1.8">
        <li><a href="https://developers.facebook.com" target="_blank" style="color:var(--accent-soft)">developers.facebook.com</a> — ilovangizni oching</li>
        <li>Instagram → API setup with Instagram login</li>
        <li>Akkauntni ulang va <strong>Access token</strong> generatsiya qiling</li>
        <li>Shu sahifadagi <strong>Instagram account ID</strong> ni ham nusxalang</li>
        <li>Webhooks bo'limida <code>messages</code> va <code>comments</code> obunasini yoqing</li>
      </ol>
    </div>
    <label class="lbl">Akkaunt nomi</label>
    <input class="input" id="acName" placeholder="Masalan: Ikkinchi biznes" style="margin-bottom:12px">
    <label class="lbl">Instagram akkaunt IDsi</label>
    <input class="input" id="acId" placeholder="17841..." style="margin-bottom:12px">
    <label class="lbl">Access token</label>
    <input class="input" id="acToken" placeholder="IGAA..." style="margin-bottom:16px">
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Bekor qilish</button>
      <button class="btn btn-primary" id="acBtn" onclick="submitAccount()">${ICONS.plus} Qo'shish</button>
    </div>\`);
}
async function submitAccount() {
  const name = $("acName").value.trim();
  const ig_account_id = $("acId").value.trim();
  const token = $("acToken").value.trim();
  if (!ig_account_id || !token) return toast("ID va token majburiy", false);
  const btn = $("acBtn");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    const r = await postJson("/api/accounts", { name, ig_account_id, token });
    toast("Akkaunt qo'shildi ✓" + (r.username ? " — @" + r.username : ""));
    if (r.warning) setTimeout(() => toast("⚠️ " + r.warning, false), 600);
    closeModal(); loadAccounts();
  } catch (e) { toast("Xatolik: " + e.message, false); btn.disabled = false; btn.textContent = "Qo'shish"; }
}
function confirmDelete(id) {
  const p = PROJECTS.find((x) => x.id === id);
  openModal("Akkauntni o'chirish", \`
    <p style="margin-bottom:8px"><strong>\${esc(p?.name || "")}</strong> o'chirilsinmi?</p>
    <p class="small" style="color:#f87171;margin-bottom:16px">⚠️ Diqqat: bu akkauntning barcha mijozlari (\${p?.contacts ?? 0}) va xabarlari (\${p?.messages ?? 0}) ham butunlay o'chadi. Bu amalni qaytarib bo'lmaydi!</p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Bekor qilish</button>
      <button class="btn btn-danger" onclick="doDelete(\${id})">Ha, o'chirish</button>
    </div>\`);
}
async function doDelete(id) {
  try {
    await api("/api/accounts/" + id, { method: "DELETE" });
    toast("Akkaunt o'chirildi");
    closeModal(); loadAccounts();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadAccounts();`;

  return renderLayout({
    title: "Akkauntlar",
    active: "accounts",
    headerAction: `<button class="btn btn-primary" onclick="addAccountModal()">${ICONS.plus} Yangi akkaunt</button>`,
    content,
    script,
  });
}
