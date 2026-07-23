# BUGUN BOT — 4-BOSQICH (v2): PREMIUM VIZUAL DARAJA — Liquid Glass + Light/Dark

> **Claude Code uchun ko'rsatma:** Bu faylni to'liq o'qi. Bu — platformani "oddiy sayt"dan 2026-yilning ENG KUCHLI vizual darajasiga (Apple iOS 26 Liquid Glass, Linear, Stripe, Attio) ko'tarish rejasi. Barcha qismlarni (A-F) KETMA-KET bajar. Har qismni tugatib GitHub'ga commit + push qil, Railway deploy'ni tekshir, keyingisiga o't. Regressiya: bot (DM, komment, bilim bazasi) har qismdan keyin ishlashi SHART. Mendan so'rama — faqat env/token kerak bo'lsa to'xtab ayt. Tugagach "4-BOSQICH TUGADI" deb yoz va to'liq hisobot ber.

---

## MAQSAD VA REFERENCE'LAR

Hozirgi holat: 7 sahifali, ishlaydigan, lekin JUDA ODDIY ko'rinishdagi dashboard.
Kerakli holat: "VAU" effekti — foydalanuvchi ochganda premium mahsulot ekanini DARROV his qilsin.

**Vizual reference'lar (shularga qarab ishla):**
- **Apple iOS 26 "Liquid Glass"** — suyuq shisha: yorug'likni egadigan shaffof panellar, hairline rim-light (yuqori chetdagi ingichka yorug' chiziq), ichki glow, hover'da sirt ustidan o'tuvchi yorug'lik nuri
- **Linear.app** — minimal aniqlik, mukammal typography, nozik 1px chegaralar, tezlik hissi
- **Stripe dashboard** — bitta muhim metrikaga fokus, toza ierarxiya, ishonch beruvchi ko'rinish
- **Attio** — AI-native: tizim o'zi xulosa beradi
- **Raycast/Supabase** — dark-mode-first, bitta kuchli aksent rang

---

## QISM A — VIZUAL TIZIM v3: LIQUID GLASS + LIGHT/DARK REJIM

Bu eng muhim qism. Barcha sahifalar shu tizimda qayta stillanadi. CSS'ni bitta markaziy modulga yoz (styles.js yoki /public/app.css) — takrorlanish bo'lmasin.

### A0. Ikki mavzu (theme) arxitekturasi — Light/Dark almashtirgich

1. `<html data-theme="dark">` atributi orqali boshqariladi. Barcha ranglar FAQAT CSS variables orqali.
2. Yuqori panelda (yoki sidebar pastida) ☀️/🌙 almashtirgich tugma — bosilganda theme o'zgaradi, `localStorage`da saqlanadi, sahifa yangilanganda eslab qoladi.
3. Default: dark. Birinchi kirishda `prefers-color-scheme` tekshirilsin.

**DARK palitra:**
```css
[data-theme="dark"] {
  --bg-base: #0a0b10;
  --bg-gradient: radial-gradient(80% 60% at 15% 0%, rgba(99,102,241,.16) 0%, transparent 55%),
                 radial-gradient(60% 50% at 90% 15%, rgba(217,70,239,.12) 0%, transparent 55%),
                 radial-gradient(50% 45% at 55% 100%, rgba(34,211,238,.09) 0%, transparent 60%);
  --glass-bg: rgba(255,255,255,0.045);
  --glass-bg-strong: rgba(255,255,255,0.08);
  --glass-border: rgba(255,255,255,0.10);
  --rim-light: rgba(255,255,255,0.28);        /* yuqori chetdagi hairline yorug'lik */
  --text-1: #f5f6f8;  --text-2: #a3aec2;  --text-3: #6b7488;
  --accent: #6366f1;  --accent-2: #a855f7;  --accent-3: #22d3ee;
  --shadow-glass: 0 8px 32px rgba(0,0,0,0.35);
}
```

**LIGHT palitra:**
```css
[data-theme="light"] {
  --bg-base: #f4f5fa;
  --bg-gradient: radial-gradient(80% 60% at 15% 0%, rgba(99,102,241,.10) 0%, transparent 55%),
                 radial-gradient(60% 50% at 90% 15%, rgba(217,70,239,.07) 0%, transparent 55%);
  --glass-bg: rgba(255,255,255,0.55);
  --glass-bg-strong: rgba(255,255,255,0.75);
  --glass-border: rgba(15,17,26,0.08);
  --rim-light: rgba(255,255,255,0.9);
  --text-1: #12141c;  --text-2: #4b5468;  --text-3: #8a91a3;
  --accent: #5b5ef0;  --accent-2: #9333ea;  --accent-3: #0891b2;
  --shadow-glass: 0 8px 28px rgba(30,35,60,0.10);
}
```

Umumiy: `--gradient-brand: linear-gradient(135deg, var(--accent), var(--accent-2) 60%, #ec4899);`

