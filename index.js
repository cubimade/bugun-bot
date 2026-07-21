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
  pickModel,
  needsHuman,
  isWithinWorkHours,
  OFF_HOURS_MESSAGE,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
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
  setNeedsHuman,
  markContactRead,
  setContactTags,
  listAllTags,
  getContactAccount,
  listBroadcastRecipients,
  getProjectToken,
  insertBroadcast,
  listBroadcasts,
  deleteProject,
  getAllSettings,
  saveSettings,
} from "./db.js";
import { APP_VERSION } from "./templates.js";
import {
  renderPrivacyPage,
  renderDataDeletionPage,
  renderStatsPage,
} from "./pages.js";
import {
  renderDashboardHome,
  renderInboxPage,
  renderContactsPage,
  renderBroadcastPage,
  renderKnowledgePage,
  renderAccountsPage,
  renderSettingsPage,
} from "./templates.js";
import { recordError, getRecentErrors } from "./logger.js";

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
const STARTED_AT = new Date();

// Dashboard sozlamalari (database'dan, env'dan ustun turadi)
let SETTINGS = {};
async function reloadSettings() {
  if (!DB_READY) return;
  try {
    SETTINGS = await getAllSettings();
  } catch (err) {
    console.error("⚠️ Sozlamalarni yuklashda xatolik:", err.message);
  }
}
function workHoursOverrides() {
  const o = {};
  if (SETTINGS.work_hours_enabled != null)
    o.enabled = SETTINGS.work_hours_enabled === "true";
  if (SETTINGS.work_start != null) o.start = SETTINGS.work_start;
  if (SETTINGS.work_end != null) o.end = SETTINGS.work_end;
  return o;
}

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

  await reloadSettings();
  if (Object.keys(SETTINGS).length) {
    console.log(`⚙️ ${Object.keys(SETTINGS).length} ta sozlama database'dan yuklandi.`);
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

// --- Rate limiting (spam himoyasi) — xotirada, senderId bo'yicha ---
const rateMap = new Map();
function isRateLimited(senderId) {
  const now = Date.now();
  const arr = (rateMap.get(senderId) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  arr.push(now);
  rateMap.set(senderId, arr);
  return arr.length > RATE_LIMIT_MAX;
}

// ============================================================
//  DM ni qayta ishlash (xotira + bilim bazasi + yaxshilanishlar)
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

  // 1) Spam himoyasi — juda ko'p yozsa, jim o'tkazamiz (xarajatni tejaymiz)
  if (isRateLimited(senderId)) {
    console.log(`🚦 Rate limit: ${senderId} juda ko'p yozdi — o'tkazamiz`);
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

  // Bu mijozning birinchi xabari? (tarixда faqat shu xabar bo'lsa — yangi)
  const isNewContact = history.length <= 1;

  // Agar tarix bo'lmasa (DB o'chiq), joriy xabarning o'zini beramiz
  if (history.length === 0) {
    history = [{ role: "user", content: userText }];
  }

  // 2) Ish vaqti — tashqarida bo'lsa, tayyor xabar (AI chaqirilmaydi)
  if (!isWithinWorkHours(new Date(), workHoursOverrides())) {
    console.log("🌙 Ish vaqti emas — tayyor javob yuboramiz");
    const offMsg = SETTINGS.off_hours_message || OFF_HOURS_MESSAGE;
    if (contactId) {
      try {
        await saveMessage(contactId, "assistant", offMsg);
      } catch (dbErr) {
        console.error("⚠️ Saqlashda xatolik:", dbErr.message);
      }
    }
    await sendInstagramMessage(senderId, offMsg, token);
    return;
  }

  // 3) "Odam kerak" — mijoz jonli operator so'radimi
  const handoff = needsHuman(userText);
  if (handoff && contactId) {
    try {
      await setNeedsHuman(contactId, true);
      console.log("🙋 'Odam kerak' deb belgilandi (dashboard'da ko'rinadi)");
    } catch (dbErr) {
      console.error("⚠️ needs_human belgilashда xatolik:", dbErr.message);
    }
  }

  // Shu akkauntning bilim bazasi
  let knowledge = "";
  if (DB_READY && projectId) {
    try {
      knowledge = await getProjectKnowledge(projectId);
    } catch (dbErr) {
      console.error("⚠️ Bilim bazasini o'qishda xatolik:", dbErr.message);
    }
  }

  // System prompt: bilim bazasi + (yangi mijoz salomi) + (odam kerak eslatmasi)
  let systemPrompt = buildSystemPrompt(knowledge);
  if (isNewContact) {
    systemPrompt +=
      "\n\nEslatma: bu mijozning birinchi xabari — iliq salomlash va o'zingni qisqa tanishtir.";
    if (SETTINGS.greeting_message) {
      systemPrompt += `\nSalomlashishda ushbu matn/uslubdan foydalan: "${SETTINGS.greeting_message}"`;
    }
  }
  // Javob uzunligi sozlamasi (dashboard'dan)
  if (SETTINGS.reply_length === "qisqa") {
    systemPrompt += "\n\nJavobni JUDA qisqa tut — 1-2 gap.";
  } else if (SETTINGS.reply_length === "batafsil") {
    systemPrompt += "\n\nKerak bo'lsa batafsilroq javob ber (4-6 gap) — lekin suvsiz, aniq.";
  }
  if (handoff) {
    systemPrompt +=
      "\n\nEslatma: mijoz jonli operator/menejer so'radi. Samimiy ayt: tez orada menejer bog'lanadi.";
  }

  // 4) Model tanlash: oddiy → Haiku, murakkab → Sonnet
  const model = pickModel(userText);
  const reply = await getClaudeReply(history, systemPrompt, model);
  console.log(`🤖 Claude javobi (${model.includes("sonnet") ? "Sonnet" : "Haiku"}): ${reply}`);

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
    // Har akkauntga faollik holatini qo'shamiz: token DB'da yoki xotira
    // xaritasida bo'lsa — faol (webhook xabarlariga javob bera oladi).
    const projects = (await listProjects()).map((p) => ({
      ...p,
      active: p.ig_account_id
        ? Boolean(p.has_token || ACCOUNTS_MAP.has(String(p.ig_account_id)))
        : Boolean(IG_TOKEN), // asosiy (fallback) loyiha
    }));
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

// Akkauntni o'chirish (mijozlar va xabarlar ham o'chadi — CASCADE)
APP.delete("/api/accounts/:projectId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.params.projectId);
    if (DEFAULT_PROJECT_ID && projectId === DEFAULT_PROJECT_ID) {
      return res.status(400).json({ error: "Asosiy loyihani o'chirib bo'lmaydi" });
    }
    const igId = await deleteProject(projectId);
    if (igId) ACCOUNTS_MAP.delete(String(igId));
    console.log(`🗑 Akkaunt o'chirildi (loyiha ${projectId})`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

APP.get("/api/contacts", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    res.json({ contacts: await listContacts(limit) });
  } catch (err) {
    next(err);
  }
});

// Oxirgi xatolar (muammolarni tez topish uchun)
APP.get("/api/errors", protect, (req, res) => {
  res.json({ errors: getRecentErrors() });
});

APP.get("/api/conversation/:contactId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.contactId);
    const contact = await getContact(contactId);
    if (!contact) return res.status(404).json({ error: "Mijoz topilmadi" });
    const messages = await getContactMessages(contactId);
    await markContactRead(contactId); // suhbat ochildi — o'qildi deb belgilaymiz
    res.json({ contact, messages });
  } catch (err) {
    next(err);
  }
});

// --- Teglar ---
APP.get("/api/tags", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ tags: await listAllTags() });
  } catch (err) {
    next(err);
  }
});

