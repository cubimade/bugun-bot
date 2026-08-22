// ============================================================
//  TEMPLATES/CONNECT.JS — kanal ulash ekranlari (ROADMAP-15, 5.2)
//    /dashboard/connect            → kanal tanlash (Instagram / Telegram / TikTok)
//    /dashboard/connect/instagram  → Instagram ulash (OAuth + qo'lda muqobil)
//
//  Uslub: loyihaning Liquid Glass dizayni, mobil-mos (bir ustunga tushadi).
//  CSS app.css'ga tegmasdan sahifa ichida — app.min.css qayta yig'ilmasin.
// ============================================================
import { renderLayout } from "./layout.js";
import { esc, ICONS } from "./components.js";
import { isConfigured, missingConfig } from "../services/instagram-oauth.js";

// Instagram brend gradienti (ROADMAP-15: #833AB4 → #FD1D1D → #FCAF45)
const IG_GRADIENT = "linear-gradient(135deg,#833AB4 0%,#FD1D1D 55%,#FCAF45 100%)";

// Instagram logotipi (sodda kontur — currentColor bilan ishlaydi)
const IG_GLYPH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:26px;height:26px">
  <rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/>
  <circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none"/></svg>`;

const TG_GLYPH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:26px;height:26px">
  <path d="M21.5 3.5L2.8 10.6c-.9.35-.87 1.65.05 1.95l4.8 1.55 1.8 5.5c.27.8 1.3.98 1.83.33l2.5-3.05 4.7 3.45c.6.44 1.46.12 1.62-.6L22.9 4.6c.17-.8-.63-1.42-1.4-1.1z"/>
  <path d="M7.65 14.1L18.4 6.6l-8.35 8.9"/></svg>`;

const TT_GLYPH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:26px;height:26px">
  <path d="M15 3v10.5a4 4 0 1 1-3.2-3.92"/><path d="M15 3c.4 2.6 2.1 4.2 4.7 4.5"/></svg>`;

// Sahifa ichi CSS — kartochkalar va Instagram tugmasi
const CONNECT_CSS = `<style>
.ch-list { display:flex; flex-direction:column; gap:12px; max-width:640px }
/* .card hoverable ustiga faqat joylashuv — glass fon/soya dizayn tizimidan keladi */
.ch-card {
  display:flex; align-items:center; gap:15px; min-height:90px; padding:16px 18px;
  border-radius:16px; color:inherit; text-decoration:none;
}
.ch-card.soon { opacity:.5; pointer-events:none }
.ch-ic { display:flex; align-items:center; justify-content:center; width:52px; height:52px;
  border-radius:14px; color:#fff; flex-shrink:0 }
.ch-arrow { margin-left:auto; color:var(--text-4); flex-shrink:0; display:flex }
.ch-arrow svg { width:18px; height:18px }
.btn-ig-connect {
  display:inline-flex; align-items:center; justify-content:center; gap:9px; width:100%;
  padding:14px 22px; border-radius:13px; border:none; cursor:pointer;
  background:${IG_GRADIENT}; color:#fff; font-weight:600; font-size:15.5px;
  box-shadow:0 6px 20px rgba(214,41,118,.35);
  transition:filter .18s ease, transform .18s ease;
}
.btn-ig-connect:hover { filter:brightness(1.07); transform:translateY(-1px) }
.btn-ig-connect:active { transform:translateY(0) }
.btn-ig-connect[aria-disabled="true"] { opacity:.5; pointer-events:none; box-shadow:none }
.connect-grid { display:grid; grid-template-columns:1fr 1fr; gap:26px; align-items:center; max-width:900px }
@media (max-width:760px) { .connect-grid { grid-template-columns:1fr; gap:18px } }
</style>`;

// ============================================================
//  5.2.1 — /dashboard/connect: kanal tanlash
// ============================================================
export function renderConnectPage() {
  const card = ({ glyph, bg, name, desc, href, soon }) => `
    <a class="card hoverable ch-card${soon ? " soon" : ""}" href="${href}"${soon ? ' tabindex="-1" aria-disabled="true"' : ""}>
      <span class="ch-ic" style="background:${bg}">${glyph}</span>
      <span style="min-width:0">
        <strong style="display:block;font-size:16px;margin-bottom:3px">${esc(name)}
          ${soon ? '<span class="pill pill-plain" style="margin-left:7px;vertical-align:middle">Tez orada</span>' : ""}</strong>
        <span class="small muted">${esc(desc)}</span>
      </span>
      <span class="ch-arrow">${ICONS.chevronRight}</span>
    </a>`;

  const content = `
  ${CONNECT_CSS}
  <p class="muted" style="margin:-4px 0 20px">Avtomatlashtirish uchun akkaunt yoki bot ulang</p>
  <div class="ch-list">
    ${card({
      glyph: IG_GLYPH,
      bg: IG_GRADIENT,
      name: "Instagram",
      desc: "Instagram akkauntingizni ulang",
      href: "/dashboard/connect/instagram",
    })}
    ${card({
      glyph: TG_GLYPH,
      bg: "linear-gradient(135deg,#0ea5e9,#6366f1)",
      name: "Telegram",
      desc: "Telegram botingizni ulang",
      href: "/dashboard/accounts?connect=telegram",
    })}
    ${card({
      glyph: TT_GLYPH,
      bg: "linear-gradient(135deg,#1f1f1f,#3a3a3a)",
      name: "TikTok",
      desc: "TikTok akkauntini ulang",
      href: "#",
      soon: true,
    })}
  </div>
  <div style="margin-top:22px">
    <a class="btn btn-plain" href="/dashboard/accounts">← Orqaga</a>
  </div>`;

  return renderLayout({ title: "Kanal tanlang", active: "accounts", content });
}

