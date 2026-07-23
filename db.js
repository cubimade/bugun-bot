// ============================================================
//  DB.JS — PostgreSQL ulanishi va ma'lumotlar bazasi funksiyalari
//  Jadvallar: projects (akkauntlar), contacts (mijozlar), messages (suhbatlar)
// ============================================================

import pkg from "pg";
const { Pool } = pkg;

// ------------------------------------------------------------
//  Ulanish (Railway DATABASE_URL orqali)
// ------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;

// Railway ichki tarmog'ida (postgres.railway.internal) SSL kerak emas,
// tashqi ulanishda esa SSL talab qilinadi.
const needsSSL =
  connectionString &&
  !connectionString.includes("railway.internal") &&
  !connectionString.includes("localhost");

const pool = new Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("⚠️ PostgreSQL pool xatoligi:", err.message);
});

// ------------------------------------------------------------
//  Jadvallarni yaratish (server ishga tushganda chaqiriladi)
// ------------------------------------------------------------
export async function initDb() {
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL topilmadi — database o'chirilgan holatda ishlaydi.");
    return false;
  }

  await pool.query(`
    -- Instagram akkauntlar (loyihalar)
    CREATE TABLE IF NOT EXISTS projects (
      id             SERIAL PRIMARY KEY,
      name           TEXT NOT NULL,
      ig_account_id  TEXT UNIQUE,
      access_token   TEXT,
      knowledge_base TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Eski bazalar uchun: ustunlar bo'lmasa qo'shamiz
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS access_token TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS knowledge_base TEXT;

    -- Mijozlar (Instagram foydalanuvchilari)
    CREATE TABLE IF NOT EXISTS contacts (
      id          SERIAL PRIMARY KEY,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      ig_user_id  TEXT NOT NULL,
      name        TEXT,
      needs_human BOOLEAN NOT NULL DEFAULT false,
      first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (project_id, ig_user_id)
    );

    -- Eski bazalar uchun: ustun bo'lmasa qo'shamiz
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS needs_human BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS unread INTEGER NOT NULL DEFAULT 0;
    -- Operator rejimi (bot pauza) va mini-CRM (4-bosqich)
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bot_paused BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS note TEXT;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sentiment TEXT;

    -- Suhbat xabarlari (doimiy xotira)
    CREATE TABLE IF NOT EXISTS messages (
      id          SERIAL PRIMARY KEY,
      contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      text        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Operator javobini ajratish uchun (inbox'da alohida rangda)
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_operator BOOLEAN NOT NULL DEFAULT false;

    -- Tezkor javoblar (saved replies)
    CREATE TABLE IF NOT EXISTS saved_replies (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      text        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Sozlamalar (dashboard orqali boshqariladi, kalit-qiymat)
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Broadcast (ommaviy xabar) tarixi
    CREATE TABLE IF NOT EXISTS broadcasts (
      id          SERIAL PRIMARY KEY,
      project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      audience    TEXT NOT NULL,
      message     TEXT NOT NULL,
      total       INTEGER NOT NULL DEFAULT 0,
      sent        INTEGER NOT NULL DEFAULT 0,
      failed      INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Broadcast rejalashtirish (4-bosqich)
    ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
    ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent';
    ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS tag TEXT;

    -- Tez qidiruv uchun indekslar
    CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_contacts_project ON contacts(project_id);
    -- 5-bosqich analitika: vaqt kesimlari va rol bo'yicha tez so'rovlar
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_role_created ON messages(role, created_at);
    CREATE INDEX IF NOT EXISTS idx_contacts_first_seen ON contacts(first_seen);
  `);

  console.log("✅ Database jadvallar tayyor (projects, contacts, messages).");
  return true;
}

// ------------------------------------------------------------
//  Loyihani (akkauntni) topish yoki yaratish
// ------------------------------------------------------------
export async function getOrCreateProject(name, igAccountId = null, accessToken = null) {
  // ig_account_id bo'lmagan holat (asosiy loyiha): nom bo'yicha topamiz/yaratamiz
  if (!igAccountId) {
    const found = await pool.query(
      `SELECT id FROM projects WHERE name = $1 ORDER BY id LIMIT 1`,
      [name]
    );
    if (found.rows[0]) return found.rows[0].id;
    const ins = await pool.query(
      `INSERT INTO projects (name) VALUES ($1) RETURNING id`,
      [name]
    );
    return ins.rows[0].id;
  }

  // Akkaunt IDsi bor: id bo'yicha upsert, tokenni ham yangilaymiz
  const { rows } = await pool.query(
    `INSERT INTO projects (name, ig_account_id, access_token)
     VALUES ($1, $2, $3)
     ON CONFLICT (ig_account_id) DO UPDATE
       SET name = EXCLUDED.name,
           access_token = COALESCE(EXCLUDED.access_token, projects.access_token)
     RETURNING id`,
    [name, String(igAccountId), accessToken]
  );
  return rows[0].id;
}

