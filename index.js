// ============================================================
//  BUGUN-BOT — Instagram AI chat-bot (v5 - modulli struktura)
//  Elbek Eshmurodov uchun | Claude API + PostgreSQL | Railway
//
//  Fayllar tuzilishi:
//    config.js    — sozlamalar, promptlar, env o'zgaruvchilar
//    claude.js    — AI javob mantiqi (Claude)
//    instagram.js — Instagram'ga xabar/komment yuborish
//    db.js        — PostgreSQL (projects, contacts, messages)
//    index.js     — server, marshrutlar, webhook orkestratsiyasi (shu fayl)
// ============================================================

import express from "express";

import {
  PORT,
  IG_TOKEN,
  VERIFY_TOKEN,
  AUTO_DM_ON_COMMENT,
  parseAccounts,
  buildSystemPrompt,
  buildCommentSystemPrompt,
} from "./config.js";
import { getClaudeReply, getCommentReply } from "./claude.js";
import {
  sendInstagramMessage,
  replyToComment,
  sendPrivateReply,
} from "./instagram.js";
import {
  initDb,
  getOrCreateProject,
  getOrCreateContact,
  saveMessage,
  getConversationHistory,
  getStats,
  getProjectKnowledge,
  setProjectKnowledge,
  listProjects,
  listContacts,
  getContact,
  getContactMessages,
  listAccountsWithTokens,
} from "./db.js";
import {
  renderPrivacyPage,
  renderDataDeletionPage,
  renderStatsPage,
  renderDashboardPage,
} from "./pages.js";

const APP = express();
APP.use(express.json());

// ============================================================
//  DATABASE + AKKAUNTLAR holati
//  DB_READY — jadvallar tayyor bo'lsa true.
//  DEFAULT_PROJECT_ID — akkaunt ro'yxatda topilmasa ishlatiladigan loyiha.
//  ACCOUNTS_MAP — entry.id (string) -> { projectId, token, name }
// ============================================================
let DB_READY = false;
let DEFAULT_PROJECT_ID = null;
const ACCOUNTS_MAP = new Map();
const IG_ACCOUNTS = parseAccounts();

async function setupDatabase() {
  try {
    DB_READY = await initDb();
  } catch (err) {
    console.error("⚠️ Database sozlashda xatolik:", err.message);
    DB_READY = false;
  }

  // Asosiy (fallback) loyiha — ro'yxatda yo'q akkauntlar uchun
  if (DB_READY) {
    try {
      DEFAULT_PROJECT_ID = await getOrCreateProject("Elbek Eshmurodov Instagram");
      console.log(`✅ Asosiy loyiha tayyor (id: ${DEFAULT_PROJECT_ID}).`);
    } catch (err) {
      console.error("⚠️ Asosiy loyiha yaratishda xatolik:", err.message);
    }
  }

  // Har bir akkauntni loyiha sifatida ro'yxatga olib, tokenini eslab qolamiz
  for (const a of IG_ACCOUNTS) {
    if (!a?.id || !a?.token) {
      console.warn("⚠️ IG_ACCOUNTS elementida id yoki token yo'q — o'tkazamiz");
      continue;
    }
    let projectId = DEFAULT_PROJECT_ID;
    if (DB_READY) {
      try {
        projectId = await getOrCreateProject(a.name || `IG ${a.id}`, String(a.id), a.token);
      } catch (err) {
        console.error(`⚠️ Akkaunt loyihasini yaratishda xatolik (${a.id}):`, err.message);
      }
    }
    ACCOUNTS_MAP.set(String(a.id), { projectId, token: a.token, name: a.name });
  }

  // Database'da saqlangan akkauntlarni ham yuklaymiz (dashboard orqali
  // qo'shilganlar restart'dan keyin ham ishlashi uchun). Env ustuvor.
  if (DB_READY) {
    try {
      for (const p of await listAccountsWithTokens()) {
        const key = String(p.ig_account_id);
        if (!ACCOUNTS_MAP.has(key)) {
          ACCOUNTS_MAP.set(key, { projectId: p.id, token: p.access_token, name: p.name });
        }
      }
    } catch (err) {
      console.error("⚠️ DB akkauntlarini yuklashda xatolik:", err.message);
    }
  }

  if (ACCOUNTS_MAP.size > 0) {
    console.log(`✅ ${ACCOUNTS_MAP.size} ta Instagram akkaunt sozlandi (multi-account).`);
  } else {
    console.log("ℹ️ Ro'yxatda akkaunt yo'q — bitta akkaunt rejimida (IG_ACCESS_TOKEN).");
  }
}

// entry.id bo'yicha to'g'ri akkauntni (loyiha + token) topish.
// Ro'yxatda bo'lmasa — asosiy loyiha va fallback token ishlatiladi.
function resolveAccount(entryId) {
  const acct = ACCOUNTS_MAP.get(String(entryId));
  if (acct) {
    return { projectId: acct.projectId ?? DEFAULT_PROJECT_ID, token: acct.token };
  }
  return { projectId: DEFAULT_PROJECT_ID, token: IG_TOKEN };
}

