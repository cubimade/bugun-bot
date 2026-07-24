# 🏗 Bugun Bot — Arxitektura

Kod tuzilishi, ma'lumot oqimi va database sxemasi (ROADMAP-6 holati).

---

## 1. Umumiy ko'rinish

```
Instagram (Meta) ──webhook──▶ Express server (Railway) ──▶ Claude API
                                    │
                                    ▼
                              PostgreSQL (Railway)
                                    ▲
       Operator (brauzer) ──▶ /dashboard sahifalari + /api/*
```

## 2. Papkalar va mas'uliyat

| Joy | Mas'uliyat |
|-----|-----------|
| `index.js` | Express sozlash: compression, json (rawBody bilan), static, rate limit, routerlarni ulash, 404, xato boshqaruvi, listen |
| `config.js` | Env o'zgaruvchilar, system promptlar, model tanlash (`pickModel`), ish vaqti, "odam kerak" kalit so'zlari |
| `state.js` | Umumiy holat: `state.DB_READY`, `state.SETTINGS`, `state.DEFAULT_PROJECT_ID`, `ACCOUNTS_MAP` (akkaunt → token/loyiha), `setupDatabase()`, `resolveAccount()`, `requireDb()` |
| `middleware/auth.js` | Basic Auth (`DASHBOARD_PASSWORD`) |
| `middleware/rate-limit.js` | IP bo'yicha so'rov cheklovi (Map, kutubxonasiz) |
| `routes/webhook.js` | GET verify, POST qabul qilish, imzo tekshiruvi (`APP_SECRET`), `handleDirectMessage`, `handleComment` |
| `routes/api.js` | Kontakt/teg/bilim bazasi/sozlamalar/qidiruv/bildirishnoma/GDPR endpointlari; analytics va broadcast routerlarini ulaydi |
| `routes/api-analytics.js` | Statistika, diagrammalar, metrikalar, AI xulosalar, CSV eksport + 5 daqiqalik kesh |
| `routes/api-broadcast.js` | Ommaviy xabar (jonli progress), rejalashtirish, scheduler (har daqiqa), {ism}/{akkaunt} |
| `routes/dashboard.js` | 8 ta sahifa marshruti (protect bilan) |
| `routes/public.js` | `/`, `/health`, `/privacy`, `/data-deletion`, `/stats` |
| `db/pool.js` | Ulanish (SSL avto), `initDb()` — jadval/ustun/indeks migratsiyasi |
| `db/projects.js` | Akkauntlar, bilim bazasi, tezkor javoblar, sozlamalar |
| `db/contacts.js` | Mijozlar, teglar, arxiv, qidiruv, GDPR o'chirish |
| `db/messages.js` | Xabarlar, suhbat tarixi, baholash, broadcast so'rovlari |
| `db/analytics.js` | Davr filtri (`periodCond`), stats/donut/heatmap/voronka/6 metrika/eksport |
| `templates/layout.js` | Umumiy karkas: sidebar, topbar (qidiruv, 🔔), modal, `renderLayout()` |
| `templates/components.js` | `esc()`, SVG ikonlar, NAV, drawer HTML |
| `templates/*.js` | Har sahifa: server-render HTML + klient JS (api orqali ma'lumot oladi) |
| `public/app.css` | Butun dizayn tizimi (CSS variables, glass, light/dark) — 1 kun keshlanadi |
| `public/app.js` | Umumiy klient JS: theme, toast, modal, drawer, qidiruv, bildirishnoma |
| `services/backup.js` | Kunlik JSON zaxira `/backups` (7 kun) |
| `logger.js` | Oxirgi 50 xato xotirada (`/api/errors`) |

`db.js` va `templates.js` — faqat re-export (eski importlar buzilmasin).

## 3. Ma'lumot oqimi (DM)

```
1. Meta POST /webhook  (imzo tekshiriladi: X-Hub-Signature-256)
2. resolveAccount(entry.id) → { projectId, token }
3. handleDirectMessage:
   - spam rate limit (senderId bo'yicha)
   - getOrCreateContact + saveMessage(user)
   - bot pauzada? → javob yo'q (operator gaplashadi)
   - ish vaqti tashqarisida? → tayyor javob
   - needsHuman(matn)? → 🙋 belgisi
   - bilim bazasi + sozlamalar → system prompt
   - pickModel: oddiy → Haiku, murakkab → Sonnet
   - getClaudeReply → saveMessage(assistant) → sendInstagramMessage
   - fonda: sentiment tahlili
```

## 4. Database sxemasi

```sql
projects   (id, name, ig_account_id UNIQUE, access_token, knowledge_base, created_at)
contacts   (id, project_id→projects CASCADE, ig_user_id, name, needs_human,
            tags TEXT[], unread, bot_paused, paused_until, note, sentiment,
            archived, first_seen, last_seen, UNIQUE(project_id, ig_user_id))
messages   (id, contact_id→contacts CASCADE, role user|assistant, text,
            is_operator, rating SMALLINT, created_at)
saved_replies (id, title, text, created_at)
settings   (key PK, value, updated_at)
broadcasts (id, project_id, audience, tag, message, total, sent, failed,
            status sent|scheduled|sending|failed, scheduled_at, created_at)
```

Indekslar: `messages(contact_id, created_at)`, `messages(created_at)`,
`messages(created_at DESC)`, `messages(role, created_at)`,
`contacts(project_id)`, `contacts(first_seen)`, `contacts(last_seen DESC)`.

Migratsiya: `initDb()` — `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT
EXISTS`, har startupda xavfsiz ishlaydi.

## 5. Kesh siyosati

| Nima | Qancha | Qayerda |
|------|--------|---------|
| Analitik SQL (stats, diagrammalar, metrikalar) | 5 daqiqa | `cachedAnalytics` (Map) |
| AI kunlik xulosa | 1 soat | `SUMMARY_CACHE` |
| AI Insights | 24 soat | `INSIGHTS_CACHE` |
| "Bu hafta nima o'zgardi" | 24 soat | `CHANGED_CACHE` |
| Statik fayllar (app.css/js) | 1 kun (brauzer) | `Cache-Control` + `?v=` versiya |

## 6. Xavfsizlik qatlamlari

1. Basic Auth — barcha `/dashboard*` va `/api/*` (`DASHBOARD_PASSWORD`)
2. Webhook imzo — HMAC-SHA256 (`APP_SECRET`), `timingSafeEqual`
3. Rate limit — IP bo'yicha (webhook 300/daq, api 120/daq) + senderId spam himoyasi
4. Input validatsiya — uzunlik/tur/format cheklovlari, SQL faqat parametrlangan
5. XSS — barcha foydalanuvchi matni `esc()` orqali
6. Xato boshqaruvi — route try/catch → error middleware; `unhandledRejection`/`uncaughtException` loglanadi, server qulamaydi
