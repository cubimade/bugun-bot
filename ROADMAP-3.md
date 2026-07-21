# BUGUN BOT — 3-BOSQICH: PROFESSIONAL DIZAYN (ChatPlace darajasi)

> **Claude Code uchun ko'rsatma:** Bu faylni to'liq o'qi. Bu — dashboard'ni ODDIY sahifadan CHATPLACE/MANYCHAT darajasidagi TO'LIQ, KO'P SAHIFALI, PROFESSIONAL platformaga aylantirish rejasi. Quyidagi vazifalarni KETMA-KET bajar. Har vazifani tugatib, GitHub'ga commit qilib, keyingisiga o't. Mendan so'rama — faqat env/token kerak bo'lsa to'xtab ayt. Tugagach "3-BOSQICH TUGADI" deb yoz.

---

## MAQSAD

Hozirgi holat: bitta oddiy /dashboard sahifasi.
Kerakli holat: ChatPlace kabi to'liq platforma — ko'p sahifali, chiroyli, professional, mobil-mos.

**Ilhom manbai:** ChatPlace, ManyChat — Instagram avtomatlashtirish platformalari.

---

## DIZAYN TIZIMI (hamma sahifada bir xil — qat'iy amal qil)

### Ranglar palitrasi (BUGUN MEDIA brendi)
- **Asosiy fon:** #0f1117 (juda to'q ko'k-qora)
- **Kartalar/panellar foni:** #1a1d27 (to'qroq kulrang-ko'k)
- **Ikkinchi darajali fon:** #232734
- **Asosiy aksent (brend):** #6366f1 (indigo/binafsha) — tugmalar, faol elementlar
- **Aksent gradient:** #6366f1 → #8b5cf6 (indigo → binafsha) — muhim tugmalar, sarlavhalar
- **Muvaffaqiyat:** #22c55e (yashil)
- **Ogohlantirish:** #f59e0b (sariq)
- **Xato/xavf:** #ef4444 (qizil)
- **Asosiy matn:** #f1f5f9 (deyarli oq)
- **Ikkinchi darajali matn:** #94a3b8 (kulrang)
- **Chegaralar:** #2d3348 (nozik, shaffofroq)

### Tipografiya
- Font: 'Inter' (Google Fonts CDN) — zamonaviy, toza
- Sarlavhalar: 600-700 weight
- Matn: 400-500 weight
- O'lchamlar: h1=24px, h2=20px, h3=16px, body=14px, small=12px

