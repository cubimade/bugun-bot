# ROADMAP-18: Blokerlarni tuzatish (audit asosida)

> **Claude Code uchun.** Loyiha ildizida.
> Bu ro'yxat mahsulot auditidan olingan — har bir muammo **o'lchangan va tasdiqlangan**, taxmin emas.
> FAZA tartibi bilan bajarilsin. Har fazadan keyin commit. Yakunda push.

---

## NIMA UCHUN BU MUHIM

Audit xulosasi: platforma funksiyalar ro'yxati bo'yicha ChatPlace'dan kam emas, lekin **uchta asosiy mexanizm amalda ishlamayapti**. Ya'ni "21 ta suhbat operator kutmoqda" degan raqam bor, lekin operator o'sha suhbatlarga texnik jihatdan javob bera olmaydi.

Bu FAZA'lar platformani "demo" holatidan "kunlik ishlaydigan" holatga o'tkazadi. Yangi funksiya qo'shilmaydi — mavjudlari tiklanadi.

---

# FAZA 0 — OAuth uzoq muddatli token (yarim qolgan ish)

Instagram OAuth oqimi deyarli ishlaydi: consent oynasi ochilyapti, `code` qaytyapti, qisqa muddatli token olinyapti. Oxirgi qadamda yiqilyapti:

```
Uzoq muddatli token olinmadi: Unsupported request - method type: get
```

**Bajarish:**

1. `services/instagram-oauth.js` dagi `exchangeForLongLived()` ni oching
2. Meta hujjatini web'dan tekshiring — Instagram Business Login uchun qisqa→uzoq token almashinuvining **joriy** usuli qanday:
   - HTTP metodi: GET yoki POST
   - Host: `graph.instagram.com` yoki `api.instagram.com`
   - Parametrlar: `grant_type=ig_exchange_token`, `client_secret`, `access_token`
3. Xato matni "method type: get" deyapti — demak endpoint POST kutayotgan bo'lishi mumkin, yoki parametrlar body'da yuborilishi kerak
4. Tuzating va real akkaunt bilan sinang

**Muvaffaqiyat mezoni:** `/auth/instagram` → Instagram consent → Allow → akkaunt bazaga tushadi va akkauntlar sahifasida ko'rinadi.

---

# FAZA 1 — Inbox: operator javob yoza olmayapti (BLOKER)

Bu eng jiddiy xato. Butun operator funksiyasi ishlamayapti.

