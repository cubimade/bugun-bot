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
Ba'zan GitHub → Railway webhook kechikadi. Yechim:
- Bo'sh commit push qiling: `git commit --allow-empty -m "deploy" && git push`, so'ng ~2-5 daqiqa kuting.
- Yoki Railway dashboardida xizmatni ochib, qo'lda **Deploy** bosing.

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

Ixtiyoriy:

| O'zgaruvchi | Standart | Tavsif |
|-------------|----------|--------|
| `AUTO_DM_ON_COMMENT` | `true` | Kommentga DM yuborish |
| `WORK_HOURS_ENABLED` | `false` | Ish vaqti nazorati |
| `WORK_START` / `WORK_END` | `9` / `21` | Ish soatlari (UTC+5) |
| `RATE_LIMIT_MAX` | `8` | 1 daqiqada maks xabar |
| `IG_ACCOUNTS` | — | Ko'p akkaunt (JSON, pastda) |

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
| `GET/POST /webhook` | Instagram webhook | verify token |
| `GET /dashboard` | Boshqaruv paneli | parol |
| `GET /stats` | Statistika | — |
| `GET /api/*` | Dashboard ma'lumotlari | parol |
| `GET /privacy`, `/data-deletion` | Huquqiy sahifalar | — |

---

## 9. Mahalliy ishga tushirish

```bash
npm install
cp .env.example .env   # qiymatlarni to'ldiring
npm start
```
