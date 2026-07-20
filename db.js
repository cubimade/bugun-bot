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

    -- Suhbat xabarlari (doimiy xotira)
    CREATE TABLE IF NOT EXISTS messages (
      id          SERIAL PRIMARY KEY,
      contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      text        TEXT NOT NULL,
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
  const [projects, contacts, messages, recent, topContacts] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS n FROM projects`),
    pool.query(`SELECT COUNT(*)::int AS n FROM contacts`),
    pool.query(`SELECT COUNT(*)::int AS n FROM messages`),
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
    `SELECT c.id, c.ig_user_id, c.name, c.project_id, p.name AS project_name
       FROM contacts c JOIN projects p ON p.id = c.project_id
      WHERE c.id = $1`,
    [contactId]
  );
  return rows[0] || null;
}

export { pool };
