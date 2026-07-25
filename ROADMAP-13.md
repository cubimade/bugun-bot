# BUGUN BOT — 13-BOSQICH: TO'LIQ AUDIT, SINOV VA MUSTAHKAMLASH

> **Claude Code uchun ko'rsatma:** Bu faylni to'liq o'qi. Bu — YANGI funksiya qo'shish EMAS. Bu — mavjud 60+ funksiyani chuqur tekshirish, sinash, buzuq joylarni tuzatish va mustahkamlash rejasi. Har qismni KETMA-KET bajar. Har tuzatishдан keyin commit + push qil. Regressiya: bot (DM, komment, bilim bazasi) har qismdan keyin ishlashi SHART. Mendan so'rama — faqat env/token kerak bo'lsa to'xtab ayt. Tugagach "13-BOSQICH TUGADI" deb to'liq audit hisoboti yoz.

## MAQSAD

Platforma tez o'sdi (v12.1.0, 100+ fayl, 60+ funksiya). Endi har bir funksiya HAQIQATAN ishlashini tekshirish va buzuq joylarni tuzatish vaqti. "Ishlaydi deb o'ylangan" va "haqiqatan ishlaydigan" o'rtasidagi farqni yo'qotish.

**MUHIM tamoyil:** Agar biror funksiya buzuq bo'lsa — tuzat. Tuzatib bo'lmasa yoki xavfli bo'lsa — menga (Elbek'ga) aniq ayt. Har bir funksiya haqida halol hisobot ber (ishlaydi/buzuq/qisman).

---

## QISM A — HAR BIR SAHIFANI TEKSHIRISH

Har dashboard sahifasini och (lokal server yoki kod tahlili orqali) va tekshir. Har biri uchun: ochiladimi, xato bermaydimi, ma'lumot to'g'ri ko'rsatiladimi, tugmalar ishlaydimi.

Tekshiriladigan sahifalar:
1. **Boshqaruv** (/dashboard) — statistika, AI xulosa, grafik, oxirgi suhbatlar
2. **Suhbatlar** (/dashboard/inbox) — ro'yxat, chat ko'rinishi, qo'lda javob, teglar, pauza
3. **Kontaktlar** (/dashboard/contacts) — jadval, qidiruv, teglar, filtr, sahifalash
4. **Voronka** (/dashboard/pipeline) — kanban, sudrab ko'chirish, bosqichlar
5. **Oqimlar** (/dashboard/flows) — ro'yxat, vizual muharrir, node qo'shish, ulash
6. **Broadcast** (/dashboard/broadcast) — forma, auditoriya, rejalashtirish
7. **Bilim bazasi** (/dashboard/knowledge) — tahrirlash, saqlash, sifat baholovchi
8. **Kalit so'zlar** (/dashboard/keywords) — qoida qo'shish, tahrirlash
9. **Media** (/dashboard/media) — yuklash, ko'rish, o'chirish
10. **Bronlar** (/dashboard/bookings) — kalendar/ro'yxat, holat
11. **Tahlil** (/dashboard/insights) — metrikalar, diagrammalar, AI tavsiyalar, prognoz
12. **A/B testlar** (/dashboard/ab-tests) — test yaratish, natijalar
13. **Sozlamalar** (/dashboard/settings) — barcha bo'limlar, saqlash
14. **Akkauntlar** (/dashboard/accounts) — ro'yxat, qo'shish sehrgari, diagnostika

Har sahifa uchun natijani yoz: ✅ ishlaydi / ⚠️ qisman (nima ishlamaydi) / ❌ buzuq (xato nima).

**Tuzat:** ochilmaydigan yoki xato beradigan sahifalarni. Har tuzatishдан keyin qayta tekshir.

**Tugagach:** commit "Audit A: sahifalar tekshirildi va tuzatildi".

---

## QISM B — HAR BIR API ENDPOINTNI TEKSHIRISH