APP.post("/api/contacts/:id/tags", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    let tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    // Tozalash: satr, bo'sh emas, 30 belgigacha, ko'pi bilan 15 ta, takrorsiz
    tags = [...new Set(
      tags
        .map((t) => String(t).trim().slice(0, 30))
        .filter(Boolean)
    )].slice(0, 15);
    await setContactTags(contactId, tags);
    res.json({ ok: true, tags });
  } catch (err) {
    next(err);
  }
});

// --- "Odam kerak" holatini boshqarish (hal qilindi deb belgilash) ---
APP.post("/api/contacts/:id/needs-human", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    const value = Boolean(req.body?.value);
    await setNeedsHuman(contactId, value);
    res.json({ ok: true, value });
  } catch (err) {
    next(err);
  }
});

// --- Qo'lda javob yuborish (operator bot o'rniga yozadi) ---
APP.post("/api/reply", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.body?.contactId);
    const text = String(req.body?.text || "").trim();
    if (!contactId || !text) {
      return res.status(400).json({ error: "contactId va text majburiy" });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: "Xabar juda uzun (1000 belgigacha)" });
    }

    const acct = await getContactAccount(contactId);
    if (!acct) return res.status(404).json({ error: "Mijoz topilmadi" });

    // Token: loyihadagi token → xotira xaritasi → asosiy (fallback) token
    const token =
      acct.access_token ||
      ACCOUNTS_MAP.get(String(acct.ig_account_id || ""))?.token ||
      IG_TOKEN;
    if (!token) {
      return res.status(400).json({ error: "Bu akkaunt uchun token topilmadi" });
    }

    const result = await sendInstagramMessage(acct.ig_user_id, text, token);
    if (!result.ok) {
      return res.status(502).json({ error: "Instagram: " + result.error });
    }

    await saveMessage(contactId, "assistant", text);
    await setNeedsHuman(contactId, false); // operator javob berdi — hal qilindi
    console.log(`👤 Operator javobi yuborildi (mijoz ${contactId})`);
    res.json({ ok: true });
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
//  SOZLAMALAR va TIZIM HOLATI
// ============================================================
const SETTING_KEYS = [
  "work_hours_enabled",
  "work_start",
  "work_end",
  "off_hours_message",
  "greeting_message",
  "reply_length",
];

