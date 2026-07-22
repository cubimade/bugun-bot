// ============================================================
//  CLAUDE.JS — AI javob mantiqi (Anthropic Claude bilan ishlash)
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import {
  ANTHROPIC_KEY,
  MODEL_HAIKU,
  SYSTEM_PROMPT,
  COMMENT_SYSTEM_PROMPT,
} from "./config.js";

const claude = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Javobdan matnni ishonchli ajratib olish.
// content[0] har doim ham matn bloki bo'lavermaydi (modelga qarab boshqa
// blok turi kelishi mumkin) — shuning uchun birinchi "text" blokini topamiz.
function extractText(response) {
  const blocks = response?.content || [];
  const textBlock = blocks.find((b) => b.type === "text" && typeof b.text === "string");
  return textBlock ? textBlock.text.trim() : "";
}

// DM suhbatiga javob. `messages` — to'liq suhbat tarixi [{role, content}].
// `systemPrompt` — akkauntga xos prompt (bilim bazasi bilan, Bosqich 2).
export async function getClaudeReply(messages, systemPrompt = SYSTEM_PROMPT, model = MODEL_HAIKU) {
  try {
    const params = {
      model,
      max_tokens: 500,
      system: systemPrompt,
      messages,
    };
    // Sonnet-5 (va yangi modellar) sukut bo'yicha "adaptive thinking" yoqadi —
    // bu qo'shimcha kechikish va token sarflaydi, hamda content[0] matn emas,
    // "thinking" bloki bo'lib qoladi. Chatbot uchun to'g'ridan-to'g'ri, tez javob
    // kerak, shuning uchun Haiku'dan boshqa modellarda thinking'ni o'chiramiz.
    // (Haiku sukut bo'yicha thinkingsiz ishlaydi va "disabled" ni qabul qilmaydi.)
    if (model !== MODEL_HAIKU) {
      params.thinking = { type: "disabled" };
    }
    const response = await claude.messages.create(params);
    const text = extractText(response);
    return text || "Kechirasiz, javobni tayyorlab bo'lmadi. Iltimos, qayta yozing.";
  } catch (err) {
    console.error("⚠️ Claude xatoligi:", err.message);
    return "Kechirasiz, hozir javob bera olmayapman. Birozdan keyin urinib ko'ring.";
  }
}

// Kunlik xulosa (dashboard "Bugungi xulosa" kartasi, Haiku — tejamkor).
// Xato bo'lsa bo'sh satr qaytaradi — chaqiruvchi o'zi fallback quradi.
export async function getDailySummary(digest) {
  try {
    const response = await claude.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 220,
      system:
        "Sen Instagram chat-bot platformasi egasiga kunlik xulosa yozuvchi yordamchisan. " +
        "Faqat o'zbek tilida (lotin), 2-3 gap, do'stona lekin ishchan ohang. " +
        "Raqamlarni tabiiy gapga aylantir, ro'yxat yoki sarlavha yozma. " +
        "Agar operator kutayotgan suhbatlar bo'lsa, buni alohida ta'kidla.",
      messages: [
        {
          role: "user",
          content:
            `Bugungi statistika (JSON): ${JSON.stringify(digest)}. ` +
            `Maydonlar: todayMessages — bugungi xabarlar, newContacts — yangi mijozlar, ` +
            `needsHuman — operator kutayotgan suhbatlar, topAccount — eng faol akkaunt, ` +
            `priceAsks — narx so'ragan mijozlar. Xulosa yoz.`,
        },
      ],
    });
    return extractText(response);
  } catch (err) {
    console.error("⚠️ Claude (kunlik xulosa) xatoligi:", err.message);
    return "";
  }
}

// Kommentga qisqa javob.
export async function getCommentReply(
  commentText,
  username,
  systemPrompt = COMMENT_SYSTEM_PROMPT
) {
  try {
    const response = await claude.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 150,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Komment${username ? " (@" + username + ")" : ""}: ${commentText}`,
        },
      ],
    });
    return extractText(response) || "Rahmat! 🙌";
  } catch (err) {
    console.error("⚠️ Claude (komment) xatoligi:", err.message);
    return "Rahmat! 🙌";
  }
}
