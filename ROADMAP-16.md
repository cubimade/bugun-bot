# ROADMAP-16: Buglar, kontakt ma'lumotlari, avtomatlashtirish va aql

> **Claude Code uchun.** Loyiha ildizida. Bosqichlar **tartib bilan** bajarilsin.
> Har FAZA oxirida alohida commit. Yakunda bitta push.
> FAZA 1 va 2 eng muhim — ular tugamaguncha keyingisiga o'tma.

---

## KONTEKST

Foydalanuvchi ChatPlace bilan solishtirmoqda va quyidagi kamchiliklarni aytdi:

1. Bittadan ortiq kalit so'z qo'shib bo'lmayapti (BUG)
2. Kursor olib borilganda ko'k rangli narsa chiqadi — keraksiz (BUG)
3. Kontaktlar raqam bilan ko'rsatilyapti, username kerak
4. Suhbatlarda kim yozgani va qaysi akkaunt ekani ko'rinmayapti
5. Bilim bazasi deyarli bir xil javob qaytaryapti
6. Kalit so'zga rasm biriktirish yo'q
7. Tahlil zaif — akkaunt tahlili va tavsiyalar kerak
8. Flow muharriri, voronka, broadcast kuchaytirilishi kerak

---

# FAZA 1 — BUGLAR

## 1.1. Kalit so'z: bittadan ortiq qo'shilmayapti

**Muammo:** foydalanuvchi 2-chi qoidani qo'shmoqchi bo'lganda ishlamayapti (skrinshotda 1 ta qoida bor: `narx, narxr`).

**Bajarish:**

1. Avval sababni aniqla — taxmin qilma. Tekshir:
   - `keywords` jadvalida `UNIQUE` cheklov bormi? (masalan `UNIQUE(keyword)` yoki `UNIQUE(project_id)`) — agar bo'lsa, ikkinchi qoida `duplicate key` xatosi bilan yiqiladi
   - `POST /api/keywords` endpoint'i qanday javob qaytaryapti
   - Frontend'da forma yuborilgandan keyin xato ko'rsatiladimi yoki jimgina yutiladimi
2. Topilgan sababni tuzat.
3. **Xato ko'rinadigan bo'lsin:** endpoint 4xx/5xx qaytarsa, forma tepasida qizil matn chiqsin (hozir jimgina yo'qoladi — foydalanuvchi nima bo'lganini bilmaydi).
4. Muvaffaqiyatli qo'shilganda forma tozalansin va ro'yxat yangilansin (sahifa qayta yuklanmasdan).

**Tekshiruv:** ketma-ket 3 ta boshqa-boshqa kalit so'z qoidasi qo'shib ko'r — uchalasi ham ro'yxatda turishi kerak.

## 1.2. Ko'k rangli artefakt

**Muammo:** foydalanuvchi "dash kursorni olib borganda ko'k rangda chiqadigan narsa kerakmas" dedi.

