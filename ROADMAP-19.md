# ROADMAP-19: Ko'p ilovali arxitektura (tester rolisiz ishlash)

> **Claude Code uchun.** Loyiha ildizida.
> Bu strukturaviy o'zgarish — diqqat bilan, faza-faza bajarilsin.
> Har fazadan keyin commit. Yakunda push.
> **Mavjud ishlaydigan oqim buzilmasin** — global env o'zgaruvchilar zaxira sifatida qolsin.

---

# 1. MUAMMO TAHLILI

## 1.1. Nima bo'lyapti

OAuth oqimi texnik jihatdan to'liq ishlaydi: consent oynasi ochiladi, `code` qaytadi, token olinadi, akkaunt bazaga tushadi. Lekin olingan token bilan **hech qanday Graph so'rovi bajarilmaydi** — `/me`, `/subscribed_apps`, hammasi `code 100` bilan yiqiladi.

## 1.2. Sabab (Meta API'dan o'lchangan)

```
instagram_business_basic            access_level: none    (Standard Access)
instagram_business_manage_messages  access_level: none    (Standard Access)
instagram_business_manage_comments  access_level: none    (Standard Access)
submission_status: UNSUBMITTED
compliance: compliant, required_actions: []
```

**Standard Access qoidasi:** ilova faqat **o'zida roli bor** (Admin / Developer / Tester) Instagram akkauntlariga kira oladi.

Amalda:

| Akkaunt | Ilovada roli | Token ishlaydimi |
|---|---|---|
| `elbek.eshmurod0v` | Egasi | ✅ 876 API chaqiruv |
| `dr_shoxrux_rahimov` | Yo'q | ❌ code 100 |
| Yangi ulanganlar | Yo'q | ❌ code 100 |

Kod aybdor emas. Bu Meta'ning **huquqiy** cheklovi, texnik emas.

## 1.3. Nima uchun bu yechim

Advanced Access olish uchun Tech Provider + Business verification + App Review kerak (3–6 hafta, qaytarilmaydi). Foydalanuvchi tester rolini ham xohlamaydi.

**Qolgan yagona yo'l:** mijoz o'z Meta ilovasining **egasi** bo'lsin. Egaga rol kerak emas — Standard Access egaga to'liq ishlaydi.

Lekin hozirgi kod bunga tayyor emas: `IG_APP_ID`, `IG_APP_SECRET`, `APP_SECRET`, `VERIFY_TOKEN` — hammasi **global env o'zgaruvchi**, ya'ni butun platformada bitta ilova.

## 1.4. Yangi arxitektura

```
HOZIR                          KEYIN
─────                          ─────
1 ta Meta ilova                Har loyihaga o'z ilovasi
env: IG_APP_ID                 projects.ig_app_id
env: IG_APP_SECRET             projects.ig_app_secret (shifrlangan)
env: VERIFY_TOKEN              projects.verify_token
1 ta webhook secret            Har loyihaga o'z secret'i

Natija: mijoz o'z ilovasining egasi → rol kerak emas → tester yo'q
```

## 1.5. Nimaga tegilmaydi

- Mavjud `elbek.eshmurod0v` akkaunti va uning `IG_ACCESS_TOKEN` bilan ishlashi
- Global env o'zgaruvchilar — ular **zaxira** (fallback) bo'lib qoladi: loyihada o'z ilovasi bo'lmasa, globaldan foydalaniladi
- Bot mantiq, AI javoblar, dashboard funksiyalari

---

# FAZA 1 — Baza va shifrlash

## 1.1. Migratsiya

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ig_app_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ig_app_secret_enc TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meta_app_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meta_app_secret_enc TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS verify_token TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS app_setup_status TEXT DEFAULT 'none';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS app_setup_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_projects_ig_app_id ON projects(ig_app_id);
```

`app_setup_status` qiymatlari: `none` | `partial` | `ready` | `error`

## 1.2. Shifrlash

App secret'lar boshqa odamlarning maxfiy ma'lumoti — **ochiq saqlanmasin**.

Yangi fayl: `services/crypto.js`

```js
const crypto = require('crypto');

