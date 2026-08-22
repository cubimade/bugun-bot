// ============================================================
//  TEMPLATES/SETUP-WIZARD.JS — sozlash sehrgari (ROADMAP-19 FAZA 4)
//  /dashboard/connect/instagram/setup
//
//  Mijoz O'Z Meta ilovasini yaratib ulaydi — ilovaning egasi bo'lgani
//  uchun tester roli kerak emas. 6 qadam, holat saqlanadi (server draft +
//  localStorage), nusxalanadigan qiymatlarda nusxa tugmasi.
//  Uslub: ROADMAP-17 dizayn tizimi (guruhlangan ro'yxat, 18px radius).
// ============================================================
import { renderLayout } from "./layout.js";

const WIZ_CSS = `<style>
.wiz-wrap { max-width: 720px; margin: 0 auto }
.wiz-steps { display:flex; gap:6px; margin-bottom:18px }
.wiz-steps .seg { flex:1; height:5px; border-radius:99px; background:var(--panel2); transition:background .25s }
.wiz-steps .seg.done { background:var(--grad) }
.wiz-step-label { font-size:13px; color:var(--text-3); margin-bottom:6px }
.wiz-card { border-radius:18px; padding:22px }
.wiz-copy { display:flex; align-items:center; gap:8px; background:var(--panel2);
  border:1px solid var(--border); border-radius:12px; padding:10px 13px; margin:8px 0;
  font-family:ui-monospace,monospace; font-size:13px; word-break:break-all }
.wiz-copy code { flex:1 }
.wiz-copy button { flex-shrink:0 }
.wiz-guide { background:var(--panel2); border-radius:12px; padding:12px 16px; margin:10px 0;
  font-size:14px; line-height:1.9 }
.wiz-guide ol { margin-left:18px }
.wiz-nav { display:flex; justify-content:space-between; gap:10px; margin-top:20px }
.wiz-note { background:rgba(52,211,153,.08); border:1px solid rgba(52,211,153,.4);
  border-radius:12px; padding:12px 16px; font-size:13.5px; line-height:1.8; margin-top:14px }
.wiz-warn { background:rgba(251,191,36,.1); border:1px solid rgba(251,191,36,.45);
  border-radius:12px; padding:11px 14px; font-size:13px; line-height:1.7; margin:10px 0 }
@media (max-width:600px) { .wiz-card { padding:16px } }
</style>`;

export function renderSetupWizardPage() {
  const content = `${WIZ_CSS}
  <div class="wiz-wrap">
    <div class="wiz-step-label" id="wizLabel">Yuklanmoqda…</div>
    <div class="wiz-steps" id="wizSteps">${'<div class="seg"></div>'.repeat(6)}</div>
    <div class="card wiz-card" id="wizBody"><div class="skeleton" style="height:220px"></div></div>
    <div class="wiz-nav">
      <button class="btn btn-plain" id="wizBack" onclick="wizGo(-1)" style="visibility:hidden">← Oldingi</button>
      <button class="btn btn-primary" id="wizNext" onclick="wizGo(1)">Keyingi →</button>
    </div>
  </div>`;

  return renderLayout({
    title: "Instagram ilovasini sozlash",
    active: "accounts",
    headerAction: `<a class="btn btn-secondary" href="/dashboard/connect/instagram">← Ulash sahifasi</a>`,
    content,
    script: wizardScript(),
  });
}

