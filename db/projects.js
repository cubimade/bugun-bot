// ============================================================
//  DB/PROJECTS.JS — akkauntlar (loyihalar) va bilim bazasi
//  (ROADMAP-6 A4 da db.js dan ajratilgan)
// ============================================================
import { pool } from "./pool.js";

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

// 7.2 diagnostika: akkauntning oxirgi mijoz xabari vaqti
export async function getProjectActivity(projectId) {
  const { rows } = await pool.query(
    `SELECT MAX(m.created_at) AS last_user_msg,
            COUNT(DISTINCT c.id)::int AS contacts
       FROM contacts c
       LEFT JOIN messages m ON m.contact_id = c.id AND m.role = 'user'
      WHERE c.project_id = $1`,
    [projectId]
  );
  return rows[0];
}

// Akkaunt tokeni (broadcast/qo'lda javob uchun)
export async function getProjectToken(projectId) {
  const { rows } = await pool.query(
    `SELECT id, name, ig_account_id, access_token FROM projects WHERE id = $1`,
    [projectId]
  );
  return rows[0] || null;
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
