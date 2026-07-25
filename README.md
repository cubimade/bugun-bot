# 🤖 Bugun Bot — ko'p kanalli AI chat-bot platformasi

Instagram va Telegram biznes akkauntlari uchun sun'iy intellektli avtomatik
javob tizimi, sotuv vositalari va to'liq boshqaruv paneli. Bot o'zbek
(hamda rus/ingliz) tilida tabiiy javob beradi, suhbatlarni eslab qoladi,
sotuv voronkasini yuritadi va biznes analitikasini ko'rsatadi.

**Stack:** Node.js (Express) · PostgreSQL · Claude API (Haiku/Sonnet) · Railway

**Holat:** v12.1 — 13-bosqich to'liq auditi o'tkazilgan (2026-07-25).
Har funksiya holati: [STATUS.md](STATUS.md)

## ✨ Imkoniyatlar (v12)

### Kanallar
- 📷 **Instagram** — DM, kommentlar, story javoblari (Meta webhook)
- ✈️ **Telegram** — bot, inline tugmalar, fayl yuborish, kanal obuna tekshirish, guruhda mention
- 🌐 **Ko'p tillilik** — mijoz tilini aniqlab (uz/ru/en) o'sha tilda javob beradi
- 🎤 **Ovoz→matn** — ovozli xabar transkripsiyasi (ELEVENLABS_API_KEY bo'lsa)

### Bot aqli
- 💬 Claude AI javoblari — bilim bazasi asosida, Haiku/Sonnet aqlli almashinuvi
- 🧠 Doimiy xotira + AI mijoz profili (ism, telefon, ehtiyoj, byudjet)
- 🔑 Kalit so'z avto-javoblari (AI'siz, tejamkor) + avto-teglash
- 🔀 **Flow builder** — vizual suhbat oqimlari (tugmalar, shartlar, kutish, amallar) + 5 tayyor shablon
- 💼 Sotuv rejimi — ehtiyoj → yechim → e'tiroz → harakatga chaqiruv
- 🚫 Spam va so'kinish filtri

### Sotuv vositalari
- 📋 **Kanban voronka** (yangi → qiziqqan → muzokara → sotildi) + summa
- 📅 **Bron tizimi** — bo'sh vaqtlar, tasdiqlash, 1 kun oldin eslatma
- 🧮 Narx kalkulyatori (savol-javob tugmalar bilan)
- 💳 To'lov havolalari (Click/Payme/Uzum) + to'lovlar ro'yxati
- 🎟 Promo-kodlar · 🤝 Referral tizimi · 🎁 Lead magnit
- ⏰ Follow-up (jim qolganlarga eslatma) · 📢 Broadcast (segment/teg bo'yicha)

### Analitika
- 📊 Statistika, diagrammalar, heatmap, voronka, manba tahlili
- 💰 ROI/moliya, LTV, segmentatsiya (VIP/faol/uxlagan/sovuq)
- 📉 Yo'qotilgan mijozlar AI tahlili · 🔮 Prognoz · 💡 Kontent tavsiyalari
- 🧪 A/B testlar (salomlashish, follow-up matni)
- 📬 Haftalik hisobot (HTML/chop + Telegram avto-yuborish)

### Jamoa va integratsiya
- 👥 Foydalanuvchilar va rollar (owner/admin/operator), sessiya + bcrypt
- 👤 Suhbatni operatorga biriktirish, ichki izohlar (mijoz ko'rmaydi)
- 🔔 Telegram bildirishnomalar (odam kerak, salbiy, bron, to'lov, tizim)
- 📡 Chiquvchi webhooklar (n8n/Zapier) + ochiq API (`/api/v1/contacts`)
- 📜 Audit log · 🩺 O'z-o'zini tekshirish (health check, 10 daqiqa)
- 🖼 Media kutubxona (DB'da saqlanadi) · 🏷 White-label brending

## 🚀 O'rnatish

```bash
npm install
cp .env.example .env   # qiymatlarni to'ldiring
npm start
```

Deploy va sozlash: [DEPLOYMENT.md](DEPLOYMENT.md) ·
Arxitektura: [ARCHITECTURE.md](ARCHITECTURE.md) ·
Foydalanuvchi qo'llanmasi: [USER-GUIDE.md](USER-GUIDE.md) ·
Versiyalar: [CHANGELOG.md](CHANGELOG.md)

## 🔒 Xavfsizlik

- Parollar bcrypt bilan; sessiya cookie httpOnly + Secure + SameSite
- Eski `DASHBOARD_PASSWORD` (Basic Auth) ham to'liq ishlaydi
- Webhook imzolari: Meta `X-Hub-Signature-256`, Telegram secret token, chiquvchi HMAC
- Rate limiting, input validatsiya, XSS himoya (`esc()`), audit log
- To'lov ma'lumotlari saqlanmaydi — faqat havola va holat