APP.get("/api/settings", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await reloadSettings();
    // Standart qiymatlar (env) + database ustunligi
    res.json({
      settings: {
        work_hours_enabled:
          SETTINGS.work_hours_enabled ??
          String((process.env.WORK_HOURS_ENABLED ?? "false") === "true"),
        work_start: SETTINGS.work_start ?? String(process.env.WORK_START ?? 9),
        work_end: SETTINGS.work_end ?? String(process.env.WORK_END ?? 21),
        off_hours_message: SETTINGS.off_hours_message ?? OFF_HOURS_MESSAGE,
        greeting_message: SETTINGS.greeting_message ?? "",
        reply_length: SETTINGS.reply_length ?? "orta",
      },
    });
  } catch (err) {
    next(err);
  }
});

APP.post("/api/settings", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const body = req.body || {};
    const toSave = {};
    for (const k of SETTING_KEYS) {
      if (body[k] != null) toSave[k] = String(body[k]).slice(0, 2000);
    }
    if (!Object.keys(toSave).length) {
      return res.status(400).json({ error: "Saqlash uchun sozlama yo'q" });
    }
    await saveSettings(toSave);
    await reloadSettings();
    console.log(`⚙️ Sozlamalar yangilandi: ${Object.keys(toSave).join(", ")}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Tizim holati (sozlamalar sahifasidagi "Tizim" kartasi uchun)
APP.get("/api/system", protect, async (req, res) => {
  let dbOk = false;
  if (DB_READY) {
    try {
      const { pool } = await import("./db.js");
      await pool.query("SELECT 1");
      dbOk = true;
    } catch (err) {
      dbOk = false;
    }
  }
  res.json({
    version: APP_VERSION,
    node: process.version,
    db: dbOk,
    accounts: ACCOUNTS_MAP.size,
    startedAt: STARTED_AT.toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    models: { haiku: "Haiku 4.5 (oddiy savollar)", sonnet: "Sonnet 5 (murakkab savollar)" },
  });
});

// ============================================================
//  BROADCAST — ommaviy xabar (jonli progress bilan)
//  Ishlar xotirada: jobId -> { total, sent, failed, done }
// ============================================================
const BROADCAST_JOBS = new Map();
let BROADCAST_SEQ = 1;

// Qabul qiluvchilar sonini oldindan ko'rish
APP.get("/api/broadcast/recipients", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.query.projectId);
    const tag = req.query.tag ? String(req.query.tag) : null;
    if (!projectId) return res.status(400).json({ error: "projectId majburiy" });
    const recipients = await listBroadcastRecipients(projectId, tag);
    res.json({ count: recipients.length });
  } catch (err) {
    next(err);
  }
});

APP.post("/api/broadcast", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.body?.projectId);
    const tag = req.body?.tag ? String(req.body.tag) : null;
    const message = String(req.body?.message || "").trim();
    if (!projectId || !message) {
      return res.status(400).json({ error: "projectId va message majburiy" });
    }
    if (message.length > 900) {
      return res.status(400).json({ error: "Xabar juda uzun (900 belgigacha)" });
    }

    const project = await getProjectToken(projectId);
    if (!project) return res.status(404).json({ error: "Akkaunt topilmadi" });
    const token =
      project.access_token ||
      ACCOUNTS_MAP.get(String(project.ig_account_id || ""))?.token ||
      IG_TOKEN;
    if (!token) return res.status(400).json({ error: "Bu akkaunt uchun token topilmadi" });

    const recipients = await listBroadcastRecipients(projectId, tag);
    if (!recipients.length) {
      return res.status(400).json({ error: "Yuborish uchun mijoz yo'q (24 soat qoidasi)" });
    }

    const jobId = String(BROADCAST_SEQ++);
    const job = { total: recipients.length, sent: 0, failed: 0, done: false };
    BROADCAST_JOBS.set(jobId, job);
    res.json({ jobId, total: job.total });

    // Fon jarayoni: ketma-ket yuboramiz (Instagram rate-limit uchun pauza bilan)
    (async () => {
      for (const r of recipients) {
        try {
          const result = await sendInstagramMessage(r.ig_user_id, message, token);
          if (result.ok) {
            job.sent++;
            await saveMessage(r.id, "assistant", message);
          } else {
            job.failed++;
          }
        } catch (err) {
          job.failed++;
          console.error(`⚠️ Broadcast xatoligi (mijoz ${r.id}):`, err.message);
        }
        await new Promise((ok) => setTimeout(ok, 350));
      }
      job.done = true;
      try {
        await insertBroadcast({
          projectId,
          audience: tag ? `Teg: ${tag}` : "Hammasi (24 soat)",
          message,
          total: job.total,
          sent: job.sent,
          failed: job.failed,
        });
      } catch (err) {
        console.error("⚠️ Broadcast tarixini saqlashda xatolik:", err.message);
      }
      console.log(`📢 Broadcast tugadi: ${job.sent}/${job.total} yuborildi, ${job.failed} xato`);
      // Xotirani tozalash (5 daqiqadan keyin)
      setTimeout(() => BROADCAST_JOBS.delete(jobId), 5 * 60 * 1000);
    })();
  } catch (err) {
    next(err);
  }
});

APP.get("/api/broadcast/status/:jobId", protect, (req, res) => {
  const job = BROADCAST_JOBS.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Ish topilmadi" });
  res.json(job);
});

APP.get("/api/broadcasts", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ broadcasts: await listBroadcasts(20) });
  } catch (err) {
    next(err);
  }
});

// ============================================================
//  DASHBOARD (boshqaruv paneli) — ko'p sahifali platforma
//  Barcha /dashboard* yo'llar Basic Auth bilan himoyalangan.
// ============================================================
APP.get("/dashboard", protect, (req, res) => res.send(renderDashboardHome()));
APP.get("/dashboard/inbox", protect, (req, res) => res.send(renderInboxPage()));
APP.get("/dashboard/contacts", protect, (req, res) => res.send(renderContactsPage()));
APP.get("/dashboard/broadcast", protect, (req, res) => res.send(renderBroadcastPage()));
APP.get("/dashboard/knowledge", protect, (req, res) => res.send(renderKnowledgePage()));
APP.get("/dashboard/accounts", protect, (req, res) => res.send(renderAccountsPage()));
APP.get("/dashboard/settings", protect, (req, res) => res.send(renderSettingsPage()));

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
  recordError("route", err);
  if (!res.headersSent) {
    res.status(500).send("<h1>Xatolik</h1><p>Ichki xatolik yuz berdi.</p>");
  }
});

// Butun jarayon darajasidagi ushlanmagan xatolar — server o'chib qolmasin.
process.on("unhandledRejection", (reason) => {
  recordError("unhandledRejection", reason);
});
process.on("uncaughtException", (err) => {
  recordError("uncaughtException", err);
});

// ============================================================
//  SERVERNI ISHGA TUSHIRISH
// ============================================================
APP.listen(PORT, async () => {
  console.log(`🚀 Bugun-bot ${PORT}-portda ishga tushdi! (v5 - modulli)`);
  await setupDatabase();
});