// ------------------------------------------------------------
//  Mijozni topish yoki yaratish (va last_seen ni yangilash)
// ------------------------------------------------------------
export async function getOrCreateContact(projectId, igUserId, name = null) {
  const { rows } = await pool.query(
    `INSERT INTO contacts (project_id, ig_user_id, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, ig_user_id)
     DO UPDATE SET last_seen = now(),
                   name = COALESCE(EXCLUDED.name, contacts.name)
     RETURNING id, bot_paused, paused_until`,
    [projectId, igUserId, name]
  );
  return rows[0];
}

// --- Bot pauza (operator rejimi) ---
// paused=true, until=null  → doimiy pauza (operator qo'lda yoqadi)
// paused=true, until=vaqt  → avto-pauza (vaqti kelganda bot o'zi yoqiladi)
export async function setBotPaused(contactId, paused, until = null) {
  await pool.query(
    `UPDATE contacts SET bot_paused = $2, paused_until = $3 WHERE id = $1`,
    [contactId, paused, until]
  );
}

// ------------------------------------------------------------
//  Xabarni saqlash
// ------------------------------------------------------------
export async function saveMessage(contactId, role, text, isOperator = false) {
  await pool.query(
    `INSERT INTO messages (contact_id, role, text, is_operator) VALUES ($1, $2, $3, $4)`,
    [contactId, role, text, isOperator]
  );
  // Mijoz xabari — o'qilmagan hisoblagichni oshiramiz (inbox belgisi uchun)
  if (role === "user") {
    await pool.query(`UPDATE contacts SET unread = unread + 1 WHERE id = $1`, [
      contactId,
    ]);
  }
}

// Suhbat ochilganda o'qilmaganlarni nolga tushirish
export async function markContactRead(contactId) {
  await pool.query(`UPDATE contacts SET unread = 0 WHERE id = $1`, [contactId]);
}

// ------------------------------------------------------------
//  Suhbat tarixini olish (Claude'ga kontekst berish uchun)
//  Oxirgi N ta xabarni to'g'ri tartibda qaytaradi.
// ------------------------------------------------------------
export async function getConversationHistory(contactId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT role, text FROM (
       SELECT role, text, created_at
       FROM messages
       WHERE contact_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) sub
     ORDER BY created_at ASC`,
    [contactId, limit]
  );
  return rows.map((r) => ({ role: r.role, content: r.text }));
}

// ------------------------------------------------------------
//  Statistika (/stats sahifasi uchun)
// ------------------------------------------------------------
export async function getStats() {
  const [projects, contacts, messages, today, week, needsHuman, recent, topContacts] =
    await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS n FROM projects`),
      pool.query(`SELECT COUNT(*)::int AS n FROM contacts`),
      pool.query(`SELECT COUNT(*)::int AS n FROM messages`),
      // Bugungi xabarlar (O'zbekiston vaqti bo'yicha)
      pool.query(
        `SELECT COUNT(*)::int AS n FROM messages
         WHERE (created_at AT TIME ZONE 'Asia/Tashkent')::date =
               (now() AT TIME ZONE 'Asia/Tashkent')::date`
      ),
      // Oxirgi 7 kun faolligi (kun bo'yicha xabarlar soni)
      pool.query(
        `SELECT to_char((created_at AT TIME ZONE 'Asia/Tashkent')::date, 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS n
           FROM messages
          WHERE created_at >= now() - interval '7 days'
          GROUP BY 1 ORDER BY 1`
      ),
      pool.query(`SELECT COUNT(*)::int AS n FROM contacts WHERE needs_human`),
      pool.query(
        `SELECT m.role, m.text, m.created_at, c.ig_user_id, c.name
       FROM messages m
       JOIN contacts c ON c.id = m.contact_id
       ORDER BY m.created_at DESC
       LIMIT 30`
      ),
      pool.query(
        `SELECT c.ig_user_id, c.name, COUNT(m.id)::int AS msg_count, MAX(m.created_at) AS last_msg
       FROM contacts c
       LEFT JOIN messages m ON m.contact_id = c.id
       GROUP BY c.id
       ORDER BY msg_count DESC, last_msg DESC NULLS LAST
       LIMIT 10`
      ),
    ]);

  return {
    projects: projects.rows[0].n,
    contacts: contacts.rows[0].n,
    messages: messages.rows[0].n,
    today: today.rows[0].n,
    week: week.rows,
    needsHuman: needsHuman.rows[0].n,
    recent: recent.rows,
    topContacts: topContacts.rows,
  };
}