**Diagnostika (o'lchangan):**

```
.inbox-wrap    overflow-y: hidden · height: 609px · scrollHeight: 3921px
textarea       ekrandagi joyi: top = 3974px (ko'rinish balandligi 779px)
holat          yuklanganda scrollTop = 0 — avto-scroll yo'q
tekshirildi    2 ta suhbatda (contact=296, contact=175)
```

Ya'ni: konteyner balandligi 609px qilib qotirilgan, ichidagi kontent 3921px, lekin `overflow-y: hidden` — scroll qilib bo'lmaydi. Javob yozish maydoni ekrandan 3200px pastda qolyapti.

**Bajarish:**

1. **Tuzilishni qayta qur** — bitta scroll qilinmaydigan blok o'rniga uch qatlam:

```css
.inbox-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;              /* qotirilgan px emas */
  min-height: 0;             /* flex ichida scroll ishlashi uchun shart */
}

.inbox-header {
  flex-shrink: 0;
}

.inbox-messages {
  flex: 1;
  overflow-y: auto;          /* hidden EMAS */
  min-height: 0;
  scroll-behavior: smooth;
}

.inbox-composer {
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  background: var(--bg-card);
  border-top: 1px solid var(--separator);
  padding: 12px 16px;
}
```

2. **Avto-scroll qo'sh** — suhbat ochilganda va yangi xabar kelganda pastga tushsin:

```js
function scrollToBottom(smooth = false) {
  const el = document.querySelector('.inbox-messages');
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}
```

- Suhbat yuklanganda: `scrollToBottom(false)` — darrov, animatsiyasiz
- Yangi xabar kelganda: agar foydalanuvchi pastda bo'lsa `scrollToBottom(true)`, yuqorida bo'lsa tegmasin (o'qiyotgan bo'lishi mumkin)

3. **"Yangi xabar" tugmasi** — foydalanuvchi yuqorida turganda yangi xabar kelsa, pastda suzuvchi tugma chiqsin: "↓ Yangi xabar". Bosilganda pastga tushadi.

4. **Composer'ni tekshir:**
   - Textarea Enter bilan yuborsin, Shift+Enter yangi qator
   - Yozilayotganda balandligi o'zi o'ssin (maks 5 qator)
   - Yuborilgandan keyin tozalansin va fokus qolsin

5. **Mobil ko'rinishda ham tekshir** — 768px dan pastda klaviatura ochilganda composer ko'rinib tursin.

**Muvaffaqiyat mezoni:** suhbat ochiladi → oxirgi xabar ko'rinadi → yozish maydoni ekranda → matn yoziladi va yuboriladi.

---

# FAZA 2 — Kalit so'z dvigateli hech narsaga mos kelmayapti (BLOKER)

**Diagnostika (o'lchangan):**

```
qoida   "narx, narxr" · ichida bo'lsa · faol · barcha akkauntlar
kirish  "narx qancha"  → Hech bir qoida mos kelmadi
kirish  "narx"         → Hech bir qoida mos kelmadi
581 ta xabar davomida hisoblagich: 0 marta / 0 javob
```

Panelning **o'z** "Sinab ko'rish" vositasi ham mos topa olmayapti — demak muammo matcher funksiyasida, webhook'da emas.

**Bajarish:**

1. **Avval sababni aniqla, keyin tuzat.** Matcher funksiyasini toping va quyidagilarni ketma-ket tekshiring:

   - **Parse:** `"narx, narxr"` massivga qanday aylanyapti? `split(',')` dan keyin `trim()` bormi? Agar yo'q bo'lsa massiv `["narx", " narxr"]` bo'ladi — ikkinchisida oldingi bo'shliq bor va hech qachon mos kelmaydi
   - **Registr:** ikkala tomon ham `toLowerCase()` qilinyaptimi?
   - **Ma'lumot formati:** bazada kalit so'zlar qanday saqlanyapti — matn, JSON massiv, yoki chip tizimidan keyin boshqa formatda? ROADMAP-16 da chip tizimi qo'shilgan edi — ehtimol saqlash formati o'zgargan, lekin o'qish yangilanmagan
   - **Akkaunt filtri:** "barcha akkauntlar" (`project_id = null` yoki `0`?) sharti to'g'ri ishlayaptimi
   - **Faol bayrog'i:** `is_active` tekshiruvi qiymatni to'g'ri o'qiyaptimi

2. **Topilgan sababni tuzat.**

3. **Matcher'ni birlik testlar bilan qoplang** — kamida shu holatlar:

```
qoida "narx" (ichida bo'lsa):
  "narx"          → mos ✓
  "narx qancha"   → mos ✓
  "NARX"          → mos ✓
  "  narx  "      → mos ✓
  "narxlar"       → mos ✓
  "salom"         → mos emas ✓

qoida "narx, xizmat" (ikki so'z):
  "xizmat bormi"  → mos ✓

qoida "narx" (aniq mos):
  "narx"          → mos ✓
  "narx qancha"   → mos emas ✓
```

4. **Diagnostika loglash qo'sh** — kelgan xabar uchun qaysi qoidalar tekshirilgani va nega mos kelmagani DEBUG darajasida loglansin. Keyingi safar diagnostika soniyalarda bo'ladi.

**Muvaffaqiyat mezoni:** "Sinab ko'rish" da "narx qancha" yozilganda qoida topiladi va javob ko'rsatiladi. Real DM da ham ishlaydi.

---

# FAZA 3 — Markdown mijozga xom holda ketyapti

Bot javoblarida `**qalin**` sintaksisi ishlatilyapti, lekin Instagram DM markdown'ni render qilmaydi. Mijoz yulduzchalarni ko'z bilan ko'radi.

```
yuborilgan:    **Eng tezkor yo'llar:**
               **Telegram:** @elbeshmurodov
mijoz ko'radi: aynan shu, yulduzchalar bilan
```

**Bajarish:**

Ikkala yechimni ham qo'llang — sanitizer ishonchli, prompt esa manbadan kamaytiradi.

1. **Sanitizer** — yuborishdan oldingi oxirgi nuqtada (barcha yuborish yo'llari: AI javob, kalit so'z, flow, broadcast, follow-up):

```js
function sanitizeForInstagram(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')      // ***qalin kursiv***
    .replace(/\*\*(.+?)\*\*/g, '$1')          // **qalin**
    .replace(/(?<!\S)\*(?!\s)(.+?)(?<!\s)\*(?!\S)/g, '$1')  // *kursiv*
    .replace(/(?<!\S)_(?!\s)(.+?)(?<!\s)_(?!\S)/g, '$1')    // _kursiv_
    .replace(/`{1,3}(.+?)`{1,3}/gs, '$1')     // `kod`
    .replace(/^#{1,6}\s+/gm, '')              // ## sarlavha
    .replace(/^\s*[-*+]\s+/gm, '• ')          // ro'yxat → bullet
    .replace(/^\s*(\d+)\.\s+/gm, '$1. ')      // raqamli ro'yxat qolsin
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1: $2') // [matn](havola) → matn: havola
    .replace(/\n{3,}/g, '\n\n')               // ortiqcha bo'sh qator
    .trim();
}
```

**Diqqat:** `*kursiv*` uchun regex ehtiyotkor bo'lsin — `2*3*4` kabi matematik ifodalarni buzmasin. Yuqoridagi lookahead/lookbehind shuni hal qiladi.

2. **System prompt'ga qoida qo'sh:**

```
Instagram DM matn formatlashni qo'llab-quvvatlamaydi. Markdown ISHLATMA:
yulduzcha, pastki chiziq, sarlavha belgisi, kod belgisi yozma.
Ro'yxat kerak bo'lsa • belgisidan foydalan. Oddiy matn yoz.
```

3. **Telegram uchun alohida** — Telegram markdown'ni qo'llab-quvvatlaydi. Sanitizer faqat Instagram yo'lida ishlasin, Telegram'da matn o'z holicha ketsin.

**Muvaffaqiyat mezoni:** test xabar yuboriladi, Instagram DM da yulduzcha ko'rinmaydi.

---

# FAZA 4 — Avtomatik hisobotlar to'xtagan

```
AI xulosa            yangilangan 2026-08-14  (8 kun oldin)
AI suhbat tahlili    yangilangan 2026-08-11  (11 kun oldin)
Haftalik taqqoslash  2026-08-11 19:23
bugun                2026-08-22
```

Panelda "kuniga bir marta yangilanadi" deb yozilgan, lekin scheduler 8–11 kundan beri ishlamayapti. Eng xavflisi — **eski ma'lumot to'g'ri ma'lumot sifatida ko'rsatilyapti**.

**Bajarish:**

1. **Scheduler'ni topib tekshir:**
   - Cron qanday ro'yxatdan o'tgan — `node-cron`, `setInterval`, yoki Railway cron?
   - Server qayta ishga tushganda cron qayta ro'yxatdan o'tyaptimi?
   - Cron ichida xato bo'lsa u jimgina yutilyaptimi? (try/catch ichida `console.error` bormi)
   - Vaqt zonasi to'g'rimi — cron UTC'da ishlaydi, `0 4 * * *` O'zbekistonda soat 9:00

2. **Har cron ishga tushganda log yozilsin:**
   ```
   [CRON] ai-summary boshlandi
   [CRON] ai-summary tugadi — 1240ms
   ```
   yoki xato bo'lsa:
   ```
   [CRON] ai-summary XATO: <sabab>
   ```

3. **Oxirgi ishga tushish vaqtini bazaga yoz** — `cron_runs` jadvali yoki `settings` ichida. Shunda "ishladimi yoki yo'qmi" savoliga aniq javob bo'ladi.

4. **Eskirgan ma'lumotga ogohlantirish qo'y** — bu eng muhimi:

```
Agar yangilangan_vaqt > 48 soat:
   xulosa ustida sariq lenta: "⚠ 8 kun oldin yangilangan — ma'lumot eskirgan"
   yonida [Hozir yangilash] tugmasi
```

Noto'g'ri raqamga qarab qaror qabul qilib qo'yish xavfi bor — foydalanuvchi eskirganini bilishi shart.

5. **Qo'lda yangilash tugmasi** — har AI blok yonida. Cron yiqilsa ham foydalanuvchi o'zi yangilaydi.

**Muvaffaqiyat mezoni:** loglarda cron ishlagani ko'rinadi, eskirgan bloklarda ogohlantirish chiqadi.

---

# FAZA 5 — Voronka foizi va vaqt zonasi

## 5.1. Voronka foizi 625% chiqyapti

```
Yozgan                 91
Suhbatlashgan (2+)     71 · 78%   ✓ to'g'ri
Qiziqqan                4 ·  6%   ✓ to'g'ri
Aloqaga chiqqan        25 · 625%  ✗ 25/4 hisoblangan · to'g'risi 25/91 = 27%
```

Sabab: foiz oldingi bosqichdan hisoblanyapti, lekin bosqichlar ketma-ket emas — "aloqaga chiqqan" mijoz "qiziqqan"ning qism to'plami emas.

**Bajarish:** har bosqich foizini **umumiy bazadan** hisobla:

```js
const percent = total > 0 ? Math.round((stageCount / total) * 100) : 0;
```

Agar haqiqiy ketma-ket voronka kerak bo'lsa, bosqichlarni qayta ta'riflash kerak — lekin hozircha umumiy bazadan hisoblash to'g'ri va tushunarli.

## 5.2. Vaqt zonasi +5

Tahlil "Eng faol vaqt: 00:00–02:00" deyapti va "shu paytda onlayn bo'ling" deb maslahat beryapti. O'zbekistonda bu deyarli imkonsiz — vaqtlar UTC'da saqlanib, UTC'da ko'rsatilayotganga o'xshaydi.

**Bajarish:**

1. **Saqlash UTC'da qolsin** — bu to'g'ri, o'zgartirmang
2. **Ko'rsatishda `Asia/Tashkent` ga o'giring** (UTC+5):

```js
const TZ = 'Asia/Tashkent';

// Ko'rsatish uchun
new Date(utcTimestamp).toLocaleString('uz-UZ', { timeZone: TZ });

// Soat bo'yicha guruhlash uchun (heatmap, faollik tahlili)
function localHour(utcDate) {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', hour12: false
  }).format(utcDate));
}
```

3. **Tekshiriladigan joylar:** heatmap (soat×kun), "eng faol vaqt" tavsiyasi, broadcast vaqt tavsiyasi, xabar vaqtlari, bron slotlari, cron jadvali

4. **Sozlamalarga vaqt zonasi maydoni qo'sh** — hozircha `Asia/Tashkent` sukut bo'yicha, lekin kelajakda mijoz o'zgartira olsin

## 5.3. Ma'nosiz foizlar

`+14425%`, `+9000%` kabi raqamlar noldan yaqin bazadan hisoblangan va hech qanday ma'lumot bermaydi.

**Qoida:** oldingi davr qiymati 10 dan kam bo'lsa, foiz o'rniga mutlaq o'zgarish ko'rsatilsin:

```
oldingi < 10:  "+43 ta" (foiz emas)
oldingi ≥ 10:  "+38%"
oldingi = 0:   "yangi"
```

---

# FAZA 6 — Ma'lumot tozalash

Production'da test axlati va dublikatlar bor. Bu ishonchni buzadi va tahlilni chalg'itadi.

**Bajarish:**

1. **Dublikat akkauntlar** — 3 ta akkaunt ham "Elbek Eshmurodov Instagram" nomida, 2 tasi butunlay bo'sh:
   - Bo'sh akkauntlarni aniqla (0 kontakt, 0 xabar, token yo'q)
   - Ularni o'chirish uchun **admin endpoint** yoz, avtomatik o'chirma — foydalanuvchi tasdiqlasin
   - Akkauntlar sahifasida har akkaunt yonida kontakt/xabar soni ko'rsatilsin, shunda qaysi biri bo'shligi ko'rinadi

2. **Dublikat flow'lar** — 4 tadan 3 tasi bir xil "Lead yig'ish" nusxasi. Xuddi shunday: aniqla, ko'rsat, foydalanuvchi o'chirsin.

3. **Test axlati** — kalit so'z qoidasining javob matni `lkdalksdak[ldasd`. Bunday yozuvlarni topib ko'rsat.

4. **Bir martalik "Tozalash" sahifasi** yoki Sozlamalar ichida bo'lim:
   - Bo'sh akkauntlar: N ta → [Ko'rish] [O'chirish]
   - Dublikat flow'lar: N ta → [Ko'rish] [O'chirish]
   - Ismsiz kontaktlar: N ta → [Profillarni tortish]
   - Bo'sh yoki ma'nosiz kalit so'z javoblari: N ta → [Ko'rish]