Bu ehtimol quyidagilardan biri:
- `:focus` holatidagi standart brauzer outline (ko'k ramka) — skrinshotda forma maydonlarida ko'rinadi
- matn tanlanganda chiqadigan ko'k fon (`::selection`)
- `title` atributidan kelib chiqadigan brauzer tooltip'i

**Bajarish:**

1. Butun dashboard CSS'ida standart focus ramkasini loyiha uslubiga moslashtir:
   ```css
   :focus { outline: none; }
   :focus-visible {
     outline: 2px solid var(--accent);
     outline-offset: 2px;
     border-radius: 8px;
   }
   ```
   `:focus-visible` ishlatilsin — klaviatura bilan yuruvchilar uchun ko'rinish saqlanadi, sichqoncha bilan bosganda chiqmaydi.
2. `::selection` rangi loyiha binafsha rangining och variantiga o'zgartirilsin.
3. Interaktiv elementlardagi `title="..."` atributlari o'chirilsin — ular xunuk sariq/kulrang brauzer tooltip'ini chiqaradi. Agar izoh kerak bo'lsa, loyihaning o'z tooltip komponenti ishlatilsin.
4. Faqat tugma va input'lardagi hover holatida yengil `background` o'zgarishi qolsin, ko'k ramka emas.

---

# FAZA 2 — KONTAKT VA SUHBAT MA'LUMOTLARI

Hozir kontaktlar `1986529728680131` ko'rinishida. Bu Instagram-scoped ID — foydalanuvchi uchun ma'nosiz.

## 2.1. Username va profil rasmini olish

Instagram Messaging API'da mijoz haqida ma'lumot olish mumkin:

```
GET https://graph.instagram.com/v23.0/{IGSID}?fields=name,username,profile_pic&access_token={TOKEN}
```

**Muhim cheklovlar:**
- Bu faqat sizga **yozgan** mijozlar uchun ishlaydi (24 soatlik oyna emas — yozgan bo'lsa bo'lgani)
- `profile_pic` URL'i vaqtinchalik, muddati tugaydi — bazaga rasmni emas, URL'ni saqlab, muddati o'tganda qayta olish kerak
- Ba'zi foydalanuvchilar ma'lumot ulashishni o'chirib qo'ygan bo'lishi mumkin → xato qaytadi, bunda ID bilan qolaveradi

**Bajarish:**

1. Migratsiya — `contacts` jadvaliga:
   ```sql
   ALTER TABLE contacts ADD COLUMN IF NOT EXISTS username TEXT;
   ALTER TABLE contacts ADD COLUMN IF NOT EXISTS full_name TEXT;
   ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_pic TEXT;
   ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_fetched_at TIMESTAMPTZ;
   ```
2. Yangi funksiya `services/ig-profile.js`:
   - `fetchContactProfile(igsid, token)` — yuqoridagi so'rovni yuboradi
   - xato bo'lsa `null` qaytaradi va WARN loglaydi, hech qachon yiqilmaydi
3. **Qachon chaqiriladi:**
   - yangi kontakt yaratilganda (webhook'da birinchi xabar kelganda)
   - mavjud kontaktda `profile_fetched_at` 7 kundan eski bo'lsa
   - webhook javobini kechiktirmasin — javob qaytarilgandan **keyin** fon rejimida chaqirilsin
4. **Bir martalik to'ldirish:** mavjud 79 ta kontakt uchun admin endpoint `POST /api/contacts/refresh-profiles` — hammasini aylanib chiqadi, so'rovlar orasida 200ms tanaffus (rate limit: soatiga 200 so'rov).
5. **Ko'rsatish (barcha joyda):**
   - Bor bo'lsa: profil rasmi + `@username` + ismi
   - Yo'q bo'lsa: hozirgi ID (lekin qisqartirilgan: `...680131`)
   - Kontaktlar, Suhbatlar, Voronka, Broadcast — hammasida bir xil komponent ishlatilsin

## 2.2. Suhbatda kim yozgani ko'rinsin

Hozir chat oynasida faqat matn bor. Kerak:

- **Yuqorida:** mijoz profil rasmi + `@username` + ismi, ostida qaysi akkauntga yozgani (`Elbek Eshmurodov Instagram`) va kanal belgisi (Instagram/Telegram)
- **Har xabar ustida:** kim yozgani — mijoz ismi, yoki `🤖 Bot (AI)`, yoki `👤 Operator: <ism>`, yoki `⚡ Avtomatlashtirish: <qoida nomi>`
- Buning uchun `messages` jadvalida manba ustuni bo'lishi kerak:
  ```sql
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_type TEXT;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_label TEXT;
  ```
  Qiymatlar: `contact`, `ai`, `operator`, `automation`, `broadcast`
- Eski xabarlarda bo'sh bo'ladi — ularni `direction` ustuniga qarab taxminan to'ldir (`in` → `contact`, `out` → `ai`)

---

# FAZA 3 — AVTOMATLASHTIRISHNI KUCHAYTIRISH

## 3.1. Kalit so'zlar sahifasi

Hozirgi holat juda oddiy. Quyidagilar qo'shilsin:

**a) Ko'p kalit so'z, tartibli kiritish**
- Matn maydoniga vergul bilan yozilganda, ular **chip/teg** ko'rinishida ajralib ko'rsatilsin (Enter yoki vergul bosilganda chip bo'lib qo'shiladi, ✕ bilan o'chiriladi)
- Har chip alohida saqlansin, bittasi o'chirilsa qolganlari qolsin

**b) Moslik turlari** (hozir faqat "ichida bo'lsa")
- `Aniq mos` — xabar aynan shu so'z
- `Ichida bo'lsa` — hozirgi
- `Boshlansa` — xabar shu so'z bilan boshlansa
- `Regex` — ilg'or foydalanuvchilar uchun (xato regex saqlanmasin, tekshirilsin)

**c) Rasm/media biriktirish**
- Javobga rasm qo'shish — Media kutubxonasidan tanlash yoki URL
- Bir nechta rasm (karusel) — Instagram bitta xabarda 1 ta media qabul qiladi, shuning uchun ketma-ket yuborilsin
- Oldindan ko'rish: javob qanday ko'rinishini ko'rsatuvchi kichik telefon maketi

**d) Tugmalar**
- Javobga 3 tagacha tugma qo'shish (Instagram cheklovi)
- Har tugma: matn + amal (havola / boshqa qoidaga o'tish / teg qo'yish / operatorga uzatish)

