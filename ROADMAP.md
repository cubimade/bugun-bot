# BUGUN BOT — TO'LIQ LOYIHA REJASI (ROADMAP)

> **Claude Code uchun ko'rsatma:** Bu faylni to'liq o'qi. Quyidagi bosqichlarni KETMA-KET, o'zing bajar. Har bosqichni tugatib, GitHub'ga commit qilib, keyingisiga o't. Mendan so'rama — faqat MUHIM qaror (masalan token kerak, yoki ma'lumot yo'q) bo'lganda to'xtab so'ra. Har qadamda o'zbek tilida qisqa izoh yoz. Tugagach, "BARCHA BOSQICHLAR TUGADI" deb yoz.

---

## LOYIHA HAQIDA

**Nima:** Instagram AI chat-bot platformasi (ChatPlace/ManyChat kabi).
**Egasi:** Elbek Eshmurodov — shaxsiy brend, kontent-marketing.
**Maqsad:** O'z 5-6 Instagram biznes akkauntlari uchun AI avtomatik javob tizimi.

**Texnologiyalar:** Node.js + Express + Claude API + PostgreSQL, Railway'da deploy.

**Hozirgi holat (TUGALLANGAN):**
- Bot Instagram DM'ga javob beradi (Claude Haiku)
- Doimiy xotira (PostgreSQL — projects, contacts, messages jadvallari)
- Komment'ga avtomatik javob + ManyChat uslubidagi DM
- /stats statistika sahifasi
- Railway'da 24/7 ishlaydi

---

## MUHIM QOIDALAR (har doim amal qil)

1. **Har o'zgarishdan keyin GitHub'ga commit + push qil.**
2. **Kod yozgandan keyin sintaksisni tekshir** (node --check).
3. **Server ishga tushishini sinab ko'r** (test qil).
4. **Xatolarni chiroyli boshqar** — bot xato qilsa, foydalanuvchiga do'stona javob bersin, server o'chmasin.
5. **Maxfiy narsalar (token, kalit) kodda YOZILMASIN** — faqat process.env orqali.
6. **O'zbek tilida (lotin) izoh yoz.**
7. **Deploy Railway'da avtomatik bo'lmasa** — bo'sh commit push qilib, ~2-3 daqiqa kut.
8. **Mavjud ishlayotgan funksiyalarni buzma** — har o'zgarishdan keyin eski funksiyalar (DM, komment) hali ishlashini tekshir (regressiya testi).

---

## BOSQICH 1 — KOD TOZALASH VA MUSTAHKAMLASH (avval shu!)

**Maqsad:** Mavjud kodni professional, toza, bo'linadigan strukturaga keltirish.

**Vazifalar:**
1. Kodni mantiqiy fayllarga bo'l:
   - `index.js` — asosiy server (webhook, marshrutlar)
   - `db.js` — database (allaqachon bor)
   - `claude.js` — AI javob mantiqi (Claude bilan ishlash)
   - `instagram.js` — Instagram'ga xabar/komment yuborish
   - `config.js` — sozlamalar (bilim bazasi, model nomi)
