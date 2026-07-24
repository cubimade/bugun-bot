# 📖 Bugun Bot — foydalanuvchi qo'llanmasi

Har sahifa nima qiladi va qanday ishlatiladi (o'zbek tilida, v12).

---

## Kirish

`https://<domen>/login` — email + parol bilan. Asosiy parol (DASHBOARD_PASSWORD)
bilan kirsangiz email shart emas. "Meni eslab qol" — 30 kun.
Chiqish: sidebar pastidagi chiqish belgisi.

**Rollar:** Owner — hamma narsa + jamoa boshqaruvi. Admin — jamoadан tashqari
hammasi. Operator — faqat Suhbatlar va Kontaktlar (biriktirilgan akkauntlar).

---

## Sahifalar

### 🏠 Boshqaruv
Kunlik xulosa (AI), asosiy raqamlar, grafiklar, "odam kerak" suhbatlar.

### 💬 Suhbatlar (Inbox)
Barcha suhbatlar (📷 Instagram / ✈️ Telegram belgisi bilan). Filtrlash:
odam kerak, salbiy, pauzada, story, platforma, teg, "menga biriktirilgan".
Chat ichida: qo'lda javob (bot 30 daqiqa pauza bo'ladi), ⚡ tezkor javoblar,
📎 media yuborish, 💳 to'lov havolasi, 🏷 teglar, 👤➕ operatorga biriktirish,
📝 ichki izohlar (sariq — mijoz ko'rmaydi), 🗄 arxivlash.

### 👥 Kontaktlar
Jadval: teglar, segmentlar (🌟VIP 🔥Faol 😴Uxlagan ❄️Sovuq), qidiruv, filtrlar,
🧹 duplikatlar, CSV/JSON eksport. Profil (drawer): AI profil (ism, telefon,
ehtiyoj, byudjet), izoh, bot pauza, GDPR o'chirish.

### 📊 Tahlil
Metrikalar, heatmap (qaysi soatda yozishadi), voronka, akkauntlar taqqoslashi,
💰 moliyaviy natija (daromad, konversiya, LTV, ROI — o'rtacha chekni kiriting),
📉 yo'qotilgan mijozlar AI tahlili, 🔮 prognoz, 💡 kontent tavsiyalari,
AI suhbatlar tahlili. 🖨 Haftalik hisobot (chop etsa bo'ladigan HTML).

### 🧪 A/B test
Ikkita matn variantini sinash (salomlashish yoki follow-up). Yangi mijozlar
tasodifiy bo'linadi; natijada javob % va konversiya ko'rinadi. "G'olib qilish"
— matn doimiy sozlamaga yoziladi.

### 🔀 Oqimlar (Flow builder)
Vizual suhbat oqimi: trigger (kalit so'z / story / komment / yangi mijoz) →
qadamlar (💬 xabar, 🔘 tugmalar, ❓ shart, ⚡ amal, ⏱ kutish). Node'ni sudrab
joylashtiring, o'ng chetidagi nuqtadan chiziq torting. "Shablondan boshlash" —
5 tayyor oqim. 🧪 Simulyatsiya — yubormasdan sinash. Flow faol payt AI aralashmaydi.

### 📋 Voronka (Kanban)
5 ustun: Yangi → Qiziqqan → Muzokara → Sotildi / Yo'q. Kartani sudrab
ko'chiring. 💰 — potensial summa. Teg qo'yilganda avtomatik harakat
(masalan "qiziqqan" tegi → Qiziqqan ustuni).

### 📅 Bronlar
Sozlang (ish kunlari/soatlari, seans davomiyligi) va yoqing — mijoz "bron"
desa bot bo'sh vaqtlarni tugma qilib beradi. 1 kun oldin avto-eslatma.
Mijoz "bekor qilaman" desa bron bekor bo'ladi. Qo'lda bron ham qo'shiladi.

### 💳 Sotuv
To'lov havolalari (Click/Payme/Uzum) — mijoz "to'lov" desa yoki inbox'da 💳
bossangiz yuboriladi; "To'landi" belgilansa mijoz "Sotildi"ga o'tadi.
Promo-kodlar, referral top, narx kalkulyatori shu yerda sozlanadi.

### 🧠 Bilim bazasi
Har akkaunt uchun biznes ma'lumoti — bot faqat shu asosida javob beradi.
"Shablon qo'yish" (E'tirozlarga javoblar bo'limi ham bor), "Sifatni tekshirish" (AI baho).

### 🖼 Media
Rasm/PDF/video kutubxonasi (5 MB/fayl, 100 MB jami). ⭐ portfolio belgisi —
mijoz "ishlaringizni ko'rsating" desa bot avtomatik yuboradi.

### 📢 Broadcast
Ommaviy xabar: auditoriya (hammasi / segment / teg), rasm biriktirish,
rejalashtirish. Instagram'da 24-soat qoidasi amal qiladi; Telegram'da cheklov yo'q.

### 🔑 Kalit so'zlar
"NARX deb yozing" uslubi: so'z kelsa — AI'siz tayyor javob (DM va kommentda).

### 📱 Akkauntlar
Instagram ulash (6 qadamli sehrgar) va ✈️ Telegram bot ulash (BotFather token).
🔍 Diagnostika — token/webhook holati.

### ⚙️ Sozlamalar
Ish vaqti, salomlashish (+ tugmalari), media javoblar, so'kinish filtri, brend
nomi; AI (javob uzunligi, tillar, sotuv rejimi); follow-up; lead magnit;
tezkor javoblar; avto-teglash; 👥 jamoa (owner); 🔔 Telegram bildirishnomalar;
📬 haftalik hisobot; 🔌 integratsiyalar (webhook, API kalit); tizim holati.

---

## Ko'p uchraydigan savollar

**Bot javob bermayapti?** Akkauntlar → Diagnostika. Token muddati, webhook
obunasi, bilim bazasi holatini ko'rsatadi. Kontakt pauzada emasligini tekshiring.

**Bot o'rniga o'zim yozsam?** Inbox'da yozing — bot 30 daqiqa avtomatik pauza
bo'ladi. Doimiy pauza: 🔕 tugmasi.

**Telegram chat ID qayerdan?** Telegram'da @userinfobot ga yozing — ID beradi.

**n8n bilan qanday ulanadi?** Sozlamalar → Integratsiyalar → webhook URL
qo'shing (n8n Webhook node URL'i). Hodisalar POST bo'lib boradi, imzo:
X-Bugun-Signature (HMAC-SHA256, secret bilan).

**Operator nima ko'radi?** Faqat Suhbatlar va Kontaktlar; agar akkaunt
biriktirilgan bo'lsa — faqat o'sha akkauntlar suhbatlari.

**Ovozli xabarlar?** ELEVENLABS_API_KEY qo'shilsa — bot ovozni matnga o'girib
javob beradi. Bo'lmasa "matn bilan yozing" deydi.
