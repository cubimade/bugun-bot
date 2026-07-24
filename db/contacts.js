// ============================================================
//  DB/CONTACTS.JS — mijozlar: yaratish, holat, teglar, mini-CRM
//  (ROADMAP-6 A4 da db.js dan ajratilgan)
// ============================================================
import { pool } from "./pool.js";

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

// Suhbat ochilganda o'qilmaganlarni nolga tushirish
export async function markContactRead(contactId) {
  await pool.query(`UPDATE contacts SET unread = 0 WHERE id = $1`, [contactId]);
}

// ------------------------------------------------------------
//  Suhbatlar (dashboard uchun) — mijozlar ro'yxati
// ------------------------------------------------------------
export async function listContacts(limit = 50, offset = 0) {
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
      LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

// Jami kontaktlar soni (pagination uchun)
export async function countContacts() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM contacts`);
  return rows[0].n;
}

// Mijozni "jonli operator kerak" deb belgilash (yoki bekor qilish)
export async function setNeedsHuman(contactId, value) {
  await pool.query(`UPDATE contacts SET needs_human = $2 WHERE id = $1`, [
    contactId,
    value,
  ]);
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
