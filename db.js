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
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      ig_account_id TEXT UNIQUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Mijozlar (Instagram foydalanuvchilari)
    CREATE TABLE IF NOT EXISTS contacts (
      id          SERIAL PRIMARY KEY,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      ig_user_id  TEXT NOT NULL,
      name        TEXT,
      first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (project_id, ig_user_id)
    );

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
export async function getOrCreateProject(name, igAccountId = null) {
  const { rows } = await pool.query(
    `INSERT INTO projects (name, ig_account_id)
     VALUES ($1, $2)
     ON CONFLICT (ig_account_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, igAccountId]
  );

  // ig_account_id null bo'lsa ON CONFLICT ishlamaydi — nom bo'yicha qidiramiz
  if (rows[0]) return rows[0].id;

  const found = await pool.query(
    `SELECT id FROM projects WHERE name = $1 ORDER BY id LIMIT 1`,
    [name]
  );
  return found.rows[0].id;
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

export { pool };
