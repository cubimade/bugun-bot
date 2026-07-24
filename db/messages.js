// ============================================================
//  DB/MESSAGES.JS — xabarlar va broadcast (ROADMAP-6 A4)
// ============================================================
import { pool } from "./pool.js";

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

export async function getContactMessages(contactId) {
  const { rows } = await pool.query(
    `SELECT role, text, created_at, is_operator
       FROM messages WHERE contact_id = $1
      ORDER BY created_at ASC`,
    [contactId]
  );
  return rows;
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
