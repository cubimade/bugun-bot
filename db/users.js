// ============================================================
//  DB/USERS.JS — 12.1: foydalanuvchilar, sessiyalar, rollar,
//  12.2: biriktirish/ichki izohlar, 12.5: audit log
// ============================================================
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

// ------------------------------------------------------------
//  FOYDALANUVCHILAR
// ------------------------------------------------------------
export async function countUsers() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM users`);
  return rows[0].n;
}

export async function createUser({ email, password, name, role }) {
  const hash = bcrypt.hashSync(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES (lower($1), $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email.trim(), hash, name || null, role || "operator"]
  );
  return rows[0]?.id || null;
}

export async function listUsers() {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at, u.last_login,
            COALESCE(array_agg(up.project_id) FILTER (WHERE up.project_id IS NOT NULL), '{}') AS project_ids
       FROM users u
       LEFT JOIN user_projects up ON up.user_id = u.id
      GROUP BY u.id
      ORDER BY u.id`
  );
  return rows;
}

export async function updateUser(id, { name, role, isActive, password }) {
  await pool.query(
    `UPDATE users
        SET name = COALESCE($2, name),
            role = COALESCE($3, role),
            is_active = COALESCE($4, is_active),
            password_hash = COALESCE($5, password_hash)
      WHERE id = $1`,
    [id, name ?? null, role ?? null, isActive ?? null, password ? bcrypt.hashSync(password, 10) : null]
  );
}

export async function deleteUser(id) {
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
}

export async function setUserProjects(userId, projectIds) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM user_projects WHERE user_id = $1`, [userId]);
    for (const pid of projectIds) {
      await client.query(
        `INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, pid]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Login: email + parol → foydalanuvchi yoki null
export async function verifyUserLogin(email, password) {
  const { rows } = await pool.query(
    `SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = lower($1)`,
    [String(email || "").trim()]
  );
  const u = rows[0];
  if (!u || !u.is_active) return null;
  if (!bcrypt.compareSync(String(password || ""), u.password_hash)) return null;
  await pool.query(`UPDATE users SET last_login = now() WHERE id = $1`, [u.id]);
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

// Birinchi owner — mavjud DASHBOARD_PASSWORD bilan (migratsiya, buzilmasin)
export async function ensureOwnerUser(email, password) {
  const n = await countUsers();
  if (n > 0) return false;
  await createUser({ email, password, name: "Owner", role: "owner" });
  console.log(`👑 Birinchi owner yaratildi: ${email} (parol — mavjud DASHBOARD_PASSWORD)`);
  return true;
}

// ------------------------------------------------------------
//  SESSIYALAR
// ------------------------------------------------------------
export async function createSession(userId, days = 7) {
  const sid = crypto.randomBytes(24).toString("hex");
  await pool.query(
    `INSERT INTO sessions (sid, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
    [sid, userId, days]
  );
  return sid;
}

export async function getSessionUser(sid) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.name, u.role,
            COALESCE((SELECT array_agg(project_id) FROM user_projects WHERE user_id = u.id), '{}') AS project_ids
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.sid = $1 AND s.expires_at > now() AND u.is_active`,
    [sid]
  );
  return rows[0] || null;
}

export async function deleteSession(sid) {
  await pool.query(`DELETE FROM sessions WHERE sid = $1`, [sid]);
}

export async function cleanupSessions() {
  await pool.query(`DELETE FROM sessions WHERE expires_at < now()`);
}

// ------------------------------------------------------------
//  12.2: BIRIKTIRISH VA ICHKI IZOHLAR
// ------------------------------------------------------------
export async function assignContact(contactId, userId) {
  await pool.query(`UPDATE contacts SET assigned_user_id = $2 WHERE id = $1`, [
    contactId,
    userId,
  ]);
}

export async function listInternalNotes(contactId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, user_name, text, created_at FROM internal_notes
      WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [contactId]
  );
  return rows;
}

export async function addInternalNote(contactId, userId, userName, text) {
  const { rows } = await pool.query(
    `INSERT INTO internal_notes (contact_id, user_id, user_name, text)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [contactId, userId || null, userName || null, text]
  );
  return rows[0].id;
}

export async function deleteInternalNote(id) {
  await pool.query(`DELETE FROM internal_notes WHERE id = $1`, [id]);
}

// ------------------------------------------------------------
//  12.5: AUDIT LOG
// ------------------------------------------------------------
export async function logAudit(userLabel, action, details = "") {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_label, action, details) VALUES ($1, $2, $3)`,
      [String(userLabel || "system").slice(0, 100), action, String(details).slice(0, 500)]
    );
  } catch (err) {
    console.error("⚠️ Audit log xatoligi:", err.message);
  }
}

export async function listAuditLog(limit = 50) {
  const { rows } = await pool.query(
    `SELECT id, user_label, action, details, created_at FROM audit_log
      ORDER BY id DESC LIMIT $1`,
    [limit]
  );
  return rows;
}
