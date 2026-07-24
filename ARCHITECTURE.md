# 🏗 Bugun Bot — Arxitektura

Kod tuzilishi, ma'lumot oqimi va database sxemasi (v12 holati).

---

## 1. Umumiy ko'rinish

```
Instagram (Meta) ──webhook──▶ ┐
Telegram (Bot API) ──webhook─▶ ├─ Express server (Railway) ──▶ Claude API
                               ┘        │
                                        ▼
                                  PostgreSQL (Railway)
                                        ▲
   Jamoa (brauzer, sessiya/parol) ──▶ /dashboard sahifalari + /api/*
   Tashqi tizimlar (n8n/CRM) ◀──── chiquvchi webhooklar / /api/v1/*
```

## 2. Papkalar va mas'uliyat

| Joy | Mas'uliyat |
|-----|-----------|
| `index.js` | Express sozlash, routerlarni ulash, scheduler'larni ishga tushirish, 404/xato boshqaruvi |
| `config.js` | Env, system promptlar (+ sotuv rejimi), model tanlash, ish vaqti |
| `state.js` | `state.DB_READY/SETTINGS`, `ACCOUNTS_MAP`, `setupDatabase()` (owner migratsiyasi ham) |
| `claude.js` | Barcha AI chaqiruvlar: javob, sentiment, insights, profil, yo'qotish, kontent |
| `instagram.js` | IG Graph API: DM, rasm, tugmalar (quick replies), komment, private reply |
| `middleware/auth.js` | **Auth**: sessiya cookie + legacy Basic (DASHBOARD_PASSWORD) + rol nazorati (operator whitelist) |
| `middleware/rate-limit.js` | IP bo'yicha cheklov |
| `routes/webhook.js` | Instagram webhook (imzo tekshiruvi, DM→inbound, kommentlar) |
| `routes/webhook-telegram.js` | Telegram webhook (`/webhook/telegram/:projectId`, secret bilan) |
| `routes/auth.js` | `/login`, `/api/login`, `/logout`, `/api/me` |
| `routes/api*.js` | Dashboard API'lari: kontaktlar, analitika (x2), broadcast, sozlamalar, avtomatizatsiya, flows, pipeline, media, sales, users, integrations, diagnostics |
| `routes/dashboard.js` | 15+ sahifa marshruti (protect bilan) |
| `services/inbound.js` | **Kiruvchi xabarlarning umumiy oqimi** (platformadan mustaqil) |
| `services/channels.js` | Platforma adapteri: `senderFor(platform, token)` → text/image/buttons/file |
| `services/telegram.js` | Telegram Bot API adapteri |
| `services/flow-engine.js` | Flow motori: trigger, node bajarish, scheduler, simulyatsiya |
| `services/flow-templates.js` | 5 tayyor flow shabloni |
| `services/sales-bot.js` | Bron/kalkulyator/to'lov/promo/referral bot mantiqlari |
| `services/booking.js` | Bo'sh slotlar (UTC+5), bron eslatma scheduler |
| `services/rules.js` | Kalit so'z/teg qoidalari keshi + teg→bosqich |
| `services/followup.js` | Follow-up scheduler (24h qoidasi IG uchun; A/B varianti) |
| `services/lang.js` | Til aniqlash heuristikasi (uz/ru/en) |
| `services/stt.js` | Ovoz→matn (ElevenLabs, ixtiyoriy) |
| `services/segments.js` | Segmentlarni yangilash (12 soatda) |
| `services/report.js` | Haftalik hisobot (matn + Telegram avto) |
| `services/notify.js` | Admin Telegram bildirishnomalari |
| `services/outbound-webhooks.js` | Chiquvchi webhooklar (HMAC imzo bilan) |
| `services/health.js` | O'z-o'zini tekshirish (DB, IG token) |
| `services/backup.js` | Kunlik JSON zaxira |
| `db/*.js` | SQL qatlam: pool+migratsiya, projects, contacts, messages, analytics, analytics2, automation, flows, media, sales, users |
| `templates/*.js` | Server-render sahifalar (har biri: HTML + klient JS) |
| `public/app.css`, `public/app.js` | Dizayn tizimi va umumiy klient JS (drawer, rol nav, AI profil) |

