// ============================================================
//  SERVICES/INBOUND-MEDIA.JS — 7.6: MEDIA XABAR — tayyor javob (AI'siz).
//  (13-audit: inbound.js 590 qator edi — shu qism alohida faylga ajratildi)
//  msg: { platform, projectId, token, senderId, name?, kind }
//  kind: image | audio | video | share | story_mention | file
// ============================================================
import {
  getOrCreateContact,
  saveMessage,
  setBotPaused,
  resetFollowupCount,
} from "../db.js";
import { sttAvailable, transcribeAudio } from "./stt.js";
import { getTelegramFileUrl } from "./telegram.js";
import { senderFor } from "./channels.js";
import { state } from "../state.js";
import { isRateLimited } from "./inbound-guards.js";
import { processIncomingText } from "./inbound.js";

const MEDIA_LABELS = {
  image: "[rasm]",
  audio: "[ovozli xabar]",
  video: "[video]",
  share: "[ulashilgan post]",
  story_mention: "[story'da belgilagan]",
};
const DEFAULT_IMAGE_REPLY =
  "Rasmni oldim! 📸 Savolingizni yozib yuborsangiz, aniq javob beraman.";
const DEFAULT_AUDIO_REPLY =
  "Ovozli xabaringizni oldim 🎤 Iltimos, savolingizni matn bilan yozing — shunda tez javob beraman.";
const DEFAULT_MEDIA_REPLY =
  "Xabaringizni oldim! 🙌 Savolingizni matn bilan yozsangiz, tez javob beraman.";

export async function processIncomingMedia(msg) {
  const { platform, projectId, token, senderId, kind } = msg;
  const send = senderFor(platform, token);
  if (isRateLimited(`${platform}:${senderId}`)) {
    console.log(`🚦 Rate limit: ${senderId} — media o'tkazildi`);
    return;
  }

  // 9.4: Ovozli xabar → matn (ELEVENLABS_API_KEY bo'lsa)
  if (kind === "audio" && sttAvailable()) {
    let audioUrl = msg.mediaUrl || null;
    if (!audioUrl && msg.tgFileId) {
      audioUrl = await getTelegramFileUrl(msg.tgFileId, token);
    }
    if (audioUrl) {
      const transcript = await transcribeAudio(audioUrl);
      if (transcript) {
        // Matnga o'girildi — odatdagi AI oqimi (inbox'da 🎤 belgisi bilan)
        await processIncomingText({ ...msg, text: transcript, voiceTranscribed: true });
        return;
      }
    }
    console.log("🎤 Transkripsiya bo'lmadi — tayyor javob yuboriladi");
  }
  const label = MEDIA_LABELS[kind] || "[fayl]";
  console.log(`📎 Media xabar [${platform}] (${senderId}): ${label}`);

  let contactId = null;
  let paused = false;
  if (state.DB_READY && projectId) {
    try {
      const contact = await getOrCreateContact(projectId, String(senderId), msg.name || null);
      contactId = contact.id;
      await saveMessage(contactId, "user", label);
      resetFollowupCount(contactId).catch(() => {});
      if (contact.bot_paused) {
        const until = contact.paused_until ? new Date(contact.paused_until) : null;
        if (until && until <= new Date()) {
          await setBotPaused(contactId, false, null);
        } else {
          paused = true;
        }
      }
    } catch (dbErr) {
      console.error("⚠️ Media xabarni saqlashda xatolik:", dbErr.message);
    }
  }
  if (paused) {
    console.log(`🔕 Bot pauzada (mijoz ${contactId}) — media javobsiz qoldirildi`);
    return;
  }

  const reply =
    kind === "audio"
      ? state.SETTINGS.media_audio_reply || DEFAULT_AUDIO_REPLY
      : kind === "image"
        ? state.SETTINGS.media_image_reply || DEFAULT_IMAGE_REPLY
        : DEFAULT_MEDIA_REPLY;

  if (contactId) {
    try {
      await saveMessage(contactId, "assistant", reply);
    } catch (dbErr) {
      console.error("⚠️ Saqlashda xatolik:", dbErr.message);
    }
  }
  await send.text(senderId, reply);
}