// Yangi akkauntni ro'yxatga olish (dashboard "Yangi akkaunt qo'shish" uchun).
// DB'ga yozadi va xotira xaritasini darhol yangilaydi (restart shart emas).
async function registerAccount({ name, igAccountId, token }) {
  let projectId = DEFAULT_PROJECT_ID;
  if (DB_READY) {
    projectId = await getOrCreateProject(
      name || `IG ${igAccountId}`,
      String(igAccountId),
      token
    );
  }
  ACCOUNTS_MAP.set(String(igAccountId), { projectId, token, name });
  return projectId;
}

// ============================================================
//  WEBHOOK — TEKSHIRUV (Meta ulanishni tasdiqlaydi)
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
//  WEBHOOK — XABAR/KOMMENT QABUL QILISH
// ============================================================
APP.post("/webhook", async (req, res) => {
  res.status(200).send("EVENT_RECEIVED"); // Meta'ga darhol javob (talab)

  try {
    const body = req.body;

    for (const entry of body.entry || []) {
      // Qaysi akkauntga tegishli — o'sha akkauntning loyihasi va tokeni
      const { projectId, token } = resolveAccount(entry.id);
      console.log(
        `📇 Akkaunt: ${entry.id} → loyiha ${projectId ?? "-"} ` +
          (ACCOUNTS_MAP.has(String(entry.id)) ? "(ro'yxatda)" : "(fallback)")
      );

      // --- DM (shaxsiy xabarlar) ---
      for (const event of entry.messaging || []) {
        await handleDirectMessage(event, projectId, token);
      }

      // --- Kommentlar va boshqa o'zgarishlar ---
      for (const change of entry.changes || []) {
        console.log(`🔄 Change hodisasi: ${change.field}`);
        if (change.field === "comments") {
          await handleComment(entry, change.value, projectId, token);
        }
      }
    }
  } catch (err) {
    console.error("⚠️ Webhook xatoligi:", err.message);
    console.error(err.stack);
  }
});

// ============================================================
//  DM ni qayta ishlash (doimiy xotira + Claude javobi)
// ============================================================
async function handleDirectMessage(event, projectId, token) {
  if (event.message?.is_echo) {
    console.log("↩️ Echo xabar (bot o'zi yuborgan) — o'tkazamiz");
    return;
  }

  const senderId = event.sender?.id;
  const userText = event.message?.text;

  if (!senderId) {
    console.log("⚠️ senderId topilmadi");
    return;
  }
  if (!userText) {
    console.log("ℹ️ Matn yo'q (rasm/stiker bo'lishi mumkin) — o'tkazamiz");
    return;
  }

  console.log(`📩 Yangi xabar (${senderId}): ${userText}`);

  // --- Doimiy xotira: mijoz + suhbat tarixi (shu akkaunt loyihasida) ---
  let contactId = null;
  let history = [];
  if (DB_READY && projectId) {
    try {
      contactId = await getOrCreateContact(projectId, senderId);
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

  // Shu akkauntning bilim bazasini promptga qo'shamiz
  let knowledge = "";
  if (DB_READY && projectId) {
    try {
      knowledge = await getProjectKnowledge(projectId);
    } catch (dbErr) {
      console.error("⚠️ Bilim bazasini o'qishda xatolik:", dbErr.message);
    }
  }

  const reply = await getClaudeReply(history, buildSystemPrompt(knowledge));
  console.log(`🤖 Claude javobi: ${reply}`);

  // Botning javobini ham xotiraga yozamiz
  if (contactId) {
    try {
      await saveMessage(contactId, "assistant", reply);
    } catch (dbErr) {
      console.error("⚠️ Javobni saqlashda xatolik:", dbErr.message);
    }
  }

  await sendInstagramMessage(senderId, reply, token);
}

// ============================================================
//  KOMMENTNI qayta ishlash (ommaviy javob + ixtiyoriy DM)
// ============================================================
async function handleComment(entry, value, projectId, token) {
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

    // Shu akkauntning bilim bazasi bilan komment javobini tayyorlaymiz
    let knowledge = "";
    if (DB_READY && projectId) {
      try {
        knowledge = await getProjectKnowledge(projectId);
      } catch (dbErr) {
        console.error("⚠️ Bilim bazasini o'qishda xatolik:", dbErr.message);
      }
    }

    const reply = await getCommentReply(
      commentText,
      username,
      buildCommentSystemPrompt(knowledge)
    );
    console.log(`🤖 Komment javobi: ${reply}`);

    // 1) Ommaviy javob — komment ostiga yoziladi
    await replyToComment(commentId, reply, token);

    // 2) Ixtiyoriy: komment yozgan odamga shaxsiy DM (ManyChat uslubi)
    if (AUTO_DM_ON_COMMENT) {
      const dmText = `Salom${username ? " @" + username : ""}! Kommentingiz uchun rahmat 🙏 Savolingiz bo'lsa, shu yerda — DM'da bemalol yozing, yordam beraman. 😊`;
      await sendPrivateReply(commentId, dmText, token);
    }
  } catch (err) {
    console.error("⚠️ Komment qayta ishlashda xatolik:", err.message);
  }
}

// ============================================================
//  ADMIN HIMOYASI (Basic Auth)
//  DASHBOARD_PASSWORD o'rnatilgan bo'lsa — parol talab qilinadi.
//  O'rnatilmagan bo'lsa — ochiq (Elbek Railway'da parolni qo'shishi kerak).
//  Foydalanuvchi nomi ixtiyoriy (masalan "admin"), parol = DASHBOARD_PASSWORD.
// ============================================================
function protect(req, res, next) {
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!pass) return next(); // parol yo'q — ochiq

  const hdr = req.get("authorization") || "";
  const [scheme, encoded] = hdr.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString();
    const pwd = decoded.slice(decoded.indexOf(":") + 1);
    if (pwd === pass) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Bugun Bot Dashboard"');
  res.status(401).send("Ruxsat yo'q — parol kerak");
}

