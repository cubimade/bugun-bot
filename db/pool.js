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

    -- 16 (3.1b): moslik turlari kengaytirildi — starts va regex qo'shildi.
    -- Eski CHECK faqat exact/contains ga ruxsat berardi, yangi tur saqlanmasdi.
    ALTER TABLE keyword_rules DROP CONSTRAINT IF EXISTS keyword_rules_match_type_check;
    ALTER TABLE keyword_rules ADD CONSTRAINT keyword_rules_match_type_check
      CHECK (match_type IN ('exact','contains','starts','regex'));

    -- 16 (3.1c/d/e): kalit so'z qoidasi kuchaytirildi
    ALTER TABLE keyword_rules ADD COLUMN IF NOT EXISTS media_urls JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE keyword_rules ADD COLUMN IF NOT EXISTS buttons JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE keyword_rules ADD COLUMN IF NOT EXISTS delay_sec INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE keyword_rules ADD COLUMN IF NOT EXISTS once_per_contact BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE keyword_rules ADD COLUMN IF NOT EXISTS work_hours_only BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE keyword_rules ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE keyword_rules ADD COLUMN IF NOT EXISTS reply_count INTEGER NOT NULL DEFAULT 0;
    -- Eski bitta media_url qiymati yangi massivga ko'chiriladi (bir marta)
    UPDATE keyword_rules SET media_urls = to_jsonb(ARRAY[media_url])
     WHERE media_url IS NOT NULL AND media_urls = '[]'::jsonb;

    -- "Faqat bir marta" va "necha kishi javob berdi" uchun ishlash tarixi
    CREATE TABLE IF NOT EXISTS keyword_rule_hits (
      rule_id    INTEGER NOT NULL REFERENCES keyword_rules(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      fired_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      replied    BOOLEAN NOT NULL DEFAULT false,
      PRIMARY KEY (rule_id, contact_id)
    );
    CREATE INDEX IF NOT EXISTS idx_kw_hits_contact ON keyword_rule_hits(contact_id);

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

    -- AI natijalar keshi (summary/insights — redeploy'da yo'qolmaydi)
    CREATE TABLE IF NOT EXISTS ai_cache (
      key        TEXT PRIMARY KEY,
      data       JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ROADMAP-18 FAZA 4: cron ishga tushishlari — "ishladimi?" savoliga aniq javob
    CREATE TABLE IF NOT EXISTS cron_runs (
      name          TEXT PRIMARY KEY,
      last_run_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_ok_at    TIMESTAMPTZ,
      last_error    TEXT,
      last_duration_ms INTEGER,
      run_count     INTEGER NOT NULL DEFAULT 0
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

    -- 10.1: Bron / navbat tizimi
    CREATE TABLE IF NOT EXISTS booking_settings (
      project_id        INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      is_active         BOOLEAN NOT NULL DEFAULT false,
      work_days         JSONB NOT NULL DEFAULT '[1,2,3,4,5,6]',
      work_start        INTEGER NOT NULL DEFAULT 9,
      work_end          INTEGER NOT NULL DEFAULT 18,
      slot_duration_min INTEGER NOT NULL DEFAULT 60,
      break_between_min INTEGER NOT NULL DEFAULT 0,
      max_days_ahead    INTEGER NOT NULL DEFAULT 7
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id           SERIAL PRIMARY KEY,
      project_id   INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      contact_id   INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      service_name TEXT,
      starts_at    TIMESTAMPTZ NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 60,
      status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','cancelled','done')),
      note         TEXT,
      reminded     BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_starts ON bookings(starts_at);
    CREATE INDEX IF NOT EXISTS idx_bookings_contact ON bookings(contact_id);

    -- 10.3: To'lovlar (faqat havola va holat — karta ma'lumoti SAQLANMAYDI)
    CREATE TABLE IF NOT EXISTS payments (
      id          SERIAL PRIMARY KEY,
      project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      contact_id  INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      amount      NUMERIC,
      method      TEXT,
      status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
      link        TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      paid_at     TIMESTAMPTZ
    );

    -- 10.4: Chegirma (promo) kodlari
    CREATE TABLE IF NOT EXISTS promo_codes (
      id               SERIAL PRIMARY KEY,
      project_id       INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      code             TEXT NOT NULL UNIQUE,
      discount_percent INTEGER,
      discount_amount  NUMERIC,
      max_uses         INTEGER NOT NULL DEFAULT 1,
      used_count       INTEGER NOT NULL DEFAULT 0,
      valid_until      TIMESTAMPTZ,
      is_active        BOOLEAN NOT NULL DEFAULT true,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 10.5: Referral
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referred_by INTEGER;

    -- 10.2: Narx kalkulyatori qoidalari
    CREATE TABLE IF NOT EXISTS price_rules (
      id         SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      question   TEXT NOT NULL,
      options    JSONB NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- 10.6: AI mijoz profili
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile JSONB;

    -- 12.1: Foydalanuvchilar va rollar
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name          TEXT,
      role          TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('owner','admin','operator')),
      is_active     BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login    TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid        TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    -- Operator qaysi akkauntlarni ko'radi (bo'sh = hammasi)
    CREATE TABLE IF NOT EXISTS user_projects (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, project_id)
    );

    -- 12.2: Suhbat biriktirish va ichki izohlar
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assigned_user_id INTEGER;

    CREATE TABLE IF NOT EXISTS internal_notes (
      id         SERIAL PRIMARY KEY,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      user_id    INTEGER,
      user_name  TEXT,
      text       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_internal_notes_contact ON internal_notes(contact_id);

    -- 12.4: Chiquvchi webhook va API kalitlar
    CREATE TABLE IF NOT EXISTS webhooks (
      id         SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      url        TEXT NOT NULL,
      events     JSONB NOT NULL DEFAULT '[]',
      is_active  BOOLEAN NOT NULL DEFAULT true,
      secret     TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      key_hash   TEXT NOT NULL,
      key_hint   TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_used  TIMESTAMPTZ
    );

    -- 12.5: Audit log
    CREATE TABLE IF NOT EXISTS audit_log (
      id         SERIAL PRIMARY KEY,
      user_label TEXT,
      action     TEXT NOT NULL,
      details    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 11.2: Segmentatsiya (vip/faol/uxlagan/sovuq), 11.5: A/B variant
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS segment TEXT;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ab_variant TEXT;

    -- 11.5: A/B testlar
    CREATE TABLE IF NOT EXISTS ab_tests (
      id            SERIAL PRIMARY KEY,
      project_id    INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      test_type     TEXT NOT NULL DEFAULT 'greeting' CHECK (test_type IN ('greeting','followup')),
      variant_a     TEXT,
      variant_b     TEXT,
      split_percent INTEGER NOT NULL DEFAULT 50,
      metric        TEXT NOT NULL DEFAULT 'reply_rate',
      status        TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','stopped','finished')),
      started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at      TIMESTAMPTZ
    );

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

    -- 15: Instagram OAuth ("Instagram bilan ulash") — profil va token holati
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS ig_username TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS ig_name TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS token_source TEXT NOT NULL DEFAULT 'manual';
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS token_last_refreshed_at TIMESTAMPTZ;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS granted_scopes TEXT;

    -- ROADMAP-18 davomi: OAuth 2-qadam qaytargan app-scoped ID. Webhook entry.id
    -- haqiqiy akkaunt IDsi (17841...) yoki app-scoped bo'lishi mumkin — ikkala
    -- kalit bo'yicha ham moslashtiriladi (state.js xaritasi).
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS app_scoped_id TEXT;

    -- ROADMAP-19 FAZA 1: ko'p ilovali arxitektura — har loyihaga o'z Meta
    -- ilovasi. Secret'lar FAQAT shifrlangan saqlanadi (services/crypto.js).
    -- Bu ustunlar bo'sh loyiha global env sozlamalari bilan ishlayveradi.
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS ig_app_id TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS ig_app_secret_enc TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS meta_app_id TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS meta_app_secret_enc TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS verify_token TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS app_setup_status TEXT DEFAULT 'none';
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS app_setup_checked_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_projects_ig_app_id ON projects(ig_app_id);
    CREATE INDEX IF NOT EXISTS idx_projects_token_expires ON projects(token_expires_at);

    -- OAuth CSRF himoyasi: bir martalik "state" qiymatlari (15 daqiqa yashaydi)
    CREATE TABLE IF NOT EXISTS oauth_states (
      state      TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      used       BOOLEAN NOT NULL DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_states_created ON oauth_states(created_at);

    -- 16 (2.1): Mijoz profili — raqamli IGSID o'rniga @username va rasm.
    -- profile_pic URL'i VAQTINCHALIK (Meta muddatini tugatadi) — shuning uchun
    -- rasm emas, URL saqlanadi va profile_fetched_at bo'yicha qayta olinadi.
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_pic TEXT;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_fetched_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_contacts_profile_fetched ON contacts(profile_fetched_at);

    -- ROADMAP-18 FAZA 7: ma'lumot ulashishni yopgan mijozlar — 3 muvaffaqiyatsiz
    -- urinishdan keyin belgilanadi va qayta urinishdan chiqariladi
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_attempts INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_unavailable BOOLEAN NOT NULL DEFAULT false;

    -- 16 (2.2): Xabarni KIM yozgani — contact | ai | operator | automation | broadcast
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_type TEXT;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_label TEXT;
    -- Eski xabarlar: role va is_operator bo'yicha bir martalik to'ldirish
    UPDATE messages SET sender_type =
      CASE WHEN role = 'user' THEN 'contact'
           WHEN is_operator THEN 'operator'
           ELSE 'ai' END
     WHERE sender_type IS NULL;

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
    -- 13-bosqich (audit): follow-up LATERAL so'rovi har kontakt uchun
    -- "oxirgi xabar" ni qidiradi — (contact_id, role, created_at DESC) indeksi
    -- bu ikkala LATERAL'ni ham indeksdan o'qishga imkon beradi
    CREATE INDEX IF NOT EXISTS idx_messages_contact_role_created
      ON messages(contact_id, role, created_at DESC);
    -- Follow-up/segment filtrlari faol (arxivlanmagan) kontaktlar bo'yicha
    CREATE INDEX IF NOT EXISTS idx_contacts_active_followup
      ON contacts(followup_sent_count) WHERE NOT archived AND NOT bot_paused;
  `);

  await ensureIgAccountUnique();

  console.log("✅ Database jadvallar tayyor (projects, contacts, messages).");
  return true;
}

// ------------------------------------------------------------
//  15: ON CONFLICT (ig_account_id) ishlashi uchun UNIQUE shart kerak.
//  Jadval boshidanoq UNIQUE bilan yaratilgan — bu faqat juda eski bazalar
//  uchun himoya. ATAYLAB alohida so'rov va alohida try/catch: dublikat
//  qiymatlar bo'lsa xato chiqadi, lekin butun migratsiya yiqilmasin.
// ------------------------------------------------------------
async function ensureIgAccountUnique() {
  try {
    const { rows } = await pool.query(
      `SELECT 1
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'projects'
          AND c.contype IN ('u', 'p')
          AND pg_get_constraintdef(c.oid) LIKE '%(ig_account_id)%'
        UNION ALL
       SELECT 1
         FROM pg_indexes
        WHERE tablename = 'projects' AND indexdef LIKE '%UNIQUE%(ig_account_id)%'`
    );
    if (rows.length) return; // allaqachon bor

    await pool.query(
      `ALTER TABLE projects ADD CONSTRAINT projects_ig_account_id_key UNIQUE (ig_account_id)`
    );
    console.log("✅ projects.ig_account_id uchun UNIQUE shart qo'shildi.");
  } catch (err) {
    // Dublikat ig_account_id bo'lsa shu yerga tushamiz — eng yangisini
    // qoldirib qolganini o'chirish kerak (qo'lda), aks holda OAuth upsert
    // ishlamaydi. Server esa ishlayveradi.
    console.error(
      "⚠️ projects.ig_account_id UNIQUE qo'shilmadi (dublikat bo'lishi mumkin):",
      err.message
    );
  }
}