### Komponentlar uslubi
- **Kartalar:** border-radius: 16px, nozik border (#2d3348), engil shadow, hover'da biroz ko'tarilish effekti
- **Tugmalar:** border-radius: 10px, asosiy tugma gradient (#6366f1→#8b5cf6), hover'da yorqinroq
- **Inputlar:** to'q fon (#232734), focus'da indigo border
- **Belgilar (badge):** kichik, yumaloq, rangli (teg uchun)
- **Animatsiyalar:** yumshoq transition (0.2s), sahifa yuklashda fade-in

### Layout
- **Chap sidebar (240px):** doimiy navigatsiya — logo tepada, menyu bandlari, pastda chiqish
- **Asosiy kontent:** sidebar'dan o'ngda, max-width bilan markazlashgan
- **Mobil (<768px):** sidebar yashirinadi, hamburger menyu chiqadi

### Sidebar menyu bandlari (iconlar bilan — emoji yoki SVG)
1. 📊 Boshqaruv (Dashboard) — /dashboard
2. 💬 Suhbatlar (Inbox) — /dashboard/inbox
3. 👥 Kontaktlar — /dashboard/contacts
4. 📢 Broadcast — /dashboard/broadcast
5. 🧠 Bilim bazasi — /dashboard/knowledge
6. 📱 Akkauntlar — /dashboard/accounts
7. ⚙️ Sozlamalar — /dashboard/settings

Faol sahifa sidebar'da ajralib tursin (indigo fon).

---

## VAZIFA 1 — ASOS: LAYOUT VA NAVIGATSIYA

**Bajarish:**
1. Umumiy layout shabloni yarat (sidebar + kontent maydoni) — barcha sahifalar shu shablondan foydalansin.
2. Sidebar: yuqorida "🤖 BUGUN BOT" logo (gradient matn), menyu bandlari (yuqoridagi 7 ta), pastda versiya raqami.
3. Har sahifa tepasida sarlavha qatori: sahifa nomi (chapda) + kontekstli tugma (o'ngda, masalan "+ Yangi akkaunt").
4. Mobil: hamburger tugma, sidebar chapdan chiqadi (overlay bilan).
5. Barcha sahifalar DASHBOARD_PASSWORD (Basic Auth) bilan himoyalangan.
6. Kod tuzilishi: HTML shablonlarni alohida funksiya/faylga ajrat (pages.js yoki templates.js) — takrorlanmasin.

**Tugagach:** commit "Dizayn 1: layout va navigatsiya".

---

## VAZIFA 2 — BOSHQARUV SAHIFASI (Dashboard) — /dashboard

**Bajarish:**
1. Yuqorida 4 ta statistika kartasi (gradient raqamlar, icon bilan):
   - Akkauntlar soni
   - Jami mijozlar
   - Jami xabarlar
   - Bugungi xabarlar (yangi!)
2. O'rtada: "Oxirgi 7 kun faolligi" — oddiy chiziqli yoki ustunli grafik (Chart.js CDN yoki sof CSS bilan). Har kun nechta xabar.
3. Pastda 2 ustun:
   - Chap: "Oxirgi suhbatlar" (5 ta) — avatar doirasi (ismning bosh harfi), ism, oxirgi xabar qisqartmasi, vaqt. Bosganda inbox'ga o'tadi.
   - O'ng: "Tezkor amallar" — tugmalar: "Broadcast yuborish", "Bilim bazasini tahrirlash", "Yangi akkaunt qo'shish".
4. "Odam kerak" belgisi bo'lgan suhbatlar alohida ajralib tursin (sariq belgi) — tepada ogohlantirish sifatida ("2 ta suhbat sizni kutmoqda").

**Tugagach:** commit "Dizayn 2: boshqaruv sahifasi".

---

## VAZIFA 3 — SUHBATLAR (INBOX) — /dashboard/inbox

**Maqsad:** ChatPlace'ning "yagona inbox"i kabi — barcha suhbatlar bir joyda, chiroyli chat ko'rinishida.

**Bajarish:**
1. 2 ustunli layout:
   - Chap (320px): suhbatlar ro'yxati — qidiruv maydoni tepada, har suhbat: avatar, ism/ID, oxirgi xabar, vaqt, o'qilmagan belgisi. Filtrlar: "Hammasi", "Odam kerak", teg bo'yicha.
   - O'ng: tanlangan suhbat — TO'LIQ chat ko'rinishi (Telegram/Instagram uslubida): mijoz xabarlari chapda (kulrang pufak), bot javoblari o'ngda (indigo pufak), vaqtlar.
2. Suhbat tepasida: mijoz ismi/ID, akkaunt nomi, teglar (badge'lar), "Teg qo'shish" tugmasi.
3. Suhbat pastida: "Qo'lda javob yozish" maydoni + "Yuborish" tugmasi (bot o'rniga odam javob berishi uchun — Instagram API orqali yuboradi).
4. "Odam kerak" suhbatlar sariq belgi bilan ajralib tursin.
5. Mobilda: ro'yxat va chat almashinib ko'rinadi (WhatsApp uslubi).

**Tugagach:** commit "Dizayn 3: inbox (suhbatlar)".

---

## VAZIFA 4 — KONTAKTLAR — /dashboard/contacts

**Bajarish:**
1. Jadval ko'rinishida barcha kontaktlar: avatar, ism/ID, akkaunt, teglar, xabarlar soni, oxirgi faollik, amallar.
2. Qidiruv va filtrlash (teg, akkaunt bo'yicha).
3. Har kontakt qatorida: teg qo'shish/o'chirish (tez, modal yoki inline).
4. Kontaktni bosganda — uning suhbatiga o'tish (inbox).
5. Yuqorida umumiy raqam: "Jami X kontakt".

**Tugagach:** commit "Dizayn 4: kontaktlar".

---

## VAZIFA 5 — BROADCAST — /dashboard/broadcast

**Bajarish:**
1. Chiroyli forma: akkaunt tanlash (dropdown), auditoriya tanlash ("Hammasi" yoki teg bo'yicha), xabar matni (katta maydon, belgi hisoblagich).
2. "Oldindan ko'rish" — xabar qanday ko'rinishini chat pufagida ko'rsat.
3. 24-soat qoidasi haqida ogohlantirish kartasi (sariq): "Instagram qoidasi: faqat oxirgi 24 soatda yozgan mijozlarga yuboriladi".
4. "Yuborish" tugmasi (gradient) → tasdiqlash modali ("X ta mijozga yuboriladi. Davom etasizmi?").
5. Yuborish jarayoni: progress ko'rsatkichi, natija (nechta yuborildi/xato).
6. Pastda: "Oldingi broadcastlar" tarixi (agar saqlansa — database'ga broadcasts jadvali qo'shsa bo'ladi).

**Tugagach:** commit "Dizayn 5: broadcast".

---

## VAZIFA 6 — BILIM BAZASI — /dashboard/knowledge

**Bajarish:**
1. Akkauntlar ro'yxati kartalar ko'rinishida — har kartada: akkaunt nomi, bilim bazasi holati ("To'ldirilgan ✅" yoki "Bo'sh ⚠️"), belgi soni.
2. Kartani bosganda — tahrirlash sahifasi/modali: katta matn maydoni, yordam matni ("Nima yozish kerak: xizmatlar, narxlar, aloqa, FAQ..."), "Saqlash" tugmasi.
3. Saqlashda muvaffaqiyat xabari (yashil toast/banner).
4. Namuna shablon tugmasi: "Shablon qo'yish" — bo'sh bilim bazasiga tayyor struktura qo'yadi (BIZ HAQIMIZDA / XIZMATLAR / NARXLAR / ALOQA / FAQ).

**Tugagach:** commit "Dizayn 6: bilim bazasi".

---

## VAZIFA 7 — AKKAUNTLAR — /dashboard/accounts

**Bajarish:**
1. Ulangan akkauntlar kartalar ko'rinishida: Instagram icon, akkaunt nomi, ID, holat (faol/nofaol), statistika (mijozlar, xabarlar).
2. "+ Yangi akkaunt qo'shish" tugmasi → modal: akkaunt nomi, Instagram ID, token kiritish maydonlari + yo'riqnoma ("Token qanday olinadi" qisqa qadam-baqadam, Meta havolasi bilan).
3. Har akkauntda: "Bilim bazasi" tugmasi (knowledge sahifasiga), "O'chirish" (tasdiqlash bilan).
4. Akkaunt holati indikatori (yashil nuqta = faol).

**Tugagach:** commit "Dizayn 7: akkauntlar".

---

## VAZIFA 8 — SOZLAMALAR — /dashboard/settings

**Bajarish:**
1. Bo'limlar (kartalar):
   - **Bot sozlamalari:** ish vaqti (yoqish/o'chirish, soatlar), salomlashish xabari matni.
   - **AI sozlamalari:** model tanlash ma'lumoti (Haiku/Sonnet qachon ishlatiladi — ko'rsatish), javob uzunligi.
   - **Tizim:** versiya, server holati, database holati (yashil/qizil indikator), oxirgi deploy vaqti.
2. Sozlamalar database'da saqlansin (settings jadvali yoki projects'ga qo'shimcha maydonlar).
3. Har o'zgarish "Saqlash" bilan, muvaffaqiyat xabari bilan.

**Tugagach:** commit "Dizayn 8: sozlamalar".

---

## VAZIFA 9 — YAKUNIY PARDOZ VA SINOV

**Bajarish:**
1. Barcha sahifalarni ko'rib chiq — dizayn izchilligi (ranglar, radiuslar, oraliqlar bir xil).
2. Yuklanish holatlari: ma'lumot yuklanayotganda skeleton yoki spinner.
3. Bo'sh holatlar: ma'lumot yo'q bo'lsa chiroyli bo'sh holat ("Hali suhbatlar yo'q" + icon).
4. Xato holatlari: chiroyli xato xabarlari.
5. Mobil test: barcha sahifalar telefonda yaxshi ko'rinsin.
6. Regressiya: bot (DM, komment, bilim bazasi) hali ishlashini tasdiqla.
7. Yakuniy hisobot.

**Tugagach:** commit "Dizayn 9: yakuniy pardoz".

---

## TEXNIK QOIDALAR

1. Tailwind CSS CDN ishlatsa bo'ladi, yoki sof CSS — lekin dizayn tizimiga (yuqoridagi ranglar) qat'iy amal qil.
2. JavaScript: vanilla JS yetarli (React shart emas — server-rendered HTML + oz JS).
3. Barcha sahifalar tez yuklansin — ortiqcha kutubxona qo'shma.
4. Har sahifa server tomonda render bo'lsin (Express route'lar), API endpointlar JSON qaytarsin.
5. Kod toza: sahifa shablonlari alohida modulda, takrorlanish minimal.
6. Xavfsizlik: barcha /dashboard* yo'llar parol bilan, SQL injection'dan himoya (parametrlangan so'rovlar).
7. Har vazifadan keyin commit + push + Railway deploy tekshiruvi.

## AGAR MUAMMO BO'LSA

- Env/token kerak → to'xta, Elbek'ga ayt.
- Kod xatosi → o'zing tuzat.
- Dizayn qarori → o'zing hal qil (dizayn tizimiga amal qilib).

## TUGAGACH

"3-BOSQICH TUGADI" deb yoz. Hisobot: barcha sahifalar ro'yxati, nima qila oladi, skrinshot tavsifi. Keyingi tavsiyalar.

---

**Eslatma:** Bu katta ish — shoshilma, har sahifani chiroyli va ishlaydigan qil. ChatPlace darajasi — maqsad. Elbek dam olishi mumkin — sen ishlaysan.
