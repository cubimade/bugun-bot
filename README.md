# 🤖 Bugun Bot — Instagram AI chat-bot platformasi

Elbek Eshmurodovning Instagram biznes akkauntlari uchun sun'iy intellektli
avtomatik javob tizimi va boshqaruv paneli. Bot Instagram **DM** va
**kommentlar**ga o'zbek tilida, do'stona javob beradi, suhbatlarni eslab
qoladi va biznes analitikasini ko'rsatadi.

## ✨ Imkoniyatlar

### Bot
- 💬 **DM'ga javob** — Claude AI orqali o'zbek tilida tabiiy javob
- 🧠 **Doimiy xotira** — har suhbat PostgreSQL'da, bot avvalgi gaplarni eslaydi
- 📚 **Bilim bazasi** — har akkaunt uchun biznes ma'lumoti (narxlar, xizmatlar)
- 💭 **Kommentga javob** + ManyChat uslubida komment egasiga DM
- 👥 **Ko'p akkaunt** — bir botda bir nechta Instagram akkaunt
- 🔕 **Operator rejimi** — bot pauza, operator qo'lda javob yozadi (30 daqiqa avto-pauza)
- 🌙 **Ish vaqti** — tashqarida tayyor javob (AI chaqirilmaydi)
- 😟 **Kayfiyat tahlili** — salbiy mijozlar avtomatik belgilanadi

### Boshqaruv paneli (9 sahifa, glass dizayn, light/dark)
- 📊 **Boshqaruv** — statistika kartalari (trend + sparkline), 7 kun grafigi, donut
- 💬 **Suhbatlar (Inbox)** — jonli chat, tezkor javoblar, 👍/👎 baholash, arxiv
- 👥 **Kontaktlar** — teglar, izohlar, CSV/JSON eksport, GDPR o'chirish
- 📈 **Tahlil** — soatlik heatmap, konversiya voronkasi, 6+ metrika, AI xulosalar
- 📢 **Broadcast** — ommaviy xabar, rejalashtirish, {ism}/{akkaunt} o'zgaruvchilari
- 📚 **Bilim bazasi**, 🖼 **Akkauntlar**, ⚙️ **Sozlamalar**
- 🔍 **Global qidiruv** (kontakt + xabar matni), 🔔 **bildirishnomalar**

## 🛠 Texnologiyalar

- **Node.js + Express** — server va webhook (ESM)
- **Claude API** (Anthropic) — Haiku (oddiy) / Sonnet (murakkab savollar)
- **PostgreSQL** — doimiy xotira
- **Railway** — 24/7 deploy
- Diagrammalar — sof SVG + vanilla JS (kutubxonasiz)

## 📁 Fayllar tuzilishi

```
index.js             — express sozlash, marshrutlarni ulash (~100 qator)
config.js            — sozlamalar, promptlar, env o'zgaruvchilar
claude.js            — AI javob mantiqi (Claude)
instagram.js         — Instagram Graph API
state.js             — umumiy server holati (DB, akkauntlar, sozlamalar)
logger.js            — oxirgi xatolar xotirasi
middleware/          — auth (Basic Auth), rate-limit
routes/              — webhook, api, api-analytics, api-broadcast, dashboard, public
db/                  — pool (migratsiya), projects, contacts, messages, analytics
templates/           — layout, components + 8 sahifa shabloni
public/              — app.css, app.js, favicon.svg (statik, keshlanadi)
services/            — backup (kunlik JSON zaxira)
pages.js             — ommaviy sahifalar (privacy, data-deletion, stats)
```

Batafsil: [ARCHITECTURE.md](ARCHITECTURE.md)

## 🚀 Ishga tushirish

### Mahalliy (local)

```bash
npm install
cp .env.example .env   # qiymatlarni to'ldiring
npm start
```

### Railway'da deploy

[DEPLOYMENT.md](DEPLOYMENT.md) ga qarang — env o'zgaruvchilar, webhook
sozlash, ko'p akkaunt, zaxira.

## 🌐 Asosiy marshrutlar

| Marshrut | Vazifasi | Himoya |
|----------|----------|--------|
| `GET/POST /webhook` | Instagram webhook | verify token + imzo (APP_SECRET) |
| `GET /dashboard/*` | Boshqaruv paneli (9 sahifa) | parol (Basic Auth) |
| `GET /api/*` | Dashboard API | parol + rate limit |
| `GET /health` | Server + DB holati (monitoring) | — |
| `GET /stats` | Statistika sahifasi | parol |
| `GET /privacy`, `/data-deletion` | Huquqiy sahifalar | — |

## 🔒 Xavfsizlik

- Maxfiy qiymatlar faqat `process.env` orqali — kodda hech qachon yozilmaydi
- Webhook imzosi tekshiriladi (`X-Hub-Signature-256` + `APP_SECRET`)
- Rate limiting: `/webhook` 300/daq, `/api` 120/daq (IP bo'yicha)
- Barcha kiruvchi ma'lumot validatsiya qilinadi, HTML `esc()` bilan himoyalanadi
- Kunlik JSON zaxira (7 kun) + Railway Postgres backup