**e) Boshqa sozlamalar**
- **Kechikish:** javob 0–60 soniyadan keyin yuborilsin (jonli ko'rinadi)
- **Faqat bir marta:** bitta mijozga bu qoida faqat 1 marta ishlasin
- **Vaqt oynasi:** faqat ish vaqtida ishlasin
- **Ustuvorlik:** bir nechta qoida mos kelsa, qaysi biri ustun (raqam bilan tartiblash, drag-and-drop bilan)
- **Statistika:** har qoida yonida "necha marta ishladi" (hozir bor) + "necha kishi javob berdi"

**f) Test qilish**
- "Sinab ko'rish" maydoni: matn yozasiz → qaysi qoida ishga tushishi va qanday javob ketishi ko'rsatiladi (haqiqiy xabar yuborilmaydi)

## 3.2. Flow muharriri (Oqimlar)

Mavjud SVG drag-and-drop asos yaxshi. Qo'shilsin:

- **Yangi node turlari:**
  - `Rasm/Media` — media yuborish
  - `Kutish` (bor, lekin kengaytirilsin: daqiqa/soat/kun)
  - `Ma'lumot so'rash` — mijozdan telefon/ism/email so'raydi va javobni o'zgaruvchiga saqlaydi (validatsiya bilan: telefon formati tekshiriladi)
  - `Shart` (bor) — kengaytirilsin: tegga qarab, o'zgaruvchiga qarab, vaqtga qarab
  - `AI javob` — shu nuqtada Claude'ga javob yozdirish (bilim bazasi bilan)
  - `Operatorga uzatish` — botni pauza qilib, operatorni chaqiradi
- **Node ichida oldindan ko'rish:** matn qanday ko'rinishi (hozir shunchaki matn maydoni)
- **Validatsiya:** saqlashdan oldin tekshir — ulanmagan node bor mi, sikl (aylanma) bormi, bo'sh matn bormi. Xatolar ro'yxat qilib ko'rsatilsin
- **Statistika oqim ustida:** har node yonida necha kishi shu yerdan o'tgani (kichik raqam)
- **Nusxalash:** oqimni klonlash tugmasi

---

# FAZA 4 — BILIM BAZASI VA AI SIFATI

**Muammo:** "deyarli bir xil javob beryapti savollarga".

## 4.1. Avval diagnostika (kod yozishdan oldin)

Quyidagilarni tekshir va natijani hisobotda yoz:

1. **Javob keshi bormi?** Loyihada AI javoblari keshlanadigan joy bor (`/api/summary` uchun qilingan edi). Agar bot javoblari ham keshlanayotgan bo'lsa — sabab shu. Bot javoblari **hech qachon keshlanmasligi kerak**.
2. **Temperature qancha?** Agar 0 yoki juda past bo'lsa, javoblar bir xil chiqadi. Bot javoblari uchun 0.7 atrofida bo'lsin.
3. **Suhbat tarixi yuborilyaptimi?** Agar har safar faqat oxirgi xabar yuborilsa, bot kontekstni unutadi va shablon javob beradi. Oxirgi 10-15 xabar yuborilishi kerak.
4. **Bilim bazasi qanday uzatilyapti?** Agar butun baza har safar system prompt'ga tiqilsa — model eng ko'p uchraydigan matnga tortiladi. 

## 4.2. Tuzatishlar

**a) Prompt caching qo'sh** (bu allaqachon rejada bor edi)

Bilim bazasi har javobda qayta yuborilyapti. Anthropic API'da `cache_control` bilan uni keshlab, xarajatni ~90% kamaytirish mumkin:

```js
system: [
  {
    type: 'text',
    text: BOT_INSTRUCTIONS   // o'zgarmas qism
  },
  {
    type: 'text',
    text: knowledgeBaseText,
    cache_control: { type: 'ephemeral' }   // keshlanadi
  }
]
```

Kesh 5 daqiqa yashaydi va har foydalanishda yangilanadi. Bilim bazasi o'zgarganda kesh o'zi yangilanadi (matn o'zgargani uchun).

**b) Tegishli bilimni tanlash (oddiy RAG)**

Butun bazani yuborish o'rniga, savolga eng mos 5-8 ta yozuvni tanla:
- Har bilim yozuvi uchun kalit so'zlar ro'yxati (allaqachon avto-teglash bor)
- Mijoz savolidagi so'zlar bilan solishtir, ball ber, eng yuqori 8 tasini yubor
- Agar hech biri mos kelmasa — umumiy 5 tasini yubor
- Bu ham tezlikni, ham javob aniqligini oshiradi

**c) Bilim bazasi sahifasi kuchaytirilsin**
- **Bo'sh joylar tahlili:** mijozlar so'ragan, lekin bazada javobi yo'q savollar ro'yxati (bot "bilmayman" degan yoki past ishonch bilan javob bergan holatlar) → "Bu savolga javob qo'shish" tugmasi
- **Guruhlash:** kategoriyalar (narx, xizmatlar, joylashuv, ish vaqti, kafolat...)
- **Sifat ko'rsatkichi:** hozirgi scorer kengaytirilsin — juda qisqa, juda uzun, takrorlanuvchi yozuvlarni belgilasin
- **Import:** matn yoki CSV'dan ommaviy qo'shish
- **Sinov maydoni:** savol yozasiz → bot qanday javob berishi va qaysi bilim yozuvlaridan foydalangani ko'rsatiladi

**d) Javob xilma-xilligi**
- Bir xil savol qayta kelganda, oldingi javob matnini prompt'ga qo'shib "boshqacha ifodalab ber" deb ko'rsat
- Salomlashish, minnatdorchilik kabi shablon javoblar uchun 3-4 variantdan tasodifiy tanlansin

---

# FAZA 5 — TAHLIL VA TAVSIYALAR

Foydalanuvchi so'radi: "akkaunt analizi — nima kamchilik, qaysi tomonlama yaxshi ketyapti, tavsiyalar".

## 5.1. Yangi bo'lim: "Akkaunt sog'lig'i"

Tahlil sahifasining yuqorisiga karta qo'shilsin — 0-100 ball va 5 ta o'lchov:

| O'lchov | Qanday hisoblanadi | Yaxshi ko'rsatkich |
|---|---|---|
| Javob tezligi | birinchi javobgacha o'rtacha vaqt | < 1 daqiqa |
| Javob qamrovi | javob berilgan / jami suhbat | > 90% |
| Konversiya | sotilgan / jami kontakt | biznesga qarab |
| Bilim qamrovi | AI ishonch bilan javob bergan savollar ulushi | > 80% |
| Faollik | oxirgi 7 kunda yangi kontaktlar tendensiyasi | o'sish |

Har o'lchov yonida: joriy qiymat, o'tgan hafta bilan solishtirish (↑↓), va rang (yashil/sariq/qizil).

## 5.2. AI tavsiyalari

Kuniga 1 marta (yoki "Yangilash" tugmasi bosilganda) Claude'ga statistikani yuborib, 3-5 ta aniq tavsiya olinadi. Har tavsiya:

- **Muammo:** nima yaxshi ketmayapti (raqam bilan)
- **Sabab:** ehtimoliy sabab
- **Yechim:** aniq amal (masalan "17 ta suhbat operatorni kutmoqda — 'narx' savoliga kalit so'z qoidasi qo'shsangiz, shularning yarmi avtomatik yopiladi")
- **Tugma:** to'g'ridan-to'g'ri kerakli sahifaga o'tkazadi

Prompt'da model **umumiy maslahat bermasin** deb aniq yozilsin — faqat shu akkauntning raqamlariga asoslangan aniq amallar.

**Muhim:** natija keshlansin (kuniga 1 marta), har sahifa ochilganda API chaqirilmasin.

## 5.3. Qo'shimcha ko'rsatkichlar

