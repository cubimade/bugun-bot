# ROADMAP-15: Instagram OAuth ulash ("Instagram bilan ulash" tugmasi)

> **Claude Code uchun ko'rsatma.** Loyiha: `C:\Users\One_Notebooks\bugun-bot`
> Bu faylni to'liq o'qi, so'ng quyidagi bosqichlarni ketma-ket bajar.
> Har bosqich oxirida commit qil. Yakunda push qil.
> **MUHIM:** mavjud qo'lda token kiritish oqimini O'CHIRMA — u zaxira variant sifatida qolsin.

---

## MAQSAD

Hozir yangi Instagram akkaunt qo'shish uchun foydalanuvchi Meta panelidan Instagram ID va access token'ni qo'lda nusxalashi kerak (6 qadamli sehrgar). Buning o'rniga ChatPlace'dagidek bitta tugma bo'lsin:

```
[Instagram bilan ulash]  →  Instagram login oynasi  →  Ruxsat berish  →  Akkaunt bazaga tushdi
```

---

## 0. NIMANI BILISH KERAK (o'qimasdan kod yozma)

### 0.1. Instagram App ID ≠ Meta App ID

Bu eng ko'p xato qilinadigan joy. Bizda ikkita boshqa-boshqa ID/Secret bor:

| Nima | Qayerdan | Nima uchun |
|------|----------|-----------|
| Meta App ID `1716236209621948` + `APP_SECRET` | App Dashboard > Settings > Basic | Webhook imzosini tekshirish uchun |
| **Instagram App ID** + **Instagram App Secret** | App Dashboard > Instagram > API setup with Instagram login > 3. Set up Instagram business login > Business login settings | **OAuth uchun — bizga shu kerak** |

OAuth'da Meta App ID ishlatilsa, `Invalid platform app` xatosi chiqadi. Yangi env o'zgaruvchilar kerak: `IG_APP_ID`, `IG_APP_SECRET`.

### 0.2. OAuth uchun 4 ta endpoint (Meta rasmiy hujjati, 2026-mart)

| Endpoint | Vazifa |
|----------|--------|
| `GET https://www.instagram.com/oauth/authorize` | Foydalanuvchidan ruxsat so'rash, `code` olish |
| `POST https://api.instagram.com/oauth/access_token` | `code` → qisqa muddatli token (1 soat) |
| `GET https://graph.instagram.com/access_token` | qisqa → uzoq muddatli token (60 kun) |
| `GET https://graph.instagram.com/refresh_access_token` | uzoq muddatli tokenni yana 60 kunga uzaytirish |

### 0.3. Ikkita boshqa-boshqa "user id"

Token almashinuvida qaytadigan `user_id` — bu **app-scoped ID**, u webhook'dagi `recipient.id` bilan MOS KELMASLIGI mumkin.

Shuning uchun token olingandan keyin **albatta** quyidagini chaqir:

```
GET https://graph.instagram.com/v23.0/me?fields=user_id,username,name,profile_picture_url&access_token=TOKEN
```

Bu yerdagi **`user_id`** maydoni — haqiqiy Instagram professional akkaunt ID'si (`17841...` bilan boshlanadi). Bazaga **aynan shuni** yoz. `id` maydonini emas.

Agar bu chalkashsa, bot DM'larni topa olmaydi — webhook keladi, lekin loyiha topilmaydi.

### 0.4. Ruxsatlar (scope)

```
instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments
```

`instagram_business_content_publish` hozircha kerak emas — qo'shma (keraksiz ruxsat so'rash foydalanuvchini cho'chitadi).

---

## 1. ENV O'ZGARUVCHILAR

`.env.example` fayliga qo'sh (haqiqiy qiymatlarni Elbek Railway'ga qo'lda kiritadi):

```
IG_APP_ID=
IG_APP_SECRET=
OAUTH_REDIRECT_URI=https://bugun-bot-production.up.railway.app/auth/instagram/callback
BASE_URL=https://bugun-bot-production.up.railway.app
```

Kodda `process.env.IG_APP_ID` bo'lmasa — server ishga tushsin, lekin "Instagram bilan ulash" tugmasi o'chirilgan (disabled) holatda ko'rinsin va ustiga "IG_APP_ID sozlanmagan" tooltip chiqsin. Server yiqilmasin.

---

## 2. BAZA MIGRATSIYASI

