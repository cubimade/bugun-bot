// ============================================================
//  ROUTES/WEBHOOK-TELEGRAM.JS — 9.1: Telegram webhook
//  POST /webhook/telegram/:projectId — har bot uchun alohida yo'l.
//  Himoya: setWebhook'da berilgan secret_token har so'rovda
//  X-Telegram-Bot-Api-Secret-Token header'ida keladi.
// ============================================================
import express from "express";

import { telegramWebhookSecret, answerCallback } from "../services/telegram.js";
import { processIncomingText, processIncomingMedia } from "../services/inbound.js";
import { getProjectToken } from "../db.js";
import { state } from "../state.js";

const router = express.Router();

function fullName(from) {
  if (!from) return null;
  return [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || from.username || null;
}

// Inline tugma bosilganda sarlavhasini topish (inbox'da chiroyli ko'rinsin)
function callbackTitle(cb) {
  const rows = cb.message?.reply_markup?.inline_keyboard || [];
  for (const row of rows) {
    for (const b of row) {
      if (b.callback_data === cb.data) return b.text;
    }
  }
  return "[tugma]";
}

router.post("/webhook/telegram/:projectId", async (req, res) => {
  const projectId = Number(req.params.projectId);
  const secret = req.get("x-telegram-bot-api-secret-token") || "";
  if (!Number.isInteger(projectId) || secret !== telegramWebhookSecret(projectId)) {
    console.warn(`🚫 Telegram webhook: secret noto'g'ri (loyiha ${projectId})`);
    return res.sendStatus(403);
  }
  res.status(200).send("OK"); // Telegram'ga darhol javob

  try {
    if (!state.DB_READY) return;
    const project = await getProjectToken(projectId);
    if (!project || project.platform !== "telegram" || !project.access_token) {
      console.warn(`⚠️ Telegram webhook: loyiha ${projectId} topilmadi yoki telegram emas`);
      return;
    }
    const token = project.access_token;
    const u = req.body || {};

    // --- Inline tugma bosildi ---
    if (u.callback_query) {
      const cb = u.callback_query;
      answerCallback(cb.id, token); // "soat" belgisini o'chirish (fonda)
      const chatId = cb.message?.chat?.id ?? cb.from?.id;
      if (!chatId) return;
      await processIncomingText({
        platform: "telegram",
        projectId,
        token,
        senderId: chatId,
        name: fullName(cb.from),
        text: callbackTitle(cb),
        quickPayload: cb.data || null,
      });
      return;
    }

    const m = u.message;
    if (!m || !m.chat) return;
    const chat = m.chat;
    let text = m.text || "";

    // 9.2: Guruhda — faqat bot @mention qilinganda javob beradi
    if (chat.type !== "private") {
      const uname = (project.tg_username || "").toLowerCase();
      if (!uname || !text.toLowerCase().includes("@" + uname)) return;
      text = text.replace(new RegExp("@" + project.tg_username, "ig"), "").trim();
      if (!text) return;
    }

    const base = {
      platform: "telegram",
      projectId,
      token,
      senderId: chat.id,
      name: fullName(m.from),
    };

    if (text) {
      await processIncomingText({ ...base, text });
      return;
    }

    // Media xabarlar
    if (m.voice || m.audio) {
      await processIncomingMedia({
        ...base,
        kind: "audio",
        tgFileId: (m.voice || m.audio).file_id,
      });
    } else if (m.photo?.length) {
      await processIncomingMedia({ ...base, kind: "image" });
    } else if (m.video || m.video_note) {
      await processIncomingMedia({ ...base, kind: "video" });
    } else if (m.document) {
      await processIncomingMedia({ ...base, kind: "file" });
    }
  } catch (err) {
    console.error("⚠️ Telegram webhook xatoligi:", err.message);
  }
});

export default router;
