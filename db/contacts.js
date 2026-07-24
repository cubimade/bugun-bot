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
     RETURNING id, name, bot_paused, paused_until`,
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
            c.archived,
            p.name AS project_name, p.platform,
            (SELECT COUNT(*)::int FROM messages m WHERE m.contact_id = c.id) AS msg_count,
            (SELECT text FROM messages m WHERE m.contact_id = c.id
              ORDER BY created_at DESC LIMIT 1) AS last_text,
            EXISTS (SELECT 1 FROM messages m WHERE m.contact_id = c.id
                      AND m.source = 'story_reply') AS has_story
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

// D1: Global qidiruv — kontakt (ism/ID) va xabar matni bo'yicha
export async function searchAll(q, limit = 8) {
  const like = "%" + q + "%";
  const [contacts, messages] = await Promise.all([
    pool.query(
      `SELECT c.id, c.name, c.ig_user_id, c.last_seen, p.name AS project_name
         FROM contacts c JOIN projects p ON p.id = c.project_id
        WHERE c.name ILIKE $1 OR c.ig_user_id ILIKE $1
        ORDER BY c.last_seen DESC LIMIT $2`,
      [like, limit]
    ),
    pool.query(
      `SELECT DISTINCT ON (m.contact_id)
              m.contact_id, m.text, m.created_at, c.name, c.ig_user_id
         FROM messages m JOIN contacts c ON c.id = m.contact_id
        WHERE m.text ILIKE $1
        ORDER BY m.contact_id, m.created_at DESC
        LIMIT $2`,
      [like, limit]
    ),
  ]);
  return { contacts: contacts.rows, messages: messages.rows };
}

// D2: Bildirishnomalar — "odam kerak" suhbatlar ro'yxati
export async function listNeedsHuman(limit = 20) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.ig_user_id, c.last_seen, p.name AS project_name
       FROM contacts c JOIN projects p ON p.id = c.project_id
      WHERE c.needs_human AND NOT c.archived
      ORDER BY c.last_seen DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

// D4: Suhbatni arxivlash / arxivdan chiqarish
export async function setContactArchived(contactId, value) {
  await pool.query(`UPDATE contacts SET archived = $2 WHERE id = $1`, [
    contactId,
    value,
  ]);
}

// F2: Kontaktni BUTUNLAY o'chirish (GDPR) — xabarlar CASCADE bilan o'chadi
export async function deleteContact(contactId) {
  const { rows } = await pool.query(
    `DELETE FROM contacts WHERE id = $1 RETURNING id`,
    [contactId]
  );
  return rows[0]?.id || null;
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
            c.note, c.sentiment, c.archived, p.name AS project_name,
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
            p.ig_account_id, p.access_token, p.platform
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

// 7.8: Yangi teglarni mavjudlariga qo'shish (takrorsiz, bitta so'rovda)
export async function addContactTags(contactId, newTags) {
  if (!newTags?.length) return;
  await pool.query(
    `UPDATE contacts
        SET tags = ARRAY(SELECT DISTINCT unnest(tags || $2::text[]))
      WHERE id = $1`,
    [contactId, newTags]
  );
}

// ------------------------------------------------------------
//  8.5: SOTUV VORONKASI (kanban)
// ------------------------------------------------------------
export const STAGES = ["new", "interested", "negotiation", "won", "lost"];

export async function setContactStage(contactId, stage) {
  if (!STAGES.includes(stage)) return false;
  await pool.query(
    `UPDATE contacts SET stage = $2, stage_changed_at = now() WHERE id = $1 AND stage <> $2`,
    [contactId, stage]
  );
  return true;
}

// Teg orqali avto-harakat: faqat OLDINGA suradi (won/lost'dan qaytarmaydi)
export async function advanceContactStage(contactId, stage) {
  if (!STAGES.includes(stage)) return false;
  const idx = STAGES.indexOf(stage);
  await pool.query(
    `UPDATE contacts SET stage = $2, stage_changed_at = now()
      WHERE id = $1
        AND array_position($3::text[], stage) < $4
        AND stage NOT IN ('won','lost')`,
    [contactId, stage, STAGES, idx + 1]
  );
  return true;
}

export async function setDealAmount(contactId, amount) {
  await pool.query(`UPDATE contacts SET deal_amount = $2 WHERE id = $1`, [
    contactId,
    amount,
  ]);
}

// Kanban uchun kontaktlar (bosqich bo'yicha, har biri oxirgi xabari bilan)
export async function listPipelineContacts(limit = 400) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.ig_user_id, c.tags, c.stage, c.stage_changed_at,
            c.deal_amount, c.last_seen, c.sentiment, p.name AS project_name,
            (SELECT text FROM messages m WHERE m.contact_id = c.id
              ORDER BY created_at DESC LIMIT 1) AS last_text
       FROM contacts c
       JOIN projects p ON p.id = c.project_id
      WHERE NOT c.archived
      ORDER BY c.last_seen DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

// Voronka statistikasi: har bosqichda nechta, jami summa, o'rtacha turish vaqti
export async function pipelineStats() {
  const { rows } = await pool.query(
    `SELECT stage,
            COUNT(*)::int AS n,
            COALESCE(SUM(deal_amount), 0)::float AS total,
            COALESCE(AVG(EXTRACT(EPOCH FROM (now() - stage_changed_at)) / 86400), 0)::float AS avg_days
       FROM contacts
      WHERE NOT archived
      GROUP BY stage`
  );
  return rows;
}

// 8.2: Bitta tegni olib tashlash (flow "amal" node'i uchun)
export async function removeContactTag(contactId, tag) {
  await pool.query(`UPDATE contacts SET tags = array_remove(tags, $2) WHERE id = $1`, [
    contactId,
    tag,
  ]);
}

export async function listAllTags() {
  const { rows } = await pool.query(
    `SELECT DISTINCT unnest(tags) AS tag FROM contacts ORDER BY 1`
  );
  return rows.map((r) => r.tag);
}