Yangi fayl: `src/db/migrations/015_oauth.sql` (yoki loyihada qanday nom qoidasi bo'lsa, shunga moslashtir).

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ig_username TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ig_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS token_source TEXT DEFAULT 'manual';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS token_last_refreshed_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS granted_scopes TEXT;

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_projects_token_expires ON projects(token_expires_at);
```

`token_source`: `'manual'` yoki `'oauth'`.

Migratsiya loyihadagi mavjud migratsiya mexanizmi orqali ishga tushsin (server start'da avtomatik).

---

## 3. OAUTH MODULI

Yangi fayl: `src/services/instagramOAuth.js`

```js
const crypto = require('crypto');
const db = require('../db');           // loyihadagi haqiqiy yo'lga moslashtir
const log = require('../utils/logger'); // loyihadagi logger

const IG_APP_ID = process.env.IG_APP_ID;
const IG_APP_SECRET = process.env.IG_APP_SECRET;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments'
].join(',');

function isConfigured() {
  return Boolean(IG_APP_ID && IG_APP_SECRET && REDIRECT_URI);
}

// --- 1-qadam: authorize URL yasash ---
async function buildAuthUrl() {
  const state = crypto.randomBytes(24).toString('hex');
  await db.query(
    'INSERT INTO oauth_states (state) VALUES ($1)',
    [state]
  );

  const params = new URLSearchParams({
    client_id: IG_APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

// --- state tekshirish (CSRF himoyasi) ---
async function consumeState(state) {
  if (!state) return false;
  const { rows } = await db.query(
    `UPDATE oauth_states SET used = TRUE
     WHERE state = $1 AND used = FALSE AND created_at > NOW() - INTERVAL '15 minutes'
     RETURNING state`,
    [state]
  );
  return rows.length > 0;
}

// --- 2-qadam: code → qisqa muddatli token ---
async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: IG_APP_ID,
    client_secret: IG_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
    code
  });

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  const json = await res.json();
  if (!res.ok || json.error_message || json.error_type) {
    throw new Error(`Token almashinuvi xato: ${json.error_message || JSON.stringify(json)}`);
  }

  // Javob ikki xil formatda kelishi mumkin: {data:[{...}]} yoki to'g'ridan-to'g'ri {...}
  const payload = Array.isArray(json.data) ? json.data[0] : json;
  if (!payload || !payload.access_token) {
    throw new Error('Javobda access_token yo\'q: ' + JSON.stringify(json));
  }

  return {
    shortToken: payload.access_token,
    permissions: payload.permissions || ''
  };
}

// --- 3-qadam: qisqa → uzoq muddatli (60 kun) ---
async function exchangeForLongLived(shortToken) {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: IG_APP_SECRET,
    access_token: shortToken
  });

  const res = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Uzoq muddatli token xato: ${JSON.stringify(json.error || json)}`);
  }

  return {
    token: json.access_token,
    expiresIn: json.expires_in || 5184000 // 60 kun
  };
}

// --- 4-qadam: profil ma'lumotlari (MUHIM: user_id maydoni) ---
async function fetchProfile(token) {
  const params = new URLSearchParams({
    fields: 'user_id,username,name,profile_picture_url',
    access_token: token
  });

  const res = await fetch(`https://graph.instagram.com/v23.0/me?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Profil olinmadi: ${JSON.stringify(json.error || json)}`);
  }

  return {
    instagramId: String(json.user_id || json.id), // user_id birinchi navbatda!
    username: json.username || null,
    name: json.name || null,
    picture: json.profile_picture_url || null
  };
}

// --- 5-qadam: webhook obunasi (avtomatlashtirish) ---
async function subscribeWebhooks(token) {
  try {
    const params = new URLSearchParams({
      subscribed_fields: 'messages,messaging_postbacks,comments,message_reactions',
      access_token: token
    });
    const res = await fetch(
      `https://graph.instagram.com/v23.0/me/subscribed_apps?${params.toString()}`,
      { method: 'POST' }
    );
    const json = await res.json();
    log.info('Webhook obunasi natijasi:', JSON.stringify(json));
    return json.success === true;
  } catch (e) {
    log.warn('Webhook obunasini avtomatik yoqib bo\'lmadi:', e.message);
    return false; // xato bo'lsa ham OAuth oqimini to'xtatma
  }
}

// --- Tokenni uzaytirish ---
async function refreshToken(longToken) {
  const params = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: longToken
  });
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Token uzaytirilmadi: ${JSON.stringify(json.error || json)}`);
  }
  return { token: json.access_token, expiresIn: json.expires_in || 5184000 };
}

module.exports = {
  isConfigured,
  buildAuthUrl,
  consumeState,
  exchangeCodeForToken,
  exchangeForLongLived,
  fetchProfile,
  subscribeWebhooks,
  refreshToken,
  SCOPES
};
```

---

## 4. ROUTE'LAR

Yangi fayl: `src/routes/oauth.js`