`db.js` va `templates.js` — faqat re-export.

## 3. Kiruvchi xabar oqimi (umumiy — IG va TG)

```
webhook → msg {platform, projectId, token, senderId, text, payload, ...}
  → services/inbound.processIncomingText:
    1. spam/so'kinish filtri (12.5)
    2. kontakt + xotira + til aniqlash + avto-teg
    3. bot pauzada? → jim (operator gaplashadi)
    4. flow tugmasi/faol flow → flow motori
    5. sotuv payload/intent (bron, kalkulyator, to'lov, promo, referral)
    6. kalit so'z qoidasi → tayyor javob
    7. lead magnit → fayl + "lead" tegi
    8. flow triggerlari (story/keyword/new_contact)
    9. portfolio so'rovi → rasmlar
    10. salomlashish tugmalari (yangi mijoz)
    11. ish vaqti tekshiruvi
    12. Claude javob (bilim bazasi + til + sotuv rejimi + A/B salomlashish)
    13. fonda: sentiment + AI profil (har 5 xabarda) + webhook hodisa
```

## 4. Database sxemasi (asosiy jadvallar)

```
projects        akkauntlar (platform: instagram|telegram, token, bilim bazasi, tg_username)
contacts        mijozlar (tags[], stage, segment, language, profile jsonb, deal_amount,
                referral_code, referred_by, ab_variant, assigned_user_id, ...)
messages        suhbatlar (role, source: dm|story_reply|comment|followup|flow|booking|lead_magnet)
flows / flow_nodes / flow_edges / contact_flow_state   — flow builder
booking_settings / bookings                            — bron tizimi
payments / promo_codes / price_rules                   — sotuv
media_library (bytea)                                  — media fayllar
ab_tests                                               — A/B testlar
users / sessions / user_projects                       — jamoa (bcrypt, rollar)
internal_notes                                         — ichki izohlar
webhooks / api_keys                                    — integratsiyalar
audit_log                                              — kim nima o'zgartirdi
keyword_rules / tag_rules / saved_replies / settings / broadcasts
```

Migratsiya: `initDb()` — `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`, har startupda xavfsiz.

## 5. Scheduler'lar

| Scheduler | Interval | Nima qiladi |
|-----------|----------|-------------|
| Broadcast | 1 daqiqa | Rejalashtirilgan broadcastlarni yuboradi |
| Flow | 1 daqiqa | Kutish (delay) muddati kelgan flow'larni davom ettiradi |
| Follow-up | 1 soat | Jim qolgan mijozlarga eslatma (IG: 24h oynasi ichida) |
| Bron eslatma | 1 soat | Ertangi bronlar uchun eslatma (20-28h oynasi) |
| Backup | 1 kun | JSON zaxira (7 kun) |
| Segmentlar | 12 soat | vip/faol/uxlagan/sovuq qayta hisoblash |
| Haftalik hisobot | 1 soat tekshiruv | Dushanba ~09:00 Telegram'ga |
| Health | 10 daqiqa | DB + IG token tekshiruvi, muammoda Telegram xabar |

## 6. Auth qatlamlari (12.1)

1. **Sessiya cookie** (`sid`) — users/sessions jadvallari, bcrypt parollar
2. **Legacy Basic Auth** — `DASHBOARD_PASSWORD` bilan har doim ishlaydi (curl/skriptlar)
3. **Login formasi** — email+parol; asosiy parol bilan email'siz ham kiradi (owner)
4. **Rollar**: owner (hammasi) · admin (users'dan tashqari) · operator (faqat Inbox/Kontaktlar, `user_projects` ko'lami)
5. Ochiq API: `X-API-Key` (api_keys, sha256 hash)

## 7. Kesh siyosati

| Nima | Qancha |
|------|--------|
| Analitik SQL | 5 daqiqa |
| AI xulosalar (insights, yo'qotish, kontent) | 24 soat |
| Kalit so'z/teg qoidalari, A/B test, webhook ro'yxati | 60 soniya |
| Sessiya lookup | 60 soniya |
| Statik fayllar | 1 kun (`?v=` bilan) |
