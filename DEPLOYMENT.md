# 🚀 Bugun Bot — Deploy va sozlash qo'llanmasi

Bu hujjat botni noldan deploy qilish, sozlash va boshqarishni tushuntiradi (o'zbek tilida).

---

## 1. Kerakli narsalar

- **GitHub** repo (`cubimade/bugun-bot`)
- **Railway** akkaunti (deploy uchun)
- **Anthropic** API kaliti (Claude)
- **Meta / Instagram** biznes akkaunti + app (webhook uchun)

---

## 2. Railway'da deploy

1. Railway'da yangi loyiha yarating va GitHub repo'ni ulang — har `git push` da avtomatik deploy bo'ladi.
2. Loyihaga **PostgreSQL** xizmatini qo'shing (New → Database → PostgreSQL).
3. Bot xizmatining **Variables** bo'limiga o'zgaruvchilarni qo'shing (pastda).
4. `DATABASE_URL` ni Postgres xizmatidan ulang:
   ```
   DATABASE_URL = ${{ Postgres.DATABASE_URL }}
   ```

### Agar avtomatik deploy ishlamasa
Ba'zan GitHub → Railway webhook kechikadi/buziladi. Ishonchli yo'l — CLI:
```bash
npm i -g @railway/cli
railway login          # bir marta
railway link           # repo papkasida, bir marta
railway up --detach    # har deploy'da (lokal koddan build qiladi)
```
Yoki Railway dashboardida xizmatni ochib, qo'lda **Deploy** bosing.

### Telegram bot ulash (v9+)
Dashboard → Akkauntlar → "✈️ Telegram bot" → BotFather'dan token → kiritng.
Webhook avtomatik o'rnatiladi (`/webhook/telegram/:projectId`, secret bilan).

---

## 3. Muhit o'zgaruvchilari (Variables)

Majburiy:

| O'zgaruvchi | Tavsif |
|-------------|--------|
| `ANTHROPIC_API_KEY` | Claude API kaliti |
| `IG_ACCESS_TOKEN` | Instagram token (asosiy akkaunt) |
| `VERIFY_TOKEN` | Webhook tekshiruv so'zi (Meta'da ham shu) |
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` |

Tavsiya etiladi:

| O'zgaruvchi | Tavsif |
|-------------|--------|
| `DASHBOARD_PASSWORD` | `/dashboard` va API'ni parol bilan himoyalash (Basic Auth) |
| `APP_SECRET` | Meta ilovaning **App Secret** qiymati — webhook imzosini (X-Hub-Signature-256) tekshirish uchun. Meta App Dashboard → Settings → Basic → App Secret. Qo'yilmasa imzo tekshirilmaydi (startupda ogohlantirish chiqadi) |

### "Instagram bilan ulash" (OAuth) uchun

Bu to'rttasi qo'yilmasa server ishlayveradi — faqat bir tugmali ulash o'chiq
bo'ladi, akkauntni qo'lda token bilan qo'shish esa ishlayveradi.

| O'zgaruvchi | Tavsif |
|-------------|--------|
| `IG_APP_ID` | **Instagram** App ID — Meta App ID EMAS! App Dashboard → Instagram → API setup with Instagram login → 3. Set up Instagram business login → Business login settings |
| `IG_APP_SECRET` | O'sha bo'limdagi **Instagram** App Secret. `APP_SECRET` bilan almashtirmang — bular boshqa-boshqa qiymatlar |
| `OAUTH_REDIRECT_URI` | `https://<domen>/auth/instagram/callback` — Meta panelidagi "Redirect URI" bilan **aynan** bir xil bo'lishi shart |
| `BASE_URL` | `https://<domen>` — `OAUTH_REDIRECT_URI` berilmasa shundan yasaladi |

> ⚠️ OAuth'da Meta App ID ishlatilsa `Invalid platform app` xatosi chiqadi.
> Meta panelida Redirect URI'ni ham qo'shishni unutmang (Business login settings).

Ixtiyoriy:

| O'zgaruvchi | Standart | Tavsif |
|-------------|----------|--------|
| `AUTO_DM_ON_COMMENT` | `true` | Kommentga DM yuborish |
| `WORK_HOURS_ENABLED` | `false` | Ish vaqti nazorati |
| `WORK_START` / `WORK_END` | `9` / `21` | Ish soatlari (UTC+5) |
| `RATE_LIMIT_MAX` | `8` | 1 daqiqada maks xabar |
| `IG_ACCOUNTS` | — | Ko'p akkaunt (JSON, pastda) |
| `ELEVENLABS_API_KEY` | — | Ovozli xabarni matnga o'girish (STT). Bo'lmasa bot "matn bilan yozing" deydi |
| `TZ_OFFSET` | `5` | Vaqt zonasi (Toshkent UTC+5) — bron va statistika uchun |