// Railway'ga yangi env: ENCRYPTION_KEY (32 baytli, base64)
// Yo'q bo'lsa — DASHBOARD_PASSWORD dan hosil qilinadi (zaxira)
function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw) return Buffer.from(raw, 'base64');
  return crypto.createHash('sha256')
    .update(String(process.env.DASHBOARD_PASSWORD || 'bugun-bot-fallback'))
    .digest();
}

function encrypt(plain) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

function decrypt(payload) {
  if (!payload) return null;
  try {
    const [ivB, tagB, dataB] = String(payload).split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB, 'base64')),
      decipher.final()
    ]).toString('utf8');
  } catch (e) {
    log.error('Decrypt xatosi:', e.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
```

`.env.example` ga qo'sh: `ENCRYPTION_KEY=` (izoh bilan: `openssl rand -base64 32` orqali yasaladi)

## 1.3. Loyiha ma'lumotlarini olish qatlami

Yangi fayl: `services/project-config.js`

```js
// Loyihaning ilova sozlamalarini qaytaradi, yo'q bo'lsa globalga tushadi
async function getAppConfig(projectId) {
  const { rows } = await db.query(
    `SELECT ig_app_id, ig_app_secret_enc, verify_token FROM projects WHERE id = $1`,
    [projectId]
  );
  const p = rows[0] || {};

  const own = Boolean(p.ig_app_id && p.ig_app_secret_enc);

  return {
    source: own ? 'project' : 'global',
    igAppId:     own ? p.ig_app_id                     : process.env.IG_APP_ID,
    igAppSecret: own ? decrypt(p.ig_app_secret_enc)    : process.env.IG_APP_SECRET,
    verifyToken: p.verify_token || process.env.VERIFY_TOKEN,
    redirectUri: process.env.OAUTH_REDIRECT_URI
  };
}
```

**Muhim:** `redirectUri` global qoladi — bitta callback manzili barcha loyihalar uchun. Har mijoz o'z Meta panelida **aynan shu manzilni** qo'shadi.

---

# FAZA 2 — Loyihaga bog'langan OAuth

## 2.1. Boshlash

Hozir `/auth/instagram` global sozlamalar bilan ishlaydi. Endi loyiha konteksti kerak.

```
GET /auth/instagram?project=<id>       ← mavjud loyihaga akkaunt ulash
GET /auth/instagram/new?app_id=...     ← yangi loyiha yaratish (sozlash sehrgaridan)
```

`state` parametri endi loyiha ma'lumotini olib yuradi:

```js
// oauth_states jadvaliga ustun qo'sh
ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS project_id INTEGER;
ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS app_id TEXT;

// state yaratishda
await db.query(
  'INSERT INTO oauth_states (state, project_id, app_id) VALUES ($1,$2,$3)',
  [state, projectId, cfg.igAppId]
);
```

## 2.2. Callback

`consumeState()` endi `project_id` va `app_id` ni ham qaytarsin. Token almashinuvida **o'sha loyihaning** secret'i ishlatilsin:

```js
const st = await oauth.consumeState(state);      // { projectId, appId }
const cfg = await getAppConfig(st.projectId);
const { shortToken } = await oauth.exchangeCodeForToken(cleanCode, cfg);
```

`exchangeCodeForToken`, `exchangeForLongLived`, `fetchProfile`, `subscribeWebhooks`, `refreshToken` — hammasi endi `cfg` obyektini parametr sifatida qabul qilsin, `process.env` dan o'qimasin.

## 2.3. Zaxira saqlansin

`?project=` berilmasa — hozirgidek global sozlamalar bilan ishlasin. Mavjud oqim buzilmaydi.

---

# FAZA 3 — Webhook yo'naltirish (eng nozik qism)

## 3.1. Muammo

Barcha ilovalar bitta URL'ga yuboradi: `/webhook`. Lekin har ilovaning **o'z secret'i** bor — imzoni qaysi secret bilan tekshirish kerakligini bilish uchun avval loyihani topish kerak. Loyihani topish uchun esa body'ni o'qish kerak. Aylanma bog'liqlik.

## 3.2. Yechim

```js
async function handleWebhook(req, res) {
  const rawBody = req.rawBody;              // xom baytlar saqlangan bo'lishi shart
  const signature = req.get('x-hub-signature-256');

  // 1-qadam: body'ni ishonchsiz deb parse qil, faqat marshrutlash uchun
  let payload;
  try { payload = JSON.parse(rawBody); } catch { return res.sendStatus(400); }

  // 2-qadam: nomzod loyihalarni top (entry[].id = IG akkaunt ID)
  const entryIds = (payload.entry || []).map(e => String(e.id)).filter(Boolean);
  const projects = await findProjectsByIgIds(entryIds);   // ig_account_id yoki app_scoped_id

  // 3-qadam: imzoni har nomzodning secret'i bilan tekshir
  let verified = null;
  for (const p of projects) {
    const cfg = await getAppConfig(p.id);
    if (verifySignature(rawBody, signature, cfg.igAppSecret)) { verified = p; break; }
  }

  // 4-qadam: hech biri mos kelmasa — globalni sina (mavjud oqim uchun)
  if (!verified && verifySignature(rawBody, signature, process.env.APP_SECRET)) {
    verified = projects[0] || null;
  }

  if (!verified) {
    log.warn('[WEBHOOK] imzo tasdiqlanmadi', { entryIds, projectsFound: projects.length });
    // HOZIRCHA LOG-ONLY REJIM — bloklamaydi (mavjud xulq saqlanadi)
  }

  res.sendStatus(200);                       // Meta'ga darrov javob
  processAsync(payload, verified);           // ishlov fon rejimida
}
```

**Muhim qoidalar:**

- Meta'ga **200 darrov** qaytarilsin, ishlov keyin. Kechikish webhook o'chirilishiga olib keladi.
- Imzo tekshiruvi **hozircha log-only** — bloklamaydi. Ko'p ilovali oqim barqarorlashgandan keyin qattiqlashtiriladi.
- `rawBody` saqlanishi shart — `express.json()` dan oldin `verify` callback bilan.

## 3.3. Verify (GET) so'rovi

Meta webhook'ni ro'yxatdan o'tkazganda `hub.verify_token` yuboradi. Endi har loyihaning o'z tokeni bo'lishi mumkin:

```js
// GET /webhook
const token = req.query['hub.verify_token'];
const ok = token === process.env.VERIFY_TOKEN
        || await verifyTokenExistsInAnyProject(token);
if (ok) return res.send(req.query['hub.challenge']);
return res.sendStatus(403);
```

Har yangi loyiha yaratilganda `verify_token` avtomatik generatsiya qilinsin (`crypto.randomBytes(16).toString('hex')`).

---

# FAZA 4 — Sozlash sehrgari

Bu foydalanuvchi ko'radigan asosiy qism. Maqsad: mijoz uchun Meta ilovasini yaratishni **qadamma-qadam** yo'naltirish.

Yangi sahifa: `/dashboard/connect/instagram/setup`

## 4.1. Qadamlar

**Qadam 1 — Ilova yaratish**

Ko'rsatma + havola:
```
1. developers.facebook.com/apps → "Create App"
2. Use case: "Other" → App type: "Business"
3. Nom: <mijoz biznesi nomi>
4. Business portfolio: mijozniki (yoki yangi yaratilsin)
```
Tugma: [developers.facebook.com ni ochish ↗]

**Qadam 2 — Instagram qo'shish**

```
App Dashboard → "Add use case" → "Manage messaging and content on Instagram"
```

**Qadam 3 — Redirect URI**

Nusxalash tugmasi bilan tayyor matn:
```
https://bugun-bot-production.up.railway.app/auth/instagram/callback
```
Ko'rsatma: `API setup with Instagram login → 4. Set up Instagram business login → Business login settings → OAuth redirect URIs`

**Qadam 4 — Webhook**

Ikkita nusxalanadigan qiymat (verify_token shu qadamda generatsiya qilinadi va bazaga yoziladi):
```
Callback URL:  https://bugun-bot-production.up.railway.app/webhook
Verify token:  <avtomatik generatsiya>
```
Obuna maydonlari: `messages, messaging_postbacks, comments, message_reactions`

**Qadam 5 — Ma'lumotlarni kiritish**

Ikki maydon:
```
Instagram App ID      [____________]
Instagram App Secret  [____________]
```
Ostida ogohlantirish: *"Bu qiymatlar Instagram → API setup sahifasidan olinadi. App settings → Basic dagi App ID/Secret EMAS."*

Saqlashda: secret shifrlanadi, `app_setup_status = 'partial'`

**Qadam 6 — Ulash**

Tugma: **[Instagram bilan ulash]** → `/auth/instagram?project=<yangi loyiha id>`

Muvaffaqiyatda `app_setup_status = 'ready'`

## 4.2. UI talablari

- Har qadamda **oldingi/keyingi** tugmalari, holat saqlanadi (yarim yo'lda chiqib ketilsa qaytadan boshlanmasin)
- Nusxalanadigan qiymatlarda **nusxa olish tugmasi** (qo'lda yozilmasin — xato manbai)
- Har qadamda skrinshot yoki aniq yo'l ko'rsatkichi
- ROADMAP-17 dagi dizayn tizimida (guruhlangan ro'yxat, 18px radius, segmentlangan qadam ko'rsatkichi)

## 4.3. Nima uchun tester kerak emas

Sehrgar oxirida qisqa izoh bo'lsin:

> Ilova mijozning o'z Meta hisobida yaratilgani uchun u ilovaning **egasi** hisoblanadi. Egaga qo'shimcha rol (tester) kerak emas — akkaunt darrov ishlaydi.

---

# FAZA 5 — Diagnostika

Har akkaunt yonida **"Tekshirish"** tugmasi (allaqachon bor, kengaytirilsin). Bosilganda ketma-ket tekshiradi va natijani ro'yxat qilib ko'rsatadi:

| Tekshiruv | Qanday | Xato bo'lsa nima deyiladi |
|---|---|---|
| Token amal qiladimi | `GET /me?fields=user_id` | "Token eskirgan — qayta ulang" |
| Ruxsatlar | `GET /me/permissions` yoki token debug | "Ruxsat berilmagan: <nomi>" |
| Webhook obunasi | `GET /me/subscribed_apps` | "Webhook yoqilmagan — Meta panelida yoqing" |
| Ilova sozlamasi | `ig_app_id` bormi | "Ilova ulanmagan — sozlash sehrgarini oching" |
| Xabar yuborish | test rejimi | "Yuborib bo'lmadi: <sabab>" |

## 5.1. Xato kodlarini tarjima qil

Meta xatolarini tushunarli o'zbekchaga aylantiruvchi jadval:

```js
const ERROR_HINTS = {
  100: "So'rov parametrlari noto'g'ri, yoki bu akkaunt ilovaga ulanmagan. " +
       "Ilova o'z Meta hisobingizda yaratilganini tekshiring.",
  190: "Token eskirgan yoki bekor qilingan — akkauntni qayta ulang.",
  200: "Ruxsat yetarli emas — Meta panelida kerakli ruxsatlarni bering.",
  4:   "So'rovlar chegarasi oshib ketdi — bir necha daqiqadan keyin urinib ko'ring.",
  10:  "Bu amal uchun ilovada ruxsat yo'q."
};
```

Xato xabarlarida doim: **nima bo'ldi + nima qilish kerak**. Faqat texnik matn ko'rsatilmasin.

---

# FAZA 6 — Ko'p ilovada token boshqaruvi

Endi har loyihaning o'z tokeni va o'z muddati bor.

1. **Kunlik cron** — har loyiha uchun alohida: muddati 10 kundan kam qolgan tokenlarni uzaytirish (`refreshToken` o'sha loyihaning `cfg` si bilan)
2. **Akkauntlar sahifasida** — har akkaunt yonida: ulanish turi (`OAuth` / `Qo'lda`), ilova manbai (`O'z ilovasi` / `Umumiy`), token holati (yashil / sariq / qizil)
3. **Ogohlantirish** — token 7 kundan kam qolganda dashboard'da lenta chiqsin
4. **Xato bo'lsa** — `app_setup_status = 'error'` va sabab yozilsin, akkaunt kartochkasida ko'rinsin

---

# XAVFSIZLIK

Bu faza boshqa odamlarning maxfiy ma'lumotini saqlaydi. Quyidagilar majburiy:

- App secret'lar **doim shifrlangan** holda saqlanadi (`ig_app_secret_enc`)
- Dashboard'da secret **hech qachon to'liq ko'rsatilmaydi** — faqat `••••X29B` ko'rinishida
- Loglarda secret va token **hech qachon to'liq chop etilmaydi** — faqat uzunlik va oxirgi 4 belgi
- API javoblarida secret maydonlari **umuman qaytarilmaydi**
- `ENCRYPTION_KEY` bo'lmasa server ishga tushsin, lekin dashboard'da qizil ogohlantirish chiqsin
- Sehrgardagi secret kiritish maydoni `type="password"` bo'lsin

---

# TEKSHIRUV RO'YXATI

- [ ] Mavjud `elbek.eshmurod0v` akkaunti ishlashda davom etadi (regressiya yo'q)
- [ ] `ig_app_id` bo'lmagan loyiha global sozlamalar bilan ishlaydi
- [ ] Sehrgar orqali yangi loyiha yaratiladi va OAuth ishlaydi
- [ ] Secret bazada shifrlangan (SQL'dan qarab tekshir)
- [ ] Secret dashboard'da va loglarda to'liq ko'rinmaydi
- [ ] Webhook ikkala ilovadan ham qabul qilinadi va to'g'ri loyihaga yo'naltiriladi
- [ ] Webhook GET verify har loyihaning tokeni bilan ishlaydi
- [ ] "Tekshirish" tugmasi barcha bandlarni tekshiradi
- [ ] Xato xabarlari o'zbekcha va amal taklif qiladi
- [ ] Token uzaytirish cron'i har loyiha uchun alohida ishlaydi
- [ ] Sehrgar yarim yo'lda to'xtatilsa holat saqlanadi
- [ ] Mobil ekranda sehrgar buzilmaydi

---

# TEGMA

- Bot mantiq, AI javoblar, bilim bazasi
- Dashboard dizayn tizimi (ROADMAP-17)
- ROADMAP-18 da tuzatilgan narsalar (inbox, kalit so'z, cron, markdown)
- Global env o'zgaruvchilar — ular zaxira bo'lib qoladi, o'chirilmaydi

---

# BOSQICHMA-BOSQICH

Bir seansda sig'masa: **FAZA 1, 2, 3** birinchi navbat — ular arxitektura asosi. Tugatib push qil, keyin xabar ber. FAZA 4 (sehrgar) alohida seansda qilinsa yaxshiroq — u katta UI ishi.

# COMMIT

```
feat(multi-app): har loyihaga alohida Meta ilovasi (v13.0.0)

- projects: ig_app_id, ig_app_secret_enc, verify_token, app_setup_status
- services/crypto.js: AES-256-GCM shifrlash
- services/project-config.js: loyiha sozlamasi, globalga zaxira tushish
- OAuth loyiha kontekstida ishlaydi (state project_id olib yuradi)
- webhook ko'p ilovadan qabul qiladi, imzo loyiha secret'i bilan tekshiriladi
- sozlash sehrgari: 6 qadamda mijoz ilovasini ulash
- diagnostika: token, ruxsat, webhook, xato tarjimasi
- tester roli kerak emas — mijoz o'z ilovasining egasi
```

Yakunda **halol hisobot**: qaysi FAZA to'liq, qaysi qisman, nima qilinmadi va nega.
