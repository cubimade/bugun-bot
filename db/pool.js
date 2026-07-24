// ============================================================
//  DB/POOL.JS — PostgreSQL ulanishi va jadval yaratish (migratsiya)
//  (ROADMAP-6 A4 da db.js dan ajratilgan)
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

export const pool = new Pool({
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

    -- 6-bosqich (D4/D5): suhbat arxivi va bot javobini baholash
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS rating SMALLINT; -- 1=👍, -1=👎, NULL=baholanmagan

    -- 7-bosqich (7.3): xabar manbasi — dm | story_reply | comment | followup
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'dm';

    -- 7.4: Kalit so'z → avto-javob qoidalari (project_id NULL = barcha akkauntlar)
    CREATE TABLE IF NOT EXISTS keyword_rules (
      id          SERIAL PRIMARY KEY,
      project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      keyword     TEXT NOT NULL,
      match_type  TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains')),
      reply_text  TEXT NOT NULL,
      media_url   TEXT,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      hit_count   INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 7.5: Follow-up avtomatizatsiya
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS followup_sent_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS followup_paused BOOLEAN NOT NULL DEFAULT false;

    -- 7.8: Avtomatik teglash qoidalari (so'z → teg)
    CREATE TABLE IF NOT EXISTS tag_rules (
      id          SERIAL PRIMARY KEY,
      project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      keyword     TEXT NOT NULL,
      tag_name    TEXT NOT NULL,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

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
    -- 9.5: broadcast'ga rasm biriktirish
    ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS media_url TEXT;

    -- 9.5: Media kutubxona — fayllar database'da (redeploy'da yo'qolmaydi)
    CREATE TABLE IF NOT EXISTS media_library (
      id           SERIAL PRIMARY KEY,
      project_id   INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'image' CHECK (type IN ('image','video','file')),
      mime         TEXT,
      size         INTEGER NOT NULL DEFAULT 0,
      data         BYTEA,
      is_portfolio BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 9.3: Ko'p tillilik — mijoz tili (uz | ru | en)
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS language TEXT;

    -- 9.1: Ko'p kanallilik — loyiha platformasi (instagram | telegram)
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'instagram';
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS tg_username TEXT;

    -- 8.5: Sotuv voronkasi (kanban) — bosqich, summa
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new';
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deal_amount NUMERIC;
    CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(stage);

    -- 8.2: FLOW BUILDER — vizual suhbat oqimlari
    CREATE TABLE IF NOT EXISTS flows (
      id            SERIAL PRIMARY KEY,
      project_id    INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      trigger_type  TEXT NOT NULL DEFAULT 'manual'
                    CHECK (trigger_type IN ('keyword','story','comment','new_contact','manual')),
      trigger_value TEXT,
      is_active     BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS flow_nodes (
      id          SERIAL PRIMARY KEY,
      flow_id     INTEGER NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
      type        TEXT NOT NULL CHECK (type IN ('message','buttons','condition','action','delay')),
      config      JSONB NOT NULL DEFAULT '{}',
      position_x  INTEGER NOT NULL DEFAULT 0,
      position_y  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS flow_edges (
      id              SERIAL PRIMARY KEY,
      flow_id         INTEGER NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
      from_node_id    INTEGER NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
      to_node_id      INTEGER NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
      condition_label TEXT
    );

    -- Kontaktning flow'dagi joriy holati (current_node_id ataylab FK'siz:
    -- graf qayta saqlanganda eski holat flow'ni yiqitmasin — motor o'zi to'xtatadi)
    CREATE TABLE IF NOT EXISTS contact_flow_state (
      id              SERIAL PRIMARY KEY,
      contact_id      INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      flow_id         INTEGER NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
      current_node_id INTEGER,
      variables       JSONB NOT NULL DEFAULT '{}',
      next_run_at     TIMESTAMPTZ,
      status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','stopped')),
      started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow ON flow_nodes(flow_id);
    CREATE INDEX IF NOT EXISTS idx_flow_edges_flow ON flow_edges(flow_id);
    CREATE INDEX IF NOT EXISTS idx_flow_state_contact ON contact_flow_state(contact_id) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_flow_state_next_run ON contact_flow_state(next_run_at) WHERE status = 'active';

    -- Tez qidiruv uchun indekslar
    CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_contacts_project ON contacts(project_id);
    -- 5-bosqich analitika: vaqt kesimlari va rol bo'yicha tez so'rovlar
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_role_created ON messages(role, created_at);
    CREATE INDEX IF NOT EXISTS idx_contacts_first_seen ON contacts(first_seen);
    -- 6-bosqich (B1): tez-tez ishlatiladigan tartiblash uchun
    CREATE INDEX IF NOT EXISTS idx_messages_created_desc ON messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contacts_lastseen ON contacts(last_seen DESC);
  `);

  console.log("✅ Database jadvallar tayyor (projects, contacts, messages).");
  return true;
}
