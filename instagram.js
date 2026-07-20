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

// DM (shaxsiy xabar) yuborish.
export async function sendInstagramMessage(recipientId, text, token = IG_TOKEN) {
  try {
    const data = await igPost(
      `${BASE}/me/messages`,
      { recipient: { id: recipientId }, message: { text } },
      token
    );
    if (data.error) {
      console.error("⚠️ Instagram yuborish xatoligi:", JSON.stringify(data.error));
    } else {
      console.log("✅ Javob yuborildi!", JSON.stringify(data));
    }
  } catch (err) {
    console.error("⚠️ Yuborishda xatolik:", err.message);
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