2. Har fayl aniq bitta vazifani bajarsin (toza kod).
3. Xatolarni markazlashtirilgan boshqarish qo'sh.
4. `.env.example` fayl yarat (kerakli o'zgaruvchilar ro'yxati, qiymatsiz).
5. `README.md` ni yangilab, loyiha qanday ishlashini yoz (o'zbekcha).

**Test:** Server ishga tushsin, DM va komment hali ishlasin.
**Tugagach:** commit "Bosqich 1: kod tozalash va bo'lish".

---

## BOSQICH 2 — BILIM BAZASI TIZIMI (AI Manager asosi)

**Maqsad:** Har akkaunt uchun alohida bilim bazasi (biznes ma'lumoti) — ChatPlace'ning kuchi.

**Vazifalar:**
1. Database'ga `knowledge_base` maydonini ishlatiladigan qil (projects jadvalida bor).
2. Bot javob berganda, o'sha akkauntning bilim bazasini SYSTEM_PROMPT'ga qo'shsin.
3. Bilim bazasi tuzilmasi: biznes nomi, xizmatlar, narxlar, aloqa, ish vaqti, FAQ.
4. Agar bilim bazasi bo'sh bo'lsa — umumiy javob bersin.
5. `/api/knowledge/:projectId` endpoint qo'sh — bilim bazasini o'qish/yozish (GET va POST).

**Test:** Bir akkauntga test bilim bazasi qo'shib, bot shunga mos javob berishini tekshir.
**Tugagach:** commit "Bosqich 2: bilim bazasi tizimi".

---

## BOSQICH 3 — DASHBOARD (BOSHQARUV PANELI)

**Maqsad:** Vizual panel — kod yozmasdan botni boshqarish.

**Vazifalar:**
1. Oddiy, chiroyli HTML dashboard yarat (alohida sahifa: `/dashboard`).
   - Sarlavha, menyu
   - Statistika kartalari (mijozlar, xabarlar, akkauntlar soni)
   - Ulangan akkauntlar ro'yxati
   - Har akkaunt uchun: bilim bazasini tahrirlash tugmasi
   - Oxirgi suhbatlar ro'yxati (kim, qachon, nima yozgan)
2. Dashboard chiroyli bo'lsin — zamonaviy dizayn (Tailwind CSS CDN ishlatsa bo'ladi), o'zbek tilida.
3. Bilim bazasini tahrirlash: matn maydoni, "Saqlash" tugmasi (yuqoridagi /api/knowledge endpoint'ga ulanadi).
4. Suhbatlarni ko'rish: har suhbatni ochib, to'liq yozishmalarni ko'rish.
5. HAVFSIZLIK: dashboard'ga oddiy parol himoyasi qo'sh (bitta admin parol, env'da saqlanadi — DASHBOARD_PASSWORD).

**Test:** Dashboard ochilsin, statistika ko'rinsin, bilim bazasi tahrirlansa saqlansin.
**Tugagach:** commit "Bosqich 3: boshqaruv paneli (dashboard)".

**MUHIM:** DASHBOARD_PASSWORD env o'zgaruvchisi kerak bo'ladi. Uni Railway'da qo'shish kerakligini menga (Elbek'ga) ayt — men qo'shaman.

---

## BOSQICH 4 — KO'P AKKAUNT QO'LLAB-QUVVATLASH

**Maqsad:** Bir necha Instagram akkaunt bir botda ishlasin (Elbek'ning 5-6 biznesi).

**Vazifalar:**
1. Kod har webhook'da qaysi akkauntga kelganini aniqlasin (entry.id orqali).
2. Har akkaunt uchun database'da alohida project, o'z tokeni, o'z bilim bazasi.
3. Token'larni database'da xavfsiz saqlash (projects.access_token).
4. Bot javob yuborganda — o'sha akkauntning tokenini ishlatsin (bitta umumiy token emas).
5. Dashboard'da: "Yangi akkaunt qo'shish" tugmasi (token va akkaunt ID kiritish).
6. Har akkaunt statistikasi alohida ko'rinsin.

**MUHIM TO'SIQ:** Har yangi akkaunt uchun Meta'da token olish va webhook obuna kerak. Bu qismni menga (Elbek'ga) tushuntir — men qo'lda qilaman (Meta panelida). Kod tomonini sen tayyorla.

**Test:** 2 ta akkaunt bilan sinab ko'r (agar 2-token bo'lsa).
**Tugagach:** commit "Bosqich 4: ko'p akkaunt qo'llab-quvvatlash".

---

## BOSQICH 5 — YAXSHILANISHLAR

**Maqsad:** Botni aqlliroq va foydaliroq qilish.

**Vazifalar:**
1. **Model tanlash:** oddiy savollarga Haiku, murakkab savollarga Sonnet (arzon + aqlli).
2. **"Odam kerak" tugmasi:** agar mijoz murakkab savol bersa yoki "odam bilan gaplashaman" desa — bot Elbek'ga xabar bersin (yoki suhbatni "human kerak" deb belgilasin, dashboard'da ko'rinsin).
3. **Ish vaqti:** ish vaqtidan tashqarida bot "hozir band, ertaga javob beramiz" desin (sozlanadigan).
4. **Salomlashish:** yangi mijozga birinchi xabarda iliq salom + tanishtiruv.
5. **Rate limiting:** bir foydalanuvchi juda ko'p yozsa, spam'dan himoya.

**Test:** Har yaxshilanishni alohida sinab ko'r.
**Tugagach:** commit "Bosqich 5: yaxshilanishlar".

---

## BOSQICH 6 — TAYYORGARLIK (kelajak uchun)

**Maqsad:** Kelajakda SaaS qilish uchun asos (hozir faqat asos, to'liq emas).

**Vazifalar:**
1. Kodni yaxshilab hujjatlashtir (har fayl boshida izoh).
2. Xatolarni log fayliga yozish (keyin muammolarni topish oson bo'lsin).
3. Database'ni zaxiralash (backup) bo'yicha izoh yoz.
4. `DEPLOYMENT.md` yarat — loyihani qanday deploy qilish, sozlash (o'zbekcha qo'llanma).

**Tugagach:** commit "Bosqich 6: hujjatlash va tayyorgarlik".

---

## HAR BOSQICHDAN KEYIN

1. GitHub'ga commit + push.
2. Railway deploy bo'lganini tekshir (yoki bo'sh commit bilan majburla).
3. Regressiya testi: DM va komment hali ishlashini tasdiqla.
4. Qisqa o'zbekcha xulosa yoz: "Bosqich X tugadi, nima qilindi".
5. Keyingi bosqichga o't.

## AGAR MUAMMO BO'LSA

- **Token kerak** → to'xta, Elbek'ga ayt.
- **Meta sozlama kerak** → to'xta, Elbek'ga ayt.
- **Railway env o'zgaruvchi kerak** → to'xta, Elbek'ga ayt.
- **Kod xatosi** → o'zing tuzat, davom et.
- **Ishonchsiz katta qaror** → to'xta, so'ra.

## TUGAGACH

Barcha bosqichlar tugagach, "BARCHA BOSQICHLAR TUGADI" deb yoz va qisqa hisobot ber: nima qilindi, bot endi nima qila oladi, keyingi qadamlar nima.

---

**Eslatma:** Shoshilma. Sifat muhim. Har bosqichni to'liq, ishlaydigan holatga keltir, keyin keyingisiga o't. Elbek dam olyapti — sen ishlaysan. Muhim qaror bo'lsagina to'xta.
