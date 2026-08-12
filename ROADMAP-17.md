# ROADMAP-17: Dizayn tizimi — Apple uslubi, sayqallangan

> **Claude Code uchun.** Loyiha ildizida.
> Bu vizual ish. Funksiyalarni **o'zgartirma** — faqat ko'rinishni almashtir.
> Har FAZA oxirida commit. Yakunda push.

---

## KONTEKST

Foydalanuvchi hozirgi dizaynni "juda sodda" deb baholadi. Yo'nalish to'g'ri (Apple uslubi), lekin ijro yetarli emas. Uch marta variant ko'rsatildi, tanlangan yo'nalish: **Apple — yumshoq, keng, shishasimon; yorug' va tungi rejim ikkalasi ham**.

Muammo gradient yoki rangda emas — **bo'shliq, burchak radiusi, tipografika va guruhlash**da.

---

# FAZA 1 — DIZAYN TOKENLARI

Yangi fayl: `public/css/tokens.css` (yoki loyihadagi mavjud CSS tuzilishiga moslashtir). Bu **yagona haqiqat manbai** — barcha rang va o'lcham shundan olinadi. Kodda qattiq yozilgan (`#7C3AED` kabi) hech qanday rang qolmasin.

```css
:root {
  /* Sirtlar — yorug' rejim */
  --bg-page:       #F2F2F7;
  --bg-card:       #FFFFFF;
  --bg-inset:      #EFEFF4;
  --bg-control:    #E3E3E8;

  /* Matn */
  --text-1:        #1C1C1E;
  --text-2:        #6E6E73;
  --text-3:        #8E8E93;
  --text-4:        #C7C7CC;

  /* Ajratgich */
  --separator:     #EFEFF4;
  --hairline:      rgba(0,0,0,0.06);

  /* Urg'u — faqat bitta */
  --accent:        #5E5CE6;
  --accent-bg:     #EEEEFC;

  /* Holat ranglari */
  --ok:            #248A4B;
  --ok-bg:         #E8F5EE;
  --warn:          #B85C1E;
  --warn-bg:       #FDEEE3;
  --danger:        #C4342B;
  --danger-bg:     #FDECEA;

  /* Radius */
  --r-card:        18px;
  --r-panel:       20px;
  --r-control:     10px;
  --r-inner:       8px;
  --r-pill:        999px;

  /* Bo'shliq */
  --pad-card:      20px;
  --pad-row:       14px 18px;
  --pad-page:      28px;
  --gap-card:      14px;
  --gap-section:   24px;

  /* Tipografika */
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

[data-theme="dark"] {
  --bg-page:       #000000;
  --bg-card:       #1C1C1E;
  --bg-inset:      #2C2C2E;
  --bg-control:    #2C2C2E;

  --text-1:        #F5F5F7;
  --text-2:        #AEAEB2;
  --text-3:        #8E8E93;
  --text-4:        #48484A;

  --separator:     #2C2C2E;
  --hairline:      rgba(255,255,255,0.08);

  --accent:        #7D7AFF;
  --accent-bg:     #232238;

  --ok:            #4ADE80;
  --ok-bg:         #1E3A2A;
  --warn:          #F5A55C;
  --warn-bg:       #3A2A1A;
  --danger:        #FF6B60;
  --danger-bg:     #3A1F1D;
}
```

**Muhim:** tungi rejimda asos **sof qora** (`#000000`), kartochkalar `#1C1C1E`. Apple aynan shunday qiladi — kulrang asos + kulrang kartochka "arzon" ko'rinadi.

## 1.1. Shrift

`Inter` ni Google Fonts'dan yukla (yoki loyihaga o'rnat), quyidagi og'irliklar bilan: 400, 500, 600.

Tipografika shkalasi — **harf oralig'i muhim**, u bo'lmasa Apple hissi yo'qoladi:

| Rol | O'lcham | Og'irlik | letter-spacing | Rang |
|---|---|---|---|---|
| Sahifa sarlavhasi | 30px | 600 | -0.03em | `--text-1` |
| Katta raqam | 34px | 600 | -0.035em | `--text-1` |
| Bo'lim sarlavhasi | 20px | 600 | -0.02em | `--text-1` |
| Qator sarlavhasi | 15px | 500 | -0.015em | `--text-1` |
| Asosiy matn | 15px | 400 | -0.01em | `--text-1` |
| Ikkilamchi matn | 13px | 400 | -0.01em | `--text-3` |
| Bo'lim yorlig'i | 13px | 500 | -0.01em | `--text-3`, KATTA HARF emas — oddiy |