### A1. LIQUID GLASS karta retsepti (asosiy komponent — hamma joyda)

Har karta/panel/modal shu retseptda:
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: 18px;
  box-shadow: var(--shadow-glass), inset 0 1px 0 var(--rim-light); /* hairline rim-light! */
  position: relative;
  transition: transform .2s ease, border-color .2s ease, box-shadow .25s ease;
}
.glass:hover { transform: translateY(-2px); border-color: rgba(99,102,241,.4); }
```
Muhim: `inset 0 1px 0 var(--rim-light)` — bu Apple uslubidagi "yuqori chetdagi yorug'lik" — shisha hissini beradigan asosiy detal!

### A2. Jonli AURORA fon (harakatlanuvchi gradient)

`body::before` — fixed, butun ekran, `--bg-gradient` bilan; ustiga sekin harakat:
```css
@keyframes aurora { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-2%,2%) scale(1.05)} 100%{transform:translate(0,0) scale(1)} }
/* animation: aurora 24s ease-in-out infinite; will-change: transform; */
```
Nozik bo'lsin — chalg'itmasin, faqat "tirik" his bersin.

### A3. Aylanuvchi GRADIENT CHEGARA (muhim kartalar uchun)

"Bugungi xulosa" kartasi va faol/tanlangan elementlarda — sekin aylanuvchi gradient hoshiya (conic-gradient + @property bilan):
```css
@property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
.glass-featured::before {
  content:''; position:absolute; inset:-1px; border-radius:19px; z-index:-1;
  background: conic-gradient(from var(--angle), transparent 0%, var(--accent) 12%, var(--accent-2) 22%, transparent 34%);
  animation: spin-border 6s linear infinite;
}
@keyframes spin-border { to { --angle: 360deg; } }
```

### A4. YORUG'LIK NURI (specular sweep) — tugmalar uchun

Asosiy (gradient) tugmalarda hover'da chapdan o'ngga o'tuvchi yorug'lik chizig'i:
```css
.btn-primary { background: var(--gradient-brand); position:relative; overflow:hidden; }
.btn-primary::after {
  content:''; position:absolute; top:0; left:-80%; width:60%; height:100%;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,.35), transparent);
  transform: skewX(-20deg); transition: left .5s ease;
}
.btn-primary:hover::after { left: 130%; }
```

### A5. KURSORNI KUZATUVCHI GLOW (kartalarda) — 30 qator JS

Statistika/bento kartalarida sichqoncha harakatiga ergashuvchi yumshoq yorug'lik:
```js
document.querySelectorAll('.glass-glow').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});
```
```css
.glass-glow::after {
  content:''; position:absolute; inset:0; border-radius:inherit; opacity:0; transition:opacity .3s;
  background: radial-gradient(220px circle at var(--mx) var(--my), rgba(99,102,241,.15), transparent 60%);
  pointer-events:none;
}
.glass-glow:hover::after { opacity:1; }
```

### A6. Micro-interactions to'plami

- Statistika raqamlari: sahifa ochilganda 0 → qiymatgacha "sanash" (JS, 0.8s, easing)
- Sahifa kontenti: fade-in + 10px yuqoriga (CSS animation, stagger — kartalar birin-ketin 60ms farq bilan)
- Toast xabarlar (saqlandi/xato): o'ng-yuqoridan glass panel silliq kiradi, 3s dan keyin chiqadi
- Input focus: chegarada aylanib chiquvchi glow (border-color + box-shadow: 0 0 0 3px rgba(99,102,241,.18))
- Sidebar faol band: chapda 3px gradient chiziq + glass fon
- Skeleton loading: spinner o'rniga glass-shimmer (gradient o'tuvchi kulrang shakllar)

### A7. Performance va fallback

- `@media (prefers-reduced-motion: reduce)` — barcha animatsiyalarni o'chir
- backdrop-filter og'ir bo'lsa (eski qurilma): `@supports not (backdrop-filter: blur(1px))` — oddiy yarim-shaffof fon fallback
- Aurora va spin-border faqat 2-3 joyda (hamma kartada EMAS) — tezlik saqlansin

**Tugagach:** commit "Vizual v3: liquid glass, light/dark, jonli gradientlar".

---

## QISM B — BOSHQARUVNI "AI-NATIVE" QILISH (Attio uslubi)

1. **"Bugungi xulosa" kartasi** (eng tepada, .glass-featured — aylanuvchi chegara bilan): Claude (Haiku) kunlik xulosa yozadi: "Bugun 13 xabar, 2 mijoz narx so'radi, 1 suhbat kutmoqda. Eng faol: BUGUN MEDIA." Kesh: soatiga 1 marta. Yonida holat: 🟢 Hammasi joyida / 🟡 E'tibor kerak.
2. **Bento grid**: 1 katta (xulosa) + 2 o'rta (bugungi xabarlar grafigi, odam-kerak) + 3 kichik (akkauntlar, mijozlar, jami xabarlar). Har biri .glass .glass-glow.
3. **Grafik**: oddiy ustunlar o'rniga silliq gradient area-chart (sof SVG), hover tooltip, oxirgi nuqtada pulsatsiya.

**Tugagach:** commit "AI-native boshqaruv (xulosa, bento, jonli grafik)".

---

## QISM C — OPERATOR REJIMI VA CRM (ChatPlace pariteti)

1. **Bot pauza**: contacts'ga `bot_paused BOOLEAN DEFAULT false`. Webhook: pauza bo'lsa javob bermaydi, faqat saqlaydi. Inbox'da 🔕 belgi, "Botni yoqish/pauza" tugmasi. **AVTO-PAUZA**: operator qo'lda javob yozsa — bot 30 daqiqa avtomatik jim (keyin o'zi yoqiladi).
2. **Tezkor javoblar**: inbox yozish maydonida ⚡ tugma — saqlangan javoblar (saved_replies jadvali), Sozlamalarda tahrirlash.
3. **Broadcast rejalashtirish**: "Hozir" yoki sana+vaqt (scheduled_at), server har daqiqa tekshiradi.
4. **Kontakt profili (drawer)**: bosganda yon panel — avatar, sanalar, teglar, izoh (note), statistika, "Suhbatga o'tish".

**Tugagach:** commit "Operator rejimi, tezkor javoblar, rejalashtirish, mini-CRM".

---

## QISM D — BIZNI AJRATIB TURADIGAN AI FUNKSIYALAR (ChatPlace'da YO'Q)

1. **AI Insights sahifasi** (/dashboard/insights, sidebar: 📈 Tahlil): Claude (Haiku, kunlik kesh) chiqaradi: eng ko'p so'ralgan 5 savol; sotuvga tayyor mijozlar (narx so'raganlar); bilim bazasi kamchiliklari (bot javob berolmagan mavzular + tavsiya).
2. **Sentiment**: har suhbatda kayfiyat (😊/😐/😟) — Claude javob berganda aniqlab database'ga yozadi. Inbox'da salbiy suhbatlar ogohlantirish bilan.

**Tugagach:** commit "AI Insights va sentiment".

---

## QISM E — INBOX PARDOZI (eng ko'p ishlatiladigan sahifa)

- Pufaklar: mijoz chapda (glass), bot o'ngda (gradient), operator alohida (cyan chegara + "Operator" belgi)
- Suhbat tepasi: kontakt + teglar + sentiment + pauza + profil tugmalari
- Yozish: auto-resize, Enter=yuborish, Shift+Enter=qator, ⚡ tezkor javoblar
- 15s auto-yangilanish, yangi xabarda yumshoq highlight; jonli qidiruv

**Tugagach:** commit "Inbox pardozi".

---

## QISM F — YAKUNIY SIFAT NAZORATI

1. Har sahifa: dizayn tizimi bir xilmi (glass, rim-light, radiuslar, animatsiyalar) — LIGHT va DARK rejimda ham!
2. Light rejimda kontrast va o'qilish tekshirilsin (shisha ustida matn aniq)
3. Mobil: hamburger, drawer, hamma sahifa telefonda chiroyli
4. Tezlik: kutubxonasiz (sof CSS/SVG/vanilla JS), animatsiyalar faqat transform/opacity
5. Xavfsizlik: yangi endpointlar parolda, parametrlangan so'rovlar
6. Regressiya: DM → Claude → javob, komment, bilim bazasi, pauza — to'liq zanjir
7. Hisobot: qilingan ishlar jadvali + ChatPlace taqqoslash jadvali

**Tugagach:** commit "Yakuniy sifat nazorati" va "4-BOSQICH TUGADI".

---

## TEXNIK QOIDALAR

1. Kutubxonasiz: glass/animatsiya = sof CSS (@property, conic-gradient, backdrop-filter); grafik = sof SVG; JS = vanilla, minimal.
2. CSS bitta markaziy joyda, komponent klasslari (.glass, .glass-glow, .btn-primary...) qayta ishlatiladi.
3. Claude chaqiruvlari (xulosa/insights/sentiment) TEJAMKOR: Haiku, kesh, qisqa promptlar.
4. Database: ALTER TABLE IF NOT EXISTS uslubi.
5. Har qadamda: node --check → commit → push → deploy tekshiruvi.
6. Mavjud funksiyani buzish TAQIQLANADI.

## TUGAGACH

"4-BOSQICH TUGADI" + hisobot: qilingan ishlar, sahifalar, ChatPlace taqqoslash, keyingi tavsiyalar.

---

**Eslatma:** "Premium" tafsilotlarda yashaydi: 1px rim-light, yumshoq glow, silliq sweep, aniq typography. Har sahifa Apple/Linear darajasida ko'rinsin — LIGHT va DARK'da ham. Elbek ochganda "VAU" deyishi kerak.
