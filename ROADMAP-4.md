# BUGUN BOT — 4-BOSQICH: PREMIUM DARAJA (ChatPlace'dan O'TIB KETISH)

> **Claude Code uchun ko'rsatma:** Bu faylni to'liq o'qi. Bu — platformani ODDIY ko'rinishdan 2026-yilning PREMIUM SaaS darajasiga (Linear, Stripe, Attio, Raycast kabi) ko'tarish rejasi. Barcha vazifalarni KETMA-KET bajar. Har vazifani tugatib, GitHub'ga commit + push qilib, Railway deploy'ni tekshirib, keyingisiga o't. Regressiya: bot (DM, komment, bilim bazasi) har bosqichdan keyin ishlashi SHART. Mendan so'rama — faqat env/token kerak bo'lsa to'xtab ayt. Tugagach "4-BOSQICH TUGADI" deb yoz va to'liq hisobot ber.

---

## MAQSAD

Hozirgi holat: 7 sahifali, ishlaydigan, lekin ODDIY ko'rinishdagi dashboard.
Kerakli holat: 2026-yil PREMIUM SaaS — Linear/Stripe/Attio darajasidagi vizual sifat + ChatPlace'da YO'Q funksiyalar.

**Dizayn ilhomi (2026 yetakchilari):** Linear (minimal aniqlik), Stripe (bitta metrikaga fokus), Attio (AI-native), Raycast/Supabase (dark-mode-first), Flux template (gradient + glassmorphism).

---

## QISM A — PREMIUM DIZAYN TIZIMI (v2)

Bu tizimga BARCHA sahifalarda qat'iy amal qil. Eski oddiy uslubni to'liq almashtir.

### A1. Ranglar (yangilangan — chuqurroq, boyroq)

CSS variables sifatida yoz (:root da) — keyin oson o'zgartiriladi:

```css
--bg-base: #0a0b10;           /* eng chuqur fon — deyarli qora, ozgina ko'k */
--bg-surface: #12141c;         /* sahifa yuzasi */
--bg-panel: rgba(255,255,255,0.03);  /* glassmorphism panel */
--bg-panel-hover: rgba(255,255,255,0.06);
--border-subtle: rgba(255,255,255,0.08);
--border-glow: rgba(99,102,241,0.35); /* faol element chegarasi */

--accent: #6366f1;             /* indigo — asosiy brend */
--accent-2: #8b5cf6;           /* binafsha — gradient jufti */
--accent-3: #22d3ee;           /* cyan — ikkinchi urg'u (grafik, badge) */
--gradient-brand: linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #d946ef 100%);
--gradient-aurora: radial-gradient(60% 50% at 20% 10%, rgba(99,102,241,.14) 0%, transparent 60%),
                   radial-gradient(50% 40% at 85% 20%, rgba(217,70,239,.10) 0%, transparent 60%),
                   radial-gradient(40% 40% at 60% 90%, rgba(34,211,238,.08) 0%, transparent 60%);

--success: #34d399;  --warning: #fbbf24;  --danger: #f87171;
--text-primary: #f4f5f7;  --text-secondary: #9ca3b8;  --text-muted: #6b7280;
```

### A2. Glassmorphism (muzli shisha) — asosiy uslub

Barcha kartalar/panellar:
- `background: var(--bg-panel); backdrop-filter: blur(14px);`
- `border: 1px solid var(--border-subtle); border-radius: 16px;`
- Muhim kartalarda (statistika): tepa chetiga 1px gradient chiziq (inner glow)
- Hover: border rangi --border-glow ga o'tadi + engil transform: translateY(-2px)
- MUHIM: matn kontrasti yuqori bo'lsin (o'qish qulay) — shisha ustida oq matn aniq ko'rinsin

### A3. Aurora fon

`body`ga: `background: var(--bg-base); background-image: var(--gradient-aurora);` — sahifa orqasida yumshoq, jonli rang dog'lari. Sekin harakat (ixtiyoriy: CSS animation bilan 30s davomida ohista siljish). Bu "premium" his beradi.

### A4. Tipografiya

- Font: 'Inter' (mavjud) + sarlavhalar uchun letter-spacing: -0.02em (zich, zamonaviy)
- Katta raqamlar (statistika): font-size 34-40px, font-weight 700, gradient matn (background-clip: text)
- Sarlavha ierarxiyasi aniq: sahifa nomi 26px/700, bo'lim 17px/600, matn 14px/450

### A5. Micro-interactions (har joyda, lekin nozik)

- Barcha tugma/karta/link: transition 0.18s ease
- Tugma hover: yorqinlik + engil scale(1.02); bosilganda scale(0.98)
- Sahifa yuklanishi: kontent fade-in + 8px yuqoriga siljish (CSS animation, 0.3s)
- Statistika raqamlari: sahifa ochilganda 0 dan haqiqiy songacha "sanash" animatsiyasi (JS, 0.8s)
- Toast xabarlar (saqlandi/xato): o'ng yuqoridan silliq kirib, 3s dan keyin chiqib ketadi
- Sidebar faol band: chap tomonida 3px gradient chiziq + yumshoq fon