```js
const express = require('express');
const router = express.Router();
const oauth = require('../services/instagramOAuth');
const db = require('../db');
const log = require('../utils/logger');
const { requireAuth } = require('../middleware/auth'); // loyihadagi sessiya middleware

// --- Boshlash ---
router.get('/auth/instagram', requireAuth, async (req, res) => {
  if (!oauth.isConfigured()) {
    return res.status(500).send(errorPage('Sozlanmagan',
      'IG_APP_ID va IG_APP_SECRET Railway o\'zgaruvchilariga qo\'shilmagan.'));
  }
  try {
    const url = await oauth.buildAuthUrl();
    res.redirect(url);
  } catch (e) {
    log.error('OAuth boshlash xatosi:', e);
    res.status(500).send(errorPage('Xatolik', e.message));
  }
});

// --- Qaytish (callback) ---
// DIQQAT: bu route'ga requireAuth QO'YMA — Instagram'dan qaytganda
// sessiya cookie'si SameSite sababli yo'qolishi mumkin. Xavfsizlik state orqali.
router.get('/auth/instagram/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.send(errorPage('Ruxsat berilmadi',
      error_description || 'Foydalanuvchi so\'rovni rad etdi.'));
  }

  const stateOk = await oauth.consumeState(state);
  if (!stateOk) {
    return res.status(400).send(errorPage('Xavfsizlik xatosi',
      'So\'rov muddati tugagan yoki takroriy. Qaytadan urinib ko\'ring.'));
  }

  try {
    // # belgisidan keyingi qismni tashla
    const cleanCode = String(code).split('#')[0];

    const { shortToken, permissions } = await oauth.exchangeCodeForToken(cleanCode);
    const { token, expiresIn } = await oauth.exchangeForLongLived(shortToken);
    const profile = await oauth.fetchProfile(token);

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Bor bo'lsa yangila, bo'lmasa qo'sh
    await db.query(
      `INSERT INTO projects
         (instagram_id, name, ig_username, ig_name, profile_picture_url,
          access_token, token_expires_at, token_source, token_last_refreshed_at, granted_scopes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'oauth',NOW(),$8)
       ON CONFLICT (instagram_id) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         ig_username = EXCLUDED.ig_username,
         ig_name = EXCLUDED.ig_name,
         profile_picture_url = EXCLUDED.profile_picture_url,
         token_expires_at = EXCLUDED.token_expires_at,
         token_source = 'oauth',
         token_last_refreshed_at = NOW(),
         granted_scopes = EXCLUDED.granted_scopes`,
      [
        profile.instagramId,
        profile.username || profile.name || 'Yangi akkaunt',
        profile.username,
        profile.name,
        profile.picture,
        token,
        expiresAt,
        permissions
      ]
    );

    const subscribed = await oauth.subscribeWebhooks(token);

    log.info(`OAuth muvaffaqiyatli: @${profile.username} (${profile.instagramId}), webhook: ${subscribed}`);

    res.send(successPage(profile, subscribed));
  } catch (e) {
    log.error('OAuth callback xatosi:', e);
    res.status(500).send(errorPage('Ulanmadi', e.message));
  }
});

module.exports = router;
```

**Muhim eslatma:** agar `projects.instagram_id` ustunida UNIQUE cheklov bo'lmasa, `ON CONFLICT` ishlamaydi. Avval tekshir:

```sql
ALTER TABLE projects ADD CONSTRAINT projects_instagram_id_key UNIQUE (instagram_id);
```

Agar bazada dublikat `instagram_id` bo'lsa, avval ularni tozala (eng yangisini qoldir).

### 4.1. Natija sahifalari

`successPage()` va `errorPage()` — loyihaning Liquid Glass uslubida, oddiy HTML. Muvaffaqiyat sahifasida:

- Profil rasmi + `@username`
- "Ulandi ✓" belgisi
- Agar `subscribed === false` bo'lsa, sariq ogohlantirish: *"Webhook obunasi avtomatik yoqilmadi. Meta panelida qo'lda yoqish kerak."*
- 3 soniyadan keyin `/dashboard/accounts` ga avtomatik qaytish (`<meta http-equiv="refresh">` yoki `setTimeout`)

---

## 5. AKKAUNTLAR SAHIFASI (UI)

`Akkauntlar` sahifasining yuqori qismiga katta tugma qo'sh:

```html
<a href="/auth/instagram" class="btn-ig-connect">
  <svg><!-- Instagram ikonkasi --></svg>
  Instagram bilan ulash
</a>
```

