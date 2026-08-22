// ============================================================
//  SERVICES/INSTAGRAM-OAUTH.JS — "Instagram bilan ulash" (ROADMAP-15)
//
//  Meta rasmiy oqimi (Instagram Business Login), 4 ta endpoint:
//    1) GET  instagram.com/oauth/authorize         → ruxsat so'rash, code olish
//    2) POST api.instagram.com/oauth/access_token  → code → qisqa token (1 soat)
//    3) GET  graph.instagram.com/access_token      → qisqa → uzoq (60 kun)
//    4) GET  graph.instagram.com/refresh_access_token → yana 60 kun
//  (3 va 4 — versiyasiz yo'l, GET; GET rad etilsa POST'ga qaytiladi,
//   graphTokenRequest() izohiga qarang.)
//
//  MUHIM 1: IG_APP_ID ≠ Meta App ID. OAuth'da Meta App ID ishlatilsa
//           "Invalid platform app" xatosi chiqadi (config.js izohiga qarang).
//  MUHIM 2: token almashinuvidagi user_id — app-scoped ID, u webhook'dagi
//           recipient.id bilan mos kelmasligi mumkin. Shuning uchun bazaga
//           me?fields=user_id dan olingan qiymat yoziladi (fetchProfile).
//  MUHIM 3: bu faylda access_token hech qachon to'liq log qilinmaydi.
// ============================================================
import crypto from "crypto";

import { globalAppConfig } from "./project-config.js";
import { saveOAuthState, consumeOAuthState } from "../db.js";
import { recordError } from "../logger.js";

const GRAPH = "https://graph.instagram.com";
const GRAPH_V = `${GRAPH}/v23.0`;

// Ruxsatlar: DM va kommentlar uchun yetarli.
// instagram_business_content_publish ATAYLAB so'ralmaydi — keraksiz ruxsat
// so'rash foydalanuvchini cho'chitadi (konversiya tushadi).
export const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

// Uzoq muddatli token amal qilish muddati (Meta standarti): 60 kun
const SIXTY_DAYS_SEC = 5184000;

// Sozlamalar to'liqmi? cfg berilmasa global env tekshiriladi. Sozlanmasa
// server yiqilmaydi — UI'da tugma o'chirilgan holatda ko'rinadi.
// ROADMAP-19 FAZA 2: cfg — loyihaning o'z ilovasi yoki global (project-config.js).
export function isConfigured(cfg = null) {
  const c = cfg || globalAppConfig();
  return Boolean(c.igAppId && c.igAppSecret && c.redirectUri);
}

// Nima yetishmayotganini aniq aytish (tooltip va xato sahifasi uchun)
export function missingConfig(cfg = null) {
  const c = cfg || globalAppConfig();
  const miss = [];
  if (!c.igAppId) miss.push("IG_APP_ID");
  if (!c.igAppSecret) miss.push("IG_APP_SECRET");
  if (!c.redirectUri) miss.push("OAUTH_REDIRECT_URI (yoki BASE_URL)");
  return miss;
}

