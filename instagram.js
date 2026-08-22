// ============================================================
//  INSTAGRAM.JS — Instagram Graph API'ga xabar/komment yuborish
//  Har funksiya `token` oladi — ko'p akkaunt uchun to'g'ri akkaunt tokeni.
// ============================================================

import { IG_TOKEN } from "./config.js";
import { sanitizeForInstagram } from "./services/sanitize.js";

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
      // code — diagnostikada tushunarli tarjima uchun (ROADMAP-19 FAZA 5)
      return { ok: false, error: data.error.message || "Token noto'g'ri", code: data.error.code };
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
      // ROADMAP-18 FAZA 3: IG markdown'ni render qilmaydi — yuborishdan
      // oldingi oxirgi nuqtada tozalanadi (barcha yuborish yo'llari shu yerdan o'tadi)
      { recipient: { id: recipientId }, message: { text: sanitizeForInstagram(text) } },
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

// 8.1: Tugmali xabar (quick replies) — Instagram maksimum 13 ta tugma,
// har tugma sarlavhasi 20 belgigacha. buttons: [{ title, payload }]
export async function sendButtons(recipientId, text, buttons, token = IG_TOKEN) {
  const quickReplies = (buttons || [])
    .filter((b) => b && (b.title || "").trim())
    .slice(0, 13)
    .map((b) => ({
      content_type: "text",
      title: String(b.title).trim().slice(0, 20),
      payload: String(b.payload ?? b.title).slice(0, 1000),
    }));
  // Tugma yo'q bo'lsa — oddiy matn sifatida yuboramiz (yiqilmaslik uchun)
  if (!quickReplies.length) return sendInstagramMessage(recipientId, text, token);
  try {
    const data = await igPost(
      `${BASE}/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: sanitizeForInstagram(text).slice(0, 1000), quick_replies: quickReplies },
      },
      token
    );
    if (data.error) {
      console.error("⚠️ Tugmali xabar xatoligi:", JSON.stringify(data.error));
      return { ok: false, error: data.error.message || "Instagram xatoligi" };
    }
    console.log(`✅ Tugmali xabar yuborildi (${quickReplies.length} tugma)`);
    return { ok: true };
  } catch (err) {
    console.error("⚠️ Tugmali xabarda xatolik:", err.message);
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
    const data = await igPost(`${BASE}/${commentId}/replies`, { message: sanitizeForInstagram(text) }, token);
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
      { recipient: { comment_id: commentId }, message: { text: sanitizeForInstagram(text) } },
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
