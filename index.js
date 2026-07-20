// ============================================================
//  BUGUN-BOT — Instagram AI chat-bot (v3 - privacy policy bilan)
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

  console.log("📬 XABAR KELDI! To'liq mazmun:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const body = req.body;

    if (body.object && body.object !== "instagram") {
      console.log(`ℹ️ Object turi: ${body.object} (instagram emas, lekin davom etamiz)`);
    }

    for (const entry of body.entry || []) {
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
//  QISM 5: PRIVACY POLICY (Meta publish uchun talab qiladi)
// ============================================================
APP.get("/privacy", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maxfiylik siyosati — Bugun Bot</title>
  <style>
    body { font-family: -apple-system, Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #222; }
    h1 { color: #1a1a2e; } h2 { color: #16213e; margin-top: 28px; }
    .date { color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Maxfiylik siyosati</h1>
  <p class="date">Oxirgi yangilanish: 2026-yil 20-iyul</p>
  <p>Ushbu maxfiylik siyosati "Bugun Bot" (Elbek Eshmurodovning Instagram avtomatik javob berish xizmati) qanday ma'lumotlarni qayta ishlashini tushuntiradi.</p>
  <h2>1. Qanday ma'lumot yig'amiz</h2>
  <p>Bot faqat siz Instagram orqali yuborgan xabarlarni qabul qiladi va ularga javob berish uchun ishlatadi. Biz sizning ismingiz (Instagram foydalanuvchi identifikatori) va yuborgan xabaringiz matnini vaqtincha qayta ishlaymiz.</p>
  <h2>2. Ma'lumotdan qanday foydalanamiz</h2>
  <p>Sizning xabaringiz avtomatik javob tayyorlash uchun sun'iy intellekt xizmatiga yuboriladi. Javob tayyorlangach, Instagram orqali sizga qaytariladi. Biz ma'lumotlaringizni uchinchi shaxslarga sotmaymiz.</p>
  <h2>3. Ma'lumotni saqlash</h2>
  <p>Bot xabarlaringizni doimiy saqlamaydi. Xabar faqat javob tayyorlash paytida vaqtincha qayta ishlanadi.</p>
  <h2>4. Ma'lumotni o'chirish</h2>
  <p>Ma'lumotlaringizni o'chirishni so'rash uchun quyidagi manzilga murojaat qiling: elbeshmurodov@gmail.com</p>
  <h2>5. Aloqa</h2>
  <p>Savollaringiz bo'lsa, biz bilan bog'laning: elbeshmurodov@gmail.com</p>
</body>
</html>
  `);
});

APP.get("/data-deletion", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="uz">
<head><meta charset="UTF-8"><title>Ma'lumotni o'chirish — Bugun Bot</title>
<style>body { font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.7; }</style>
</head>
<body>
  <h1>Ma'lumotni o'chirish</h1>
  <p>Bugun Bot xabarlaringizni doimiy saqlamaydi. Agar ma'lumotlaringizni o'chirishni istasangiz, quyidagi manzilga murojaat qiling:</p>
  <p><strong>elbeshmurodov@gmail.com</strong></p>
  <p>So'rovingiz 48 soat ichida ko'rib chiqiladi.</p>
</body>
</html>
  `);
});

// ============================================================
//  SERVERNI ISHGA TUSHIRISH
// ============================================================
APP.get("/", (req, res) => {
  res.send("🤖 Bugun-bot ishlayapti! (v3)");
});

APP.listen(PORT, () => {
  console.log(`🚀 Bugun-bot ${PORT}-portda ishga tushdi! (v3 - privacy policy bilan)`);
});
