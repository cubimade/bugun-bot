// ============================================================
//  SERVICES/INSTAGRAM-OAUTH.JS — "Instagram bilan ulash" (ROADMAP-15)
//
//  Meta rasmiy oqimi (Instagram Business Login), 4 ta endpoint:
//    1) GET  instagram.com/oauth/authorize         → ruxsat so'rash, code olish
//    2) POST api.instagram.com/oauth/access_token  → code → qisqa token (1 soat)
//    3) GET  graph.instagram.com/access_token      → qisqa → uzoq (60 kun)
//    4) GET  graph.instagram.com/refresh_access_token → yana 60 kun
//
//  MUHIM 1: IG_APP_ID ≠ Meta App ID. OAuth'da Meta App ID ishlatilsa
//           "Invalid platform app" xatosi chiqadi (config.js izohiga qarang).
//  MUHIM 2: token almashinuvidagi user_id — app-scoped ID, u webhook'dagi
//           recipient.id bilan mos kelmasligi mumkin. Shuning uchun bazaga
//           me?fields=user_id dan olingan qiymat yoziladi (fetchProfile).
//  MUHIM 3: bu faylda access_token hech qachon to'liq log qilinmaydi.
// ============================================================
import crypto from "crypto";

import { IG_APP_ID, IG_APP_SECRET, OAUTH_REDIRECT_URI } from "../config.js";
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

// Env to'liq sozlanganmi? Sozlanmasa server yiqilmaydi — UI'da tugma
// o'chirilgan holatda ko'rinadi (isConfigured() shu uchun kerak).
export function isConfigured() {
  return Boolean(IG_APP_ID && IG_APP_SECRET && OAUTH_REDIRECT_URI);
}

// Nima yetishmayotganini aniq aytish (tooltip va xato sahifasi uchun)
export function missingConfig() {
  const miss = [];
  if (!IG_APP_ID) miss.push("IG_APP_ID");
  if (!IG_APP_SECRET) miss.push("IG_APP_SECRET");
  if (!OAUTH_REDIRECT_URI) miss.push("OAUTH_REDIRECT_URI (yoki BASE_URL)");
  return miss;
}

// ------------------------------------------------------------
//  1-qadam: authorize URL (state — CSRF himoyasi, bir martalik)
// ------------------------------------------------------------
export async function buildAuthUrl() {
  const state = crypto.randomBytes(24).toString("hex");
  await saveOAuthState(state);

  const params = new URLSearchParams({
    client_id: IG_APP_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

// state tekshirish — ikkinchi marta ishlatilsa false qaytadi
export async function consumeState(state) {
  return consumeOAuthState(state);
}

// Meta javoblari turli formatda keladi — xato matnini bir xil ko'rinishga solamiz
function errText(json) {
  return (
    json?.error?.message ||
    json?.error_message ||
    json?.error_description ||
    (typeof json?.error === "string" ? json.error : null) ||
    JSON.stringify(json || {}).slice(0, 300)
  );
}

// ------------------------------------------------------------
//  2-qadam: code → qisqa muddatli token (1 soat)
// ------------------------------------------------------------
export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: IG_APP_ID,
    client_secret: IG_APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: OAUTH_REDIRECT_URI,
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

  const perms = payload.permissions;
  return {
    shortToken: payload.access_token,
    permissions: Array.isArray(perms) ? perms.join(",") : String(perms || ""),
  };
}

// ------------------------------------------------------------
//  3-qadam: qisqa → uzoq muddatli token (60 kun)
// ------------------------------------------------------------
export async function exchangeForLongLived(shortToken) {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: IG_APP_SECRET,
    access_token: shortToken,
  });

  const res = await fetch(`${GRAPH}/access_token?${params.toString()}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error || !json.access_token) {
    throw new Error("Uzoq muddatli token olinmadi: " + errText(json));
  }
  return { token: json.access_token, expiresIn: Number(json.expires_in) || SIXTY_DAYS_SEC };
}

// ------------------------------------------------------------
//  4-qadam: profil ma'lumotlari
//  DIQQAT: bazaga `user_id` yoziladi, `id` EMAS. `id` — app-scoped,
//  webhook'dagi entry.id bilan mos kelmaydi va bot DM'ni topa olmaydi.
// ------------------------------------------------------------
export async function fetchProfile(token) {
  const params = new URLSearchParams({
    fields: "user_id,username,name,profile_picture_url",
    access_token: token,
  });

  const res = await fetch(`${GRAPH_V}/me?${params.toString()}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error("Profil olinmadi: " + errText(json));
  }

  const instagramId = String(json.user_id || json.id || "");
  if (!instagramId) throw new Error("Profil javobida akkaunt IDsi yo'q");

  return {
    instagramId,
    username: json.username || null,
    name: json.name || null,
    picture: json.profile_picture_url || null,
    // Diagnostika uchun: user_id va id farq qilsa, bu normal (id — app-scoped)
    appScopedId: json.id ? String(json.id) : null,
  };
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
  const res = await fetch(`${GRAPH}/refresh_access_token?${params.toString()}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error || !json.access_token) {
    throw new Error("Token uzaytirilmadi: " + errText(json));
  }
  return { token: json.access_token, expiresIn: Number(json.expires_in) || SIXTY_DAYS_SEC };
}

// To'liq oqim: code → uzoq muddatli token + profil (route'ni yengil saqlaydi)
export async function completeFlow(code) {
  // Instagram ba'zan code oxiriga "#_" qo'shib yuboradi — kesib tashlaymiz
  const cleanCode = String(code || "").split("#")[0];
  if (!cleanCode) throw new Error("Instagram `code` qaytarmadi");

  const { shortToken, permissions } = await exchangeCodeForToken(cleanCode);
  const { token, expiresIn } = await exchangeForLongLived(shortToken);
  const profile = await fetchProfile(token);
  return { token, expiresIn, permissions, profile };
}

// Kutilmagan xatolarni umumiy xatolar buferiga ham yozamiz (/api/errors)
export function reportOAuthError(err) {
  recordError("oauth", err);
}