function requireDb(req, res) {
  if (!DB_READY) {
    res.status(503).json({ error: "Database o'chiq" });
    return false;
  }
  return true;
}

// ============================================================
//  API — DASHBOARD ma'lumotlari
// ============================================================
APP.get("/api/stats", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json(await getStats());
  } catch (err) {
    next(err);
  }
});

APP.get("/api/projects", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ projects: await listProjects() });
  } catch (err) {
    next(err);
  }
});

APP.get("/api/contacts", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ contacts: await listContacts(50) });
  } catch (err) {
    next(err);
  }
});

APP.get("/api/conversation/:contactId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.contactId);
    const contact = await getContact(contactId);
    const messages = await getContactMessages(contactId);
    res.json({ contact, messages });
  } catch (err) {
    next(err);
  }
});

// --- Bilim bazasi (o'qish/yozish) ---
APP.get("/api/knowledge/:projectId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    res.json({ projectId, knowledge: await getProjectKnowledge(projectId) });
  } catch (err) {
    next(err);
  }
});

APP.post("/api/knowledge/:projectId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    const text = typeof req.body?.knowledge === "string" ? req.body.knowledge : "";
    await setProjectKnowledge(projectId, text);
    console.log(`📝 Bilim bazasi yangilandi (loyiha ${projectId}, ${text.length} belgi)`);
    res.json({ ok: true, projectId, length: text.length });
  } catch (err) {
    next(err);
  }
});

// --- Yangi akkaunt qo'shish (multi-account) ---
APP.post("/api/accounts", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const { name, ig_account_id, token } = req.body || {};
    if (!ig_account_id || !token) {
      return res.status(400).json({ error: "ig_account_id va token majburiy" });
    }
    const projectId = await registerAccount({
      name,
      igAccountId: ig_account_id,
      token,
    });
    console.log(`➕ Yangi akkaunt qo'shildi: ${ig_account_id} (loyiha ${projectId})`);
    res.json({ ok: true, projectId });
  } catch (err) {
    next(err);
  }
});

// ============================================================
//  DASHBOARD (boshqaruv paneli)
// ============================================================
APP.get("/dashboard", protect, (req, res) => res.send(renderDashboardPage()));

// ============================================================
//  SAHIFALAR — privacy, data-deletion, stats
// ============================================================
APP.get("/privacy", (req, res) => res.send(renderPrivacyPage()));
APP.get("/data-deletion", (req, res) => res.send(renderDataDeletionPage()));

APP.get("/stats", async (req, res, next) => {
  if (!DB_READY) {
    res
      .status(503)
      .send("<h1>📊 Statistika mavjud emas</h1><p>Database ulanmagan (DATABASE_URL topilmadi).</p>");
    return;
  }
  try {
    const stats = await getStats();
    res.send(renderStatsPage(stats));
  } catch (err) {
    next(err);
  }
});

APP.get("/", (req, res) => {
  res.send(
    "🤖 Bugun-bot ishlayapti! (v5 - modulli) — <a href='/dashboard'>/dashboard</a> yoki <a href='/stats'>/stats</a>"
  );
});

// ============================================================
//  MARKAZLASHTIRILGAN XATO BOSHQARUVI
// ============================================================
// Express marshrutlaridagi kutilmagan xatolar shu yerga tushadi.
APP.use((err, req, res, next) => {
  console.error("⚠️ Marshrut xatoligi:", err.message);
  console.error(err.stack);
  if (!res.headersSent) {
    res.status(500).send("<h1>Xatolik</h1><p>Ichki xatolik yuz berdi.</p>");
  }
});

// Butun jarayon darajasidagi ushlanmagan xatolar — server o'chib qolmasin.
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Ushlanmagan promise xatoligi:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️ Ushlanmagan xatolik:", err.message);
  console.error(err.stack);
});

// ============================================================
//  SERVERNI ISHGA TUSHIRISH
// ============================================================
APP.listen(PORT, async () => {
  console.log(`🚀 Bugun-bot ${PORT}-portda ishga tushdi! (v5 - modulli)`);
  await setupDatabase();
});