Barcha /api/* endpointlarni ro'yxatla va tekshir:
1. To'g'ri javob qaytaradimi (200, JSON)
2. Xato holatida chiroyli javob beradimi (500 emas, tushunarli xato)
3. Parol himoyasida (401 ishlaydi)
4. SQL injection'dan himoyalangan (parametrlangan so'rovlar)
5. Sekin emasmi (kesh kerakli joyda bormi)

Ayniqsa tekshir:
- /api/dashboard-data (birlashtirilgan — to'g'ri ishlaydimi)
- /api/summary, /api/insights (AI kesh ishlaydimi, har chaqiruvda AI chaqirmaydimi)
- /api/contacts (sahifalash, filtr)
- Barcha POST endpointlar (input validatsiya)

**Tuzat:** xato beradigan yoki sekin endpointlarni.

**Tugagach:** commit "Audit B: endpointlar tekshirildi".

---

## QISM C — BOT ZANJIRINI TO'LIQ TEKSHIRISH

Botning har bir javob berish yo'lini tekshir (simulyatsiya yoki kod tahlili):

1. **Oddiy DM** → AI javob (bilim bazasi bilan)
2. **Story reply** → maxsus javob
3. **Komment** → ommaviy javob + private DM
4. **Kalit so'z** (DM va komment) → avto-javob (AI'siz)
5. **Media xabar** (rasm/ovoz) → mos javob
6. **Flow trigger** → flow ishga tushadi, AI o'chadi
7. **Bot pauza** → javob bermaydi (operator rejimi)
8. **Avto-pauza** → operator yozgach 30 daqiqa jim
9. **Ish vaqti** → tashqarida "band" javobi
10. **Rate limit** → spam bloklanadi
11. **Follow-up** → jim mijozga eslatma (24-soat qoidasi)
12. **Avto-teglash** → so'zga qarab teg qo'yiladi

Har yo'l uchun: ishlaydimi, bir-biriga xalaqit bermaydimi (masalan flow + kalit so'z + follow-up).

**MUHIM:** ustuvorlik to'g'rimi? Tartib: pauza → kalit so'z → flow → AI. Buni tekshir.

**Tuzat:** buzuq yo'llarni.

**Tugagach:** commit "Audit C: bot zanjiri tekshirildi".

---

## QISM D — SCHEDULER'LARNI TEKSHIRISH

Bir nechta scheduler bor (setInterval). Ular bir-biriga xalaqit bermasligi va server yiqitmasligi kerak:
1. Broadcast scheduler (60s)
2. Backup scheduler (kunlik)
3. Follow-up scheduler (soatlik)
4. Flow scheduler (daqiqa)
5. Booking scheduler (soatlik)
6. Segments scheduler (12 soat)
7. Weekly report scheduler
8. Health scheduler (10 daqiqa)

Tekshir:
- Har biri xatoga chidamli (try/catch) — bittasi yiqilsa boshqasi ishlaydi
- Server ishga tushganda hammasi to'g'ri boshlanadi
- Og'ir emas (database'ni haddan tashqari yuklamaydi)
- Bir vaqtda ishlaganda muammo yo'q

**Tuzat:** himoyasiz yoki og'ir scheduler'larni.

**Tugagach:** commit "Audit D: scheduler'lar tekshirildi".

---

## QISM E — MOBIL VA BROWSER TEKSHIRUVI

1. Har sahifa mobil o'lchamда (< 768px) to'g'ri ko'rinadimi
2. Sidebar drawer, jadvallar scroll, diagrammalar moslashadi
3. Modal va drawer'lar telefonда to'liq ekran
4. Tugmalar bosiladigan o'lchamда (kichik emas)
5. Matn o'qiladigan (juda kichik emas)
6. Light va Dark ikkalasида ishlaydi
7. perf-lite rejim sekin qurilmada aurora/glow o'chiradimi

**Tuzat:** mobil'da buzuq ko'rinishlarni.

**Tugagach:** commit "Audit E: mobil tekshiruvi".

---

## QISM F — XAVFSIZLIK VA MA'LUMOT

1. **Barcha /dashboard* va /api* parol himoyasida** (401 ishlaydi)
2. **Login/sessiya** ishlaydi (owner bilan kirish, logout, xato parol rad)
3. **Webhook imzo** — log-only rejim ishlaydi (bot qotmaydi)
4. **SQL injection** — hamma so'rov parametrlangan (grep bilan tekshir, string concat yo'q)
5. **XSS** — foydalanuvchi kiritgan matn HTML'da escape qilinadi (esc() ishlatilgan)
6. **Sirlar** — kodda hech qanday token/kalit yozilmagan (grep bilan tekshir)
7. **Zaxira** — kunlik backup ishlaydi (loglarда ko'rinadi)
8. **Rate limit** — /webhook va /api himoyalangan

**Tuzat:** topilgan zaifliklarni.

**Tugagach:** commit "Audit F: xavfsizlik tekshirildi".

---

## QISM G — TOZALASH VA OPTIMIZATSIYA

1. **Test ma'lumotlar:** database'da qolgan soxta test kontaktlar (test_user, kb_test, sonnet_fix, handoff va h.k.) — ularni va xabarlarini o'chir. DIQQAT: haqiqiy mijozlarni o'chirma! Ishonching komil bo'lmasa — ro'yxatni menga ko'rsat.
2. **Ishlatilmagan kod:** eski, ishlatilmaydigan fayllar/funksiyalar bo'lsa — tozala (ehtiyotkorlik bilan).
3. **Console.log:** ortiqcha debug loglar bo'lsa kamaytir (muhimlarини qoldir).
4. **Database indekslar:** sekin so'rovlar uchun indeks bormi tekshir.
5. **Fayl hajmi:** biror fayl juda katta (500+ qator) bo'lsa — bo'l.

**Tugagach:** commit "Audit G: tozalash va optimizatsiya".

---

## QISM H — HUJJATLAR VA YAKUNIY HISOBOT

1. **README.md** yangilansin — barcha imkoniyatlar ro'yxati, texnologiyalar, holat.
2. **USER-GUIDE.md** — har sahifa nima qiladi, qanday ishlatish (o'zbekcha, oddiy til).
3. **STATUS.md** (yangi) — audit natijasi: har funksiya holati jadvali (ishlaydi/qisman/buzuq).
4. **Yakuniy hisobot** — quyidagilar bilan:
   - Nechta sahifa/funksiya tekshirildi
   - Nechta buzuq topildi va tuzatildi
   - Qaysilari hali qisman/muammoli (Elbek e'tibori kerak)
   - Tezlik ko'rsatkichlari
   - Xavfsizlik holati
   - Keyingi tavsiyalar (eng muhim 3-5 ta)

**Tugagach:** commit "Audit H: hujjatlar va hisobot" va "13-BOSQICH TUGADI".

---

## TEXNIK QOIDALAR

1. Bu bosqichда YANGI funksiya qo'shilmaydi — faqat tekshirish va tuzatish.
2. Har tuzatishдан keyin: node --check → server test → commit → push.
3. Buzuq narsani tuzat; tuzatib bo'lmasa yoki xavfli bo'lsa — Elbek'ga ayt.
4. Mavjud ishlaydigan funksiyani buzish TAQIQLANADI.
5. Har qism uchun HALOL hisobot — "ishlaydi" deb o'tkazib yuborma, haqiqatan tekshir.
6. Test ma'lumot o'chirishда juda ehtiyot bo'l — haqiqiy mijoz o'chmasin.

## TUGAGACH

"13-BOSQICH TUGADI" + to'liq audit hisoboti (yuqoridagi QISM H formatida). Bu hisobot menга platformaning HAQIQIY holatini ko'rsatishi kerak — nima ishlaydi, nima yo'q, nimaga e'tibor kerak.

---

**Eslatma:** Bu eng muhim bosqichlardан biri. Yangi funksiya jozibali, lekin ishlaydigan, ishonchli platforma muhimroq. Halol audit — kelajakda ko'p muammodan saqlaydi. Shoshilmай, chuqur tekshir.
