# BUGUN BOT — 5-BOSQICH: KUCHLI ANALITIKA VA DIAGRAMMALAR

> **Claude Code uchun ko'rsatma:** Bu faylni to'liq o'qi. Bu — platformani "chiroyli lekin sayoz" holatdan "kuchli analitik vosita" darajasiga ko'tarish rejasi. Barcha qismlarni (A-G) KETMA-KET bajar. Har qismni tugatib GitHub'ga commit + push qil, Railway deploy'ni tekshir, keyingisiga o't. Regressiya: bot (DM, komment, bilim bazasi, pauza) har qismdan keyin ishlashi SHART. Mendan so'rama — faqat env/token kerak bo'lsa to'xtab ayt. Tugagach "5-BOSQICH TUGADI" deb yoz va hisobot ber.

---

## MAQSAD

Hozirgi holat: chiroyli dizayn, lekin analitika sayoz — 4 ta raqam va bitta grafik. Foydalanuvchi "nima bo'lyapti?" degan savolga to'liq javob ololmaydi.

Kerakli holat: har savolga javob beradigan kuchli analitik panel — trendlar, taqqoslashlar, vaqt kesimlari, biznes qarorlari uchun ma'lumot.

**MUHIM:** Barcha yangi elementlar mavjud dizayn tizimida (glass, rim-light, light/dark) bo'lsin. Yangi ranglar o'ylab topma — mavjud CSS variables ishlatilsin.

---

## QISM A — VIZUAL TUZATISHLAR (birinchi navbatda, tez)

### A1. Ortiqcha yorug'lik dog'ini olib tashlash — MUHIM

"Bugungi xulosa" kartasidagi katta binafsha/pushti radial gradient dog'ni **BUTUNLAY olib tashla**. Sabab: matnni bosib qolyapti, chalg'itadi, arzon ko'rinadi.