### A6. Skeleton loading

Ma'lumot yuklanayotganda spinner O'RNIGA skeleton (kulrang pulsatsiyalanuvchi shakllar) — kartalar, jadval qatorlari, chat pufaklari shaklida. Bu premium his beradi.

### A7. Bo'sh holatlar (empty states)

Har bo'sh ro'yxatda: katta yumshoq icon + qisqa matn + harakat tugmasi. Masalan Suhbatlar bo'sh: "💬 Hali suhbatlar yo'q — bot birinchi xabarni kutmoqda".

**Tugagach:** commit "Premium 1: dizayn tizimi v2 (glassmorphism, aurora, micro-interactions)".

---

## QISM B — BOSHQARUV SAHIFASINI "AI-NATIVE" QILISH

2026 trendi: dashboard o'zi XULOSA beradi, foydalanuvchi grafik qurib o'tirmaydi (Attio uslubi).

### B1. "Bugungi xulosa" kartasi (eng tepada, eng muhim)

Progressive disclosure: birinchi savol — "hammasi joyidami?". Katta glassmorphism karta:
- Claude API bilan kunlik xulosa generatsiya qil (arzon: Haiku): "Bugun 13 xabar keldi, 2 mijoz narx so'radi, 1 suhbat sizni kutmoqda. Eng faol akkaunt: BUGUN MEDIA."
- Xulosa har dashboard ochilganda emas — kesh qilinsin (soatiga 1 marta yangilanadi), tejamkor.
- Yonida holat indikatori: 🟢 "Hammasi ishlayapti" / 🟡 "E'tibor kerak" (odam kerak suhbatlar bo'lsa)

### B2. Bento grid layout

Statistika kartalarini bir xil o'lchamdagi 4 karta o'rniga BENTO uslubida joyla:
- 1 katta karta (2x kenglik): "Bugungi xulosa" (B1)
- 2 o'rta karta: Bugungi xabarlar (grafik bilan), Odam kerak suhbatlar
- Kichik kartalar: Akkauntlar, Jami mijozlar, Jami xabarlar

### B3. Grafikni jonlantirish

Hozirgi oddiy ustunlar o'rniga: silliq gradient area-chart (SVG bilan chiz — kutubxonasiz mumkin), hover'da har kun qiymati tooltip'da, oxirgi nuqtada pulsatsiyalanuvchi indikator.

**Tugagach:** commit "Premium 2: AI-native boshqaruv (xulosa, bento, jonli grafik)".

---

## QISM C — CHATPLACE'DA BOR, BIZDA YO'Q — QO'SHISH

### C1. Bot pauza (operator rejimi) — MUHIM!

ChatPlace'ning asosiy funksiyasi. Suhbat sahifasida "Botni pauza qilish" tugmasi:
- Pauza qilinganda: bot o'sha kontaktga javob BERMAYDI (operator gaplashadi)
- Database: contacts jadvaliga `bot_paused BOOLEAN DEFAULT false`
- Webhook mantiqida tekshir: agar bot_paused → javob berma, faqat xabarni saqla
- Inbox'da pauza qilingan suhbatlar 🔕 belgisi bilan
- "Botni qayta yoqish" tugmasi
- AVTO-PAUZA: operator qo'lda javob yozsa — bot avtomatik 30 daqiqa pauza (keyin o'zi yoqiladi). Bu ChatPlace'dan ham aqlliroq!

### C2. Tezkor javoblar (saved replies)

Inbox'da qo'lda javob yozish maydonida "⚡ Tezkor javoblar" tugmasi — oldindan saqlangan javoblar ro'yxati (masalan "Narxlar haqida", "Aloqa ma'lumoti"). Sozlamalarda tahrirlash. Database: `saved_replies` jadvali.

### C3. Broadcast rejalashtirish

Broadcast sahifasiga "Hozir yuborish" yoki "Rejalashtirish" (sana+vaqt tanlash). Database: broadcasts jadvaliga `scheduled_at`. Server har daqiqada tekshiradi (setInterval) — vaqti kelganda yuboradi.

### C4. Kontakt profili (mini CRM)

Kontaktni bosganda yon panel (drawer) ochiladi: avatar, ism, ID, birinchi/oxirgi ko'rilgan sana, teglar, izohlar maydoni (nota — database'ga `note` allaqachon bor, ishlatilsin), statistika (nechta xabar), "Suhbatga o'tish" tugmasi.

**Tugagach:** commit "Premium 3: operator rejimi, tezkor javoblar, rejalashtirish, mini-CRM".

---

## QISM D — CHATPLACE'DA YO'Q — BIZNI AJRATIB TURADIGAN FUNKSIYALAR

Bu qism bizni ChatPlace'dan O'TKAZADI. Ularda bular yo'q yoki juda kuchsiz:

### D1. AI Insight — suhbatlar tahlili (bizning super-kuch!)

