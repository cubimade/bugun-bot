// templates/settings-script-admin.js — Sozlamalar sahifasi klient JS (admin qism):
// avto-teg qoidalari, tizim holati, tezkor javoblar, foydalanuvchilar, integratsiyalar
// (13-audit: settings.js 792 qator edi — klient JS shu faylga ajratildi)

export function settingsScriptAdmin() {
  return `
// 7.8: Avto-teg qoidalari boshqaruvi
let TAG_RULES = [];
async function loadTagRules() {
  try {
    const { rules } = await api("/api/tag-rules");
    TAG_RULES = rules || [];
    renderTagRules();
  } catch (e) { $("trList").innerHTML = '<span class="small muted">Yuklanmadi: ' + esc(e.message) + "</span>"; }
}
function renderTagRules() {
  if (!TAG_RULES.length) { $("trList").innerHTML = '<span class="small muted">Hali qoida yo\\'q</span>'; return; }
  $("trList").innerHTML = TAG_RULES.map((r) => \`
    <div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--border);\${r.is_active ? "" : "opacity:.5"}">
      <span class="small" style="flex:1;min-width:0">"<strong>\${esc(r.keyword)}</strong>" → <span class="badge b-indigo">\${esc(r.tag_name)}</span>
        <span class="muted">\${r.project_name ? "· " + esc(r.project_name) : ""}</span></span>
      <button class="btn btn-sm" onclick="toggleTagRule(\${r.id}, \${!r.is_active})" data-tip="\${r.is_active ? "To'xtatish" : "Yoqish"}">\${r.is_active ? "⏸" : "▶️"}</button>
      <button class="btn btn-sm" onclick="delTagRule(\${r.id})" data-tip="O'chirish">🗑</button>
    </div>\`).join("");
}
async function addTagRule(btn) {
  const keyword = $("trWord").value.trim();
  const tag_name = $("trTag").value.trim();
  if (!keyword || !tag_name) return toast("So'z va teg majburiy", false);
  btn.disabled = true;
  try {
    await postJson("/api/tag-rules", { keyword, tag_name });
    $("trWord").value = ""; $("trTag").value = "";
    toast("Qoida qo'shildi ✓");
    loadTagRules();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function toggleTagRule(id, val) {
  try {
    await postJson("/api/tag-rules/" + id, { is_active: val });
    const r = TAG_RULES.find((x) => x.id === id);
    if (r) r.is_active = val;
    renderTagRules();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function delTagRule(id) {
  try {
    await api("/api/tag-rules/" + id, { method: "DELETE" });
    TAG_RULES = TAG_RULES.filter((x) => x.id !== id);
    renderTagRules();
    toast("Qoida o'chirildi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadTagRules();

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
        <button class="btn btn-sm btn-danger" onclick="deleteQuickReply(\${r.id})" data-tip="O'chirish">✕</button>
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
// ===== 12.1: foydalanuvchilar boshqaruvi (faqat owner ko'radi) =====
let USERS = [], US_PROJECTS = [];
async function initUsers() {
  try {
    const me = await api("/api/me");
    if (me.user.role !== "owner") return;
    $("usersCard").style.display = "";
    const p = await api("/api/projects");
    US_PROJECTS = (p.projects || []);
    loadUsers();
  } catch (e) { /* legacy — usersCard owner uchun ochiladi */ }
}
async function loadUsers() {
  try {
    const { users } = await api("/api/users");
    USERS = users || [];
    renderUsers();
  } catch (e) { $("usersList").innerHTML = '<span class="small muted">Yuklanmadi: ' + esc(e.message) + "</span>"; }
}
function renderUsers() {
  if (!USERS.length) { $("usersList").innerHTML = '<span class="small muted">Hali jamoa a\\'zosi yo\\'q — pastda qo\\'shing</span>'; return; }
  const ROLE_LBL = { owner: "👑 Owner", admin: "🛠 Admin", operator: "🎧 Operator" };
  $("usersList").innerHTML = USERS.map(function (u) {
    const projs = (u.project_ids || []).map(function (pid) {
      const p = US_PROJECTS.find(function (x) { return x.id === pid; });
      return p ? p.name : "#" + pid;
    });
    return '<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;' + (u.is_active ? "" : "opacity:.5") + '">' +
      '<span class="small" style="flex:1;min-width:0"><strong>' + esc(u.name || u.email) + "</strong>" +
        ' <span class="muted">' + esc(u.email) + "</span><br>" +
        '<span class="badge ' + (u.role === "owner" ? "b-green" : u.role === "admin" ? "b-indigo" : "b-gray") + '">' + ROLE_LBL[u.role] + "</span>" +
        (u.role === "operator" ? ' <span class="muted small">' + (projs.length ? "akkauntlar: " + esc(projs.join(", ")) : "barcha akkauntlar") + "</span>" : "") +
        (u.last_login ? ' <span class="muted small">· oxirgi kirish: ' + timeAgo(u.last_login) + "</span>" : "") + "</span>" +
      (u.role !== "owner" ? '<button class="btn btn-sm" onclick="editUserProjects(' + u.id + ')" data-tip="Akkauntlarni biriktirish">📱</button>' : "") +
      '<button class="btn btn-sm" onclick="resetUserPassword(' + u.id + ')" data-tip="Parolni yangilash">🔑</button>' +
      (u.role !== "owner" ? '<button class="btn btn-sm" onclick="toggleUser(' + u.id + "," + !u.is_active + ')">' + (u.is_active ? "⏸" : "▶️") + "</button>" +
        '<button class="btn btn-sm" onclick="delUser(' + u.id + ')">🗑</button>' : "") +
    "</div>";
  }).join("");
}
async function addUser(btn) {
  const email = $("nuEmail").value.trim();
  if (!email) return toast("Email kiriting", false);
  btn.disabled = true;
  try {
    const r = await postJson("/api/users", { email, name: $("nuName").value.trim(), role: $("nuRole").value });
    openModal("✅ Foydalanuvchi qo'shildi", '<p style="line-height:1.8">Vaqtinchalik parol (bir marta ko\\'rsatiladi, nusxalab yuboring):</p>' +
      '<div class="card" style="padding:14px;text-align:center;font-size:18px;font-weight:700;letter-spacing:1px;margin:10px 0">' + esc(r.tempPassword) + "</div>" +
      '<p class="small muted">Kirish: ' + location.origin + "/login — email: " + esc(email) + "</p>" +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" onclick="closeModal()">Yopish</button></div>');
    $("nuEmail").value = ""; $("nuName").value = "";
    loadUsers();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
function editUserProjects(id) {
  const u = USERS.find(function (x) { return x.id === id; });
  const cur = u.project_ids || [];
  openModal("📱 Akkauntlar — " + esc(u.name || u.email), '<p class="small muted" style="margin-bottom:10px">Operator faqat belgilangan akkauntlarning suhbatlarini ko\\'radi. Hech biri belgilanmasa — hammasini ko\\'radi.</p>' +
    US_PROJECTS.map(function (p) {
      return '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer" class="small">' +
        '<input type="checkbox" class="upChk" value="' + p.id + '"' + (cur.includes(p.id) ? " checked" : "") + "> " + esc(p.name) + "</label>";
    }).join("") +
    '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">' +
      '<button class="btn" onclick="closeModal()">Bekor</button>' +
      '<button class="btn btn-primary" onclick="saveUserProjects(' + id + ')">Saqlash</button></div>');
}
async function saveUserProjects(id) {
  const ids = Array.from(document.querySelectorAll(".upChk:checked")).map(function (c) { return Number(c.value); });
  try {
    await postJson("/api/users/" + id, { project_ids: ids });
    closeModal(); toast("Saqlandi ✓");
    loadUsers();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function resetUserPassword(id) {
  try {
    const r = await postJson("/api/users/" + id, { reset_password: true });
    openModal("🔑 Yangi parol", '<div class="card" style="padding:14px;text-align:center;font-size:18px;font-weight:700;letter-spacing:1px;margin:10px 0">' + esc(r.tempPassword) + "</div>" +
      '<p class="small muted">Bir marta ko\\'rsatiladi — nusxalab yuboring.</p>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" onclick="closeModal()">Yopish</button></div>');
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function toggleUser(id, val) {
  try {
    await postJson("/api/users/" + id, { is_active: val });
    loadUsers();
    toast(val ? "Faollashtirildi ▶️" : "To'xtatildi ⏸");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function delUser(id) {
  const u = USERS.find(function (x) { return x.id === id; });
  openModal("Foydalanuvchini o'chirish", '<p style="margin-bottom:16px"><strong>' + esc(u ? (u.name || u.email) : "") + '</strong> o\\'chirilsinmi?</p>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" onclick="closeModal()">Bekor</button>' +
    '<button class="btn btn-danger" onclick="doDelUser(' + id + ')">Ha, o\\'chirish</button></div>');
}
async function doDelUser(id) {
  try {
    await api("/api/users/" + id, { method: "DELETE" });
    closeModal(); toast("O'chirildi");
    loadUsers();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function loadAudit() {
  $("auditList").innerHTML = skeletonRows(3, 30);
  try {
    const { log } = await api("/api/audit-log");
    $("auditList").innerHTML = log.length ? log.map(function (l) {
      return '<div class="small" style="padding:5px 0;border-bottom:1px solid var(--border)">' +
        '<span class="muted">' + fmt(l.created_at) + "</span> · <strong>" + esc(l.user_label || "system") + "</strong> · " +
        esc(l.action) + (l.details ? ' <span class="muted">(' + esc(l.details) + ")</span>" : "") + "</div>";
    }).join("") : '<span class="small muted">Hali yozuv yo\\'q</span>';
  } catch (e) { $("auditList").innerHTML = '<span class="small muted">Yuklanmadi: ' + esc(e.message) + "</span>"; }
}
// ===== 12.4: integratsiyalar (owner/admin) =====
async function initInteg() {
  try {
    const me = await api("/api/me");
    if (!["owner", "admin"].includes(me.user.role)) return;
    $("integCard").style.display = "";
    loadWebhooks();
    if (me.user.role === "owner") loadApiKeys();
    else $("akList").innerHTML = '<span class="small muted">Faqat owner boshqaradi</span>';
  } catch (e) { /* jim */ }
}
const EV_LBL = { new_contact: "yangi kontakt", won: "sotuv", booking: "bron", payment_paid: "to'lov" };
async function loadWebhooks() {
  try {
    const { webhooks } = await api("/api/webhooks");
    $("whList").innerHTML = webhooks.length ? webhooks.map(function (w) {
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;' + (w.is_active ? "" : "opacity:.5") + '">' +
        '<span class="small" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(w.url) +
        ' <span class="muted">(' + (w.events || []).map(function (e) { return EV_LBL[e] || e; }).join(", ") + ")</span></span>" +
        '<button class="btn btn-sm" onclick="testWebhook(' + w.id + ')" data-tip="Test yuborish">🧪</button>' +
        '<button class="btn btn-sm" onclick="toggleWebhook(' + w.id + "," + !w.is_active + ')">' + (w.is_active ? "⏸" : "▶️") + "</button>" +
        '<button class="btn btn-sm" onclick="delWebhook(' + w.id + ')">🗑</button></div>';
    }).join("") : '<span class="small muted">Hali webhook yo\\'q</span>';
  } catch (e) { $("whList").innerHTML = '<span class="small muted">Yuklanmadi</span>'; }
}
async function addWebhook(btn) {
  const url = $("whUrl").value.trim();
  const events = Array.from(document.querySelectorAll(".whEv:checked")).map(function (c) { return c.value; });
  if (!url) return toast("URL kiriting", false);
  btn.disabled = true;
  try {
    const r = await postJson("/api/webhooks", { url, events });
    openModal("✅ Webhook qo'shildi", '<p class="small" style="margin-bottom:8px">Imzo tekshirish uchun secret (bir marta ko\\'rsatiladi):</p>' +
      '<div class="card" style="padding:12px;font-family:monospace;font-size:13px;word-break:break-all">' + esc(r.secret) + "</div>" +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" onclick="closeModal()">Yopish</button></div>');
    $("whUrl").value = "";
    loadWebhooks();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function testWebhook(id) {
  try {
    const r = await postJson("/api/webhooks/" + id + "/test", {});
    toast(r.ok ? "Test yuborildi ✓ (HTTP " + r.status + ")" : "Yuborilmadi: " + (r.error || "HTTP " + r.status), r.ok);
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function toggleWebhook(id, val) {
  try { await postJson("/api/webhooks/" + id, { is_active: val }); loadWebhooks(); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
async function delWebhook(id) {
  try { await api("/api/webhooks/" + id, { method: "DELETE" }); loadWebhooks(); toast("O'chirildi"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
async function loadApiKeys() {
  try {
    const { keys } = await api("/api/api-keys");
    $("akList").innerHTML = keys.length ? keys.map(function (k) {
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)" class="small">' +
        "<span style='flex:1'>🔑 " + esc(k.name) + ' <span class="muted">' + esc(k.key_hint || "") + (k.last_used ? " · ishlatilgan: " + timeAgo(k.last_used) : "") + "</span></span>" +
        '<button class="btn btn-sm" onclick="delApiKey(' + k.id + ')">🗑</button></div>';
    }).join("") : '<span class="small muted">Hali kalit yo\\'q</span>';
  } catch (e) { /* jim */ }
}
async function delApiKey(id) {
  if (!confirm("API kalit o'chirilsinmi? Uni ishlatayotgan integratsiyalar to'xtaydi.")) return;
  try { await api("/api/api-keys/" + id, { method: "DELETE" }); loadApiKeys(); toast("Kalit o'chirildi"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
async function addApiKey(btn) {
  btn.disabled = true;
  try {
    const r = await postJson("/api/api-keys", { name: $("akName").value.trim() || "API kalit" });
    openModal("🔑 API kalit yaratildi", '<p class="small" style="margin-bottom:8px">Bir marta ko\\'rsatiladi — nusxalab oling:</p>' +
      '<div class="card" style="padding:12px;font-family:monospace;font-size:13px;word-break:break-all">' + esc(r.key) + "</div>" +
      '<p class="small muted" style="margin-top:10px">Ishlatish: <code>curl -H "X-API-Key: ..." ' + location.origin + "/api/v1/contacts</code></p>" +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" onclick="closeModal()">Yopish</button></div>');
    $("akName").value = "";
    loadApiKeys();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
initInteg();
initUsers();
loadSettings(); loadSystem(); loadQuickReplies();`;
}
