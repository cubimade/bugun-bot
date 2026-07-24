# BUGUN BOT — 6-BOSQICH: TEXNIK SIFAT VA YETISHMAYOTGAN FUNKSIYALAR

> **Claude Code uchun ko'rsatma:** Bu faylni to'liq o'qi. **MUHIM: bu ROADMAP-5 dan KEYIN bajariladi.** Agar ROADMAP-5 hali tugamagan bo'lsa — avval uni tugat, keyin shu faylga o't. Barcha qismlarni (A-H) KETMA-KET bajar. Har qismni tugatib GitHub'ga commit + push qil, Railway deploy'ni tekshir. Regressiya: bot (DM, komment, bilim bazasi, pauza, broadcast) har qismdan keyin ishlashi SHART. Mendan so'rama — faqat env/token kerak bo'lsa to'xtab ayt. Tugagach "6-BOSQICH TUGADI" deb yoz.

---

## MAQSAD

Platforma funksional jihatdan kuchli, lekin **texnik qarz** yig'ilgan va ba'zi muhim funksiyalar yetishmayapti. Bu bosqich: kodni sog'lomlashtirish + yetishmayotgan narsalarni qo'shish.

**Aniqlangan muammolar (kod tahlilidan):**
- `templates.js` = 135 KB (juda katta, barcha sahifalar bitta faylda)
- `index.js` = 47 KB (marshrutlar, API, webhook aralash)
- `db.js` = 36 KB (bo'linmagan)
- CSS inline (keshlanmaydi, har so'rovda qayta yuboriladi)
- Statik fayllar (`/public`) yo'q

---

## QISM A — KODNI BO'LISH VA TEZLASHTIRISH

### A1. templates.js ni bo'lish
`templates/` papka yaratib, har sahifani alohida faylga ajrat:
```
templates/layout.js      — umumiy karkas (sidebar, head, theme)
templates/dashboard.js   — Boshqaruv
templates/inbox.js       — Suhbatlar
templates/contacts.js    — Kontaktlar
templates/broadcast.js   — Broadcast
templates/knowledge.js   — Bilim bazasi
templates/accounts.js    — Akkauntlar
templates/settings.js    — Sozlamalar
templates/insights.js    — Tahlil
templates/components.js  — qayta ishlatiladigan bo'laklar (karta, tugma, badge, empty state, skeleton)
```
Har fayl faqat o'z sahifasini eksport qilsin. `templates.js` faqat re-export qiladi (eski importlar buzilmasin).

### A2. CSS ni alohida statik faylga chiqarish
- `public/app.css` yarat — barcha dizayn tizimi (CSS variables, .glass, .btn, animatsiyalar) shu yerda
- `express.static("public")` bilan xizmat qil, `Cache-Control: max-age=86400` sarlavhasi bilan
- HTML'da: `<link rel="stylesheet" href="/app.css">`
- Inline CSS'ni HTML'lardan olib tashla (faqat dinamik qiymatlar qolsin)
- Xuddi shu tarzda: `public/app.js` — umumiy JS (theme toggle, toast, glow, sanash animatsiyasi)

### A3. index.js ni bo'lish
```
routes/webhook.js    — Instagram webhook (GET verify + POST)
routes/api.js        — barcha /api/* endpointlar
routes/dashboard.js  — barcha /dashboard/* sahifa marshrutlari
routes/public.js     — /, /privacy, /data-deletion, /stats
middleware/auth.js   — Basic Auth
```
`index.js` faqat: express sozlash, middleware ulash, marshrutlarni ulash, serverni ishga tushirish (~100 qator).

### A4. db.js ni bo'lish
```
db/pool.js        — ulanish, jadval yaratish (migratsiya)
db/contacts.js    — kontakt funksiyalari
db/messages.js    — xabar funksiyalari
db/projects.js    — akkaunt/bilim bazasi
db/analytics.js   — statistika so'rovlari
db/index.js       — re-export
```

**Tugagach:** commit "Texnik A: kod bo'lindi, CSS statik faylga chiqarildi".

---

## QISM B — TEZLIK OPTIMIZATSIYASI

1. **Database indekslar** (agar yo'q bo'lsa):
   ```sql
   CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id);
   CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_contacts_project ON contacts(project_id);
   CREATE INDEX IF NOT EXISTS idx_contacts_lastseen ON contacts(last_seen DESC);
   ```
2. **Sahifalash (pagination)**: Kontaktlar va Inbox'da 50 tadan yuklash, "Ko'proq yuklash" tugmasi yoki cheksiz scroll. Hozir hammasi birdan yuklanyapti — 1000 kontakt bo'lsa sayt qotadi.
3. **Analitika keshi**: og'ir SQL so'rovlar (heatmap, voronka, metrikalar) 5 daqiqa keshlansin (oddiy Map + timestamp yetarli).
4. **N+1 so'rovlarni yo'q qilish**: kontaktlar ro'yxatida har biri uchun alohida so'rov qilinmasin — JOIN yoki bitta so'rovda.
5. **Gzip**: `compression` paketi qo'sh (yoki Railway o'zi qiladi — tekshir).

**Tugagach:** commit "Texnik B: tezlik (indeks, pagination, kesh)".

---

## QISM C — XAVFSIZLIK VA BARQARORLIK

1. **Rate limiting**: `/webhook` va `/api/*` uchun oddiy limit (masalan bir IP dan daqiqasiga 60 so'rov). Kutubxonasiz — oddiy Map bilan.
2. **Webhook imzosini tekshirish**: Meta `X-Hub-Signature-256` sarlavhasi yuboradi — uni APP_SECRET bilan tekshir (soxta so'rovlar kirmasin). Agar APP_SECRET env yo'q bo'lsa — Elbek'ga ayt, u qo'shadi.
3. **Xato boshqaruvi**: har route try/catch da; server hech qachon qulamasin; `process.on('unhandledRejection')` va `uncaughtException` loglansin.
4. **Input validatsiya**: barcha POST endpointlarda kiruvchi ma'lumot tekshirilsin (uzunlik, tur), XSS uchun HTML escape (mavjud `esc()` hamma joyda ishlatilsin).
5. **Sirlarni tekshirish**: kodda hech qanday token/kalit yozilmaganini tasdiqla (grep bilan tekshir).
6. **Health check**: `/health` endpoint — server + database holati JSON qaytarsin (Railway monitoring uchun).

**Tugagach:** commit "Texnik C: xavfsizlik va barqarorlik".

---

## QISM D — YETISHMAYOTGAN MUHIM FUNKSIYALAR

### D1. Qidiruv (global)
Yuqori panelda qidiruv maydoni — kontakt ismi/ID, xabar matni bo'yicha qidirish. Natijalar dropdown'da, bosganda suhbatga o'tadi.

### D2. Bildirishnomalar
- Dashboard'da qo'ng'iroq belgisi (🔔) — yangi "odam kerak" suhbatlar soni bilan
- Bosganda ro'yxat ochiladi
- Brauzer bildirishnomasi (Notification API) — ixtiyoriy, foydalanuvchi ruxsat bersa

### D3. Xabar shabloni o'zgaruvchilari
Broadcast va tezkor javoblarda: `{ism}`, `{akkaunt}` kabi o'zgaruvchilar — yuborishda haqiqiy qiymatga almashsin.

### D4. Suhbat arxivi
Suhbatni "arxivlash" (inbox'dan yashirish, lekin o'chirmaslik). Filtrda "Arxivlangan" bo'limi.

### D5. Bot javob sifati baholash
Har bot javobi ostida (inbox'da) 👍/👎 tugmalari — operator baholaydi. Statistika: "Javoblarning 87% ijobiy baholangan". Bu bilim bazasini yaxshilashga yordam beradi.

**Tugagach:** commit "Texnik D: qidiruv, bildirishnoma, shablonlar, arxiv, baholash".

---

## QISM E — MOBIL VA FOYDALANUVCHI TAJRIBASI

1. **Mobil to'liq tekshiruv**: har sahifa telefonda ishlashi — sidebar drawer, jadvallar scroll, diagrammalar moslashuvchan
2. **Klaviatura yorliqlari**: `/` — qidiruv, `Esc` — modal yopish, `Ctrl+K` — tezkor buyruq (ixtiyoriy)
3. **Sahifa sarlavhalari**: har sahifada to'g'ri `<title>` (brauzer tabida ko'rinadi)
4. **Favicon**: oddiy bot ikonkasi (SVG, base64 inline yoki public'da)
5. **404 sahifasi**: chiroyli, "Bosh sahifaga qaytish" tugmasi bilan
6. **Yuklanish holatlari**: barcha API chaqiruvlarida skeleton yoki spinner

**Tugagach:** commit "Texnik E: mobil va UX".

---

## QISM F — MA'LUMOTLAR XAVFSIZLIGI

1. **Avtomatik zaxira (backup)**: kuniga bir marta database'ning muhim jadvallarini JSON sifatida eksport qilib, `/backups` papkaga saqlash (oxirgi 7 kun saqlansin, eskisi o'chirilsin). Yoki: Railway'ning o'z backup imkoniyatini DEPLOYMENT.md da hujjatlashtir.
2. **Ma'lumot o'chirish**: kontaktni butunlay o'chirish imkoni (GDPR talabi) — dashboard'da tugma, tasdiqlash bilan.
3. **Eksport**: to'liq ma'lumot eksporti (barcha kontakt + suhbatlar JSON).

**Tugagach:** commit "Texnik F: zaxira va ma'lumot boshqaruvi".

---

## QISM G — HUJJATLASHTIRISH

1. `README.md` yangilansin: loyiha nima, qanday ishlaydi, sahifalar ro'yxati, texnologiyalar
2. `DEPLOYMENT.md`: Railway sozlash, env o'zgaruvchilar ro'yxati (izohlar bilan), yangi akkaunt ulash qadamlari
3. `ARCHITECTURE.md` (yangi): kod tuzilishi, papkalar, ma'lumot oqimi (webhook → claude → javob), database sxemasi
4. Kod ichida: har fayl boshida qisqa izoh (nima qiladi)

**Tugagach:** commit "Texnik G: hujjatlar".

---

## QISM H — YAKUNIY NAZORAT

1. Barcha sahifalar ishlaydi (9 sahifa × light/dark × mobil/desktop)
2. Bot to'liq zanjiri: DM → Claude → javob; komment; bilim bazasi; pauza; broadcast
3. Tezlik: sahifalar 2 soniyada yuklanadi
4. Xavfsizlik: parolsiz kirish imkonsiz, webhook imzo tekshiriladi
5. Kod: hech bir fayl 500 qatordan oshmasin (bo'lingan bo'lsin)
6. Hisobot: nima o'zgardi, fayl tuzilishi, keyingi tavsiyalar

**Tugagach:** commit "Texnik H: yakuniy nazorat" va "6-BOSQICH TUGADI".

---

## TEXNIK QOIDALAR

1. **Refaktoring xavfsiz bo'lsin**: har fayl bo'linishidan keyin server ishga tushishini va sahifalar ochilishini tekshir. Buzilsa — orqaga qaytar.
2. Yangi kutubxona minimal (faqat `compression` kerak bo'lsa).
3. Har qadamda: node --check → server test → commit → push → deploy.
4. Mavjud funksiyani buzish TAQIQLANADI — bu eng muhim qoida.

## TUGAGACH

"6-BOSQICH TUGADI" + hisobot: fayl tuzilishi (oldin/keyin), qo'shilgan funksiyalar, tezlik ko'rsatkichlari, keyingi tavsiyalar.

---

**Eslatma:** Bu "ko'rinmaydigan" ish — foydalanuvchi yangi tugma ko'rmaydi, lekin sayt tez, barqaror va kengaytiriladigan bo'ladi. Bu platformaning uzoq muddatli sog'lig'i uchun eng muhim bosqich.
