# BUGUN BOT — 10-BOSQICH: SOTUV VA PUL TOPISH

> **Claude Code uchun:** Bu faylni to'liq o'qi. **ROADMAP-9 dan KEYIN bajariladi.** Vazifalarni KETMA-KET bajar, commit + push + deploy tekshir. Regressiya SHART. Mendan so'rama — faqat env/token kerak bo'lsa ayt. Tugagach "10-BOSQICH TUGADI" deb yoz.

## MAQSAD
Botni suhbatlashuvchidan **sotuvchiga** aylantirish: to'lov, bron, kalkulyator, chegirma, referral.

---

## VAZIFA 1 — BRON / NAVBAT TIZIMI

Klinika, salon, konsultatsiya beruvchilar uchun eng kerakli funksiya.

1. **Database:**
   - `booking_settings` — `project_id, is_active, work_days (jsonb), work_start, work_end, slot_duration_min, break_between_min, max_days_ahead`
   - `bookings` — `id, project_id, contact_id, service_name, starts_at, duration_min, status (pending/confirmed/cancelled/done), note, created_at`

2. **Sozlamalar sahifasi:** ish kunlari, soatlari, seans davomiyligi, tanaffus, necha kun oldindan bron qilish mumkin.

3. **Bot mantiqi:** mijoz "band qilmoqchiman", "qachon kelay" desa:
   - Bo'sh vaqtlarni hisoblab, eng yaqin 5-6 tasini tugma qilib yuboradi
   - Mijoz tanlaydi → tasdiqlash → bron yaratiladi
   - Tasdiq xabari: sana, vaqt, manzil (bilim bazasidan)
   - Eslatma: 1 kun oldin avtomatik xabar

4. **Dashboard:** `/dashboard/bookings` (sidebar: 📅 Bronlar) — kalendar yoki ro'yxat ko'rinishi, holat o'zgartirish, qo'lda bron qo'shish.

5. **Bekor qilish:** mijoz "bekor qilaman" desa — bron bekor qilinadi, vaqt bo'shaydi.

**Tugagach:** commit "10.1: bron tizimi".

---

## VAZIFA 2 — NARX KALKULYATORI

1. **Sozlamalar:** kalkulyator qoidalari — savollar va ularning narxga ta'siri.
   Misol: "Nechta post?" (10 → 1mln, 20 → 1.8mln), "Muddat?" (1 oy → x1, 3 oy → x0.9)
2. **Database:** `price_rules` — `project_id, question, options (jsonb: [{label, value, price_effect}])`
3. **Bot mantiqi:** mijoz "narx qancha" desa va kalkulyator yoqilgan bo'lsa — savollarni ketma-ket beradi (tugmalar bilan), oxirida taxminiy narxni aytadi + "Aniq narx uchun bog'laning".
4. Natija kontakt izohiga yoziladi (operator ko'radi).

**Tugagach:** commit "10.2: narx kalkulyatori".

---

## VAZIFA 3 — TO'LOV HAVOLASI

1. **Sozlamalar:** to'lov usullari — Click/Payme/Uzum havolalari (statik havola yoki summa bilan dinamik).
2. **Bot:** mijoz to'lashga tayyor bo'lsa (yoki operator "to'lov" tugmasini bossa) — havola yuboriladi.
3. **Database:** `payments` — `id, project_id, contact_id, amount, method, status (pending/paid/failed), link, created_at, paid_at`.
4. **Dashboard:** to'lovlar ro'yxati, holatni qo'lda "to'landi" qilish (avtomatik tekshiruv keyingi bosqichda — provayder API kerak).
5. **Kanban bilan bog'la:** to'lov "to'landi" bo'lsa → kontakt "Sotildi" bosqichiga o'tadi.

**MUHIM:** Hech qanday to'lov ma'lumoti (karta raqami) platformada saqlanmaydi — faqat havola.

**Tugagach:** commit "10.3: to'lov havolasi".

---

## VAZIFA 4 — CHEGIRMA KODLARI

1. **Database:** `promo_codes` — `id, project_id, code, discount_percent, discount_amount, max_uses, used_count, valid_until, is_active`.
2. **Dashboard:** promo-kodlar boshqaruvi (yaratish, statistika: nechta ishlatilgan).
3. **Bot:** mijoz kod yozsa — tekshiradi, amal qilsa tasdiqlaydi va kontaktga teg qo'yadi.
4. Flow'da: "chegirma kodi ber" amali (avtomatik yaratib yuborish).

**Tugagach:** commit "10.4: chegirma kodlari".

---

## VAZIFA 5 — REFERRAL TIZIMI

1. **Database:** `contacts` ga `referred_by` (kontakt id), `referral_code` (unikal).
2. Har kontaktga unikal kod/havola: `ig.me/m/username?ref=ABC123` yoki Telegram uchun `t.me/bot?start=ABC123`.
3. Bot: "Do'stingizni taklif qiling" — havolani yuboradi.
4. Yangi mijoz shu havoladan kelsa — `referred_by` yoziladi.
5. **Dashboard:** referral statistikasi — kim nechta olib kelgan, top 10.
6. Bonus: taklif qilgan kishiga avtomatik promo-kod (sozlamada yoqiladi).

**Tugagach:** commit "10.5: referral".

---

## VAZIFA 6 — MIJOZ PROFILI AVTOMATIK TO'LDIRISH

1. Bot suhbatdan ma'lumot yig'adi (Claude yordamida, har 5 xabarda bir marta):
   - Ism (agar aytgan bo'lsa)
   - Telefon/email (matn ichidan)
   - Ehtiyoj (nima kerak)
   - Byudjet (agar aytgan)
   - Shoshilinchlik
2. `contacts` ga qo'shimcha ustunlar yoki `profile` (jsonb).
3. Kontakt drawer'ida ko'rinadi: "AI profil" bo'limi.
4. Kanban kartasida byudjet/ehtiyoj qisqacha ko'rinsin.

**Tugagach:** commit "10.6: AI mijoz profili".

---

## YAKUNIY NAZORAT

1. Bron, to'lov, kalkulyator bir-biriga xalaqit bermaydi
2. Barcha yangi sahifalar dizayn tizimida
3. Regressiya to'liq
4. Hisobot: sotuv funksiyalari ro'yxati, qanday ishlatish bo'yicha qisqa qo'llanma

**Tugagach:** commit "10.7: yakuniy nazorat" va "10-BOSQICH TUGADI".

---

## TEXNIK QOIDALAR
1. To'lov ma'lumotlari saqlanmaydi (faqat havola va holat)
2. Bron vaqtlari timezone bilan to'g'ri ishlasin (Asia/Tashkent)
3. Database: ALTER TABLE IF NOT EXISTS
4. Mavjud funksiyani buzish TAQIQLANADI