- Instagram gradient rangi (`#833AB4 → #FD1D1D → #FCAF45`)
- Ostida kichik matn: *"Bir marta bosing — Instagram sizdan ruxsat so'raydi"*
- Yonida ikkilamchi tugma: **"Qo'lda kiritish"** — mavjud 6 qadamli sehrgarni ochadi (o'zgarishsiz qoladi)

### Akkaunt kartochkasida ko'rsat:

- Profil rasmi + `@username`
- Ulanish turi: `OAuth` (yashil nishon) yoki `Qo'lda` (kulrang nishon)
- Token holati:
  - 30+ kun qolgan → yashil "Faol"
  - 7–30 kun → sariq "Tez orada tugaydi (N kun)"
  - < 7 kun yoki tugagan → qizil "Yangilash kerak" + "Qayta ulash" tugmasi (`/auth/instagram` ga olib boradi)
- OAuth bilan ulangan akkauntlarda "Tokenni hozir uzaytirish" tugmasi → `POST /api/accounts/:id/refresh-token`

---

## 5.2. KANAL TANLASH EKRANI (ChatPlace uslubida)

Akkauntlar sahifasidagi **"Akkaunt qo'shish"** tugmasi endi to'g'ridan-to'g'ri OAuth'ga emas, avval kanal tanlash ekraniga olib borsin. Bu kelajakda TikTok/WhatsApp qo'shilganda ham ishlaydi.

### Oqim

```
Akkauntlar sahifasi
   └─ [+ Kanal ulash]
        └─ /dashboard/connect          ← kanal tanlash (yangi)
             ├─ Instagram  → /dashboard/connect/instagram
             │                  ├─ [Instagram bilan ulash] → /auth/instagram
             │                  └─ [Qo'lda kiritish]       → mavjud sehrgar
             └─ Telegram   → mavjud Telegram ulash sahifasi
```

### 5.2.1. `/dashboard/connect` — kanal tanlash

Yangi route: `router.get('/dashboard/connect', requireAuth, ...)`

Sahifa tuzilishi (loyihaning Liquid Glass uslubida, mobil-mos):

- Sarlavha: **"Kanal tanlang"**
- Ostida: *"Avtomatlashtirish uchun akkaunt yoki bot ulang"*
- Ro'yxat — har biri katta bosiladigan kartochka (`<a>` tegi, butun kartochka bosiladi):

| Ikonka | Nomi | Tavsif | Havola | Holat |
|---|---|---|---|---|
| Instagram (gradient) | **Instagram** | Instagram akkauntingizni ulang | `/dashboard/connect/instagram` | faol |
| Telegram (ko'k) | **Telegram** | Telegram botingizni ulang | mavjud Telegram sahifasi | faol |
| TikTok (qora) | **TikTok** | TikTok akkauntini ulang | `#` | `Tez orada` nishoni, `pointer-events: none`, `opacity: 0.5` |

Kartochka o'lchami: balandligi ~90px, radius 16px, hover'da yengil ko'tarilish (`translateY(-2px)`) va soya. O'ng tomonda `→` strelka.

Pastda chapda: **← Orqaga** havolasi → `/dashboard/accounts`

### 5.2.2. `/dashboard/connect/instagram` — Instagram ulash sahifasi

Ikki ustunli (mobilda bir ustun):

**Chap tomon:**
- Katta Instagram ikonkasi yoki illyustratsiya
- Sarlavha: **"Instagram'ga kiring"**
- Ostida: *"va BUGUN BOT'ga kerakli ruxsatlarni bering"*

**O'ng tomon:**
- Kichik sarlavha: **"Instagram'ga kiring va BUGUN BOT'ga ruxsat bering"**
- Tushuntirish matni:
  > Bu Instagram bilan avtomatlashtirish qurish imkonini beradi. Ma'lumotlaringiz nazoratingizda qoladi — ruxsatingizsiz hech narsa qilinmaydi.
- **Ishonch bloki** (kulrang ramka ichida):
  > 🔒 Ulanish Meta'ning rasmiy API'si orqali amalga oshiriladi. Login va parolingizni bizga bermaysiz — ularni faqat Instagram'ning o'z sahifasiga kiritasiz.
- Asosiy tugma: **[Instagram bilan davom etish]** → `/auth/instagram`
- Ostida kichik matn havola: **"yoki qo'lda token kiritish"** → mavjud 6 qadamli sehrgar

**Nima uchun ishonch bloki kerak:** foydalanuvchi "parolimni so'rayaptimi?" deb cho'chiydi. ChatPlace ham aynan shu matnni yozib qo'ygan — bu konversiyani oshiradi.

### 5.2.3. Ulanishdan oldin tekshiruv (ixtiyoriy, lekin tavsiya etiladi)

Instagram ulash sahifasida tugmadan yuqorida kichik eslatma bo'lsin:

> **Ulashdan oldin tekshiring:**
> ✓ Instagram akkauntingiz **Professional** (Business yoki Creator) turida
> ✓ Akkaunt Facebook sahifasiga bog'langan

Sababi: shaxsiy (personal) akkauntlar OAuth'dan o'tolmaydi va foydalanuvchi tushunarsiz xato oladi. Oldindan ogohlantirish qo'llab-quvvatlash so'rovlarini kamaytiradi.

---

## 6. TOKENNI AVTOMATIK UZAYTIRISH

Yangi fayl: `src/jobs/tokenRefresh.js`

Loyihadagi mavjud kunlik zaxira (backup) cron mexanizmiga o'xshatib yoz. Kuniga 1 marta (masalan, soat 04:00) ishlasin:

```js
async function refreshExpiringTokens() {
  const { rows } = await db.query(
    `SELECT id, instagram_id, ig_username, access_token, token_expires_at
     FROM projects
     WHERE token_source = 'oauth'
       AND token_expires_at IS NOT NULL
       AND token_expires_at < NOW() + INTERVAL '10 days'
       AND token_expires_at > NOW()
       AND token_last_refreshed_at < NOW() - INTERVAL '24 hours'`
  );

  for (const p of rows) {
    try {
      const { token, expiresIn } = await oauth.refreshToken(p.access_token);
      await db.query(
        `UPDATE projects
         SET access_token = $1,
             token_expires_at = $2,
             token_last_refreshed_at = NOW()
         WHERE id = $3`,
        [token, new Date(Date.now() + expiresIn * 1000), p.id]
      );
      log.info(`Token uzaytirildi: @${p.ig_username}`);
    } catch (e) {
      log.error(`Token uzaytirilmadi (@${p.ig_username}): ${e.message}`);
    }
  }
}
```

**Meta qoidalari:** token kamida 24 soatlik bo'lishi, muddati tugamagan bo'lishi va `instagram_business_basic` ruxsati berilgan bo'lishi kerak. 60 kun ichida uzaytirilmagan token butunlay o'ladi va faqat qayta OAuth yordam beradi.

---

## 7. TEKSHIRUV RO'YXATI (o'zing tekshir, keyin push qil)

- [ ] `IG_APP_ID` bo'lmasa ham server ishga tushadi, yiqilmaydi
- [ ] `/auth/instagram` Instagram sahifasiga yo'naltiradi
- [ ] `state` ikki marta ishlatilmaydi (ikkinchi urinishda xato beradi)
- [ ] `code` dagi `#_` tozalanadi
- [ ] Bazaga yozilgan `instagram_id` — `me?fields=user_id` dan olingan (`id` emas)
- [ ] Mavjud akkaunt qayta ulanganda dublikat yaratilmaydi, faqat yangilanadi
- [ ] `/dashboard/connect` ochiladi, Instagram va Telegram kartochkalari ishlaydi
- [ ] TikTok kartochkasi bosilmaydi ("Tez orada")
- [ ] `/dashboard/connect/instagram` da ishonch bloki ko'rinadi
- [ ] Ikkala yangi sahifa mobil ekranda buzilmaydi
- [ ] Qo'lda kiritish sehrgari hamon ishlaydi
- [ ] Token muddati akkauntlar sahifasida ko'rinadi
- [ ] Access token dashboard'da ochiq ko'rinmaydi (faqat oxirgi 4 belgi, masalan `••••a1B2`)
- [ ] Loglarda token to'liq chop etilmaydi

---

## 8. COMMIT VA PUSH

```
feat(oauth): Instagram Business Login bilan bir tugmali ulash

- /auth/instagram va /auth/instagram/callback route'lari
- qisqa -> uzoq muddatli token almashinuvi (60 kun)
- kunlik avtomatik token uzaytirish
- webhook obunasini avtomatik yoqish
- akkauntlar sahifasida token holati ko'rsatkichi
- kanal tanlash va Instagram ulash ekranlari
- qo'lda kiritish varianti zaxira sifatida saqlandi
```

Push qilgandan keyin **shu xabarni yoz:** "ROADMAP-15 bajarildi, push qilindi. Railway'da deploy kerak."

---

## 9. TEGMA (bu ishlarni qilma)

- `verifySignature()` funksiyasini o'zgartirma — u hozir log-only rejimda, atayin shunday
- Mavjud webhook route'lariga tegma
- `APP_SECRET` ni `IG_APP_SECRET` bilan almashtirma — bular boshqa-boshqa narsa
- Qo'lda token kiritish oqimini o'chirma
