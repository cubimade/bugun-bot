// ============================================================
//  BUGUN-BOT — Instagram AI chat-bot (v3 - privacy policy bilan)
//  Elbek Eshmurodov uchun | Claude API bilan ishlaydi
// ============================================================

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  initDb,
  getOrCreateProject,
  getOrCreateContact,
  saveMessage,
  getConversationHistory,
  getStats,
} from "./db.js";

const APP = express();
const PORT = process.env.PORT || 3000;

const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const claude = new Anthropic({ apiKey: ANTHROPIC_KEY });

APP.use(express.json());

// ============================================================
//  DATABASE holati
//  DB_READY — jadvallar tayyor bo'lsa true.
//  DEFAULT_PROJECT_ID — barcha mijozlar biriktiriladigan asosiy akkaunt.
// ============================================================
let DB_READY = false;
let DEFAULT_PROJECT_ID = null;

async function setupDatabase() {
  try {
    DB_READY = await initDb();
    if (DB_READY) {
      DEFAULT_PROJECT_ID = await getOrCreateProject("Elbek Eshmurodov Instagram");
      console.log(`✅ Asosiy loyiha tayyor (id: ${DEFAULT_PROJECT_ID}).`);
    }
  } catch (err) {
    console.error("⚠️ Database sozlashda xatolik:", err.message);
    DB_READY = false;
  }
}

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

// Kommentlarga javob uchun alohida, qisqaroq "aql"
const COMMENT_SYSTEM_PROMPT = `Sen Elbek Eshmurodovning Instagram postlaridagi kommentlarga javob beruvchi assistentsan.
Qoidalar:
- Faqat o'zbek tilida (lotin alifbosida) yoz.
- JUDA qisqa javob ber — 1 gap, ko'pi bilan 2 gap.
- Iliq, do'stona, samimiy ohang. 1-2 ta emoji ishlatsa bo'ladi.
- Kommentga mos tabiiy javob yoz: minnatdorchilik, qisqa javob yoki savol bo'lsa DM'ga taklif.
- Reklama qilma, ortiqcha uzun yozma.`;

