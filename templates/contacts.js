// templates/contacts.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";

// ============================================================
//  3. KONTAKTLAR — /dashboard/contacts
//  Jadval: avatar, ism/ID, akkaunt, teglar, xabarlar, faollik, amallar
// ============================================================
export function renderContactsPage() {
  const content = `
  <div class="card" style="padding:14px;margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    <input class="input" id="search" placeholder="🔍 Qidirish (ism yoki ID)..." style="flex:1;min-width:180px" oninput="renderTable()">
    <select class="input" id="tagFilter" style="width:auto;min-width:150px" onchange="renderTable()">
      <option value="">Barcha teglar</option>
    </select>
    <select class="input" id="accFilter" style="width:auto;min-width:150px" onchange="renderTable()">
      <option value="">Barcha akkauntlar</option>
    </select>
  </div>
  <div class="table-wrap">
    <table class="tbl">
      <thead><tr>
        <th>Mijoz</th><th>Akkaunt</th><th>Teglar</th>
        <th style="text-align:center">Xabarlar</th><th>Oxirgi faollik</th><th></th>
      </tr></thead>
      <tbody id="rows"><tr><td colspan="6">${'<div class="skeleton" style="height:44px;margin:6px 0"></div>'.repeat(4)}</td></tr></tbody>
    </table>
  </div>
  <div style="text-align:center;margin-top:14px">
    <button class="btn" id="loadMore" style="display:none" onclick="loadMore()">⬇ Ko'proq yuklash</button>
  </div>
  ${DRAWER_HTML}`;

  const script = `
let CONTACTS = [];
let ALL_TAGS = [];
let EDITING = null;
let TOTAL = 0;
const PAGE = 50;

async function loadData() {
  try {
    const [c, t] = await Promise.all([api("/api/contacts?limit=" + PAGE), api("/api/tags")]);
    CONTACTS = c.contacts; TOTAL = c.total ?? c.contacts.length; ALL_TAGS = t.tags || [];
    fillFilters(); renderTable();
  } catch (e) {
    $("rows").innerHTML = \`<tr><td colspan="6">\${emptyState("⚠️", "Yuklashda xatolik: " + e.message)}</td></tr>\`;
  }
}
// B2: pagination — keyingi 50 tani qo'shib yuklash
async function loadMore() {
  const btn = $("loadMore");
  btn.disabled = true; btn.textContent = "Yuklanmoqda...";
  try {
    const c = await api("/api/contacts?limit=" + PAGE + "&offset=" + CONTACTS.length);
    const bor = new Set(CONTACTS.map((x) => x.id));
    CONTACTS = CONTACTS.concat((c.contacts || []).filter((x) => !bor.has(x.id)));
    TOTAL = c.total ?? TOTAL;
    fillFilters(); renderTable();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false; btn.textContent = "⬇ Ko'proq yuklash";
}
function fillFilters() {
  $("tagFilter").innerHTML = '<option value="">Barcha teglar</option>' +
    ALL_TAGS.map((t) => \`<option value="\${esc(t)}">\${esc(t)}</option>\`).join("");
  const accs = [...new Set(CONTACTS.map((c) => c.project_name).filter(Boolean))];
  $("accFilter").innerHTML = '<option value="">Barcha akkauntlar</option>' +
    accs.map((a) => \`<option value="\${esc(a)}">\${esc(a)}</option>\`).join("");
}
function filtered() {
  const q = ($("search").value || "").toLowerCase().trim();
  const tag = $("tagFilter").value;
  const acc = $("accFilter").value;
  return CONTACTS.filter((c) =>
    (!q || String(c.name || "").toLowerCase().includes(q) || String(c.ig_user_id).includes(q)) &&
    (!tag || (c.tags || []).includes(tag)) &&
    (!acc || c.project_name === acc)
  );
}
function renderTable() {
  const items = filtered();
  document.querySelector(".page-head h1").textContent = "Kontaktlar · " + TOTAL + " ta";
  const more = $("loadMore");
  if (more) {
    more.style.display = CONTACTS.length < TOTAL ? "" : "none";
    more.textContent = "⬇ Ko'proq yuklash (" + CONTACTS.length + "/" + TOTAL + ")";
  }
  if (!items.length) {
    $("rows").innerHTML = \`<tr><td colspan="6">\${emptyState("👥", CONTACTS.length ? "Filtrga mos kontakt topilmadi" : "Hali kontaktlar yo'q — birinchi mijoz yozganda shu yerda ko'rinadi")}</td></tr>\`;
    return;
  }
  $("rows").innerHTML = items.map((c) => \`
    <tr>
      <td>
        <a href="/dashboard/inbox?contact=\${c.id}" style="display:flex;align-items:center;gap:10px">
          \${avatar(c.name || c.ig_user_id, 34)}
          <span style="min-width:0">
            <strong style="display:flex;align-items:center;gap:6px">\${esc(c.name || c.ig_user_id)}
              \${c.needs_human ? '<span title="Odam kerak">🙋</span>' : ""}
              \${c.bot_paused ? '<span title="Bot pauzada">🔕</span>' : ""}
              \${c.unread ? \`<span class="badge" style="background:var(--grad);color:#fff">\${c.unread}</span>\` : ""}</strong>
            <span class="small muted">ID: \${esc(c.ig_user_id)}</span>
          </span>
        </a>
      </td>
      <td class="small muted">\${esc(c.project_name || "—")}</td>
      <td>
        <span style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
          \${(c.tags || []).map((t) => \`<span class="badge b-indigo">\${esc(t)}</span>\`).join("")}
          <button class="chip-add" onclick="openTagEditor(\${c.id})" title="Teg qo'shish/o'chirish"
            style="background:none;border:1px dashed var(--border);border-radius:999px;color:var(--muted);font-size:11px;padding:2px 8px;cursor:pointer">+ teg</button>
        </span>
      </td>
      <td style="text-align:center">\${c.msg_count}</td>
      <td class="small muted" title="\${fmt(c.last_seen)}">\${timeAgo(c.last_seen)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="openProfile(\${c.id})">👤 Profil</button>
        <a class="btn btn-sm" href="/dashboard/inbox?contact=\${c.id}">💬 Suhbat</a>
      </td>
    </tr>\`).join("");
}

function openTagEditor(contactId) {
  EDITING = CONTACTS.find((c) => c.id === contactId);
  if (!EDITING) return;
  const tags = EDITING.tags || [];
  openModal("Teglar — " + (EDITING.name || EDITING.ig_user_id), \`
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      \${tags.length ? "" : '<span class="muted small">Hali teg yo\\'q</span>'}
      \${tags.map((t) => \`<span class="badge b-indigo" style="font-size:12px;padding:4px 11px">\${esc(t)}
        <button onclick="removeTag('\${esc(t).replace(/'/g, "\\\\'")}')" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 4px">✕</button></span>\`).join("")}
    </div>
    <div style="display:flex;gap:8px">
      <input class="input" id="newTag" placeholder="Yangi teg (masalan: VIP)" list="tagSuggest"
        onkeydown="if(event.key==='Enter'){event.preventDefault();addTag();}">
      <datalist id="tagSuggest">\${ALL_TAGS.map((t) => \`<option value="\${esc(t)}">\`).join("")}</datalist>
      <button class="btn btn-primary" onclick="addTag()">Qo'shish</button>
    </div>\`);
}
async function saveTags(tags) {
  const r = await postJson("/api/contacts/" + EDITING.id + "/tags", { tags });
  EDITING.tags = r.tags;
  r.tags.forEach((t) => { if (!ALL_TAGS.includes(t)) ALL_TAGS.push(t); });
  fillFilters(); renderTable(); openTagEditor(EDITING.id);
}
async function addTag() {
  const t = $("newTag").value.trim();
  if (!t) return;
  try { await saveTags([...(EDITING.tags || []), t]); toast("Teg qo'shildi ✓"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
async function removeTag(t) {
  try { await saveTags((EDITING.tags || []).filter((x) => x !== t)); toast("Teg o'chirildi"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
// Drawer'dan pauza o'zgarsa — jadvalni yangilaymiz
function onPauseChanged(id, v) {
  const local = CONTACTS.find((c) => c.id === id);
  if (local) { local.bot_paused = v; local.paused_until = null; }
  renderTable();
}
loadData();`;

  return renderLayout({
    title: "Kontaktlar",
    active: "contacts",
    headerAction: `<button class="btn" onclick="location.href='/api/export/contacts.csv?period='+PERIOD" title="Joriy davr bo'yicha CSV">⬇ CSV yuklab olish</button> <button class="btn" onclick="location.href='/api/export/full.json'" title="Barcha kontakt + suhbatlar (JSON)">📦 To'liq eksport</button> <a class="btn" href="/dashboard/inbox">${ICONS.inbox} Inbox</a>`,
    content,
    script,
  });
}