// ------------------------------------------------------------
//  1-qadam: authorize URL (state — CSRF himoyasi, bir martalik)
//  cfg — loyihaning ilova sozlamalari; projectId state bilan saqlanadi,
//  callback'da o'sha loyihaning secret'i ishlatiladi.
// ------------------------------------------------------------
export async function buildAuthUrl(cfg = null, projectId = null) {
  const c = cfg || globalAppConfig();
  const state = crypto.randomBytes(24).toString("hex");
  await saveOAuthState(state, projectId ?? c.projectId, c.igAppId);

  const params = new URLSearchParams({
    client_id: c.igAppId,
    redirect_uri: c.redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

// state tekshirish — yaroqli bo'lsa { projectId, appId }, aks holda null.
// Ikkinchi marta ishlatilsa ham null (bir martalik).
export async function consumeState(state) {
  return consumeOAuthState(state);
}

// Meta javoblari turli formatda keladi — xato matnini bir xil ko'rinishga solamiz.
// Xato kodi/turi va HTTP status ham qo'shiladi: "Unsupported request" kabi
// umumiy matnlarni kodsiz diagnostika qilib bo'lmaydi.
function errText(json, res) {
  const base =
    json?.error?.message ||
    json?.error_message ||
    json?.error_description ||
    (typeof json?.error === "string" ? json.error : null) ||
    JSON.stringify(json || {}).slice(0, 300);

  const bits = [];
  if (json?.error?.type) bits.push(json.error.type);
  if (json?.error?.code !== undefined) bits.push("code " + json.error.code);
  if (res && !res.ok) bits.push("HTTP " + res.status);
  return bits.length ? `${base} (${bits.join(", ")})` : base;
}

// ------------------------------------------------------------
//  2-qadam: code → qisqa muddatli token (1 soat)
// ------------------------------------------------------------
export async function exchangeCodeForToken(code, cfg = null) {
  const c = cfg || globalAppConfig();
  const body = new URLSearchParams({
    client_id: c.igAppId,
    client_secret: c.igAppSecret,
    grant_type: "authorization_code",
    redirect_uri: c.redirectUri,
    code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.error || json.error_message || json.error_type) {
    throw new Error("Token almashinuvi xato: " + errText(json));
  }

  // Javob ikki xil formatda kelishi mumkin: {data:[{...}]} yoki to'g'ridan-to'g'ri {...}
  const payload = Array.isArray(json.data) ? json.data[0] : json;
  if (!payload?.access_token) {
    throw new Error("Javobda access_token yo'q (Instagram javobi kutilmagan formatda)");
  }

  // ROADMAP-18 davomi: Meta ba'zi Business Login ilovalarida bu qadamda
  // ALLAQACHON uzoq muddatli token qaytaradi (expires_in ~5184000). Bunday
  // tokenni ig_exchange_token bilan almashtirish "Unsupported request"
  // (code 100) beradi. Shu sabab expires_in ham qaytariladi — completeFlow
  // unga qarab almashtirish qadamini o'tkazib yuboradi.
  const expiresIn = Number(payload.expires_in) || null;
  console.log(
    `🔑 Code almashinuvi OK — maydonlar: [${Object.keys(payload).join(", ")}], ` +
      `expires_in: ${expiresIn ?? "yo'q"}, token: ${String(payload.access_token).slice(0, 4)}…`
  );

  const perms = payload.permissions;
  return {
    shortToken: payload.access_token,
    expiresIn,
    // user_id shu javobda keladi — profil olinmasa ham akkauntni saqlash
    // uchun zaxira (completeFlow'da ishlatiladi)
    userId: payload.user_id ? String(payload.user_id) : null,
    permissions: Array.isArray(perms) ? perms.join(",") : String(perms || ""),
  };
}

// ------------------------------------------------------------
//  graph.instagram.com token endpointlari uchun umumiy so'rov
//  (/access_token va /refresh_access_token — ikkalasi bir xil ishlaydi)
//
//  Meta hujjati (2026-08 da qayta tekshirildi:
//  developers.facebook.com/docs/instagram-platform/reference/access_token):
//    GET graph.instagram.com/access_token   (versiyasiz)
//        ?grant_type=ig_exchange_token&client_secret=...&access_token=...
//  client_secret — INSTAGRAM ilova sirri (Instagram > API setup sahifasidan),
//  Meta App > Settings > Basic'dagi sir EMAS.
//
//  Amaliyotda "Unsupported request - method type: get/post" (code 100,
//  IGApiException) kuzatildi. Empirik tekshiruv: parametr yetishmasa yoki
//  token buzuq bo'lsa Meta BOSHQA xato beradi ("Failed to decrypt" / 190),
//  ya'ni bu xato token muvaffaqiyatli dekript qilingandan KEYIN chiqadi —
//  odatda client_secret ilovaga mos kelmasligi yoki ilova turi noto'g'ri
//  bo'lganda. Shu sabab 3 variant ketma-ket sinaladi va har muvaffaqiyatsiz
//  javob TO'LIQ (token qiymatlarisiz) loglanadi:
//    1) GET  versiyasiz  (hujjatdagi rasmiy usul)
//    2) POST versiyasiz  (form-urlencoded body)
//    3) GET  versiyali   (/v23.0/access_token — ba'zi ilovalarda shu ishlaydi)
// ------------------------------------------------------------

// Xavfsiz diagnostika: tokenning FAQAT birinchi 4 harfi (to'liq token EMAS).
// Instagram Business Login tokenlari "IGAA" bilan boshlanadi. Boshqa prefiks
// ko'rinsa — ilova "Instagram API with Facebook Login" ga sozlangan bo'lishi
// mumkin, u holda bu endpoint umuman ishlamaydi (boshqa oqim kerak).
function tokenKind(token) {
  return String(token || "").slice(0, 4) || "?";
}

// Log uchun javob matni: token ko'rinishidagi qiymatlar qisqartiriladi
function redact(s) {
  return String(s || "").replace(/IGAA[\w-]{8,}/g, (m) => m.slice(0, 8) + "…[redacted]");
}

// Parametrlar diagnostikasi: QIYMATLAR EMAS, faqat nomi va uzunligi —
// bo'sh client_secret kabi sabablar logdan darhol ko'rinadi
function paramsDiag(params) {
  return [...params.entries()]
    .map(([k, v]) => `${k}(${String(v).length}${k === "access_token" ? ", " + tokenKind(v) + "…" : ""})`)
    .join(" ");
}

async function graphTokenRequest(path, params, errPrefix, tokenForDiag) {
  const attempts = [
    { label: "GET versiyasiz", exec: () => fetch(`${GRAPH}${path}?${params.toString()}`) },
    {
      label: "POST versiyasiz",
      exec: () =>
        fetch(`${GRAPH}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }),
    },
    { label: "GET versiyali (v23.0)", exec: () => fetch(`${GRAPH_V}${path}?${params.toString()}`) },
  ];

  let lastJson = null;
  let lastRes = null;
  for (const a of attempts) {
    const res = await a.exec();
    const json = await res.json().catch(() => ({}));
    if (res.ok && !json.error && json.access_token) {
      return { token: json.access_token, expiresIn: Number(json.expires_in) || SIXTY_DAYS_SEC };
    }
    // ROADMAP-18 qo'shimcha: TO'LIQ javob (redaktlangan) — keyingi diagnostika
    // soniyalarda bo'lsin. Token qiymatlari hech qachon logga tushmaydi.
    console.warn(
      `⚠️ ${path} [${a.label}] muvaffaqiyatsiz — HTTP ${res.status}, javob: ${redact(
        JSON.stringify(json).slice(0, 600)
      )} | yuborilgan: ${paramsDiag(params)}`
    );
    lastJson = json;
    lastRes = res;
  }

  const err = new Error(
    `${errPrefix}: ${errText(lastJson, lastRes)} [token: ${tokenKind(tokenForDiag)}…]`
  );
  // completeFlow "Unsupported request" (code 100) holatini alohida ushlaydi:
  // token allaqachon uzoq muddatli bo'lsa, almashtirish shart emas
  err.igCode = lastJson?.error?.code;
  err.igUnsupported =
    lastJson?.error?.code === 100 && /unsupported request/i.test(String(lastJson?.error?.message));
  throw err;
}

// ------------------------------------------------------------
//  3-qadam: qisqa → uzoq muddatli token (60 kun)
// ------------------------------------------------------------
export async function exchangeForLongLived(shortToken, cfg = null) {
  const c = cfg || globalAppConfig();
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: c.igAppSecret,
    access_token: shortToken,
  });
  return graphTokenRequest("/access_token", params, "Uzoq muddatli token olinmadi", shortToken);
}

// ------------------------------------------------------------
//  4-qadam: profil ma'lumotlari
//  DIQQAT: bazaga `user_id` yoziladi, `id` EMAS. `id` — app-scoped,
//  webhook'dagi entry.id bilan mos kelmaydi va bot DM'ni topa olmaydi.
//
//  "Unsupported request - method type: get" (code 100) ba'zi tokenlarda
//  ayrim FIELDS uchun chiqadi (masalan name/profile_picture_url ruxsati
//  yo'q bo'lsa). Shu sabab progressiv urinish: to'liq ro'yxat → qisqargan →
//  minimal → versiyasiz minimal. Har muvaffaqiyatsiz urinish TO'LIQ
//  loglanadi (URL token qiymatisiz + Meta'ning to'liq JSON javobi).
// ------------------------------------------------------------
export async function fetchProfile(token, nodeId = null) {
  const attempts = [
    { base: GRAPH_V, path: "/me", fields: "user_id,username,name,profile_picture_url", label: "to'liq" },
    { base: GRAPH_V, path: "/me", fields: "user_id,username", label: "qisqargan" },
    { base: GRAPH_V, path: "/me", fields: "user_id", label: "minimal" },
    { base: GRAPH, path: "/me", fields: "user_id,username", label: "versiyasiz" },
    // fields'siz — Meta standart maydonlarni qaytaradi
    { base: GRAPH_V, path: "/me", fields: null, label: "fields'siz" },
  ];
  // app-scoped ID ma'lum bo'lsa — node sifatida to'g'ridan-to'g'ri so'rash
  // (/me ishlamagan tokenlarda ba'zan node lookup ishlaydi)
  if (nodeId) {
    attempts.push({
      base: GRAPH_V,
      path: `/${encodeURIComponent(String(nodeId))}`,
      fields: "user_id,username,name,profile_picture_url",
      label: "node lookup",
    });
  }

  let lastErr = null;
  for (const a of attempts) {
    const params = new URLSearchParams({ access_token: token });
    if (a.fields) params.set("fields", a.fields);
    const url = `${a.base}${a.path}?${params.toString()}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (res.ok && !json.error) {
      const instagramId = String(json.user_id || json.id || "");
      if (!instagramId) {
        lastErr = new Error("Profil javobida akkaunt IDsi yo'q");
        continue;
      }
      if (a.label !== "to'liq") {
        console.log(`👤 Profil "${a.label}" urinishida olindi (${a.fields || "standart maydonlar"}) — qolgani keyin to'ldiriladi`);
      }
      return {
        instagramId,
        username: json.username || null,
        name: json.name || null,
        picture: json.profile_picture_url || null,
        // Diagnostika uchun: user_id va id farq qilsa, bu normal (id — app-scoped)
        appScopedId: json.id ? String(json.id) : null,
      };
    }

    console.warn(
      `⚠️ ${a.path} [${a.label}: ${a.fields || "fields'siz"}] muvaffaqiyatsiz — HTTP ${res.status}, ` +
        `URL: ${a.base}${a.path}?${a.fields ? "fields=" + a.fields + "&" : ""}access_token=[redacted], ` +
        `javob: ${JSON.stringify(json).slice(0, 600)}`
    );
    lastErr = new Error("Profil olinmadi: " + errText(json, res));
  }
  throw lastErr || new Error("Profil olinmadi");
}

// ------------------------------------------------------------
//  5-qadam: webhook obunasi (sehrgardagi eng ko'p unutiladigan qadam)
//  Xato bo'lsa ham OAuth oqimi TO'XTAMAYDI — natija foydalanuvchiga
//  sariq ogohlantirish sifatida ko'rsatiladi.
// ------------------------------------------------------------
export async function subscribeWebhooks(token) {
  try {
    const params = new URLSearchParams({
      subscribed_fields: "messages,messaging_postbacks,comments,message_reactions",
      access_token: token,
    });
    const res = await fetch(`${GRAPH_V}/me/subscribed_apps?${params.toString()}`, {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    if (json.success === true) {
      console.log("📡 Webhook obunasi yoqildi (OAuth)");
      return true;
    }
    console.warn("⚠️ Webhook obunasi yoqilmadi:", errText(json));
    return false;
  } catch (err) {
    console.warn("⚠️ Webhook obunasini avtomatik yoqib bo'lmadi:", err.message);
    return false;
  }
}

// ------------------------------------------------------------
//  Tokenni uzaytirish (yana 60 kun)
//  Meta talabi: token kamida 24 soatlik, muddati tugamagan va
//  instagram_business_basic ruxsati berilgan bo'lishi kerak.
//  60 kun ichida uzaytirilmagan token butunlay o'ladi — faqat qayta OAuth.
// ------------------------------------------------------------
export async function refreshToken(longToken) {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: longToken,
  });
  return graphTokenRequest("/refresh_access_token", params, "Token uzaytirilmadi", longToken);
}

// Token allaqachon uzoq muddatlimi? (57+ kun — 1-2 soatlik qisqa token emas)
const LONG_LIVED_MIN_SEC = 5000000;

// Profil olish, lekin OQIMNI TO'XTATMASDAN: fetchProfile yiqilsa va 2-qadam
// javobida user_id bo'lsa — akkaunt minimal profil bilan baribir saqlanadi
// (username'ni keyin kunlik profil cron yoki qo'lda yangilash to'ldiradi).
// user_id ham bo'lmasa — chin xato: akkauntni identifikatsiya qilib bo'lmaydi.
async function profileOrMinimal(token, fallbackUserId) {
  try {
    const profile = await fetchProfile(token, fallbackUserId);
    // 2-qadamdagi user_id — app-scoped ID; webhook moslashtirishda zaxira kalit
    if (!profile.appScopedId && fallbackUserId) profile.appScopedId = String(fallbackUserId);
    return profile;
  } catch (err) {
    if (!fallbackUserId) throw err;
    console.warn(
      `⚠️ Profil olinmadi (${err.message}) — akkaunt 2-qadamdagi user_id (${fallbackUserId}) bilan saqlanadi, profil keyin to'ldiriladi`
    );
    return {
      instagramId: String(fallbackUserId),
      username: null,
      name: null,
      picture: null,
      appScopedId: String(fallbackUserId),
      partial: true, // profil to'liq emas — keyin to'ldiriladi
    };
  }
}

// To'liq oqim: code → uzoq muddatli token + profil (route'ni yengil saqlaydi)
// cfg — loyihaning ilova sozlamalari (berilmasa global env)
export async function completeFlow(code, cfg = null) {
  const c = cfg || globalAppConfig();
  // Instagram ba'zan code oxiriga "#_" qo'shib yuboradi — kesib tashlaymiz
  const cleanCode = String(code || "").split("#")[0];
  if (!cleanCode) throw new Error("Instagram `code` qaytarmadi");

  const { shortToken, expiresIn: codeExpiresIn, userId, permissions } =
    await exchangeCodeForToken(cleanCode, c);

  // 1-holat: Meta bu qadamda ALLAQACHON uzoq muddatli token berdi —
  // ig_exchange_token qadami ortiqcha (u "Unsupported request" beradi)
  if (codeExpiresIn && codeExpiresIn > LONG_LIVED_MIN_SEC) {
    console.log(
      `🔑 Token allaqachon uzoq muddatli (expires_in=${codeExpiresIn}) — almashtirish qadami o'tkazib yuborildi`
    );
    const profile = await profileOrMinimal(shortToken, userId);
    return { token: shortToken, expiresIn: codeExpiresIn, permissions, profile };
  }

  // 2-holat: oddiy yo'l — qisqa tokenni uzoqqa almashtiramiz
  try {
    const { token, expiresIn } = await exchangeForLongLived(shortToken, c);
    const profile = await profileOrMinimal(token, userId);
    return { token, expiresIn, permissions, profile };
  } catch (err) {
    // 3-holat: "Unsupported request" (code 100) — expires_in kelmagan bo'lsa ham
    // token uzoq muddatli bo'lishi mumkin. Token bilan davom etamiz (60 kun deb
    // olamiz, keyin refresh cron uzaytiradi); profil ham minimal bo'lishi mumkin.
    if (err.igUnsupported) {
      console.warn(
        "⚠️ Almashtirish 'Unsupported request' berdi — token allaqachon uzoq muddatli bo'lishi mumkin, tokenning o'zi ishlatiladi"
      );
      const profile = await profileOrMinimal(shortToken, userId);
      return {
        token: shortToken,
        expiresIn: codeExpiresIn || SIXTY_DAYS_SEC,
        permissions,
        profile,
      };
    }
    throw err;
  }
}

// Kutilmagan xatolarni umumiy xatolar buferiga ham yozamiz (/api/errors)
export function reportOAuthError(err) {
  recordError("oauth", err);
}