Yangi sahifa: /dashboard/insights ("📈 Tahlil" sidebar'ga qo'shiladi):
- Claude (Haiku) barcha suhbatlarni tahlil qilib chiqaradi (kunlik kesh):
  - "Eng ko'p so'ralgan 5 savol" (mijozlar nimani so'rayapti)
  - "Sotuvga tayyor mijozlar" (narx so'raganlar, qiziqqanlar ro'yxati)
  - "Bilim bazasi kamchiliklari" (bot javob berolmagan savollar — bilim bazasiga nima qo'shish kerakligi tavsiyasi!)
- Bu ChatPlace'da YO'Q — biz AI-native platformamiz!

### D2. Sentiment (kayfiyat) belgisi

Har suhbatda mijoz kayfiyati: 😊 ijobiy / 😐 neytral / 😟 salbiy (Claude javob berganda qo'shimcha aniqlaydi, database'ga saqlanadi). Inbox'da salbiy kayfiyatli suhbatlar ogohlantirish bilan — operator tez aralashsin.

### D3. Kunlik Telegram hisobot (ixtiyoriy, agar oson bo'lsa)

Har kuni kechqurun bot statistikasi haqida qisqa xulosa loglariga yozilsin (keyin Telegram'ga ulash mumkin). Hozircha: /dashboard'da "Kunlik hisobot" bo'limi yetarli.

**Tugagach:** commit "Premium 4: AI Insights, sentiment — ChatPlace'da yo'q funksiyalar".

---

## QISM E — INBOX'NI MUKAMMALLASHTIRISH (eng ko'p ishlatiladigan sahifa)

- Chat pufaklari: mijoz chapda (shisha panel), bot o'ngda (gradient), operator javoblari alohida rangda (cyan chegara) + "Operator" belgisi
- Xabar ostida vaqt + holat (yuborildi ✓)
- Suhbat tepasida: kontakt info + teglar + sentiment + "Botni pauza" + "Profil" tugmalari
- Yozish maydoni: auto-resize textarea, Enter=yuborish, Shift+Enter=yangi qator, ⚡ tezkor javoblar
- Real-vaqt his: 15 soniyada auto-yangilanish (mavjud bo'lsa saqla), yangi xabar kelsa yumshoq highlight
- Qidiruv: ism/ID bo'yicha jonli filtrlash

**Tugagach:** commit "Premium 5: inbox mukammallashtirildi".

---

## QISM F — YAKUNIY SIFAT NAZORATI

1. Barcha sahifalarni ko'rib chiq: dizayn tizimi (A qism) hamma joyda bir xilmi (ranglar, radiuslar, glassmorphism, animatsiyalar)
2. Mobil: har sahifa telefonda ishlashi va chiroyli ko'rinishi (hamburger, drawer'lar to'liq ekran)
3. Tezlik: sahifalar tez yuklansin — ortiqcha kutubxona yo'q, SVG/CSS bilan yechilgan
4. Xavfsizlik: barcha yangi endpointlar parol himoyasida, SQL injection yo'q (parametrlangan so'rovlar)
5. Regressiya: bot to'liq zanjiri (DM → Claude → javob, komment, bilim bazasi, pauza mantiqi) ishlaydi
6. Console'da xato yo'q (brauzer devtools tekshiruvi o'rniga: kod sifatini o'zing ko'rib chiq)
7. Yakuniy hisobot: har qism bo'yicha nima qilindi, sahifalar ro'yxati, ChatPlace bilan taqqoslash jadvali (bizda bor / ularda bor)

**Tugagach:** commit "Premium 6: yakuniy sifat nazorati" va "4-BOSQICH TUGADI" deb yoz.

---

## TEXNIK QOIDALAR

1. Kutubxonasiz yoki minimal: glassmorphism/animatsiyalar = sof CSS; grafiklar = sof SVG. React KERAK EMAS.
2. CSS'ni alohida modulga ajrat (styles.js yoki static css) — takrorlanish bo'lmasin.
3. Claude API chaqiruvlari (xulosa, insights, sentiment) TEJAMKOR: Haiku model, kesh (har chaqiruvda emas!), qisqa promptlar.
4. Har vazifadan keyin: node --check, commit, push, Railway deploy tekshiruvi.
5. Database o'zgarishlari: ALTER TABLE IF NOT EXISTS uslubida (eski ma'lumot buzilmasin).
6. Mavjud funksiyani buzish TAQIQLANADI.

## AGAR MUAMMO BO'LSA

- Env/token kerak → to'xta, Elbek'ga ayt.
- Kod xatosi → o'zing tuzat.
- Dizayn qarori → dizayn tizimi (A qism) asosida o'zing hal qil.

## TUGAGACH

"4-BOSQICH TUGADI" + hisobot: qilingan ishlar jadvali, ChatPlace taqqoslash jadvali (qaysi funksiya kimda bor), keyingi tavsiyalar.

---

**Eslatma:** Bu eng katta dizayn sakrashi. Shoshilma — har sahifa Linear/Stripe darajasida ko'rinsin. "Premium" = tafsilotlarda: 1px chegaralar, yumshoq animatsiyalar, aniq ierarxiya, bo'sh joylar. Elbek qaytganda "VAU" deyishi kerak.