O'rniga:
- Karta oddiy glass fonda (--glass-bg)
- Faqat nozik rim-light (yuqori chetdagi 1px yorug'lik)
- Chegara: ingichka gradient (1px), aylanuvchi conic EMAS — statik, nozik
- Matn har doim 100% aniq o'qilsin (kontrast tekshirilsin)

Boshqa kartalarda ham katta rang dog'lari bo'lmasin. Qoida: **rang urg'u uchun, fon uchun emas.**

### A2. Statistika kartalarini jonlantirish

Har statistika kartasi (Akkauntlar, Mijozlar, Xabarlar, Odam kerak) quyidagini ko'rsatsin:
- Katta raqam (mavjud)
- **Trend belgisi**: ↑ +12% yoki ↓ -5% (o'tgan davrga nisbatan), yashil/qizil rangda, kichik shrift
- **Sparkline**: karta pastida 7 kunlik mini-grafik (sof SVG, 40px balandlik, gradient chiziq)
- Qo'shimcha kontekst: "6 mijoz · 2 tasi yangi" uslubida

**Tugagach:** commit "Analitika A: vizual tuzatishlar, trend va sparkline".

---

## QISM B — VAQT FILTRI (butun tizim bo'ylab)

Har analitik sahifa tepasida filtr paneli:
- Tugmalar: **Bugun · 7 kun · 30 kun · Hammasi** (segmented control uslubida, faol tugma gradient bilan)
- Tanlov `localStorage`da saqlansin (sahifa yangilanganda eslab qolsin)
- Barcha statistika, grafiklar, diagrammalar shu filtrga qarab qayta hisoblansin
- Backend: API endpointlarga `?period=today|7d|30d|all` parametri qo'shilsin
- Database so'rovlari: `WHERE created_at >= NOW() - INTERVAL '7 days'` uslubida

**Tugagach:** commit "Analitika B: vaqt filtri".

---

## QISM C — YANGI DIAGRAMMALAR (sof SVG, kutubxonasiz)

Barcha diagrammalar: sof SVG, mavjud rang palitrasi (--accent, --accent-2, --accent-3), hover'da tooltip, light/dark'da ishlaydi.

### C1. Donut chart — suhbatlar holati
Boshqaruv sahifasida. Ko'rsatadi: javob berilgan / odam kerak / bot pauzada / javobsiz.
- Markazda umumiy son
- Yonida legenda (rangli nuqta + nom + son + foiz)
- Segment hover'da biroz kattalashadi

### C2. Soatlik heatmap — eng foydalisi!
"Qaysi soatda ko'p yozishadi" — 7 kun × 24 soat katakchalar to'ri (yoki soddaroq: faqat 24 soat, bir qator).
- Katakcha rangi: xabarlar soniga qarab (och → to'q accent rang)
- Hover: "Payshanba 14:00 — 8 xabar"
- Ostida xulosa: "Eng faol vaqt: 19:00–21:00"
- **Bu juda qimmatli** — qachon onlayn bo'lish kerakligini ko'rsatadi

### C3. Akkauntlar taqqoslashi
Gorizontal ustunli diagramma: har akkaunt uchun mijozlar/xabarlar soni.
- Ustunlar gradient bilan, uzunligi nisbatga qarab
- Yonida raqam va foiz
- Saralash: eng faoldan pastga

### C4. Konversiya voronkasi (funnel) — ChatPlace'da bor, bizda yo'q!
Bosqichlar (yuqoridan pastga, kengaydan torga):
1. **Yozgan** — barcha kontaktlar
2. **Suhbatlashgan** — 2+ xabar yozganlar
3. **Qiziqqan** — narx/xizmat so'raganlar (bot javobida yoki mijoz xabarida "narx", "qancha", "xizmat" so'zlari bo'yicha aniqlanadi)
4. **Aloqaga chiqqan** — Telegram/telefon so'raganlar yoki "odam kerak" belgisi

Har bosqichda: son + konversiya foizi (oldingi bosqichdan). Voronka shakli SVG bilan (trapetsiya bloklar).

**Tugagach:** commit "Analitika C: donut, heatmap, taqqoslash, voronka".

---

## QISM D — YANGI METRIKALAR (hisoblash + ko'rsatish)

Quyidagi metrikalarni hisoblab, Tahlil (/dashboard/insights) sahifasida ko'rsat:

1. **O'rtacha javob vaqti** — mijoz xabari va bot javobi orasidagi vaqt (soniyalarda). "Bot o'rtacha 3.2 soniyada javob beradi"
2. **O'rtacha suhbat davomiyligi** — bir kontakt bilan o'rtacha nechta xabar almashiladi
3. **Eng faol kunlar** — hafta kunlari bo'yicha taqsimot
4. **Javobsiz qolgan savollar** — bot "bilmayman/aniq emas" tipida javob bergan holatlar soni (matnda "kechirasiz", "bilmayman", "aniq emas" kabi iboralar bo'yicha aniqlanadi) → bilim bazasiga nima qo'shish kerakligini ko'rsatadi
5. **Takroriy mijozlar** — bir necha kun davomida qaytib yozganlar soni va foizi
6. **Yangi vs qaytgan** — davr ichida yangi kontaktlar va eskilarning nisbati

Har metrika: glass kartada, katta raqam + tushuntirish + (imkoni bo'lsa) trend.

**Tugagach:** commit "Analitika D: yangi metrikalar".

---

## QISM E — TAHLIL SAHIFASINI KUCHAYTIRISH (/dashboard/insights)

Mavjud AI Insights sahifasini to'liq analitik markazga aylantir:

1. **Yuqorida:** vaqt filtri (B qism)
2. **Metrikalar bloki:** D qismdagi 6 metrika (bento grid)
3. **Diagrammalar:** heatmap (C2), voronka (C4), akkauntlar taqqoslashi (C3)
4. **AI tahlil bloki** (mavjud, saqlansin va yaxshilansin):
   - Eng ko'p so'ralgan 5 savol
   - Sotuvga tayyor mijozlar (ro'yxat, suhbatga o'tish havolasi bilan)
   - Bilim bazasi kamchiliklari + aniq tavsiya
   - **YANGI:** "Bu hafta nima o'zgardi" — Claude o'tgan davr bilan taqqoslab xulosa yozadi
5. AI chaqiruvlari kesh bilan (kuniga 1 marta yoki filtr o'zgarganda), Haiku model

**Tugagach:** commit "Analitika E: tahlil sahifasi kuchaytirildi".

---

## QISM F — EKSPORT VA HISOBOTLAR

1. **CSV eksport:** Kontaktlar sahifasida "⬇ CSV yuklab olish" tugmasi (joriy filtr bo'yicha). Ustunlar: ism/ID, akkaunt, teglar, xabarlar soni, birinchi/oxirgi ko'rilgan, izoh.
2. **Statistika eksporti:** Tahlil sahifasida "Hisobotni yuklab olish" — asosiy metrikalar CSV yoki oddiy matn hisoboti.
3. Eksport server tomonda (Express route), fayl nomi sanaga qarab: `kontaktlar-2026-07-23.csv`

**Tugagach:** commit "Analitika F: eksport".

---

## QISM G — YAKUNIY SIFAT NAZORATI

1. Barcha yangi diagrammalar light VA dark rejimda to'g'ri ko'rinsin
2. Mobil: diagrammalar telefonda o'qilsin (kerak bo'lsa gorizontal scroll yoki soddalashtirilgan ko'rinish)
3. Ma'lumot yo'q holati: har diagramma uchun chiroyli bo'sh holat ("Ma'lumot yig'ilmoqda...")
4. Tezlik: og'ir SQL so'rovlar keshlansin (kamida 5 daqiqa), sahifa 2 soniyada yuklansin
5. Regressiya: bot to'liq zanjiri ishlaydi (DM, komment, bilim bazasi, pauza, broadcast)
6. Hisobot: qo'shilgan diagrammalar/metrikalar ro'yxati, ChatPlace bilan taqqoslash

**Tugagach:** commit "Analitika G: yakuniy nazorat" va "5-BOSQICH TUGADI".

---

## TEXNIK QOIDALAR

1. **Kutubxonasiz:** barcha diagrammalar sof SVG + vanilla JS. Chart.js va boshqalar SHART EMAS.
2. **Rang:** faqat mavjud CSS variables. Yangi rang o'ylab topilmaydi.
3. **Tejamkorlik:** og'ir hisoblar keshlansin; AI chaqiruvlari Haiku + kesh.
4. **Database:** yangi ustun kerak bo'lsa `ALTER TABLE IF NOT EXISTS`; indeks qo'sh (created_at, contact_id) — tezlik uchun.
5. Har qadamda: node --check → commit → push → deploy tekshiruvi.
6. Mavjud funksiyani buzish TAQIQLANADI.

## TUGAGACH

"5-BOSQICH TUGADI" + hisobot: qo'shilgan diagrammalar, metrikalar, ChatPlace taqqoslash jadvali, keyingi tavsiyalar.

---

**Eslatma:** Maqsad — chiroyli emas, FOYDALI. Har diagramma biror biznes savoliga javob bersin: "Qachon onlayn bo'lay?", "Qaysi biznesim yaxshi ishlayapti?", "Mijozlar qayerda yo'qolyapti?". Bezak uchun diagramma qo'shma.
