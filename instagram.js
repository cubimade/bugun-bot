// ============================================================
//  INSTAGRAM.JS — Instagram Graph API'ga xabar/komment yuborish
//  Har funksiya `token` oladi — ko'p akkaunt uchun to'g'ri akkaunt tokeni.
// ============================================================

import { IG_TOKEN } from "./config.js";

const BASE = "https://graph.instagram.com/v21.0";

// Ichki yordamchi — POST so'rov yuborib, JSON qaytaradi.
async function igPost(url, body, token) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

// Token tekshiruvi — akkaunt qo'shishda token haqiqatan ishlashini tasdiqlaydi.
// ok: true (ishlaydi) | false (Instagram rad etdi) | null (tarmoq xatosi — aniqlanmadi)
export async function verifyToken(token) {
  try {
    const r = await fetch(`${BASE}/me?fields=user_id,username`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    if (data.error) {
      return { ok: false, error: data.error.message || "Token noto'g'ri" };
    }
    return {
      ok: true,
      userId: String(data.user_id || data.id || ""),
      username: data.username || "",
    };
  } catch (err) {
    return { ok: null, error: err.message };
  }
}

// Webhook obunasini tekshirish (7.2 diagnostika).
// ok: true + subscribed/fields | false (so'rov rad etildi) | null (aniqlab bo'lmadi)
export async function checkSubscription(token) {
  try {
    const r = await fetch(`${BASE}/me/subscribed_apps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    if (data.error) return { ok: false, error: data.error.message || "Tekshirib bo'lmadi" };
    const apps = data.data || [];
    return {
      ok: true,
      subscribed: apps.length > 0,
      fields: apps[0]?.subscribed_fields || [],
    };
  } catch (err) {
    return { ok: null, error: err.message };
  }
}

// DM (shaxsiy xabar) yuborish.
// Natija: { ok: true } yoki { ok: false, error: "..." } — dashboard'dagi
// qo'lda javob va broadcast muvaffaqiyatni bilishi uchun.
export async function sendInstagramMessage(recipientId, text, token = IG_TOKEN) {
  try {
    const data = await igPost(
      `${BASE}/me/messages`,
      { recipient: { id: recipientId }, message: { text } },
      token
    );
    if (data.error) {
      console.error("⚠️ Instagram yuborish xatoligi:", JSON.stringify(data.error));
      return { ok: false, error: data.error.message || "Instagram xatoligi" };
    }
    console.log("✅ Javob yuborildi!", JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    console.error("⚠️ Yuborishda xatolik:", err.message);
    return { ok: false, error: err.message };
  }
}

// Rasm (media) yuborish — kalit so'z javobidagi media_url uchun (7.4)
export async function sendInstagramImage(recipientId, imageUrl, token = IG_TOKEN) {
  try {
    const data = await igPost(
      `${BASE}/me/messages`,
      {
        recipient: { id: recipientId },
        message: { attachment: { type: "image", payload: { url: imageUrl } } },
      },
      token
    );
    if (data.error) {
      console.error("⚠️ Rasm yuborish xatoligi:", JSON.stringify(data.error));
      return { ok: false, error: data.error.message || "Instagram xatoligi" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Kommentga ommaviy javob (komment ostiga).
export async function replyToComment(commentId, text, token = IG_TOKEN) {
  try {
    const data = await igPost(`${BASE}/${commentId}/replies`, { message: text }, token);
    if (data.error) {
      console.error("⚠️ Kommentga javob xatoligi:", JSON.stringify(data.error));
    } else {
      console.log("✅ Kommentga ommaviy javob yozildi!", JSON.stringify(data));
    }
  } catch (err) {
    console.error("⚠️ Kommentga javobda xatolik:", err.message);
  }
}

// Komment yozgan odamga shaxsiy DM (private reply — recipient.comment_id).
export async function sendPrivateReply(commentId, text, token = IG_TOKEN) {
  try {
    const data = await igPost(
      `${BASE}/me/messages`,
      { recipient: { comment_id: commentId }, message: { text } },
      token
    );
    if (data.error) {
      console.error("⚠️ Shaxsiy DM xatoligi:", JSON.stringify(data.error));
    } else {
      console.log("✅ Kommentga shaxsiy DM yuborildi!", JSON.stringify(data));
    }
  } catch (err) {
    console.error("⚠️ Shaxsiy DM'da xatolik:", err.message);
  }
}
