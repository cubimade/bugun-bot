// ============================================================
//  DB/AUTOMATION.JS — 7-bosqich avtomatizatsiya so'rovlari:
//  kalit so'z qoidalari (7.4), teg qoidalari (7.8)
// ============================================================
import { pool } from "./pool.js";

// ------------------------------------------------------------
//  7.4: KALIT SO'Z QOIDALARI
// ------------------------------------------------------------
export async function listKeywordRules() {
  const { rows } = await pool.query(
    `SELECT k.id, k.project_id, k.keyword, k.match_type, k.reply_text,
            k.media_url, k.is_active, k.hit_count, k.created_at,
            p.name AS project_name
       FROM keyword_rules k
       LEFT JOIN projects p ON p.id = k.project_id
      ORDER BY k.id DESC`
  );
  return rows;
}

// Webhook uchun: shu akkauntga tegishli (yoki umumiy) faol qoidalar
export async function getActiveKeywordRules(projectId) {
  const { rows } = await pool.query(
    `SELECT id, keyword, match_type, reply_text, media_url
       FROM keyword_rules
      WHERE is_active AND (project_id IS NULL OR project_id = $1)
      ORDER BY (match_type = 'exact') DESC, length(keyword) DESC`,
    [projectId]
  );
  return rows;
}

export async function insertKeywordRule({ projectId, keyword, matchType, replyText, mediaUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO keyword_rules (project_id, keyword, match_type, reply_text, media_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [projectId || null, keyword, matchType, replyText, mediaUrl || null]
  );
  return rows[0].id;
}

export async function updateKeywordRule(id, { keyword, matchType, replyText, mediaUrl, isActive }) {
  await pool.query(
    `UPDATE keyword_rules
        SET keyword = COALESCE($2, keyword),
            match_type = COALESCE($3, match_type),
            reply_text = COALESCE($4, reply_text),
            media_url = $5,
            is_active = COALESCE($6, is_active)
      WHERE id = $1`,
    [id, keyword ?? null, matchType ?? null, replyText ?? null, mediaUrl ?? null, isActive ?? null]
  );
}

export async function deleteKeywordRule(id) {
  await pool.query(`DELETE FROM keyword_rules WHERE id = $1`, [id]);
}

export async function incrementKeywordHit(id) {
  await pool.query(`UPDATE keyword_rules SET hit_count = hit_count + 1 WHERE id = $1`, [id]);
}

// Matnga mos qoidani topish (exact ustuvor, keyin uzun keyword'lar)
export function matchKeywordRule(rules, text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return null;
  for (const r of rules) {
    const k = r.keyword.trim().toLowerCase();
    if (!k) continue;
    if (r.match_type === "exact" ? t === k : t.includes(k)) return r;
  }
  return null;
}

// ------------------------------------------------------------
//  7.5: FOLLOW-UP — jim qolgan mijozlarni topish
//  Shartlar: oxirgi xabar botdan, kutish vaqti o'tgan, limit tugamagan,
//  pauzada/arxivda emas, mijozning OXIRGI XABARI 24 SOAT ICHIDA
//  (Instagram 24-soat qoidasi — bundan tashqarida yuborish TAQIQ).
// ------------------------------------------------------------
export async function findFollowupCandidates({ waitHours, maxCount, limit = 30 }) {
  const { rows } = await pool.query(
    `SELECT c.id, c.ig_user_id, c.name,
            p.name AS project_name, p.ig_account_id, p.access_token,
            last.created_at AS last_at, lastu.created_at AS last_user_at
       FROM contacts c
       JOIN projects p ON p.id = c.project_id
       JOIN LATERAL (
         SELECT role, created_at FROM messages
          WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1
       ) last ON last.role = 'assistant'
       JOIN LATERAL (
         SELECT created_at FROM messages
          WHERE contact_id = c.id AND role = 'user'
          ORDER BY created_at DESC LIMIT 1
       ) lastu ON true
      WHERE NOT c.archived
        AND NOT c.bot_paused
        AND NOT c.followup_paused
        AND c.followup_sent_count < $1
        AND last.created_at < now() - make_interval(hours => $2)
        AND lastu.created_at >= now() - interval '23 hours'
      ORDER BY last.created_at ASC
      LIMIT $3`,
    [maxCount, waitHours, limit]
  );
  return rows;
}

export async function markFollowupSent(contactId) {
  await pool.query(
    `UPDATE contacts SET followup_sent_count = followup_sent_count + 1 WHERE id = $1`,
    [contactId]
  );
}

// Mijoz javob berdi — hisoblagich nolga (keyingi jimlikda yana ishlaydi)
export async function resetFollowupCount(contactId) {
  await pool.query(
    `UPDATE contacts SET followup_sent_count = 0 WHERE id = $1 AND followup_sent_count > 0`,
    [contactId]
  );
}

// ------------------------------------------------------------
//  7.8: AVTO-TEGLASH QOIDALARI
// ------------------------------------------------------------
export async function listTagRules() {
  const { rows } = await pool.query(
    `SELECT t.id, t.project_id, t.keyword, t.tag_name, t.is_active,
            p.name AS project_name
       FROM tag_rules t
       LEFT JOIN projects p ON p.id = t.project_id
      ORDER BY t.id`
  );
  return rows;
}

export async function getActiveTagRules(projectId) {
  const { rows } = await pool.query(
    `SELECT id, keyword, tag_name FROM tag_rules
      WHERE is_active AND (project_id IS NULL OR project_id = $1)`,
    [projectId]
  );
  return rows;
}

export async function insertTagRule({ projectId, keyword, tagName }) {
  const { rows } = await pool.query(
    `INSERT INTO tag_rules (project_id, keyword, tag_name) VALUES ($1, $2, $3) RETURNING id`,
    [projectId || null, keyword, tagName]
  );
  return rows[0].id;
}

export async function updateTagRule(id, { isActive }) {
  await pool.query(`UPDATE tag_rules SET is_active = COALESCE($2, is_active) WHERE id = $1`, [
    id,
    isActive ?? null,
  ]);
}

export async function deleteTagRule(id) {
  await pool.query(`DELETE FROM tag_rules WHERE id = $1`, [id]);
}

// Standart qoidalar — jadval bo'sh bo'lsa bir marta qo'shiladi (7.8.3)
export async function seedDefaultTagRules() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM tag_rules`);
  if (rows[0].n > 0) return false;
  const defaults = [
    ["narx", "qiziqqan"], ["qancha", "qiziqqan"], ["necha pul", "qiziqqan"],
    ["keyin", "sovuq"], ["o'ylab ko'raman", "sovuq"], ["rahmat", "sovuq"],
    ["qachon", "issiq"], ["band qilay", "issiq"], ["kelaman", "issiq"],
    ["shikoyat", "e'tibor kerak"], ["yomon", "e'tibor kerak"], ["qaytaring", "e'tibor kerak"],
  ];
  for (const [keyword, tag] of defaults) {
    await pool.query(
      `INSERT INTO tag_rules (project_id, keyword, tag_name) VALUES (NULL, $1, $2)`,
      [keyword, tag]
    );
  }
  console.log(`🏷 ${defaults.length} ta standart teg qoidasi qo'shildi.`);
  return true;
}

// Xabar matniga mos teglar
export function matchTagRules(rules, text) {
  const t = String(text || "").toLowerCase();
  const tags = new Set();
  for (const r of rules) {
    if (r.keyword && t.includes(r.keyword.trim().toLowerCase())) tags.add(r.tag_name);
  }
  return [...tags];
}
