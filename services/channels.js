// ============================================================
//  SERVICES/CHANNELS.JS — 9.1: platforma adapterlarining umumiy
//  interfeysi. Har platforma uchun bir xil: text / image / buttons.
//  buttons: [{ title, payload }] — IG'da quick replies, TG'da inline.
// ============================================================
import {
  sendInstagramMessage,
  sendInstagramImage,
  sendButtons as sendInstagramButtons,
} from "../instagram.js";
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramButtons,
} from "./telegram.js";

export function senderFor(platform, token) {
  if (platform === "telegram") {
    return {
      platform,
      text: (userId, text) => sendTelegramMessage(userId, text, token),
      image: (userId, url) => sendTelegramPhoto(userId, url, token),
      buttons: (userId, text, buttons, urlButtons) =>
        sendTelegramButtons(userId, text, buttons, token, urlButtons),
    };
  }
  return {
    platform: "instagram",
    text: (userId, text) => sendInstagramMessage(userId, text, token),
    image: (userId, url) => sendInstagramImage(userId, url, token),
    // IG'da URL tugma yo'q — havolalar matn sifatida qo'shiladi
    buttons: async (userId, text, buttons, urlButtons = []) => {
      const extra = (urlButtons || [])
        .filter((u) => u && u.title && u.url)
        .map((u) => `${u.title}: ${u.url}`)
        .join("\n");
      return sendInstagramButtons(userId, extra ? `${text}\n\n${extra}` : text, buttons, token);
    },
  };
}