// Ixtiyoriy: komment yozgan odamga avtomatik DM yuborish (ManyChat uslubi).
// Railway'da AUTO_DM_ON_COMMENT=false qilib o'chirib qo'yish mumkin.
const AUTO_DM_ON_COMMENT = (process.env.AUTO_DM_ON_COMMENT ?? "true") !== "false";

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

        // --- Doimiy xotira: mijoz + suhbat tarixi ---
        let contactId = null;
        let history = [];
        if (DB_READY && DEFAULT_PROJECT_ID) {
          try {
            contactId = await getOrCreateContact(DEFAULT_PROJECT_ID, senderId);
            await saveMessage(contactId, "user", userText);
            history = await getConversationHistory(contactId, 20);
          } catch (dbErr) {
            console.error("⚠️ Xabarni saqlashda xatolik:", dbErr.message);
          }
        }

        // Agar tarix bo'lmasa (DB o'chiq), joriy xabarning o'zini beramiz
        if (history.length === 0) {
          history = [{ role: "user", content: userText }];
        }

        const reply = await getClaudeReply(history);
        console.log(`🤖 Claude javobi: ${reply}`);

        // Botning javobini ham xotiraga yozamiz
        if (contactId) {
          try {
            await saveMessage(contactId, "assistant", reply);
          } catch (dbErr) {
            console.error("⚠️ Javobni saqlashda xatolik:", dbErr.message);
          }
        }

        await sendInstagramMessage(senderId, reply);
      }

      const changes = entry.changes || [];
      for (const change of changes) {
        console.log(`🔄 Change hodisasi: ${change.field}`);
        if (change.field === "comments") {
          await handleComment(entry, change.value);
        } else {
          console.log(JSON.stringify(change.value, null, 2));
        }
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
async function getClaudeReply(messages) {
  try {
    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages, // to'liq suhbat tarixi — [{ role, content }, ...]
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
//  QISM 4B: KOMMENTLARGA JAVOB BERISH
// ============================================================
async function handleComment(entry, value) {
  try {
    const commentId = value?.id;
    const commentText = value?.text;
    const fromId = value?.from?.id;
    const username = value?.from?.username;
    const accountId = entry?.id; // webhook kelgan biznes-akkaunt IDsi

    if (!commentId || !commentText) {
      console.log("ℹ️ Komment matni yoki ID yo'q — o'tkazamiz");
      return;
    }

    // O'z kommentimizga javob bermaymiz (cheksiz tsikl oldini olish)
    if (fromId && accountId && fromId === accountId) {
      console.log("↩️ Bu botning o'z kommenti — o'tkazamiz");
      return;
    }

    console.log(`💬 Yangi komment (@${username || fromId}): ${commentText}`);

    const reply = await getCommentReply(commentText, username);
    console.log(`🤖 Komment javobi: ${reply}`);

    // 1) Ommaviy javob — komment ostiga yoziladi
    await replyToComment(commentId, reply);

    // 2) Ixtiyoriy: komment yozgan odamga shaxsiy DM (ManyChat uslubi)
    if (AUTO_DM_ON_COMMENT) {
      const dmText = `Salom${username ? " @" + username : ""}! Kommentingiz uchun rahmat 🙏 Savolingiz bo'lsa, shu yerda — DM'da bemalol yozing, yordam beraman. 😊`;
      await sendPrivateReply(commentId, dmText);
    }
  } catch (err) {
    console.error("⚠️ Komment qayta ishlashda xatolik:", err.message);
  }
}

// Komment uchun qisqa Claude javobi
async function getCommentReply(commentText, username) {
  try {
    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: COMMENT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Komment${username ? " (@" + username + ")" : ""}: ${commentText}`,
        },
      ],
    });
    return response.content[0].text.trim();
  } catch (err) {
    console.error("⚠️ Claude (komment) xatoligi:", err.message);
    return "Rahmat! 🙌";
  }
}

// Kommentga ommaviy javob yozish (POST /{comment-id}/replies)
async function replyToComment(commentId, text) {
  const url = `https://graph.instagram.com/v21.0/${commentId}/replies`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${IG_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: text }),
    });
    const data = await response.json();
    if (data.error) {
      console.error("⚠️ Kommentga javob xatoligi:", JSON.stringify(data.error));
    } else {
      console.log("✅ Kommentga ommaviy javob yozildi!", JSON.stringify(data));
    }
  } catch (err) {
    console.error("⚠️ Kommentga javobda xatolik:", err.message);
  }
}

// Komment yozgan odamga shaxsiy DM (private reply — recipient.comment_id)
async function sendPrivateReply(commentId, text) {
  const url = `https://graph.instagram.com/v21.0/me/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${IG_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text: text },
      }),
    });
    const data = await response.json();
    if (data.error) {
      console.error("⚠️ Shaxsiy DM xatoligi:", JSON.stringify(data.error));
    } else {
      console.log("✅ Kommentga shaxsiy DM yuborildi!", JSON.stringify(data));
    }
  } catch (err) {
    console.error("⚠️ Shaxsiy DM'da xatolik:", err.message);
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
//  QISM 6: STATISTIKA SAHIFASI (/stats)
// ============================================================
APP.get("/stats", async (req, res) => {
  if (!DB_READY) {
    res
      .status(503)
      .send("<h1>📊 Statistika mavjud emas</h1><p>Database ulanmagan (DATABASE_URL topilmadi).</p>");
    return;
  }

  try {
    const stats = await getStats();

    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const fmt = (d) => (d ? new Date(d).toLocaleString("uz-UZ") : "—");

    const topRows = stats.topContacts
      .map(
        (c) => `
        <tr>
          <td>${esc(c.name || c.ig_user_id)}</td>
          <td style="text-align:center">${c.msg_count}</td>
          <td>${fmt(c.last_msg)}</td>
        </tr>`
      )
      .join("");

    const recentRows = stats.recent
      .map(
        (m) => `
        <tr>
          <td>${fmt(m.created_at)}</td>
          <td><span class="badge ${m.role}">${m.role === "user" ? "Mijoz" : "Bot"}</span></td>
          <td>${esc(m.name || m.ig_user_id)}</td>
          <td>${esc(m.text)}</td>
        </tr>`
      )
      .join("");

    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statistika — Bugun Bot</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Arial, sans-serif; background: #0f0f1e; color: #e8e8f0; margin: 0; padding: 24px; }
    h1 { color: #fff; margin: 0 0 4px; }
    .sub { color: #888; font-size: 14px; margin-bottom: 24px; }
    .cards { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
    .card { background: linear-gradient(135deg, #1a1a2e, #23234a); border: 1px solid #2d2d55; border-radius: 14px; padding: 20px 28px; min-width: 160px; }
    .card .num { font-size: 40px; font-weight: 700; color: #7c8cff; }
    .card .label { color: #aaa; font-size: 14px; margin-top: 4px; }
    h2 { color: #fff; font-size: 18px; margin: 28px 0 12px; }
    table { width: 100%; border-collapse: collapse; background: #16162a; border-radius: 12px; overflow: hidden; }
    th, td { padding: 10px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid #26264a; }
    th { background: #1e1e3a; color: #bbb; font-weight: 600; }
    td { color: #ddd; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge.user { background: #2a4d69; color: #9cd; }
    .badge.assistant { background: #3d2a5a; color: #c9a; }
    .wrap { overflow-x: auto; }
    .empty { color: #777; padding: 16px; }
  </style>
</head>
<body>
  <h1>📊 Bugun Bot — Statistika</h1>
  <div class="sub">Yangilangan: ${fmt(new Date())}</div>

  <div class="cards">
    <div class="card"><div class="num">${stats.projects}</div><div class="label">Akkauntlar</div></div>
    <div class="card"><div class="num">${stats.contacts}</div><div class="label">Mijozlar</div></div>
    <div class="card"><div class="num">${stats.messages}</div><div class="label">Jami xabarlar</div></div>
  </div>

  <h2>🏆 Eng faol mijozlar</h2>
  <div class="wrap">
    <table>
      <thead><tr><th>Mijoz</th><th style="text-align:center">Xabarlar</th><th>Oxirgi faollik</th></tr></thead>
      <tbody>${topRows || `<tr><td colspan="3" class="empty">Hali mijozlar yo'q</td></tr>`}</tbody>
    </table>
  </div>

  <h2>💬 Oxirgi suhbatlar</h2>
  <div class="wrap">
    <table>
      <thead><tr><th>Vaqt</th><th>Kim</th><th>Mijoz</th><th>Xabar</th></tr></thead>
      <tbody>${recentRows || `<tr><td colspan="4" class="empty">Hali xabarlar yo'q</td></tr>`}</tbody>
    </table>
  </div>
</body>
</html>
    `);
  } catch (err) {
    console.error("⚠️ /stats xatoligi:", err.message);
    res.status(500).send("<h1>Xatolik</h1><p>Statistikani olishda muammo yuz berdi.</p>");
  }
});

// ============================================================
//  SERVERNI ISHGA TUSHIRISH
// ============================================================
APP.get("/", (req, res) => {
  res.send("🤖 Bugun-bot ishlayapti! (v4 - database bilan) — /stats ni oching");
});

APP.listen(PORT, async () => {
  console.log(`🚀 Bugun-bot ${PORT}-portda ishga tushdi! (v4 - database bilan)`);
  await setupDatabase();
});