> **Kirish (v12):** `/login` sahifasi — jamoa a'zolari email+parol bilan,
> siz esa asosiy `DASHBOARD_PASSWORD` bilan (email shart emas) kirasiz.
> Eski usul — brauzer Basic Auth so'rovi/curl — ham to'liq ishlaydi.
> Birinchi ishga tushishda owner avtomatik yaratiladi
> (email: elbeshmurodov@gmail.com, parol: DASHBOARD_PASSWORD qiymati).

To'liq ro'yxat: `.env.example` fayliga qarang.

---

## 4. Meta / Instagram webhook sozlash

1. Meta App Dashboard → **Webhooks** → Instagram.
2. Callback URL: `https://<sizning-domen>/webhook`
3. Verify token: `VERIFY_TOKEN` bilan bir xil.
4. Obuna maydonlari: **`messages`** va **`comments`**.
5. Instagram biznes akkauntini app'ga ulab, token oling.

Kerakli ruxsatlar: `instagram_business_manage_messages`, `instagram_business_manage_comments`.

---

## 5. Ko'p akkaunt qo'shish

Ikki usul:

**A) Dashboard orqali (oson):** `/dashboard` → "Yangi akkaunt qo'shish" → nom, akkaunt IDsi (entry.id), token. Darhol ishlaydi, DB'da saqlanadi.

**B) Env orqali:** `IG_ACCOUNTS` o'zgaruvchisiga JSON:
```json
[{"id":"17841AKKAUNTA","name":"Asosiy","token":"IGAA..."},
 {"id":"17841AKKAUNTB","name":"Ikkinchi","token":"IGAA..."}]
```

> Har yangi akkaunt uchun Meta'da webhook obunasi va token alohida kerak.

---

## 6. Database zaxiralash (backup)

Railway Postgres'ni zaxiralash:

**A) Railway ichki backup:** Postgres xizmati → **Backups** bo'limidan avtomatik zaxira yoqing.

**B) Qo'lda `pg_dump`:** Postgres → Variables → `DATABASE_PUBLIC_URL` ni oling, so'ng:
```bash
pg_dump "DATABASE_PUBLIC_URL" > bugun_bot_backup.sql
```
Tiklash:
```bash
psql "DATABASE_PUBLIC_URL" < bugun_bot_backup.sql
```

Muhim jadvallar: `projects`, `contacts`, `messages`.

**C) Avtomatik JSON zaxira (o'rnatilgan):** server har kuni muhim jadvallarni
`/backups/backup-YYYY-MM-DD.json` fayliga yozadi (oxirgi 7 kun, tokenlarsiz).
Diqqat: Railway diski **efemer** — har deploy'da o'chadi, shuning uchun asosiy
zaxira sifatida A yoki B usulini ishlating.

**D) To'liq eksport (dashboard'dan):** Kontaktlar sahifasi → "📦 To'liq
eksport" — barcha kontakt + suhbatlar JSON fayl sifatida yuklab olinadi.

---

## 7. Muammolarni topish (loglar)

- **Railway loglari:** xizmat → **Deployments** → **View Logs**. Barcha `console.log`/`console.error` shu yerda.
- **Oxirgi xatolar API:** `GET /api/errors` (parol bilan) — oxirgi 50 ta xatoni JSON'da qaytaradi.
- Bot xato qilsa ham **o'chib qolmaydi** — markazlashtirilgan xato boshqaruvi bor.

---

## 8. Marshrutlar

| Marshrut | Tavsif | Himoya |
|----------|--------|--------|
| `GET /` | Holat | — |
| `GET /health` | Server + DB holati JSON (monitoring) | — |
| `GET/POST /webhook` | Instagram webhook | verify token + imzo (APP_SECRET) + rate limit |
| `GET /dashboard*` | Boshqaruv paneli (9 sahifa) | parol |
| `GET /stats` | Statistika | parol |
| `GET /api/*` | Dashboard ma'lumotlari | parol + rate limit (120/daq) |
| `GET /privacy`, `/data-deletion` | Huquqiy sahifalar | — |

> Railway'da **Healthcheck Path** sifatida `/health` ni qo'yish tavsiya
> etiladi (Service → Settings → Health Check).

---

## 9. Mahalliy ishga tushirish

```bash
npm install
cp .env.example .env   # qiymatlarni to'ldiring
npm start
```
