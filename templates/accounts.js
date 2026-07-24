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
          <button class="btn btn-sm" onclick="runDiagnostics(\${p.id})">🔍 Tekshirish</button>
          <a class="btn btn-sm" href="/dashboard/knowledge">🧠 Bilim bazasi</a>
          <button class="btn btn-sm btn-danger" onclick="confirmDelete(\${p.id})">🗑 O'chirish</button>
        </div>
      </div>\`).join("");
  } catch (e) { $("cards").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message); }
}

// ============================================================
//  7.1: AKKAUNT ULASH SEHRGARI — 6 qadam, orqaga/oldinga
// ============================================================
let WIZ = { step: 1, name: "", igId: "", token: "" };

function addAccountModal() {
  WIZ = { step: 1, name: "", igId: "", token: "" };
  wizRender();
}

function wizProgress() {
  let dots = "";
  for (let i = 1; i <= 6; i++) {
    dots += '<span style="width:22px;height:5px;border-radius:99px;background:' +
      (i <= WIZ.step ? "var(--accent)" : "var(--glass-border)") + '"></span>';
  }
  return \`<div style="display:flex;align-items:center;gap:5px;margin-bottom:14px">
    \${dots}<span class="small muted" style="margin-left:8px">Qadam \${WIZ.step}/6</span></div>\`;
}

function wizNav(nextLabel, nextFn) {
  return \`<div style="display:flex;gap:10px;justify-content:space-between;margin-top:18px">
    <button class="btn" onclick="\${WIZ.step === 1 ? "closeModal()" : "wizBack()"}">\${WIZ.step === 1 ? "Bekor qilish" : "← Orqaga"}</button>
    <button class="btn btn-primary" id="wizNext" onclick="\${nextFn || "wizNext()"}">\${nextLabel || "Keyingisi →"}</button>
  </div>\`;
}
function wizBack() { WIZ.step--; wizRender(); }
function wizNext() { WIZ.step++; wizRender(); }

function wizBox(inner) {
  return '<div class="card" style="padding:13px;background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.35);margin-bottom:6px">' + inner + "</div>";
}
const WIZ_LINK = (url, label) =>
  \`<a href="\${url}" target="_blank" rel="noopener" style="color:var(--accent-soft);font-weight:600">\${label} ↗</a>\`;

function wizRender() {
  const s = WIZ.step;
  let body = "";

  if (s === 1) {
    body = \`
      <p style="line-height:1.7;margin-bottom:10px"><strong>Akkauntingiz Business yoki Creator turidami?</strong><br>
      <span class="small muted">Oddiy (shaxsiy) akkauntga bot ulanmaydi — Instagram faqat professional akkauntlarga API beradi.</span></p>
      \${wizBox(\`<strong class="small">Bilmasangiz yoki "Yo'q" bo'lsa — shunday o'zgartiriladi:</strong>
        <ol class="small muted" style="margin:6px 0 0 18px;line-height:1.8">
          <li>Instagram ilovasi → profil → <strong>☰ menyu → Settings</strong></li>
          <li><strong>Account type and tools → Switch to professional account</strong></li>
          <li><strong>Business</strong> yoki <strong>Creator</strong> ni tanlang (bepul)</li>
        </ol>\`)}
      \${wizNav("Ha, professional ✓")}\`;
  } else if (s === 2) {
    body = \`
      <p style="line-height:1.7;margin-bottom:10px"><strong>Instagram Tester roli bering</strong><br>
      <span class="small muted">Meta ilovangiz akkauntingiz bilan ishlashi uchun akkauntni "Instagram Tester" sifatida qo'shish kerak.</span></p>
      \${wizBox(\`<ol class="small muted" style="margin:0 0 0 18px;line-height:1.8">
          <li>\${WIZ_LINK("https://developers.facebook.com/apps", "developers.facebook.com/apps")} — ilovangizni oching</li>
          <li>Chap menyuda <strong>App roles → Roles</strong></li>
          <li><strong>Add People → Instagram Tester</strong> → akkaunt username'ini kiriting</li>
        </ol>\`)}
      \${wizNav("Bajardim ✓")}\`;
  } else if (s === 3) {
    body = \`
      <p style="line-height:1.7;margin-bottom:10px"><strong>Instagram'da taklifni qabul qiling</strong><br>
      <span class="small muted">Endi o'sha akkaunt taklifni tasdiqlashi kerak — busiz token ishlamaydi.</span></p>
      \${wizBox(\`<ol class="small muted" style="margin:0 0 0 18px;line-height:1.8">
          <li>Telefonda Instagram → <strong>Settings</strong></li>
          <li><strong>Website permissions → Apps and websites</strong> (yoki "Sayt ruxsatlari")</li>
          <li><strong>Tester invites</strong> bo'limida taklifni <strong>Accept</strong> qiling</li>
        </ol>
        <p class="small muted" style="margin-top:8px">💡 Topolmasangiz: brauzerda \${WIZ_LINK("https://www.instagram.com/accounts/manage_access/", "instagram.com/accounts/manage_access")} → Tester invites</p>\`)}
      \${wizNav("Bajardim ✓")}\`;
  } else if (s === 4) {
    body = \`
      <p style="line-height:1.7;margin-bottom:10px"><strong>Token oling va shu yerga kiriting</strong></p>
      \${wizBox(\`<ol class="small muted" style="margin:0 0 0 18px;line-height:1.8">
          <li>\${WIZ_LINK("https://developers.facebook.com/apps", "Ilovangiz")} → <strong>Instagram → API setup with Instagram login</strong></li>
          <li><strong>Add account</strong> → akkauntga kiring</li>
          <li><strong>Generate token</strong> → tokenni nusxalang</li>
          <li>O'sha qatordagi <strong>Instagram account ID</strong> (17841...) ni ham nusxalang</li>
        </ol>\`)}
      <label class="lbl">Akkaunt nomi (ixtiyoriy)</label>
      <input class="input" id="wzName" value="\${esc(WIZ.name)}" placeholder="Masalan: Ikkinchi biznes" style="margin-bottom:10px">
      <label class="lbl">Instagram akkaunt IDsi</label>
      <input class="input" id="wzId" value="\${esc(WIZ.igId)}" placeholder="17841..." style="margin-bottom:10px">
      <label class="lbl">Access token</label>
      <input class="input" id="wzToken" value="\${esc(WIZ.token)}" placeholder="IGAA..." style="margin-bottom:4px">
      \${wizNav("Keyingisi →", "wizSaveStep4()")}\`;
  } else if (s === 5) {
    body = \`
      <p style="line-height:1.7;margin-bottom:10px"><strong>Webhook obunasini yoqing</strong><br>
      <span class="small muted">Busiz Instagram xabarlarni botga yubormaydi — eng ko'p unutiladigan qadam!</span></p>
      \${wizBox(\`<ol class="small muted" style="margin:0 0 0 18px;line-height:1.8">
          <li>O'sha <strong>API setup</strong> sahifasida, akkaunt qatorida</li>
          <li><strong>Webhook Subscription</strong> tugmasini <strong>On</strong> holatiga o'tkazing</li>
          <li>Ochilgan oynada <strong>messages</strong> va <strong>comments</strong> maydonlari belgilangan bo'lsin</li>
        </ol>\`)}
      \${wizNav("Bajardim ✓")}\`;
  } else {
    body = \`
      <p style="line-height:1.7;margin-bottom:10px"><strong>Tekshirish va saqlash</strong><br>
      <span class="small muted">Token Instagram'da jonli tekshiriladi, so'ng akkaunt saqlanadi.</span></p>
      <div class="small muted" style="margin-bottom:6px">ID: <strong>\${esc(WIZ.igId)}</strong>\${WIZ.name ? " · Nom: <strong>" + esc(WIZ.name) + "</strong>" : ""}</div>
      <div id="wzResult"></div>
      \${wizNav("✓ Tekshirish va saqlash", "wizFinish()")}\`;
  }

  openModal("Yangi Instagram akkaunt", wizProgress() + body);
}

function wizSaveStep4() {
  WIZ.name = $("wzName").value.trim();
  WIZ.igId = $("wzId").value.trim();
  WIZ.token = $("wzToken").value.trim();
  if (!WIZ.igId || !WIZ.token) return toast("ID va token majburiy", false);
  if (!/^\\d{5,25}$/.test(WIZ.igId)) return toast("ID faqat raqamlardan iborat bo'lishi kerak (17841...)", false);
  wizNext();
}

async function wizFinish() {
  const btn = $("wizNext");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Tekshirilmoqda...';
  try {
    const r = await postJson("/api/accounts", { name: WIZ.name, ig_account_id: WIZ.igId, token: WIZ.token });
    $("wzResult").innerHTML =
      '<div class="card" style="padding:12px;border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.08);margin-bottom:6px">' +
      "🎉 <strong>Akkaunt ulandi!</strong>" + (r.username ? " — @" + esc(r.username) : "") +
      '<div class="small muted" style="margin-top:4px">Endi bu akkauntga kelgan DM va kommentlarga bot javob beradi. Bilim bazasini to\\'ldirishni unutmang!</div></div>' +
      (r.warning ? '<div class="card" style="padding:10px;border-color:rgba(251,191,36,.5);background:rgba(251,191,36,.08)" class="small">⚠️ ' + esc(r.warning) + "</div>" : "");
    toast("Akkaunt qo'shildi ✓" + (r.username ? " — @" + r.username : ""));
    btn.textContent = "Yopish";
    btn.disabled = false;
    btn.onclick = () => { closeModal(); loadAccounts(); };
    loadAccounts();
  } catch (e) {
    $("wzResult").innerHTML =
      '<div class="card" style="padding:12px;border-color:rgba(248,113,113,.5);background:rgba(248,113,113,.08)">❌ <strong>Xatolik:</strong> ' + esc(e.message) +
      '<div class="small muted" style="margin-top:4px">Token noto\\'g\\'ri bo\\'lsa — 4-qadamga qaytib yangi token oling.</div></div>';
    btn.disabled = false; btn.textContent = "↻ Qayta urinish";
  }
}
// ============================================================
//  7.2: AKKAUNT DIAGNOSTIKASI — token, webhook, faollik, bilim bazasi
// ============================================================
const DIAG_ICON = { ok: "✅", warn: "⚠️", err: "❌", unknown: "❔" };
const DIAG_LABEL = {
  token: "🔑 Token holati",
  webhook: "📡 Webhook obunasi",
  activity: "📈 Faollik",
  knowledge: "🧠 Bilim bazasi",
};
async function runDiagnostics(projectId) {
  const p = PROJECTS.find((x) => x.id === projectId);
  openModal("🔍 Diagnostika — " + (p ? p.name : "#" + projectId), skeletonRows(4, 52));
  try {
    const r = await api("/api/accounts/" + projectId + "/diagnostics");
    $("modalBody").innerHTML = Object.keys(DIAG_LABEL).map((k) => {
      const c = r.checks[k];
      return \`<div class="card" style="padding:11px 13px;margin-bottom:9px">
        <div style="display:flex;align-items:flex-start;gap:9px">
          <span style="font-size:16px">\${DIAG_ICON[c.status] || "❔"}</span>
          <div style="min-width:0;flex:1">
            <strong class="small">\${DIAG_LABEL[k]}</strong>
            <div class="small muted" style="margin-top:2px">\${esc(c.text)}</div>
            \${c.fix ? \`<div class="small" style="margin-top:5px;color:var(--accent-soft)">→ \${esc(c.fix)} <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener" style="color:var(--accent-soft);font-weight:600">Meta panel ↗</a></div>\` : ""}
          </div>
        </div>
      </div>\`;
    }).join("") +
    '<div style="display:flex;justify-content:flex-end;margin-top:4px"><button class="btn" onclick="closeModal()">Yopish</button></div>';
  } catch (e) {
    $("modalBody").innerHTML = emptyState("⚠️", "Diagnostika xatosi: " + e.message);
  }
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