Katta o'lchamlarda salbiy `letter-spacing` — bu Apple tipografikasining asosiy belgisi. Unutilsa hamma narsa oddiy ko'rinadi.

---

# FAZA 2 — KOMPONENTLARNI QAYTA QURISH

## 2.1. Emoji ikonkalarni olib tashla

Hozir sahifalarda emoji ishlatilgan (📊 🔥 ✅ 🎯 💬 va h.k.). **Apple hech qachon emoji ikonka ishlatmaydi.** Bu eng ko'p sezilgan "arzon" belgisi.

**Bajarish:**
- Lucide ikonka to'plamini qo'sh (SVG, yengil): `https://cdn.jsdelivr.net/npm/lucide-static/` yoki inline SVG sprite
- Butun loyihada emoji ikonkalarni chizma ikonkaga almashtir
- O'lcham: yon menyuda 20px, qator ichida 18px, tugmada 16px
- Rang: `currentColor` — ota elementdan meros oladi
- Chiziq qalinligi: `stroke-width: 1.75`

**Istisno:** bot javoblari va foydalanuvchi matnidagi emoji qolsin — faqat interfeys ikonkalari almashtiriladi.

## 2.2. Guruhlangan ro'yxat (eng muhim o'zgarish)

Hozir har kontakt/suhbat alohida kartochka. Buning o'rniga **bitta blok, ichida ajratgich chiziqlar** — iOS Sozlamalar uslubi.

```html
<div class="group-list">
  <div class="group-row">
    <div class="avatar">MA</div>
    <div class="row-body">
      <p class="row-title">Maftuna Aliyeva</p>
      <p class="row-sub">@maftuna_a · 6 xabar</p>
    </div>
    <span class="pill pill-warn">3 soat</span>
    <svg class="chevron">...</svg>
  </div>
  <div class="separator"></div>
  <!-- keyingi qator -->
</div>
```

```css
.group-list {
  background: var(--bg-card);
  border-radius: var(--r-card);
  overflow: hidden;
}
.group-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: var(--pad-row);
  transition: background 0.15s ease;
}
.group-row:hover { background: var(--bg-inset); }
.separator {
  height: 1px;
  background: var(--separator);
  margin-left: 74px;   /* avatar kengligi + gap — Apple shunday qiladi */
}
```

**Ajratgich chizig'i avatar ostidan boshlanmaydi** — chapdan 74px chekinadi. Bu kichik detal, lekin aynan shu Apple hissini beradi.

Qo'llaniladigan joylar: Kontaktlar, Suhbatlar ro'yxati, Kalit so'zlar ro'yxati, Bilim bazasi, Akkauntlar, Bronlar.

## 2.3. Ko'rsatkich kartochkasi

```css
.metric-card {
  background: var(--bg-card);
  border-radius: var(--r-card);
  padding: var(--pad-card);
  border: none;          /* ramka yo'q — Apple sirt farqi bilan ajratadi */
}
.metric-label { font-size: 14px; color: var(--text-3); margin-bottom: 10px; }
.metric-value { font-size: 34px; font-weight: 600; letter-spacing: -0.035em; line-height: 1; }
.metric-note  { font-size: 13px; margin-top: 10px; }
```

Har ko'rsatkich ostida **kontekst** bo'lsin, quruq raqam emas:
- "↑ 38% o'tgan haftaga"
- "eng eskisi 3 soat kutmoqda"
- progress chizig'i (6px balandlik, `--r-pill` radius)

## 2.4. Segmentlangan boshqaruv (filtrlar)

Hozirgi "Bugun / 7 kun / 30 kun / Hammasi" tugmalari iOS segmented control'ga aylantirilsin:

```css
.segmented {
  display: inline-flex;
  background: var(--bg-control);
  border-radius: var(--r-control);
  padding: 2px;
}
.segmented button {
  font-size: 14px;
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--text-2);
  border-radius: 8px;
  transition: all 0.2s ease;
}
.segmented button[aria-pressed="true"] {
  background: var(--bg-card);
  color: var(--text-1);
  font-weight: 500;
}
```

