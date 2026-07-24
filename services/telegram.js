// ============================================================
//  SERVICES/TELEGRAM.JS — 9.1: Telegram Bot API adapteri
//  Instagram adapteri (instagram.js) bilan bir xil natija shakli:
//  { ok: true } yoki { ok: false, error }
//  Token env'da EMAS — database'da (projects.access_token).
// ============================================================
import crypto from "crypto";
import { APP_SECRET, VERIFY_TOKEN } from "../config.js";

const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

async function tgCall(method, body, token) {
  const r = await fetch(API(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// Bot tokenini tekshirish (akkaunt qo'shishda)
export async function verifyBotToken(token) {
  try {
    const data = await tgCall("getMe", {}, token);
    if (!data.ok) return { ok: false, error: data.description || "Token noto'g'ri" };
    return {
      ok: true,
      botId: String(data.result.id),
      username: data.result.username || "",
      name: data.result.first_name || "",
    };
  } catch (err) {
    return { ok: null, error: err.message };
  }
}

// Webhook maxfiy tokeni — Telegram har so'rovda header'da yuboradi
// (X-Telegram-Bot-Api-Secret-Token), soxta so'rovlardan himoya.
export function telegramWebhookSecret(projectId) {
  const seed = APP_SECRET || VERIFY_TOKEN || "bugun-bot";
  return crypto.createHmac("sha256", seed).update("tg:" + projectId).digest("hex").slice(0, 40);
}

export async function setTelegramWebhook(token, url, secret) {
  try {
    const data = await tgCall(
      "setWebhook",
      { url, secret_token: secret, allowed_updates: ["message", "callback_query"] },
      token
    );
    if (!data.ok) return { ok: false, error: data.description || "Webhook o'rnatilmadi" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function sendTelegramMessage(chatId, text, token) {
  try {
    const data = await tgCall("sendMessage", { chat_id: chatId, text: String(text || "").slice(0, 4000) }, token);
    if (!data.ok) {
      console.error("⚠️ Telegram yuborish xatoligi:", data.description);
      return { ok: false, error: data.description || "Telegram xatoligi" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Inline keyboard — buttons: [{ title, payload }], urlButtons: [{ title, url }]
export async function sendTelegramButtons(chatId, text, buttons, token, urlButtons = []) {
  const rows = (buttons || [])
    .filter((b) => b && (b.title || "").trim())
    .slice(0, 13)
    .map((b) => [{ text: String(b.title).slice(0, 40), callback_data: String(b.payload ?? b.title).slice(0, 64) }]);
  for (const u of urlButtons || []) {
    if (u && u.title && /^https?:\/\//.test(u.url || "")) {
      rows.push([{ text: String(u.title).slice(0, 40), url: u.url }]);
    }
  }
  if (!rows.length) return sendTelegramMessage(chatId, text, token);
  try {
    const data = await tgCall(
      "sendMessage",
      {
        chat_id: chatId,
        text: String(text || "").slice(0, 4000),
        reply_markup: { inline_keyboard: rows },
      },
      token
    );
    if (!data.ok) {
      console.error("⚠️ Telegram tugma xatoligi:", data.description);
      return { ok: false, error: data.description || "Telegram xatoligi" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function sendTelegramPhoto(chatId, photoUrl, token, caption = "") {
  try {
    const data = await tgCall("sendPhoto", { chat_id: chatId, photo: photoUrl, caption }, token);
    if (!data.ok) return { ok: false, error: data.description || "Rasm yuborilmadi" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// 9.2: Fayl (PDF va h.k.) yuborish — lead magnit uchun
export async function sendTelegramDocument(chatId, fileUrl, token, caption = "") {
  try {
    const data = await tgCall("sendDocument", { chat_id: chatId, document: fileUrl, caption }, token);
    if (!data.ok) return { ok: false, error: data.description || "Fayl yuborilmadi" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Tugma bosilganda "soat" belgisini o'chirish
export async function answerCallback(callbackId, token) {
  try {
    await tgCall("answerCallbackQuery", { callback_query_id: callbackId }, token);
  } catch {
    /* muhim emas */
  }
}

// 9.2: Kanalga obuna tekshirish — @kanal yoki -100... ID
export async function isChannelMember(channel, userId, token) {
  try {
    const data = await tgCall("getChatMember", { chat_id: channel, user_id: userId }, token);
    if (!data.ok) return { ok: false, error: data.description };
    const st = data.result?.status;
    return { ok: true, member: ["creator", "administrator", "member"].includes(st) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// 9.4: Ovozli xabar faylining URL'ini olish (transkripsiya uchun)
export async function getTelegramFileUrl(fileId, token) {
  try {
    const data = await tgCall("getFile", { file_id: fileId }, token);
    if (!data.ok || !data.result?.file_path) return null;
    return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
  } catch {
    return null;
  }
}
