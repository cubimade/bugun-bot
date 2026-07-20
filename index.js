// ============================================================
//  BUGUN-BOT — Instagram AI chat-bot
//  Elbek Eshmurodov uchun | Claude API bilan ishlaydi
// ============================================================
//
//  Bu server 3 ta ishni qiladi:
//  1. Instagram'dan DM (shaxsiy xabar) qabul qiladi
//  2. Xabarni Claude'ga yuboradi
//  3. Claude yozgan javobni Instagram'ga qaytaradi
//
// ============================================================

import express from "express";
import Anthropic from "@anthropic-ai/sdk";

// --- Sozlamalar (bu qiymatlar Railway'da "Variables" dan olinadi) ---
const APP = express();
const PORT = process.env.PORT || 3000;

const IG_TOKEN = process.env.IG_ACCESS_TOKEN;        // Instagram token
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;       // Webhook maxfiy so'zi
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY; // Claude kaliti

// --- Claude'ni sozlash ---
const claude = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Kelgan ma'lumotni JSON sifatida o'qish (bu webhook'dan OLDIN bo'lishi shart)
APP.use(express.json());

// ============================================================
//  BOTNING "AQLI" — Claude qanday javob berishini shu belgilaydi
//  Bu matnni o'zgartirib, botning xarakterini o'zgartirishingiz mumkin
// ============================================================
const SYSTEM_PROMPT = `Sen Elbek Eshmurodovning Instagram sahifasi uchun yordamchi assistentisan.
Elbek — shaxsiy brend va kontent-marketing bo'yicha mutaxassis.

Qanday javob berasan:
- Faqat o'zbek tilida (lotin alifbosida) yoz
- Do'stona, samimiy, lekin professional bo'l
- Odamlarga hurmat bilan murojaat qil ("siz")
- Qisqa va aniq javob ber (2-4 gap yetarli)
- Agar savol Elbek yoki uning xizmatlari haqida bo'lsa, yordam ber
- Agar biror narsani bilmasang, halol ayt va Elbek bilan bog'lanishni taklif qil
- Emoji'lardan me'yorida foydalanish mumkin

Sen mijoz bilan birinchi aloqadasan — iliq va yordamga tayyor bo'l.`;

// ============================================================
//  QISM 1: Webhook TEKSHIRUVI (Meta buni bir marta so'raydi)
// ============================================================
// Meta serverni ulaganda "sen haqiqiy serverimisan?" deb tekshiradi.
// Biz maxfiy so'z (verify token) bilan javob beramiz.
APP.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook tasdiqlandi!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook tasdiqlanmadi — token noto'g'ri");
    res.sendStatus(403);
  }
});

// ============================================================
//  QISM 2: XABAR QABUL QILISH (Instagram DM keladi)
// ============================================================
APP.post("/webhook", async (req, res) => {
  // Darrov "OK" javob beramiz (Meta 20 soniya kutadi, kechiktirmaymiz)
  res.status(200).send("EVENT_RECEIVED");

  try {
    const body = req.body;

    // Xabar Instagram'dan kelganini tekshiramiz
    if (body.object !== "instagram") return;

    // Har bir kelgan xabarni ko'rib chiqamiz
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        // Bot o'zi yuborgan xabarga javob bermasligi kerak (aks holda cheksiz aylanadi)
        if (event.message?.is_echo) continue;

        const senderId = event.sender?.id;      // Kim yozdi
        const userText = event.message?.text;    // Nima yozdi

        // Faqat matnli xabarlarga javob beramiz
        if (!senderId || !userText) continue;

        console.log(`📩 Yangi xabar (${senderId}): ${userText}`);

        // Claude'dan javob olamiz
        const reply = await getClaudeReply(userText);
        console.log(`🤖 Claude javobi: ${reply}`);

        // Javobni Instagram'ga yuboramiz
        await sendInstagramMessage(senderId, reply);
      }
    }
  } catch (err) {
    console.error("⚠️ Xatolik:", err.message);
  }
});

// ============================================================
//  QISM 3: CLAUDE'DAN JAVOB OLISH
// ============================================================
async function getClaudeReply(userText) {
  try {
    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001", // Tez va arzon model (DM uchun ideal)
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
    });

    // Claude javobini matn sifatida olamiz
    return response.content[0].text;
  } catch (err) {
    console.error("⚠️ Claude xatoligi:", err.message);
    return "Kechirasiz, hozir javob bera olmayapman. Birozdan keyin urinib ko'ring.";
  }
}

// ============================================================
//  QISM 4: INSTAGRAM'GA XABAR YUBORISH
// ============================================================
async function sendInstagramMessage(recipientId, text) {
  const url = `https://graph.instagram.com/v21.0/me/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${IG_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("⚠️ Instagram yuborish xatoligi:", data.error.message);
    } else {
      console.log("✅ Javob yuborildi!");
    }
  } catch (err) {
    console.error("⚠️ Yuborishda xatolik:", err.message);
  }
}

// ============================================================
//  SERVERNI ISHGA TUSHIRISH
// ============================================================
// Bosh sahifa — server ishlab turganini tekshirish uchun
APP.get("/", (req, res) => {
  res.send("🤖 Bugun-bot ishlayapti!");
});

APP.listen(PORT, () => {
  console.log(`🚀 Bugun-bot ${PORT}-portda ishga tushdi!`);
});
