# BUGUN BOT — 12-BOSQICH: JAMOA, INTEGRATSIYA VA KENGAYISH

> **Claude Code uchun:** Bu faylni to'liq o'qi. **ROADMAP-11 dan KEYIN bajariladi.** Vazifalarni KETMA-KET bajar, commit + push + deploy tekshir. Regressiya SHART. Mendan so'rama — faqat env/token kerak bo'lsa ayt. Tugagach "12-BOSQICH TUGADI" deb yoz.

## MAQSAD
Platformani bir kishilik vositadan **jamoa mahsulotiga** aylantirish + tashqi tizimlar bilan bog'lash + kelajakda sotish imkoniyati.

---

## VAZIFA 1 — FOYDALANUVCHILAR VA ROLLAR

Hozir bitta parol bor. Jamoa uchun to'liq tizim kerak.

1. **Database:**
   - `users` — `id, email, password_hash, name, role (owner/admin/operator), is_active, created_at, last_login`
   - `user_projects` — qaysi foydalanuvchi qaysi akkauntlarni ko'radi (operator uchun cheklov)
2. **Autentifikatsiya:** Basic Auth o'rniga oddiy sessiya (cookie + `sessions` jadvali yoki imzolangan cookie). Parol `bcrypt` bilan hash.
3. **Kirish sahifasi:** chiroyli login formasi (dizayn tizimida), "Meni eslab qol".
4. **Rollar:**
   - **Owner** — hamma narsa + foydalanuvchi qo'shish/o'chirish + billing
   - **Admin** — hamma narsa, foydalanuvchilardan tashqari
   - **Operator** — faqat Inbox va Kontaktlar (o'ziga biriktirilgan akkauntlar)
5. **Sozlamalar:** foydalanuvchilar boshqaruvi (taklif qilish — email + vaqtinchalik parol).
6. **Migratsiya:** mavjud DASHBOARD_PASSWORD bilan birinchi owner avtomatik yaratilsin (buzilmasin).

**Tugagach:** commit "12.1: foydalanuvchilar va rollar".

---

## VAZIFA 2 — SUHBATNI BIRIKTIRISH VA ICHKI IZOHLAR

1. **Biriktirish:** `contacts` ga `assigned_user_id`. Inbox'da "Biriktirish" tugmasi — operator tanlanadi.
2. **Filtr:** "Menga biriktirilgan" / "Biriktirilmagan" / hamma.
3. **Ichki izohlar:** `internal_notes` jadvali — `contact_id, user_id, text, created_at`. Inbox'da chat yonida "Izohlar" bo'limi — faqat jamoa ko'radi, mijoz ko'rmaydi. Sariq fon bilan ajralib tursin.
4. **Bildirishnoma:** suhbat biriktirilganda operatorga xabar (dashboard'da qo'ng'iroq belgisi).

**Tugagach:** commit "12.2: biriktirish va izohlar".

---

## VAZIFA 3 — TELEGRAM BILDIRISHNOMALAR (admin uchun)

1. **Sozlamalar:** admin Telegram chat ID kiritadi (yoki bot orqali `/start` bilan bog'lanadi).
2. **Bildirishnoma turlari** (har biri alohida yoqiladi):
   - 🙋 "Odam kerak" suhbat paydo bo'ldi
   - 😟 Salbiy kayfiyatli xabar
   - 📅 Yangi bron
   - 💰 To'lov qilindi
   - ⚠️ Bot ishlamay qoldi / token muddati tugadi
   - 📊 Kunlik/haftalik hisobot
3. Yuborish `services/telegram.js` orqali (ROADMAP-9 da yaratilgan).

**Tugagach:** commit "12.3: Telegram bildirishnomalar".

---

## VAZIFA 4 — INTEGRATSIYALAR (webhook chiqish, n8n, Sheets)

1. **Chiquvchi webhook:** `webhooks` jadvali — `project_id, url, events (jsonb), is_active, secret`. Hodisa bo'lganda (yangi kontakt, sotuv, bron) POST yuboriladi (HMAC imzo bilan).
2. **Sozlamalar:** webhook qo'shish, hodisalarni tanlash, test yuborish tugmasi.
3. **Google Sheets:** kontaktlarni jadvalga eksport (oddiy: CSV havolasi yoki Sheets API — agar kalit bo'lsa).
4. **n8n/Zapier:** chiquvchi webhook orqali ishlaydi — hujjatda misol yo'riqnoma bilan tushuntir.
5. **Kiruvchi API:** `/api/v1/contacts` (GET/POST) — API kalit bilan (`api_keys` jadvali). Tashqi tizimlar kontakt qo'shishi/o'qishi uchun.

**Tugagach:** commit "12.4: integratsiyalar va API".

---

## VAZIFA 5 — XAVFSIZLIK VA SIFAT NAZORATI

1. **Spam filtri:** takroriy bir xil xabarlar, havola tashlovchilar, bot-o'xshash xatti-harakat → avtomatik `spam` tegi, bot javob bermaydi.
2. **So'kinish filtri:** qo'pol so'zlar ro'yxati (sozlamalarda tahrirlanadi) → bot javob bermaydi, operatorga uzatiladi ("e'tibor kerak" tegi).
3. **Duplikat kontakt:** bir xil telefon/email bo'lgan kontaktlarni aniqlash va birlashtirish taklifi.
4. **Ishlamay qolish nazorati:** har 10 daqiqada o'z-o'zini tekshirish (database, Instagram API). Muammo bo'lsa Telegram'ga xabar.
5. **Audit log:** `audit_log` jadvali — kim nima o'zgartirdi (bilim bazasi, sozlama, akkaunt o'chirish). Sozlamalarda ko'rish.

**Tugagach:** commit "12.5: xavfsizlik va nazorat".

---

## VAZIFA 6 — MIJOZ KABINETI (white-label asosi)

Kelajakda platformani boshqalarga sotish uchun asos.

1. **Kontseptsiya:** sening mijozing (masalan Dr. Dildora) o'z kabinetiga kiradi va faqat **o'z akkauntini** ko'radi.
2. Bu `user_projects` orqali allaqachon mumkin (12.1) — mijozga `operator` roli va faqat o'z akkauntini berish.
3. **Cheklangan ko'rinish:** mijoz uchun soddalashtirilgan dashboard — statistika, suhbatlar, bilim bazasi. Texnik narsalar (tokenlar, tizim) yashiringan.
4. **Brending:** sozlamalarda logo va nom o'zgartirish (har akkaunt uchun) — mijoz o'z brendini ko'radi.

**Tugagach:** commit "12.6: mijoz kabineti".

---

## VAZIFA 7 — YAKUNIY HUJJATLAR VA TOPSHIRISH

1. **README.md** — to'liq yangilansin: loyiha tavsifi, imkoniyatlar ro'yxati, texnologiyalar, o'rnatish.
2. **ARCHITECTURE.md** — kod tuzilishi, ma'lumot oqimi, database sxemasi (to'liq), scheduler'lar ro'yxati.
3. **USER-GUIDE.md** (yangi) — foydalanuvchi qo'llanmasi o'zbek tilida: har sahifa nima qiladi, qanday ishlatish, ko'p uchraydigan savollar.
4. **DEPLOYMENT.md** — env o'zgaruvchilar to'liq ro'yxati (izohlar bilan), yangi akkaunt ulash, zaxira tiklash.
5. **CHANGELOG.md** — versiyalar tarixi (v1 dan v12 gacha qisqacha).

**Tugagach:** commit "12.7: hujjatlar" va "12-BOSQICH TUGADI".

---

## YAKUNIY NAZORAT

1. Ko'p foydalanuvchi bilan test: owner, admin, operator — har biri to'g'ri narsani ko'radi
2. Eski parol bilan kirish hali ishlaydi (migratsiya buzmagan)
3. Barcha scheduler'lar barqaror
4. Regressiya to'liq
5. Yakuniy hisobot: platforma imkoniyatlari to'liq ro'yxati

---

## TEXNIK QOIDALAR
1. Parollar bcrypt bilan hash (ochiq saqlanmaydi)
2. Sessiya cookie: httpOnly, secure, sameSite
3. Rol tekshiruvi har endpoint'da (middleware)
4. Audit log — muhim o'zgarishlar yoziladi
5. Mavjud funksiyani buzish TAQIQLANADI — ayniqsa auth migratsiyasida ehtiyot bo'l