- **Savol turlari:** mijozlar eng ko'p nima so'rayapti (AI bilan toifalash) — pirog diagramma
- **Yo'qotish nuqtasi:** suhbatlar qaysi bosqichda to'xtayapti
- **Vaqt tahlili:** hozirgi heatmap yaxshi, lekin ustiga tavsiya qo'shilsin ("soat 19-21 eng faol — broadcast shu vaqtda yuboring")
- **Taqqoslash:** bu hafta vs o'tgan hafta, bu oy vs o'tgan oy

---

# FAZA 6 — VORONKA VA BROADCAST

## 6.1. Voronka

- **Avtomatik ko'chirish qoidalari:** teg qo'yilganda yoki kalit so'z ishlatilganda karta o'zi keyingi bosqichga o'tsin
- **Karta ichida:** mijoz username + rasmi (FAZA 2 dan), oxirgi xabar, necha kun turgani, summa
- **Summa maydoni:** har kartaga potentsial summa yozish → bosqich ustida jami ko'rinsin
- **Eslatma:** karta N kundan ortiq qimirlamasa, ogohlantirish belgisi (hozir "o'rt. 6.8 kun" bor — buni kartaga ham chiqar)
- **Bosqichlarni sozlash:** hozir 5 ta qat'iy bosqich. Foydalanuvchi qo'shishi/nomini o'zgartirishi mumkin bo'lsin
- **Filtr:** akkaunt bo'yicha, teg bo'yicha, sana bo'yicha

## 6.2. Broadcast

- **Segment quruvchi:** teg + bosqich + oxirgi faollik + akkaunt bo'yicha shart tuzish (va/yoki mantiq bilan)
- **24 soat qoidasi ko'rsatkichi:** "Segmentda 45 kishi, shundan 12 tasiga hozir yuborish mumkin" — yuborishdan oldin aniq ko'rsatilsin (hozir shunchaki "mos mijoz yo'q" deydi, sababi tushunarsiz)
- **A/B test:** 2 xil matn, segmentning yarmiga bittadan, natija taqqoslanadi
- **Jadval:** kelajakdagi sana/vaqtga rejalashtirish (bor, lekin kengaytirilsin — takrorlanuvchi ham)
- **Natija hisoboti:** yuborildi / ochildi / javob berdi / obunani bekor qildi
- **Shablonlar:** tez-tez ishlatiladigan matnlarni saqlash

---

# FAZA 7 — BRON

Foydalanuvchi "bron qismini qayerga yo'naltiramiz" deb tushunmadi. Sahifaga tushuntirish qo'shilsin va foydali qilinsin:

- Sahifa tepasiga qisqa tushuntirish: *"Mijoz 'bron', 'navbat', 'qachon kelay' desa — bot bo'sh vaqtlarni tugma qilib yuboradi, mijoz tanlaydi, bron bazaga tushadi. 1 kun oldin avtomatik eslatma boradi."*
- **Xizmat turlari:** bir nechta xizmat (masalan "Konsultatsiya 30 daq", "To'liq qabul 60 daq") — har biri o'z davomiyligi bilan
- **Kalendar ko'rinishi:** ro'yxat emas, hafta ko'rinishi
- **Bron holati:** kutilmoqda / tasdiqlandi / kelmadi / yakunlandi
- **Eslatma sozlamasi:** necha soat oldin, qanday matn

---

# YAKUNIY TALABLAR

- Har FAZA'dan keyin alohida commit (`fix:`, `feat:` prefiksi bilan)
- Hech bir mavjud funksiya buzilmasin — o'zgartirishdan oldin tegishli fayllarni o'qi
- `verifySignature()`, webhook route'lari va OAuth kodiga **tegma**
- Yangi migratsiyalar `IF NOT EXISTS` bilan, mavjud ma'lumot yo'qolmasin
- Har API chaqiruvi try/catch ichida, xato bo'lsa sahifa yiqilmasin
- Mobil ko'rinish tekshirilsin
- Yakunda **halol hisobot**: qaysi FAZA to'liq, qaysi qisman, nima qilinmadi va nega

## Agar hammasi bir seansda sig'masa

FAZA 1, 2, 3 birinchi navbat — ularni tugatib push qil, keyin xabar ber. Qolganini keyingi seansda davom ettiramiz. Yarim qolgan ishni "bajarildi" deb yozma.