// ============================================================
//  5.2.2 — /dashboard/connect/instagram: Instagram ulash
// ============================================================
export function renderConnectInstagramPage() {
  const ready = isConfigured();
  const missing = missingConfig().join(", ");

  // ROADMAP-19 FAZA 4: mijoz o'z Meta ilovasi bilan ulansa — tester roli
  // kerak emas. Sehrgar shu yo'lni qadamma-qadam yo'naltiradi.
  const wizardLink = `
    <div class="card" style="padding:13px 15px;margin-top:12px">
      <div class="small" style="line-height:1.7;display:flex;gap:8px;align-items:flex-start">
        <span style="color:var(--accent-soft);flex-shrink:0">${ICONS.sparkle || ""}</span>
        <span><strong>O'z ilovangiz bilan ulash (tavsiya)</strong>
        <div class="muted" style="margin-top:3px">Meta ilovasini o'z hisobingizda yaratasiz — hech qanday qo'shimcha rol (tester) kerak bo'lmaydi, akkaunt darrov ishlaydi.</div>
        <a class="btn btn-secondary btn-sm" href="/dashboard/connect/instagram/setup" style="margin-top:8px">Sozlash sehrgarini ochish →</a></span>
      </div>
    </div>`;

  // Env sozlanmagan bo'lsa: tugma o'chirilgan + sabab tooltip'da
  const mainBtn = ready
    ? `<a class="btn-ig-connect" href="/auth/instagram">${IG_GLYPH} Instagram bilan davom etish</a>${wizardLink}`
    : `<span class="btn-ig-connect" aria-disabled="true" data-tip="${esc(missing)} sozlanmagan">
         ${IG_GLYPH} Instagram bilan davom etish</span>
       <div class="card" style="padding:11px 13px;margin-top:11px;border-color:rgba(251,191,36,.5);background:rgba(251,191,36,.08)">
         <div class="small" style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--warn-ap);flex-shrink:0">${ICONS.alert}</span>
         <span><strong>${esc(missing)} sozlanmagan</strong>
         <div class="muted" style="margin-top:3px">Railway → Variables bo'limiga qo'shilishi kerak. Shu paytgacha quyidagi <strong>qo'lda token kiritish</strong> orqali ulashingiz mumkin — u to'liq ishlaydi.</div></span></div>
       </div>${wizardLink}`;

  const content = `
  ${CONNECT_CSS}
  <div class="connect-grid">

    <div style="text-align:center;padding:10px">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:118px;height:118px;
                  border-radius:32px;background:${IG_GRADIENT};color:#fff;box-shadow:0 14px 40px rgba(214,41,118,.35)">
        <span style="transform:scale(2.6);display:flex">${IG_GLYPH}</span>
      </div>
      <h2 style="font-size:23px;margin:20px 0 6px">Instagram'ga kiring</h2>
      <p class="muted" style="line-height:1.7">va BUGUN BOT'ga kerakli ruxsatlarni bering</p>
    </div>

    <div class="card" style="padding:22px">
      <h3 style="font-size:16.5px;margin-bottom:9px">Instagram'ga kiring va BUGUN BOT'ga ruxsat bering</h3>
      <p class="small muted" style="line-height:1.75;margin-bottom:14px">
        Bu Instagram bilan avtomatlashtirish qurish imkonini beradi.
        Ma'lumotlaringiz nazoratingizda qoladi — ruxsatingizsiz hech narsa qilinmaydi.
      </p>

      <!-- Ishonch bloki: "parolimni so'rayaptimi?" cho'chishini yo'qotadi -->
      <div class="card" style="padding:12px 14px;margin-bottom:14px;background:var(--input-bg)">
        <div class="small" style="line-height:1.7;display:flex;gap:8px;align-items:flex-start">
          <span style="color:var(--text-3);flex-shrink:0">${ICONS.lock}</span>
          <span>Ulanish Meta'ning rasmiy API'si orqali amalga oshiriladi.
          Login va parolingizni <strong>bizga bermaysiz</strong> — ularni faqat Instagram'ning o'z sahifasiga kiritasiz.</span>
        </div>
      </div>

      <!-- Ulashdan oldin tekshiruv: shaxsiy akkaunt OAuth'dan o'tolmaydi -->
      <div class="card" style="padding:12px 14px;margin-bottom:16px;border-color:rgba(99,102,241,.35);background:rgba(99,102,241,.07)">
        <strong class="small">Ulashdan oldin tekshiring:</strong>
        <div class="small muted" style="line-height:1.85;margin-top:4px">
          <div style="display:flex;gap:6px;align-items:center"><span style="color:var(--ok);flex-shrink:0">${ICONS.check}</span> Instagram akkauntingiz <strong>Professional</strong> (Business yoki Creator) turida</div>
          <div style="display:flex;gap:6px;align-items:center"><span style="color:var(--ok);flex-shrink:0">${ICONS.check}</span> Akkaunt Facebook sahifasiga bog'langan</div>
        </div>
      </div>

      ${mainBtn}

      <div style="text-align:center;margin-top:13px">
        <a class="small muted" href="/dashboard/accounts?connect=manual"
           style="text-decoration:underline;text-underline-offset:3px">yoki qo'lda token kiritish</a>
      </div>
    </div>
  </div>

  <div style="margin-top:24px">
    <a class="btn btn-plain" href="/dashboard/connect">← Orqaga</a>
  </div>`;

  return renderLayout({ title: "Instagram ulash", active: "accounts", content });
}