// ------------------------------------------------------------
//  Kunlik digest — AI xulosa uchun xom raqamlar (O'zbekiston vaqti)
// ------------------------------------------------------------
export async function getDailyDigest() {
  const TODAY = `(created_at AT TIME ZONE 'Asia/Tashkent')::date = (now() AT TIME ZONE 'Asia/Tashkent')::date`;
  const [todayMsgs, newContacts, needsHumanQ, topAccount, priceAsks] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS n FROM messages WHERE ${TODAY}`),
    pool.query(
      `SELECT COUNT(*)::int AS n FROM contacts
        WHERE (first_seen AT TIME ZONE 'Asia/Tashkent')::date = (now() AT TIME ZONE 'Asia/Tashkent')::date`
    ),
    pool.query(`SELECT COUNT(*)::int AS n FROM contacts WHERE needs_human`),
    pool.query(
      `SELECT p.name, COUNT(*)::int AS n
         FROM messages m
         JOIN contacts c ON c.id = m.contact_id
         JOIN projects p ON p.id = c.project_id
        WHERE (m.created_at AT TIME ZONE 'Asia/Tashkent')::date = (now() AT TIME ZONE 'Asia/Tashkent')::date
        GROUP BY p.name ORDER BY n DESC LIMIT 1`
    ),
    pool.query(
      `SELECT COUNT(DISTINCT contact_id)::int AS n FROM messages
        WHERE role = 'user' AND ${TODAY}
          AND (text ILIKE '%narx%' OR text ILIKE '%qancha%' OR text ILIKE '%price%' OR text ILIKE '%skidka%' OR text ILIKE '%chegirma%')`
    ),
  ]);
  return {
    todayMessages: todayMsgs.rows[0].n,
    newContacts: newContacts.rows[0].n,
    needsHuman: needsHumanQ.rows[0].n,
    topAccount: topAccount.rows[0]?.name || null,
    priceAsks: priceAsks.rows[0].n,
  };
}

// ------------------------------------------------------------
//  AI Insights uchun: oxirgi 7 kunlik mijoz xabarlari
// ------------------------------------------------------------
export async function getRecentUserMessages(limit = 250) {
  const { rows } = await pool.query(
    `SELECT m.text, c.id AS contact_id, c.name, c.ig_user_id
       FROM messages m
       JOIN contacts c ON c.id = m.contact_id
      WHERE m.role = 'user' AND m.created_at >= now() - interval '7 days'
      ORDER BY m.created_at DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

// ------------------------------------------------------------
//  Bilim bazasi (knowledge base) — har akkaunt uchun biznes ma'lumoti
// ------------------------------------------------------------
export async function getProjectKnowledge(projectId) {
  const { rows } = await pool.query(
    `SELECT knowledge_base FROM projects WHERE id = $1`,
    [projectId]
  );
  return rows[0]?.knowledge_base || "";
}

export async function setProjectKnowledge(projectId, text) {
  await pool.query(`UPDATE projects SET knowledge_base = $2 WHERE id = $1`, [
    projectId,
    text,
  ]);
}

// ------------------------------------------------------------
//  Loyihalar (akkauntlar) ro'yxati va bittasi — dashboard uchun
// ------------------------------------------------------------
export async function listProjects() {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.ig_account_id, p.knowledge_base, p.created_at,
            (p.access_token IS NOT NULL) AS has_token,
            (SELECT COUNT(*)::int FROM contacts c WHERE c.project_id = p.id) AS contacts,
            (SELECT COUNT(*)::int FROM messages m
               JOIN contacts c ON c.id = m.contact_id
              WHERE c.project_id = p.id) AS messages
       FROM projects p
      ORDER BY p.id`
  );
  return rows;
}

export async function getProject(projectId) {
  const { rows } = await pool.query(
    `SELECT id, name, ig_account_id, knowledge_base, created_at
       FROM projects WHERE id = $1`,
    [projectId]
  );
  return rows[0] || null;
}

// Akkauntni (loyihani) o'chirish — mijozlar va xabarlar CASCADE bilan o'chadi.
// O'chirilgan loyihaning ig_account_id sini qaytaradi (xotira xaritasidan olib tashlash uchun).
export async function deleteProject(projectId) {
  const { rows } = await pool.query(
    `DELETE FROM projects WHERE id = $1 RETURNING ig_account_id`,
    [projectId]
  );
  return rows[0]?.ig_account_id || null;
}

// Tokeni bor akkauntlar — startup'da xotira xaritasiga yuklash uchun.
// (Dashboard orqali qo'shilgan akkauntlar restart'dan keyin ham ishlaydi.)
export async function listAccountsWithTokens() {
  const { rows } = await pool.query(
    `SELECT id, name, ig_account_id, access_token
       FROM projects
      WHERE ig_account_id IS NOT NULL AND access_token IS NOT NULL`
  );
  return rows;
}

// ------------------------------------------------------------
//  Suhbatlar (dashboard uchun) — mijozlar ro'yxati va to'liq yozishma
// ------------------------------------------------------------
export async function listContacts(limit = 50) {
  const { rows } = await pool.query(
    `SELECT c.id, c.ig_user_id, c.name, c.project_id, c.last_seen, c.needs_human,
            c.tags, c.unread, c.first_seen, c.bot_paused, c.paused_until, c.sentiment,
            p.name AS project_name,
            (SELECT COUNT(*)::int FROM messages m WHERE m.contact_id = c.id) AS msg_count,
            (SELECT text FROM messages m WHERE m.contact_id = c.id
              ORDER BY created_at DESC LIMIT 1) AS last_text
       FROM contacts c
       JOIN projects p ON p.id = c.project_id
      ORDER BY c.last_seen DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

// Mijozni "jonli operator kerak" deb belgilash (yoki bekor qilish)
export async function setNeedsHuman(contactId, value) {
  await pool.query(`UPDATE contacts SET needs_human = $2 WHERE id = $1`, [
    contactId,
    value,
  ]);
}

export async function getContactMessages(contactId) {
  const { rows } = await pool.query(
    `SELECT role, text, created_at, is_operator
       FROM messages WHERE contact_id = $1
      ORDER BY created_at ASC`,
    [contactId]
  );
  return rows;
}

export async function getContact(contactId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.ig_user_id, c.name, c.project_id, c.needs_human, c.tags,
            c.unread, c.first_seen, c.last_seen, c.bot_paused, c.paused_until,
            c.note, c.sentiment, p.name AS project_name,
            (SELECT COUNT(*)::int FROM messages m WHERE m.contact_id = c.id) AS msg_count
       FROM contacts c JOIN projects p ON p.id = c.project_id
      WHERE c.id = $1`,
    [contactId]
  );
  return rows[0] || null;
}

// Mijoz izohini (nota) saqlash — mini-CRM
export async function setContactNote(contactId, note) {
  await pool.query(`UPDATE contacts SET note = $2 WHERE id = $1`, [
    contactId,
    note,
  ]);
}

// Mijoz kayfiyatini saqlash (AI aniqlaydi)
export async function setContactSentiment(contactId, sentiment) {
  await pool.query(`UPDATE contacts SET sentiment = $2 WHERE id = $1`, [
    contactId,
    sentiment,
  ]);
}

// Mijoz + akkaunt tokeni (qo'lda javob yuborish uchun)
export async function getContactAccount(contactId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.ig_user_id, c.project_id,
            p.ig_account_id, p.access_token
       FROM contacts c JOIN projects p ON p.id = c.project_id
      WHERE c.id = $1`,
    [contactId]
  );
  return rows[0] || null;
}

// ------------------------------------------------------------
//  Teglar — mijozlarni belgilash (VIP, yangi, qiziqqan ...)
// ------------------------------------------------------------
export async function setContactTags(contactId, tags) {
  await pool.query(`UPDATE contacts SET tags = $2 WHERE id = $1`, [
    contactId,
    tags,
  ]);
}

export async function listAllTags() {
  const { rows } = await pool.query(
    `SELECT DISTINCT unnest(tags) AS tag FROM contacts ORDER BY 1`
  );
  return rows.map((r) => r.tag);
}

// ------------------------------------------------------------
//  BROADCAST — ommaviy xabar yuborish
// ------------------------------------------------------------

// Instagram 24 soat qoidasi: faqat oxirgi 24 soatda o'zi yozgan
// mijozlarga xabar yuborish mumkin. Teg berilsa — shu teg bo'yicha.
export async function listBroadcastRecipients(projectId, tag = null) {
  const { rows } = await pool.query(
    `SELECT c.id, c.ig_user_id
       FROM contacts c
      WHERE c.project_id = $1
        AND ($2::text IS NULL OR $2 = ANY(c.tags))
        AND EXISTS (
          SELECT 1 FROM messages m
           WHERE m.contact_id = c.id AND m.role = 'user'
             AND m.created_at >= now() - interval '24 hours'
        )
      ORDER BY c.last_seen DESC`,
    [projectId, tag]
  );
  return rows;
}

// Akkaunt tokeni (broadcast/qo'lda javob uchun)
export async function getProjectToken(projectId) {
  const { rows } = await pool.query(
    `SELECT id, name, ig_account_id, access_token FROM projects WHERE id = $1`,
    [projectId]
  );
  return rows[0] || null;
}

export async function insertBroadcast({ projectId, audience, message, total, sent, failed }) {
  const { rows } = await pool.query(
    `INSERT INTO broadcasts (project_id, audience, message, total, sent, failed)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [projectId, audience, message, total, sent, failed]
  );
  return rows[0].id;
}

// --- Rejalashtirilgan broadcast (C3) ---
export async function insertScheduledBroadcast({ projectId, audience, tag, message, scheduledAt }) {
  const { rows } = await pool.query(
    `INSERT INTO broadcasts (project_id, audience, tag, message, status, scheduled_at)
     VALUES ($1, $2, $3, $4, 'scheduled', $5) RETURNING id`,
    [projectId, audience, tag, message, scheduledAt]
  );
  return rows[0].id;
}

// Vaqti kelgan broadcastlarni atomik "olish" (ikki marta yuborilmasligi uchun)
export async function claimDueBroadcasts() {
  const { rows } = await pool.query(
    `UPDATE broadcasts SET status = 'sending'
      WHERE status = 'scheduled' AND scheduled_at <= now()
      RETURNING id, project_id, tag, message`
  );
  return rows;
}

export async function finishBroadcast(id, { total, sent, failed, status = "sent" }) {
  await pool.query(
    `UPDATE broadcasts SET total = $2, sent = $3, failed = $4, status = $5 WHERE id = $1`,
    [id, total, sent, failed, status]
  );
}

// Faqat hali yuborilmagan (scheduled) broadcastni bekor qilish mumkin
export async function cancelScheduledBroadcast(id) {
  const { rows } = await pool.query(
    `DELETE FROM broadcasts WHERE id = $1 AND status = 'scheduled' RETURNING id`,
    [id]
  );
  return rows[0]?.id || null;
}

export async function listBroadcasts(limit = 20) {
  const { rows } = await pool.query(
    `SELECT b.id, b.audience, b.message, b.total, b.sent, b.failed, b.created_at,
            b.status, b.scheduled_at, b.tag,
            p.name AS project_name
       FROM broadcasts b
       LEFT JOIN projects p ON p.id = b.project_id
      ORDER BY (b.status = 'scheduled') DESC, COALESCE(b.scheduled_at, b.created_at) DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

// ------------------------------------------------------------
//  TEZKOR JAVOBLAR (saved replies) — operator uchun tayyor matnlar
// ------------------------------------------------------------
export async function listSavedReplies() {
  const { rows } = await pool.query(
    `SELECT id, title, text FROM saved_replies ORDER BY id`
  );
  return rows;
}

export async function insertSavedReply(title, text) {
  const { rows } = await pool.query(
    `INSERT INTO saved_replies (title, text) VALUES ($1, $2) RETURNING id`,
    [title, text]
  );
  return rows[0].id;
}

export async function deleteSavedReply(id) {
  await pool.query(`DELETE FROM saved_replies WHERE id = $1`, [id]);
}

// ------------------------------------------------------------
//  SOZLAMALAR — kalit-qiymat (dashboard'dan boshqariladi)
// ------------------------------------------------------------
export async function getAllSettings() {
  const { rows } = await pool.query(`SELECT key, value FROM settings`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function saveSettings(obj) {
  for (const [key, value] of Object.entries(obj)) {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, String(value)]
    );
  }
}

// ============================================================
//  5-BOSQICH: ANALITIKA
//  Vaqt filtri: today | 7d | 30d | all — FAQAT shu ro'yxatdan
//  (SQL'ga foydalanuvchi matni hech qachon qo'shilmaydi)
// ============================================================
const TZ = `AT TIME ZONE 'Asia/Tashkent'`;

export function normalizePeriod(p) {
  return ["today", "7d", "30d", "all"].includes(p) ? p : "7d";
}

// Joriy davr sharti (col — vaqt ustuni nomi, kod ichidan keladi)
function periodCond(period, col) {
  switch (period) {
    case "today": return `(${col} ${TZ})::date = (now() ${TZ})::date`;
    case "7d":    return `${col} >= now() - interval '7 days'`;
    case "30d":   return `${col} >= now() - interval '30 days'`;
    default:      return `TRUE`;
  }
}

// O'tgan (taqqoslash) davri sharti — trend hisoblash uchun
function prevPeriodCond(period, col) {
  switch (period) {
    case "today":
      return `(${col} ${TZ})::date = (now() ${TZ})::date - 1`;
    case "7d":
      return `${col} >= now() - interval '14 days' AND ${col} < now() - interval '7 days'`;
    case "30d":
      return `${col} >= now() - interval '60 days' AND ${col} < now() - interval '30 days'`;
    default:
      return `FALSE`; // "hammasi" uchun trend yo'q
  }
}

// ------------------------------------------------------------
//  A2/B: Statistika kartalari — davr bo'yicha son, trend, sparkline
// ------------------------------------------------------------
export async function getStatsForPeriod(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const MP = prevPeriodCond(p, "m.created_at");
  const C = periodCond(p, "first_seen");
  const CP = prevPeriodCond(p, "first_seen");

  // Grafik seriyasi: today → soatlik (24), 7d → 7 kun, 30d/all → 30 kun
  const seriesQ =
    p === "today"
      ? `SELECT EXTRACT(HOUR FROM created_at ${TZ})::int AS x, COUNT(*)::int AS n
           FROM messages
          WHERE (created_at ${TZ})::date = (now() ${TZ})::date
          GROUP BY 1 ORDER BY 1`
      : `SELECT to_char((created_at ${TZ})::date, 'YYYY-MM-DD') AS x, COUNT(*)::int AS n
           FROM messages
          WHERE created_at >= now() - interval '${p === "7d" ? 7 : 30} days'
          GROUP BY 1 ORDER BY 1`;

  const [core, series, sparks, newContacts] = await Promise.all([
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM projects) AS projects,
         (SELECT COUNT(*)::int FROM contacts) AS contacts_total,
         (SELECT COUNT(*)::int FROM contacts WHERE ${C}) AS contacts_new,
         (SELECT COUNT(DISTINCT m.contact_id)::int FROM messages m WHERE ${M}) AS contacts_active,
         (SELECT COUNT(DISTINCT m.contact_id)::int FROM messages m WHERE ${MP}) AS contacts_active_prev,
         (SELECT COUNT(*)::int FROM messages m WHERE ${M}) AS messages_cur,
         (SELECT COUNT(*)::int FROM messages m WHERE ${MP}) AS messages_prev,
         (SELECT COUNT(*)::int FROM messages
           WHERE (created_at ${TZ})::date = (now() ${TZ})::date) AS today,
         (SELECT COUNT(*)::int FROM contacts WHERE needs_human) AS needs_human`
    ),
    pool.query(seriesQ),
    // Sparkline: har doim oxirgi 7 kun (kunma-kun) — xabar, faol mijoz, odam-kerak
    pool.query(
      `WITH days AS (
         SELECT generate_series(
           (now() ${TZ})::date - 6, (now() ${TZ})::date, interval '1 day'
         )::date AS d
       )
       SELECT to_char(days.d, 'YYYY-MM-DD') AS day,
              COALESCE(msg.n, 0) AS msgs,
              COALESCE(act.n, 0) AS active,
              COALESCE(hum.n, 0) AS human
         FROM days
         LEFT JOIN (
           SELECT (created_at ${TZ})::date AS d, COUNT(*)::int AS n
             FROM messages WHERE created_at >= now() - interval '8 days' GROUP BY 1
         ) msg ON msg.d = days.d
         LEFT JOIN (
           SELECT (created_at ${TZ})::date AS d, COUNT(DISTINCT contact_id)::int AS n
             FROM messages WHERE created_at >= now() - interval '8 days' GROUP BY 1
         ) act ON act.d = days.d
         LEFT JOIN (
           SELECT (last_seen ${TZ})::date AS d, COUNT(*)::int AS n
             FROM contacts WHERE needs_human AND last_seen >= now() - interval '8 days' GROUP BY 1
         ) hum ON hum.d = days.d
        ORDER BY days.d`
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM contacts WHERE ${C}) AS cur,
         (SELECT COUNT(*)::int FROM contacts WHERE ${CP}) AS prev`
    ),
  ]);

  const r = core.rows[0];
  const pct = (cur, prev) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : null;

  return {
    period: p,
    projects: r.projects,
    contactsTotal: r.contacts_total,
    contactsActive: r.contacts_active,
    contactsNew: newContacts.rows[0].cur,
    messages: r.messages_cur,
    today: r.today,
    needsHuman: r.needs_human,
    trends: {
      messages: p === "all" ? null : pct(r.messages_cur, r.messages_prev),
      contacts: p === "all" ? null : pct(r.contacts_active, r.contacts_active_prev),
      newContacts: p === "all" ? null : pct(newContacts.rows[0].cur, newContacts.rows[0].prev),
    },
    series: series.rows,
    sparks: {
      msgs: sparks.rows.map((x) => x.msgs),
      active: sparks.rows.map((x) => x.active),
      human: sparks.rows.map((x) => x.human),
    },
  };
}

// ------------------------------------------------------------
//  C1: Donut — suhbatlar holati (o'zaro istisno kategoriyalar)
//  ustuvorlik: odam kerak > pauzada > javob berilgan > javobsiz
// ------------------------------------------------------------
export async function getDonutData(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const { rows } = await pool.query(
    `WITH davr AS (
       SELECT DISTINCT m.contact_id AS id FROM messages m WHERE ${M}
     ),
     holat AS (
       SELECT c.id,
              CASE
                WHEN c.needs_human THEN 'human'
                WHEN c.bot_paused THEN 'paused'
                WHEN EXISTS (SELECT 1 FROM messages b
                              WHERE b.contact_id = c.id AND b.role = 'assistant') THEN 'answered'
                ELSE 'silent'
              END AS s
         FROM contacts c
         JOIN davr ON davr.id = c.id
     )
     SELECT s, COUNT(*)::int AS n FROM holat GROUP BY s`
  );
  const out = { answered: 0, human: 0, paused: 0, silent: 0 };
  for (const r of rows) out[r.s] = r.n;
  return out;
}

// ------------------------------------------------------------
//  C2: Soatlik heatmap — 7 kun × 24 soat (mijoz xabarlari)
// ------------------------------------------------------------
export async function getHeatmapData(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "created_at");
  const { rows } = await pool.query(
    `SELECT EXTRACT(DOW FROM created_at ${TZ})::int AS dow,
            EXTRACT(HOUR FROM created_at ${TZ})::int AS hour,
            COUNT(*)::int AS n
       FROM messages
      WHERE role = 'user' AND ${M}
      GROUP BY 1, 2`
  );
  return rows;
}