function wizardScript() {
  return `
let WIZ = { step: 0, draft: null, urls: {}, encryptionKey: true };
const STEP_KEY = "igSetupStep";

function copyBtn(value, id) {
  return '<button class="btn btn-sm btn-secondary" onclick="wizCopy(\\'' + id + '\\')" id="btn-' + id + '">Nusxalash</button>';
}
async function wizCopy(id) {
  const el = document.getElementById(id);
  try {
    await navigator.clipboard.writeText(el.textContent.trim());
    const btn = document.getElementById("btn-" + id);
    btn.textContent = "Nusxalandi ✓";
    setTimeout(() => { btn.textContent = "Nusxalash"; }, 1800);
  } catch (e) { toast("Nusxalab bo'lmadi — qo'lda belgilang", false); }
}
function copyRow(value, id) {
  return '<div class="wiz-copy"><code id="' + id + '">' + esc(value || "—") + "</code>" + copyBtn(value, id) + "</div>";
}

// ---- Qadamlar mazmuni ----
function stepContent(i) {
  const d = WIZ.draft || {};
  const u = WIZ.urls || {};
  if (i === 0) return {
    label: "1-qadam · Meta ilovasini yarating",
    html: \`
      <h3 style="margin-bottom:10px">Meta ilovasini yarating</h3>
      <p class="small muted" style="margin-bottom:8px">Ilova SIZNING Meta hisobingizda yaratiladi — shunda siz uning egasi bo'lasiz va hech qanday qo'shimcha rol (tester) kerak bo'lmaydi.</p>
      <div class="wiz-guide"><ol>
        <li><strong>developers.facebook.com/apps</strong> → <strong>Create App</strong></li>
        <li>Use case: <strong>Other</strong> → App type: <strong>Business</strong></li>
        <li>Nom: biznesingiz nomi (masalan: "\${esc(d.name || "Mening biznesim")} Bot")</li>
        <li>Business portfolio: o'zingizniki (yo'q bo'lsa yangi yaratiladi)</li>
      </ol></div>
      <a class="btn btn-secondary" href="https://developers.facebook.com/apps" target="_blank" rel="noopener">developers.facebook.com ni ochish ↗</a>\`,
  };
  if (i === 1) return {
    label: "2-qadam · Instagram qo'shing",
    html: \`
      <h3 style="margin-bottom:10px">Ilovaga Instagram'ni qo'shing</h3>
      <div class="wiz-guide"><ol>
        <li>App Dashboard → <strong>Add use case</strong></li>
        <li><strong>"Manage messaging and content on Instagram"</strong> ni tanlang</li>
      </ol></div>
      <p class="small muted">Shu qadamdan keyin chap menyuda <strong>Instagram</strong> bo'limi paydo bo'ladi.</p>\`,
  };
  if (i === 2) return {
    label: "3-qadam · Redirect URI",
    html: \`
      <h3 style="margin-bottom:10px">Redirect URI qo'shing</h3>
      <p class="small muted" style="margin-bottom:6px">Quyidagi manzilni AYNAN shu ko'rinishda nusxalang (qo'lda yozmang — xato manbai):</p>
      \${copyRow(u.redirectUri, "wizRedirect")}
      <div class="wiz-guide">Qayerga: <strong>Instagram → API setup with Instagram login → 4. Set up Instagram business login → Business login settings → OAuth redirect URIs</strong></div>\`,
  };
  if (i === 3) return {
    label: "4-qadam · Webhook",
    html: \`
      <h3 style="margin-bottom:10px">Webhook sozlang</h3>
      <p class="small muted" style="margin-bottom:6px">Instagram → API setup → <strong>Configure webhooks</strong> bo'limiga ikkita qiymatni nusxalang:</p>
      <label class="lbl" style="margin-top:8px">Callback URL</label>
      \${copyRow(u.webhookUrl, "wizWebhook")}
      <label class="lbl">Verify token <span class="muted small">(shu loyiha uchun avtomatik yaratilgan)</span></label>
      \${copyRow(d.verifyToken, "wizVerify")}
      <div class="wiz-guide">Obuna maydonlari (Subscription fields): <strong>\${esc(u.subscriptionFields || "messages, messaging_postbacks, comments, message_reactions")}</strong></div>\`,
  };
  if (i === 4) return {
    label: "5-qadam · Ilova ma'lumotlari",
    html: \`
      <h3 style="margin-bottom:10px">App ID va App Secret kiriting</h3>
      <div class="wiz-warn">⚠ Bu qiymatlar <strong>Instagram → API setup</strong> sahifasidan olinadi. <strong>App settings → Basic</strong> dagi App ID/Secret EMAS — ular boshqa qiymatlar!</div>
      <label class="lbl">Instagram App ID</label>
      <input class="input" id="wizAppId" inputmode="numeric" placeholder="1234567890123456" value="\${esc(d.igAppId || "")}" style="margin-bottom:12px">
      <label class="lbl">Instagram App Secret</label>
      <input class="input" id="wizAppSecret" type="password" placeholder="\${d.hasSecret ? "•••••••• (saqlangan — o'zgartirish uchun yangisini kiriting)" : "abc123..."}" autocomplete="off" style="margin-bottom:12px">
      <button class="btn btn-primary" id="wizSaveCreds" onclick="wizSaveCredentials(this)">Saqlash</button>
      <span class="small muted" id="wizCredsState" style="margin-left:10px">\${d.hasSecret ? "✓ Saqlangan (shifrlangan)" : ""}</span>
      \${WIZ.encryptionKey ? "" : '<div class="wiz-warn" style="margin-top:12px">⚠ Server\\'da ENCRYPTION_KEY sozlanmagan — secret zaxira kalit bilan shifrlanadi. Railway\\'ga <code>ENCRYPTION_KEY</code> qo\\'shish tavsiya etiladi (<code>openssl rand -base64 32</code>).</div>'}\`,
  };
  return {
    label: "6-qadam · Ulash",
    html: \`
      <h3 style="margin-bottom:10px">Instagram bilan ulang</h3>
      <p class="small muted" style="margin-bottom:14px">Instagram oynasi ochiladi — biznes akkauntingiz bilan kirib <strong>Allow</strong> tugmasini bosing.</p>
      \${d.hasSecret
        ? '<a class="btn btn-primary" style="font-size:15px;padding:13px 26px" href="/auth/instagram?project=' + d.projectId + '">Instagram bilan ulash</a>'
        : '<div class="wiz-warn">Avval 5-qadamda App ID va Secret saqlanishi kerak.</div>'}
      <div class="wiz-note">💡 <strong>Nega tester kerak emas?</strong> Ilova sizning o'z Meta hisobingizda yaratilgani uchun siz uning <strong>egasi</strong> hisoblanasiz. Egaga qo'shimcha rol (tester) kerak emas — akkaunt darrov ishlaydi.</div>\`,
  };
}

function renderStep() {
  const c = stepContent(WIZ.step);
  $("wizLabel").textContent = c.label;
  $("wizBody").innerHTML = c.html;
  document.querySelectorAll("#wizSteps .seg").forEach((s, i) => s.classList.toggle("done", i <= WIZ.step));
  $("wizBack").style.visibility = WIZ.step === 0 ? "hidden" : "visible";
  $("wizNext").style.display = WIZ.step === 5 ? "none" : "";
  try { localStorage.setItem(STEP_KEY, String(WIZ.step)); } catch (e) {}
}

function wizGo(dir) {
  // 5-qadamdan oldinga faqat secret saqlangan bo'lsa
  if (dir > 0 && WIZ.step === 4 && !WIZ.draft?.hasSecret) {
    return toast("Avval App ID va Secret'ni saqlang", false);
  }
  WIZ.step = Math.max(0, Math.min(5, WIZ.step + dir));
  renderStep();
}

async function wizSaveCredentials(btn) {
  const appId = $("wizAppId").value.trim();
  const appSecret = $("wizAppSecret").value.trim();
  if (!appId) return toast("App ID kiriting", false);
  if (!appSecret && !WIZ.draft?.hasSecret) return toast("App Secret kiriting", false);
  if (!appSecret) return toast("Secret allaqachon saqlangan — o'zgartirish uchun yangisini kiriting", false);
  btn.disabled = true;
  try {
    const r = await postJson("/api/setup/instagram/" + WIZ.draft.projectId + "/credentials",
      { app_id: appId, app_secret: appSecret });
    WIZ.draft.igAppId = r.igAppId;
    WIZ.draft.hasSecret = true;
    WIZ.draft.status = r.status;
    $("wizAppSecret").value = "";
    $("wizCredsState").textContent = "✓ Saqlandi (shifrlangan, " + r.secretMasked + ")";
    toast("Saqlandi — secret shifrlangan holda");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}

async function wizInit() {
  try {
    const r = await postJson("/api/setup/instagram/start", {});
    WIZ.draft = r.draft; WIZ.urls = r.urls; WIZ.encryptionKey = r.encryptionKey !== false;
    // Holatni tiklash: secret saqlangan bo'lsa 6-qadamga, aks holda localStorage
    let step = 0;
    try { step = Number(localStorage.getItem(STEP_KEY)) || 0; } catch (e) {}
    if (r.resumed && WIZ.draft.hasSecret) step = Math.max(step, 5);
    else if (r.resumed) step = Math.max(step, 0);
    WIZ.step = Math.max(0, Math.min(5, step));
    renderStep();
    if (r.resumed) toast("Avvalgi sozlash davom ettirilmoqda");
  } catch (e) {
    $("wizBody").innerHTML = '<div class="empty">Yuklanmadi: ' + esc(e.message) + "</div>";
  }
}
wizInit();`;
}
