// ============================================================
//  BUGUN-BOT — Instagram AI chat-bot (v2 - yaxshilangan)
//  Elbek Eshmurodov uchun | Claude API bilan ishlaydi
// ============================================================

import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const APP = express();
const PORT = process.env.PORT || 3000;

const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const claude = new Anthropic({ apiKey: ANTHROPIC_KEY });

APP.use(express.json());

// ============================================================
//  BOTNING "AQLI"
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
//  QISM 1: Webhook TEKSHIRUVI
// ============================================================
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
//  QISM 2: XABAR QABUL QILISH (DEBUG rejimi bilan)
// ============================================================
APP.post("/webhook", async (req, res) => {
  res.status(200).send("EVENT_RECEIVED");

  // MUHIM: kelgan HAMMA narsani to'liq logga yozamiz (debug uchun)
  console.log("📬 XABAR KELDI! To'liq mazmun:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const body = req.body;

    // Instagram tekshiruvi (yumshoqroq — object bo'lmasa ham davom etamiz)
    if (body.object && body.object !== "instagram") {
      console.log(`ℹ️ Object turi: ${body.object} (instagram emas, lekin davom etamiz)`);
    }

    // Har bir entry'ni ko'rib chiqamiz
    for (const entry of body.entry || []) {
      // Instagram xabarlari IKKI xil joyda bo'lishi mumkin:
      // 1) entry.messaging (Messenger uslubi)
      // 2) entry.changes (Instagram uslubi)

      // --- 1-usul: messaging ---
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        if (event.message?.is_echo) {
          console.log("↩️ Echo xabar (bot o'zi yuborgan) — o'tkazamiz");
          continue;
        }

        const senderId = event.sender?.id;
        const userText = event.message?.text;

        if (!senderId) {
          console.log("⚠️ senderId topilmadi");
          continue;
        }
        if (!userText) {
          console.log("ℹ️ Matn yo'q (rasm/stiker bo'lishi mumkin) — o'tkazamiz");
          continue;
        }

        console.log(`📩 Yangi xabar (${senderId}): ${userText}`);

        const reply = await getClaudeReply(userText);
        console.log(`🤖 Claude javobi: ${reply}`);

        await sendInstagramMessage(senderId, reply);
      }

      // --- 2-usul: changes (agar messaging bo'sh bo'lsa) ---
      const changes = entry.changes || [];
      for (const change of changes) {
        console.log(`🔄 Change hodisasi: ${change.field}`);
        console.log(JSON.stringify(change.value, null, 2));
      }
    }
  } catch (err) {
    console.error("⚠️ Xatolik:", err.message);
    console.error(err.stack);
  }
});

// ============================================================
//  QISM 3: CLAUDE'DAN JAVOB OLISH
// ============================================================
async function getClaudeReply(userText) {
  try {
    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
    });
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
      console.error("⚠️ Instagram yuborish xatoligi:", JSON.stringify(data.error));
    } else {
      console.log("✅ Javob yuborildi!", JSON.stringify(data));
    }
  } catch (err) {
    console.error("⚠️ Yuborishda xatolik:", err.message);
  }
}

// ============================================================
//  SERVERNI ISHGA TUSHIRISH
// ============================================================
APP.get("/", (req, res) => {
  res.send("🤖 Bugun-bot ishlayapti! (v2)");
});

APP.listen(PORT, () => {
  console.log(`🚀 Bugun-bot ${PORT}-portda ishga tushdi! (v2 - debug rejimi)`);
});
