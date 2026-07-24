# BUGUN BOT — 11-BOSQICH: CHUQUR ANALITIKA VA BIZNES AQL

> **Claude Code uchun:** Bu faylni to'liq o'qi. **ROADMAP-10 dan KEYIN bajariladi.** Vazifalarni KETMA-KET bajar, commit + push + deploy tekshir. Regressiya SHART. Mendan so'rama — faqat env/token kerak bo'lsa ayt. Tugagach "11-BOSQICH TUGADI" deb yoz.

## MAQSAD
Platformani "nima bo'ldi" dan "nima qilish kerak" darajasiga ko'tarish — biznes qarorlariga yordam beradigan aql.

---

## VAZIFA 1 — ROI VA MOLIYAVIY KO'RSATKICHLAR

1. **Sozlamalarda:** o'rtacha chek (bir mijozdan o'rtacha daromad), oylik xarajat (agar kiritmoqchi bo'lsa).
2. **Hisoblash:**
   - Bot orqali kelgan mijozlar soni
   - Sotilganlar (kanban "Sotildi" bosqichi yoki to'lov holati)
   - Umumiy daromad (to'lovlar yig'indisi yoki sotilgan × o'rtacha chek)
   - Konversiya: mijoz → sotuv
3. **Dashboard:** "Moliyaviy natija" kartasi — daromad, konversiya, o'rtacha chek, davr bo'yicha o'zgarish.
4. **Grafik:** oylar bo'yicha daromad dinamikasi.

**Tugagach:** commit "11.1: ROI va moliya".

---

## VAZIFA 2 — LTV VA MIJOZ SEGMENTATSIYASI

1. **LTV (mijoz qiymati):** bir mijoz o'rtacha qancha daromad keltirgan (takroriy sotuvlar bilan).
2. **Segmentlar (avtomatik):**
   - 🌟 **VIP** — ko'p sotib olgan / katta summa
   - 🔥 **Faol** — oxirgi 7 kunda yozgan
   - 😴 **Uxlagan** — 30+ kun jim
   - ❄️ **Sovuq** — yozgan, lekin qiziqmagan
3. `contacts` ga `segment` ustuni, kunlik yangilanadi (scheduler).
4. **Kontaktlar sahifasi:** segment bo'yicha filtr, segment badge'lari.
5. **Broadcast:** segment bo'yicha yuborish (masalan faqat "Uxlagan"larga qaytarish kampaniyasi).

**Tugagach:** commit "11.2: LTV va segmentatsiya".

---

## VAZIFA 3 — YO'QOTILGAN MIJOZLAR TAHLILI

1. Voronkada qayerda ko'p mijoz yo'qolayotganini aniqla (bosqichlar orasidagi tushish).
2. **AI tahlil:** Claude yo'qotilgan mijozlar suhbatlarini o'qib xulosa beradi:
   - "10 mijoz narx eshitgach javob bermadi — narx yuqori yoki qiymat tushuntirilmagan"
   - "5 mijoz javobni kutmasdan ketdi — javob vaqti sekin"
3. **Tavsiyalar:** aniq harakat ("Narx aytishdan oldin qiymatni tushuntiring", "Follow-up yoqing").
4. Insights sahifasida alohida bo'lim.

**Tugagach:** commit "11.3: yo'qotish tahlili".

---

## VAZIFA 4 — PROGNOZ

1. Oxirgi 30-60 kun ma'lumotidan trend hisobla (oddiy chiziqli regressiya yoki o'rtacha o'sish).
2. **Prognoz:** "Shu tempda oyiga ~40 yangi mijoz, ~8 sotuv, ~12 mln so'm kutiladi".
3. Grafikda: haqiqiy (to'liq chiziq) + prognoz (uzuq chiziq).
4. Ogohlantirish: agar trend pasaysa — "O'tgan haftaga nisbatan 30% kam. Sabab: ..." (AI xulosa).

**Tugagach:** commit "11.4: prognoz".

---

## VAZIFA 5 — A/B TEST

1. **Database:** `ab_tests` — `id, project_id, name, variant_a (jsonb), variant_b (jsonb), split_percent, metric (reply_rate/conversion), status, started_at, ended_at`.
2. **Nima sinaladi:** salomlashish matni, bilim bazasi uslubi (rasmiy/do'stona), follow-up matni, tugmalar.
3. **Mantiq:** yangi kontaktlar tasodifiy A yoki B guruhga tushadi (`contacts.ab_variant`), o'sha variant ishlatiladi.
4. **Natija:** har variant bo'yicha javob berish foizi, konversiya, statistik ishonchlilik (oddiy: qaysi biri yaxshi + farq sezilarlimi).
5. **Sahifa:** `/dashboard/ab-tests` — test yaratish, kuzatish, g'olibni tanlash ("Bu variantni doimiy qil").

**Tugagach:** commit "11.5: A/B test".

---

## VAZIFA 6 — KONTENT TAVSIYALARI

1. Mijozlar savollaridan eng ko'p takrorlanadigan mavzularni aniqla (AI klasterlash).
2. **Tavsiya:** "12 kishi 'narx' so'radi — narxlar haqida post/story qiling", "8 kishi 'qancha vaqt oladi' — jarayon haqida reels".
3. **Post g'oyalari:** Claude 5 ta aniq kontent g'oyasi beradi (sarlavha + qisqa tavsif).
4. **Eng yaxshi post vaqti:** heatmap ma'lumotidan — "Auditoriyangiz 19:00-21:00 da faol".
5. Insights sahifasida "Kontent tavsiyalari" bo'limi.

**Tugagach:** commit "11.6: kontent tavsiyalari".

---

## VAZIFA 7 — SOLISHTIRISH VA HISOBOTLAR

1. **Solishtirish:** akkauntlarni yonma-yon (mijozlar, konversiya, daromad), davrlarni (bu oy vs o'tgan oy).
2. **Haftalik hisobot:** dashboard'da "Bu hafta" kartasi — asosiy raqamlar + AI xulosa + tavsiyalar.
3. **Eksport:** hisobotni PDF yoki chiroyli HTML sifatida yuklab olish (chop etsa bo'ladigan).
4. **Telegram'ga yuborish** (agar Telegram bot ulangan bo'lsa): haftalik hisobotni avtomatik yuborish (sozlamada yoqiladi).

**Tugagach:** commit "11.7: solishtirish va hisobotlar".

---

## YAKUNIY NAZORAT

1. Barcha hisoblar to'g'ri (test ma'lumot bilan tekshir)
2. Og'ir so'rovlar keshlangan, sahifa tez
3. AI chaqiruvlari tejamkor (Haiku + kunlik kesh)
4. Regressiya to'liq
5. Hisobot

**Tugagach:** commit "11.8: yakuniy nazorat" va "11-BOSQICH TUGADI".

---

## TEXNIK QOIDALAR
1. Moliyaviy hisoblar aniq bo'lsin (raqamlarni yaxlitlash to'g'ri)
2. Prognoz — taxmin ekanini foydalanuvchiga ayt ("taxminiy")
3. AI xulosalari kesh bilan (kuniga 1 marta)
4. Mavjud funksiyani buzish TAQIQLANADI