## 2.5. Tugmalar

Uch tur, boshqasi yo'q:

```css
.btn-primary {           /* sahifada faqat BITTA */
  background: var(--accent);
  color: #FFFFFF;
  font-size: 15px; font-weight: 500;
  padding: 10px 20px;
  border-radius: var(--r-control);
  border: none;
}
.btn-secondary {
  background: var(--bg-card);
  color: var(--text-1);
  border: 1px solid var(--hairline);
  /* qolgani bir xil */
}
.btn-plain {
  background: transparent;
  color: var(--accent);
  border: none;
}
```

**Gradient tugmalar olib tashlanadi.** Hozirgi binafsha-pushti gradient faqat bitta joyda qoladi: logotip. Boshqa hech qayerda gradient bo'lmasin.

## 2.6. Nishonlar (pill)

```css
.pill {
  font-size: 12px; font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--r-pill);
}
.pill-ok     { background: var(--ok-bg);     color: var(--ok); }
.pill-warn   { background: var(--warn-bg);   color: var(--warn); }
.pill-danger { background: var(--danger-bg); color: var(--danger); }
.pill-plain  { background: var(--bg-inset);  color: var(--text-2); }
```

## 2.7. Avatar

```css
.avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 500;
  flex-shrink: 0;
  object-fit: cover;
}
```

- Profil rasmi bor bo'lsa — rasm
- Yo'q, lekin ism bor — bosh harflar (`MA`), fon rangi ismdan hisoblanadi (barqaror hash → 6 ta oldindan belgilangan yumshoq rangdan biri)
- Hech narsa yo'q — kulrang fon + odam ikonkasi

---

# FAZA 3 — SAHIFA TUZILISHI

## 3.1. Yon menyu

