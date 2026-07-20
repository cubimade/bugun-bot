# 🤖 Bugun Bot — Instagram AI chat-bot

Elbek Eshmurodovning Instagram biznes akkauntlari uchun sun'iy intellektli
avtomatik javob tizimi. Bot Instagram **DM** va **kommentlar**ga o'zbek tilida,
do'stona javob beradi va suhbatlarni eslab qoladi.

## ✨ Imkoniyatlar

- 💬 **DM'ga javob** — Claude AI orqali o'zbek tilida tabiiy javob
- 🧠 **Doimiy xotira** — har suhbat PostgreSQL'da saqlanadi, bot avvalgi gaplarni eslaydi
- 💭 **Kommentga javob** — postga yozilgan kommentga avtomatik javob
- 📩 **ManyChat uslubidagi DM** — komment egasiga avtomatik shaxsiy xabar
- 👥 **Ko'p akkaunt** — bir botda bir nechta Instagram akkaunt (har biri o'z tokeni bilan)
- 📊 **Statistika** — `/stats` sahifasida mijozlar, xabarlar, oxirgi suhbatlar

## 🛠 Texnologiyalar

- **Node.js + Express** — server va webhook
- **Claude API** (Anthropic) — AI javoblar (Haiku modeli)
- **PostgreSQL** — doimiy xotira
- **Railway** — 24/7 deploy

## 📁 Fayllar tuzilishi

| Fayl | Vazifasi |
|------|----------|
| `index.js` | Asosiy server, webhook marshrutlari, orkestratsiya |
| `config.js` | Sozlamalar, promptlar, muhit o'zgaruvchilari |
| `claude.js` | AI javob mantiqi (Claude bilan ishlash) |
| `instagram.js` | Instagram Graph API'ga xabar/komment yuborish |
| `db.js` | PostgreSQL (projects, contacts, messages jadvallari) |
| `pages.js` | HTML sahifalar (privacy, data-deletion, stats) |

## 🚀 Ishga tushirish

### Mahalliy (local)

1. Paketlarni o'rnating:
   ```bash
   npm install
   ```
2. `.env.example` ni nusxalab `.env` yarating va qiymatlarni to'ldiring.
3. Serverni ishga tushiring:
   ```bash
   npm start
   ```

### Railway'da deploy

1. Loyihani GitHub'ga push qiling — Railway avtomatik deploy qiladi.
2. Railway "Variables" bo'limiga muhit o'zgaruvchilarini qo'shing
   (`.env.example` dagi ro'yxat bo'yicha).
3. `DATABASE_URL` — Railway Postgres xizmatidan avtomatik ulanadi.

## 🔑 Muhit o'zgaruvchilari

`.env.example` fayliga qarang. Asosiylari:

- `ANTHROPIC_API_KEY` — Claude API kaliti
- `IG_ACCESS_TOKEN` — Instagram token (bitta akkaunt uchun)
- `IG_ACCOUNTS` — ko'p akkaunt uchun JSON ro'yxat (ixtiyoriy)
- `VERIFY_TOKEN` — webhook tekshiruvi
- `DATABASE_URL` — PostgreSQL (Railway beradi)
- `AUTO_DM_ON_COMMENT` — kommentga DM yuborish (true/false)

## 🌐 Marshrutlar (endpointlar)

| Marshrut | Vazifasi |
|----------|----------|
| `GET /` | Bot ishlayotganini ko'rsatadi |
| `GET/POST /webhook` | Instagram webhook (tekshiruv + xabarlar) |
| `GET /stats` | Statistika sahifasi |
| `GET /privacy` | Maxfiylik siyosati |
| `GET /data-deletion` | Ma'lumotni o'chirish ko'rsatmasi |

## 🔒 Xavfsizlik

Maxfiy qiymatlar (token, API kalit) **hech qachon kodda yozilmaydi** —
faqat `process.env` orqali o'qiladi. `.env` va `node_modules` GitHub'ga
yuklanmaydi (`.gitignore`).