// ------------------------------------------------------------
//  C3: Akkauntlar taqqoslashi — mijoz/xabar soni, faoldan pastga
// ------------------------------------------------------------
export async function getAccountsComparison(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const { rows } = await pool.query(
    `SELECT p.id, p.name,
            COUNT(DISTINCT m.contact_id)::int AS contacts,
            COUNT(m.id)::int AS messages
       FROM projects p
       LEFT JOIN contacts c ON c.project_id = p.id
       LEFT JOIN messages m ON m.contact_id = c.id AND ${M}
      GROUP BY p.id, p.name
      ORDER BY messages DESC, contacts DESC`
  );
  return rows;
}

// ------------------------------------------------------------
//  C4: Konversiya voronkasi
//  yozgan → suhbatlashgan (2+ xabar) → qiziqqan (narx) → aloqaga chiqqan
// ------------------------------------------------------------
export async function getFunnelData(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const { rows } = await pool.query(
    `WITH davr AS (
       SELECT m.contact_id AS id,
              COUNT(*) FILTER (WHERE m.role = 'user')::int AS user_msgs,
              bool_or(m.role = 'user' AND (
                m.text ILIKE '%narx%' OR m.text ILIKE '%qancha%' OR m.text ILIKE '%price%'
                OR m.text ILIKE '%xizmat%' OR m.text ILIKE '%chegirma%' OR m.text ILIKE '%skidka%'
              )) AS interested,
              bool_or(m.role = 'user' AND (
                m.text ILIKE '%telegram%' OR m.text ILIKE '%telefon%' OR m.text ILIKE '%nomer%'
                OR m.text ILIKE '%raqam%' OR m.text ILIKE '%bog''lan%' OR m.text ILIKE '%aloqa%'
              )) AS contacted
         FROM messages m
        WHERE ${M}
        GROUP BY m.contact_id
     )
     SELECT COUNT(*)::int AS wrote,
            COUNT(*) FILTER (WHERE user_msgs >= 2)::int AS engaged,
            COUNT(*) FILTER (WHERE interested)::int AS interested,
            COUNT(*) FILTER (WHERE contacted OR EXISTS (
              SELECT 1 FROM contacts c WHERE c.id = davr.id AND c.needs_human
            ))::int AS contacted
       FROM davr`
  );
  return rows[0];
}

