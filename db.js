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

    -- Suhbat xabarlari (doimiy xotira)
    CREATE TABLE IF NOT EXISTS messages (
      id          SERIAL PRIMARY KEY,
      contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      text        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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

    -- Tez qidiruv uchun indekslar
    CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_contacts_project ON contacts(project_id);
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
     RETURNING id`,
    [projectId, igUserId, name]
  );
  return rows[0].id;
}

// ------------------------------------------------------------
//  Xabarni saqlash
// ------------------------------------------------------------
export async function saveMessage(contactId, role, text) {
  await pool.query(
    `INSERT INTO messages (contact_id, role, text) VALUES ($1, $2, $3)`,
    [contactId, role, text]
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
            c.tags, c.unread, c.first_seen,
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
    `SELECT role, text, created_at
       FROM messages WHERE contact_id = $1
      ORDER BY created_at ASC`,
    [contactId]
  );
  return rows;
}

export async function getContact(contactId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.ig_user_id, c.name, c.project_id, c.needs_human, c.tags,
            c.unread, p.name AS project_name
       FROM contacts c JOIN projects p ON p.id = c.project_id
      WHERE c.id = $1`,
    [contactId]
  );
  return rows[0] || null;
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

export async function listBroadcasts(limit = 20) {
  const { rows } = await pool.query(
    `SELECT b.id, b.audience, b.message, b.total, b.sent, b.failed, b.created_at,
            p.name AS project_name
       FROM broadcasts b
       LEFT JOIN projects p ON p.id = b.project_id
      ORDER BY b.created_at DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

export { pool };
