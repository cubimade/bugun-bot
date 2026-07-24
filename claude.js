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

// D1: Suhbatlar tahlili (AI Insights) — Haiku, kunlik kesh bilan chaqiriladi.
// messagesText: "[contact_id] Ism: xabar" qatorlari. JSON qaytaradi yoki null.
export async function getInsights(messagesText) {
  try {
    const response = await claude.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 900,
      system:
        "Sen Instagram biznes-suhbatlarini tahlil qiluvchi yordamchisan. " +
        "Faqat toza JSON qaytar (markdown yoki izohsiz), o'zbek tilida (lotin). Format: " +
        '{"top_questions":[{"question":"...","count":N}],' +
        '"sales_ready":[{"contact_id":N,"name":"...","reason":"..."}],' +
        '"kb_gaps":["bilim bazasiga qo\'shish kerak bo\'lgan ma\'lumot"]}. ' +
        "top_questions — eng ko'p so'ralgan 5 tagacha savol mavzusi; " +
        "sales_ready — narx so'ragan yoki sotib olishga qiziqqan mijozlar; " +
        "kb_gaps — bot aniq javob berolmasligi mumkin bo'lgan, bilim bazasiga qo'shish tavsiya etiladigan mavzular (5 tagacha).",
      messages: [
        {
          role: "user",
          content: `Oxirgi 7 kunlik mijoz xabarlari:\n${messagesText}\n\nTahlil qilib JSON qaytar.`,
        },
      ],
    });
    const raw = extractText(response)
      .replace(/^```(json)?/m, "")
      .replace(/```\s*$/m, "")
      .trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    console.error("⚠️ Claude (insights) xatoligi:", err.message);
    return null;
  }
}

// 5-bosqich E4: "Bu hafta nima o'zgardi" — joriy va o'tgan davr raqamlarini
// taqqoslab 2-3 gap xulosa (Haiku, kunlik kesh bilan chaqiriladi).
export async function getWhatsChanged(comparison) {
  try {
    const response = await claude.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 260,
      system:
        "Sen biznes-analitik yordamchisan. Instagram bot statistikasini o'tgan davr bilan " +
        "taqqoslab xulosa yozasan. Faqat o'zbek tilida (lotin), 2-3 gap, aniq raqamlar bilan. " +
        "O'sish/pasayish sabablarini taxmin qilma — faqat faktlar va bitta amaliy tavsiya. " +
        "Ro'yxat yoki sarlavha yozma.",
      messages: [
        {
          role: "user",
          content:
            `Taqqoslash (JSON): ${JSON.stringify(comparison)}. ` +
            `Maydonlar: messages/messagesPrev — xabarlar (joriy/o'tgan 7 kun), ` +
            `activeContacts/activeContactsPrev — faol mijozlar, newContacts — yangi mijozlar, ` +
            `unanswered — bot javob berolmagan savollar, needsHuman — operator kutayotganlar. ` +
            `"Bu hafta nima o'zgardi" xulosasini yoz.`,
        },
      ],
    });
    return extractText(response);
  } catch (err) {
    console.error("⚠️ Claude (haftalik taqqoslash) xatoligi:", err.message);
    return "";
  }
}

// 7.7: Bilim bazasi sifatini baholash (Haiku). JSON yoki null qaytaradi.
// unansweredText — bot javob berolmagan savollar namunasi (bog'lash uchun).
export async function getKnowledgeReview(knowledge, unansweredText = "") {
  try {
    const response = await claude.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 700,
      system:
        "Sen Instagram chat-bot bilim bazasi sifatini baholovchi ekspertsan. " +
        "Faqat toza JSON qaytar (markdown/izohsiz), o'zbek tilida (lotin). Format: " +
        '{"score":N,' +
        '"sections":{"xizmatlar":"ok|partial|missing","narxlar":"ok|partial|missing",' +
        '"aloqa":"ok|partial|missing","ish_vaqti":"ok|partial|missing","faq":"ok|partial|missing"},' +
        '"tips":["aniq tavsiya"],"unanswered_note":"javobsiz savollar haqida 1 gap yoki bo\'sh"}. ' +
        "score — 0-100 umumiy ball (to'liqlik, aniqlik, sotuvga yordami). " +
        "tips — eng muhim 3-5 tavsiya, aniq va amaliy (masalan: 'Narxlar ko'rsatilmagan — mijozlar eng ko'p shuni so'raydi'). " +
        "Agar javobsiz savollar berilgan bo'lsa — qaysilariga bilim bazasida javob yo'qligini unanswered_note'da ayt.",
      messages: [
        {
          role: "user",
          content:
            `Bilim bazasi matni:\n"""\n${String(knowledge || "").slice(0, 12000)}\n"""\n\n` +
            (unansweredText
              ? `Bot javob berolmagan savollar namunasi:\n${unansweredText.slice(0, 2000)}\n\n`
              : "") +
            "Baholab JSON qaytar.",
        },
      ],
    });
    const raw = extractText(response)
      .replace(/^```(json)?/m, "")
      .replace(/```\s*$/m, "")
      .trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    console.error("⚠️ Claude (bilim bazasi bahosi) xatoligi:", err.message);
    return null;
  }
}

// D2: Mijoz kayfiyati (sentiment) — juda arzon Haiku chaqiruvi.
// 'positive' | 'neutral' | 'negative' yoki "" (xatoda).
export async function getSentiment(userTexts) {
  try {
    const response = await claude.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 8,
      system:
        "Mijozning oxirgi xabarlari asosida kayfiyatini aniqla. " +
        "FAQAT bitta so'z qaytar: positive, neutral yoki negative.",
      messages: [{ role: "user", content: userTexts.join("\n").slice(0, 1500) }],
    });
    const word = extractText(response).toLowerCase().trim();
    if (["positive", "neutral", "negative"].includes(word)) return word;
    return "";
  } catch (err) {
    console.error("⚠️ Claude (sentiment) xatoligi:", err.message);
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