// ------------------------------------------------------------
//  D: 6 metrika
// ------------------------------------------------------------
export async function getMetrics(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const MM = periodCond(p, "created_at");

  const [respTime, convLen, weekdays, unanswered, repeats, newVsOld] = await Promise.all([
    // 1. O'rtacha javob vaqti: user → keyingi assistant orasidagi sekundlar (10 daqiqagacha)
    pool.query(
      `WITH juft AS (
         SELECT m.created_at AS t,
                LAG(m.role) OVER (PARTITION BY m.contact_id ORDER BY m.created_at) AS prev_role,
                LAG(m.created_at) OVER (PARTITION BY m.contact_id ORDER BY m.created_at) AS prev_t,
                m.role
           FROM messages m
          WHERE ${M}
       )
       SELECT AVG(EXTRACT(EPOCH FROM (t - prev_t)))::float AS avg_s,
              COUNT(*)::int AS n
         FROM juft
        WHERE role = 'assistant' AND prev_role = 'user'
          AND t - prev_t < interval '10 minutes'`
    ),
    // 2. O'rtacha suhbat davomiyligi: kontaktga o'rtacha xabar soni
    pool.query(
      `SELECT COALESCE(AVG(n), 0)::float AS avg_msgs
         FROM (SELECT COUNT(*)::int AS n FROM messages m WHERE ${M} GROUP BY m.contact_id) t`
    ),
    // 3. Hafta kunlari bo'yicha taqsimot (mijoz xabarlari)
    pool.query(
      `SELECT EXTRACT(DOW FROM m.created_at ${TZ})::int AS dow, COUNT(*)::int AS n
         FROM messages m
        WHERE m.role = 'user' AND ${M}
        GROUP BY 1 ORDER BY 1`
    ),
    // 4. Javobsiz qolgan savollar: bot "bilmayman" tipidagi javoblari
    pool.query(
      `SELECT COUNT(*)::int AS n FROM messages m
        WHERE m.role = 'assistant' AND ${M}
          AND (m.text ILIKE '%bilmayman%' OR m.text ILIKE '%kechirasiz%'
               OR m.text ILIKE '%aniq emas%' OR m.text ILIKE '%ma''lumot yo''q%'
               OR m.text ILIKE '%javob berolmayman%' OR m.text ILIKE '%operator%')`
    ),
    // 5. Takroriy mijozlar: 2+ turli kunda yozganlar
    pool.query(
      `WITH kunlar AS (
         SELECT m.contact_id, COUNT(DISTINCT (m.created_at ${TZ})::date)::int AS d
           FROM messages m
          WHERE m.role = 'user' AND ${M}
          GROUP BY m.contact_id
       )
       SELECT COUNT(*) FILTER (WHERE d >= 2)::int AS repeat,
              COUNT(*)::int AS total
         FROM kunlar`
    ),
    // 6. Yangi vs qaytgan: davrda yozganlardan first_seen davr ichida/oldin
    pool.query(
      `WITH faol AS (SELECT DISTINCT m.contact_id AS id FROM messages m WHERE ${M})
       SELECT COUNT(*) FILTER (WHERE ${periodCond(p, "c.first_seen")})::int AS fresh,
              COUNT(*)::int AS total
         FROM contacts c JOIN faol ON faol.id = c.id`
    ),
  ]);

  const rt = respTime.rows[0];
  const rp = repeats.rows[0];
  const nv = newVsOld.rows[0];
  return {
    period: p,
    avgResponseSec: rt.avg_s != null ? Math.round(rt.avg_s * 10) / 10 : null,
    avgResponseSample: rt.n,
    avgConversationMsgs: Math.round(convLen.rows[0].avg_msgs * 10) / 10,
    weekdays: weekdays.rows,
    unanswered: unanswered.rows[0].n,
    repeatCustomers: { count: rp.repeat, total: rp.total,
      pct: rp.total ? Math.round((rp.repeat / rp.total) * 100) : 0 },
    newVsReturning: { fresh: nv.fresh, returning: nv.total - nv.fresh, total: nv.total },
  };
}

// ------------------------------------------------------------
//  F1: CSV eksport uchun kontaktlar (davr bo'yicha)
// ------------------------------------------------------------
export async function listContactsForExport(period) {
  const p = normalizePeriod(period);
  const C = p === "all" ? "TRUE" : periodCond(p, "c.last_seen");
  const { rows } = await pool.query(
    `SELECT c.name, c.ig_user_id, p.name AS project_name,
            array_to_string(c.tags, '; ') AS tags,
            COUNT(m.id)::int AS msg_count,
            c.first_seen, c.last_seen, c.note
       FROM contacts c
       JOIN projects p ON p.id = c.project_id
       LEFT JOIN messages m ON m.contact_id = c.id
      WHERE ${C}
      GROUP BY c.id, p.name
      ORDER BY c.last_seen DESC`
  );
  return rows;
}

export { pool };