5. **Akkauntga haqiqiy nom berish** — akkauntlar sahifasida nomni tahrirlash imkoni bo'lsin (`Dr. Dildora`, `Milliy Shashlik` kabi).

---

# FAZA 7 — Kontakt profillarini avtomatik tortish

91 ta kontaktdan aksariyati `…300784` ko'rinishida. "Profillarni yangilash" tugmasi bor, lekin avtomatik ishlamayapti. Bu broadcast'dagi `{ism}` o'zgaruvchisini ham buzadi.

**Bajarish:**

1. **Webhook'da avtomatik chaqirilsin** — yangi kontakt yaratilganda profil ma'lumoti fon rejimida tortilsin (webhook javobini kechiktirmasin)
2. **Kunlik cron** — `profile_fetched_at` bo'sh yoki 7 kundan eski kontaktlar uchun qayta urinsin, bir yurishda 100 ta, so'rovlar orasida 300ms
3. **Xato bo'lsa belgilansin** — ba'zi foydalanuvchilar ma'lumot ulashishni yopgan. Ularni `profile_unavailable = true` bilan belgilab, qayta urinishdan chiqar
4. **`{ism}` uchun zaxira** — ism yo'q bo'lsa broadcast'da "Salom!" deb boshlansin, "Salom {ism}!" o'rniga bo'sh joy qolmasin