- Kengligi 240px
- Fon: `--bg-card` (yorug'da oq, tunda `#1C1C1E`)
- Har element: ikonka (20px) + matn (15px), padding `10px 14px`, radius `--r-inner`
- Faol element: `background: var(--accent-bg); color: var(--accent)`
- Guruhlash — bo'lim yorliqlari bilan:
  - **Ish**: Boshqaruv, Suhbatlar, Kontaktlar, Voronka, Bronlar
  - **Avtomatlashtirish**: Oqimlar, Kalit so'zlar, Bilim bazasi, Broadcast
  - **Tahlil**: Tahlil, A/B test, Sotuv
  - **Sozlash**: Media, Akkauntlar, Sozlamalar
- Pastda: versiya, rejim almashtirgich, chiqish

Hozir 14 ta element bir uzun ro'yxatda — guruhlash bilan yengil ko'rinadi.

## 3.2. Sahifa boshi

Har sahifada bir xil tuzilish:

```
Sana yoki kontekst (15px, --text-3)
Sahifa nomi (30px, 600, -0.03em)
                                    [Asosiy amal tugmasi — o'ngda]
─────────────────────────────────── (28px bo'shliq)
Segmentlangan filtr yoki qidiruv
                                    (24px bo'shliq)
Kontent
```

Sahifa paddingi: `--pad-page` (28px). Hozir siqiq.

## 3.3. Bo'sh holat

Har bo'sh ro'yxatda:
- Ikonka (32px, `--text-4`)
- Sarlavha (17px, 500) — nima yo'qligini emas, nima qilish kerakligini aytadi
- Bir qator izoh (14px, `--text-3`)
- Tugma (`.btn-secondary`)

Masalan: *"Birinchi kalit so'zni qo'shing"* — *"Mijoz shu so'zni yozganda bot avtomatik javob beradi"* — `[Kalit so'z qo'shish]`

"Hali hech narsa yo'q" degan matn ishlatilmasin.

## 3.4. Yuklanish holati

Aylanuvchi spinner o'rniga **skelet** (skeleton) — kontent shakliga mos kulrang bloklar, yengil pulsatsiya bilan. Bu kutishni qisqaroq his qildiradi.

---

# FAZA 4 — SHISHA EFFEKTI (o'lchov bilan)

Foydalanuvchi "shishasimon" dedi, lekin hozirgi loyihada blur haddan tashqari ishlatilgan va tezlikni pasaytiryapti (ilgari `perf-lite` rejimi qo'shilgan edi).

**Qoida: blur faqat 3 joyda:**

1. **Yuqori panel** (agar mavjud bo'lsa) — sahifa aylantirilganda ostidagi kontent ko'rinib turadi
2. **Modal orqa foni** — `backdrop-filter: blur(20px)` + `background: rgba(0,0,0,0.25)`
3. **Yon menyu** — faqat ish stoli ko'rinishida

```css
.glass {
  background: rgba(255,255,255,0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
}
[data-theme="dark"] .glass {
  background: rgba(28,28,30,0.72);
}
```

`saturate(180%)` muhim — Apple shuni ishlatadi, ostidagi ranglar jonli chiqadi.

**Boshqa hech qayerda blur bo'lmasin** — kartochkalarda, tugmalarda, nishonlarda. Ular tekis sirt bo'ladi.

## 4.1. Harakat

- O'tishlar: `0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- Hover: faqat fon rangi o'zgaradi, ko'chish yo'q
- Bosilganda: `transform: scale(0.98)`
- Modal ochilishi: 0.25s, pastdan yuqoriga 8px + shaffoflik
- `@media (prefers-reduced-motion: reduce)` — barcha animatsiya o'chirilsin

---

# FAZA 5 — TOZALASH

1. **Eski CSS'ni o'chir** — yangi tokenlar bilan almashtirilgan qoidalar qolib ketmasin. Ular bir-birini bekor qiladi.
2. **Qattiq yozilgan ranglarni qidir** — `#` bilan boshlanadigan barcha ranglar tokenga almashtirilsin. Faqat `tokens.css` da hex bo'lsin.
3. **`perf-lite` rejimini qayta ko'rib chiq** — blur kamayganidan keyin u kerak bo'lmasligi mumkin.
4. **Focus holati:**
   ```css
   :focus { outline: none; }
   :focus-visible {
     outline: 2px solid var(--accent);
     outline-offset: 2px;
     border-radius: var(--r-inner);
   }
   ```
5. **Mobil:** 768px dan pastda yon menyu pastki panelga aylanadi (5 ta asosiy element + "Ko'proq"). Kartochkalar bir ustunda. Padding 28px → 16px.

---

# TEKSHIRUV RO'YXATI

- [ ] Interfeysda bironta emoji ikonka qolmagan
- [ ] Logotipdan boshqa joyda gradient yo'q
- [ ] Barcha ranglar `tokens.css` dan olinadi
- [ ] Tungi rejimda asos sof qora, kartochka `#1C1C1E`
- [ ] Katta sarlavhalarda salbiy `letter-spacing` qo'llangan
- [ ] Ro'yxatlar guruhlangan, ajratgich chapdan 74px chekingan
- [ ] Har sahifada `.btn-primary` faqat bitta
- [ ] Blur faqat 3 joyda
- [ ] Bo'sh holatlar amal taklif qiladi
- [ ] Klaviatura bilan yurilganda focus ko'rinadi
- [ ] Mobil ekranda buzilmaydi
- [ ] Ikkala rejimda ham barcha matn o'qiladi

---

# TEGMA

- Backend mantiq, API endpoint'lari, ma'lumotlar bazasi
- `verifySignature()` va webhook route'lari
- OAuth kodi (`routes/oauth.js`, `services/instagram-oauth.js`)
- Funksionallik — faqat ko'rinish o'zgaradi

---

# COMMIT

```
style: Apple uslubidagi dizayn tizimi (v12.3.0)

- tokens.css: rang, radius, bo'shliq, tipografika tokenlari
- emoji ikonkalar Lucide SVG bilan almashtirildi
- guruhlangan ro'yxat komponenti (iOS Sozlamalar uslubi)
- segmentlangan filtr boshqaruvi
- gradient faqat logotipda qoldi
- blur 3 ta joyga cheklandi
- yon menyu guruhlandi
- bo'sh holat va skelet yuklanish
```

Yakunda **halol hisobot**: qaysi FAZA to'liq, qaysi qisman, nima qilinmadi.

Bir seansda sig'masa: FAZA 1, 2, 3 birinchi navbat — ularni tugatib push qil, keyin xabar ber.