---

# TEKSHIRUV RO'YXATI

- [ ] OAuth: akkaunt tugma orqali ulanadi
- [ ] Inbox: suhbat ochilganda oxirgi xabar ko'rinadi, javob yoziladi
- [ ] Inbox: mobil ekranda ham composer ko'rinadi
- [ ] Kalit so'z: "narx qancha" qoidani topadi
- [ ] Kalit so'z: birlik testlar o'tadi
- [ ] Markdown: Instagram'ga toza matn ketadi
- [ ] Markdown: Telegram'da formatlash saqlanadi
- [ ] Cron: loglarda ishlagani ko'rinadi
- [ ] Eskirgan xulosada ogohlantirish chiqadi
- [ ] Voronka foizi 100% dan oshmaydi
- [ ] Vaqtlar Toshkent vaqtida ko'rsatiladi
- [ ] Kichik bazada foiz o'rniga mutlaq raqam
- [ ] Bo'sh akkaunt va dublikatlar aniqlanadi
- [ ] Yangi kontakt profil bilan keladi

---

# TEGMA

- `verifySignature()` va webhook route'lari
- Dizayn tizimi (ROADMAP-17 da qilingan) — faqat inbox tuzilishi tuzatiladi
- Ma'lumotni **avtomatik o'chirma** — faqat aniqla va ko'rsat

---

# COMMIT

```
fix: blokerlarni tuzatish — inbox, kalit so'z, cron, hisob (v12.4.0)

- inbox scroll va sticky composer, avto-scroll
- kalit so'z matcher tuzatildi + birlik testlar
- Instagram uchun markdown sanitizer
- cron tiklandi, eskirgan ma'lumotga ogohlantirish
- voronka foizi umumiy bazadan hisoblanadi
- vaqtlar Asia/Tashkent zonasida
- kontakt profillari avtomatik tortiladi
- tozalash paneli
```

Yakunda **halol hisobot**: qaysi FAZA to'liq, qaysi qisman, nima qilinmadi va nega.

Bir seansda sig'masa: **FAZA 0, 1, 2, 3** birinchi navbat — ular eng ko'p sezilarli. Tugatib push qil, keyin xabar ber.
