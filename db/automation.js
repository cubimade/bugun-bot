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
            k.media_url, k.media_urls, k.buttons, k.delay_sec, k.once_per_contact,
            k.work_hours_only, k.priority, k.reply_count,
            k.is_active, k.hit_count, k.created_at,
            p.name AS project_name
       FROM keyword_rules k
       LEFT JOIN projects p ON p.id = k.project_id
      ORDER BY k.priority DESC, k.id DESC`
  );
  return rows;
}

// Webhook uchun: shu akkauntga tegishli (yoki umumiy) faol qoidalar.
// 16 (3.1e): tartib — avval USTUVORLIK, keyin aniq moslik, keyin uzun so'z.
// Shu tartib matchKeywordRule() ning "birinchi mos kelgani yutadi" mantig'ini
// foydalanuvchi belgilagan ustuvorlikka bo'ysundiradi.
export async function getActiveKeywordRules(projectId) {
  const { rows } = await pool.query(
    `SELECT id, keyword, match_type, reply_text, media_url, media_urls, buttons,
            delay_sec, once_per_contact, work_hours_only, priority
       FROM keyword_rules
      WHERE is_active AND (project_id IS NULL OR project_id = $1)
      ORDER BY priority DESC, (match_type = 'exact') DESC, length(keyword) DESC`,
    [projectId]
  );
  return rows;
}

// ------------------------------------------------------------
//  16 (3.1e): "Faqat bir marta" va javob berganlar statistikasi
// ------------------------------------------------------------
// Bu qoida shu mijozda allaqachon ishlaganmi?
export async function keywordRuleFiredFor(ruleId, contactId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM keyword_rule_hits WHERE rule_id = $1 AND contact_id = $2`,
    [ruleId, contactId]
  );
  return rows.length > 0;
}

export async function recordKeywordRuleHit(ruleId, contactId) {
  await pool.query(
    `INSERT INTO keyword_rule_hits (rule_id, contact_id) VALUES ($1, $2)
     ON CONFLICT (rule_id, contact_id) DO UPDATE SET fired_at = now()`,
    [ruleId, contactId]
  );
}

// Mijoz qoida javobidan KEYIN yozgan bo'lsa — "javob berdi" deb belgilaymiz.
// Faqat 24 soat ichida ishlagan qoidalar hisobga olinadi.
export async function markKeywordRuleReplied(contactId) {
  const { rows } = await pool.query(
    `UPDATE keyword_rule_hits
        SET replied = TRUE
      WHERE contact_id = $1 AND replied = FALSE
        AND fired_at > now() - INTERVAL '24 hours'
      RETURNING rule_id`,
    [contactId]
  );
  for (const r of rows) {
    await pool.query(`UPDATE keyword_rules SET reply_count = reply_count + 1 WHERE id = $1`, [
      r.rule_id,
    ]);
  }
  return rows.length;
}

// Ustuvorlikni saqlash (sudrab tartiblash uchun) — bitta so'rovda
export async function setKeywordPriorities(pairs) {
  if (!pairs.length) return;
  const ids = pairs.map((p) => p.id);
  const prios = pairs.map((p) => p.priority);
  await pool.query(
    `UPDATE keyword_rules k SET priority = v.priority
       FROM (SELECT unnest($1::int[]) AS id, unnest($2::int[]) AS priority) v
      WHERE k.id = v.id`,
    [ids, prios]
  );
}

export async function insertKeywordRule({
  projectId,
  keyword,
  matchType,
  replyText,
  mediaUrl,
  mediaUrls = [],
  buttons = [],
  delaySec = 0,
  oncePerContact = false,
  workHoursOnly = false,
  priority = 0,
}) {
  const { rows } = await pool.query(
    `INSERT INTO keyword_rules
       (project_id, keyword, match_type, reply_text, media_url,
        media_urls, buttons, delay_sec, once_per_contact, work_hours_only, priority)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11) RETURNING id`,
    [
      projectId || null,
      keyword,
      matchType,
      replyText,
      mediaUrl || (mediaUrls[0] ?? null), // eski ustun ham to'ldiriladi (orqaga moslik)
      JSON.stringify(mediaUrls || []),
      JSON.stringify(buttons || []),
      delaySec || 0,
      Boolean(oncePerContact),
      Boolean(workHoursOnly),
      priority || 0,
    ]
  );
  return rows[0].id;
}

// ROADMAP-16 (1.1): shu kalit so'z shu akkaunt uchun allaqachon bormi?
// Bazada UNIQUE cheklov YO'Q — dublikat jimgina qo'shilib, ikkita bir xil
// qoida bir-birini "bosib" turardi. Endi oldindan tekshiramiz va
// foydalanuvchiga aniq sabab aytamiz.
export async function keywordRuleExists(projectId, keyword) {
  const { rows } = await pool.query(
    `SELECT id FROM keyword_rules
      WHERE lower(keyword) = lower($1)
        AND project_id IS NOT DISTINCT FROM $2
      LIMIT 1`,
    [keyword, projectId || null]
  );
  return rows.length > 0;
}

// null berilgan maydon O'ZGARMAYDI (COALESCE) — qisman yangilash uchun.
export async function updateKeywordRule(
  id,
  {
    keyword,
    matchType,
    replyText,
    mediaUrl,
    isActive,
    mediaUrls,
    buttons,
    delaySec,
    oncePerContact,
    workHoursOnly,
    priority,
  }
) {
  await pool.query(
    `UPDATE keyword_rules
        SET keyword = COALESCE($2, keyword),
            match_type = COALESCE($3, match_type),
            reply_text = COALESCE($4, reply_text),
            media_url = $5,
            is_active = COALESCE($6, is_active),
            media_urls = COALESCE($7::jsonb, media_urls),
            buttons = COALESCE($8::jsonb, buttons),
            delay_sec = COALESCE($9, delay_sec),
            once_per_contact = COALESCE($10, once_per_contact),
            work_hours_only = COALESCE($11, work_hours_only),
            priority = COALESCE($12, priority)
      WHERE id = $1`,
    [
      id,
      keyword ?? null,
      matchType ?? null,
      replyText ?? null,
      mediaUrl ?? null,
      isActive ?? null,
      mediaUrls ? JSON.stringify(mediaUrls) : null,
      buttons ? JSON.stringify(buttons) : null,
      delaySec ?? null,
      oncePerContact ?? null,
      workHoursOnly ?? null,
      priority ?? null,
    ]
  );
}

export async function deleteKeywordRule(id) {
  await pool.query(`DELETE FROM keyword_rules WHERE id = $1`, [id]);
}

export async function incrementKeywordHit(id) {
  await pool.query(`UPDATE keyword_rules SET hit_count = hit_count + 1 WHERE id = $1`, [id]);
}

// Matnga mos qoidani topish (exact ustuvor, keyin uzun keyword'lar)
// ROADMAP-16 (3.1b): 4 ta moslik turi — exact | contains | starts | regex.
// Xato regex bot ishini TO'XTATMASLIGI kerak — try/catch bilan o'tkazib yuboriladi.
export function matchKeywordRule(rules, text) {
  const raw = String(text || "").trim();
  const t = raw.toLowerCase();
  if (!t) return null;
  for (const r of rules) {
    const k = String(r.keyword || "").trim();
    if (!k) continue;
    const low = k.toLowerCase();
    let hit = false;
    switch (r.match_type) {
      case "exact":
        hit = t === low;
        break;
      case "starts":
        hit = t.startsWith(low);
        break;
      case "regex":
        try {
          hit = new RegExp(k, "i").test(raw);
        } catch {
          hit = false; // buzuq regex — qoida shunchaki ishlamaydi, bot yiqilmaydi
        }
        break;
      default: // "contains"
        hit = t.includes(low);
    }
    if (hit) return r;
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
    `SELECT c.id, c.ig_user_id, c.name, c.ab_variant,
            p.name AS project_name, p.ig_account_id, p.access_token, p.platform,
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
        -- 8.7: faol flow'dagi mijozga follow-up yuborilmaydi (to'qnashuv)
        AND NOT EXISTS (SELECT 1 FROM contact_flow_state s
                         WHERE s.contact_id = c.id AND s.status = 'active')
        AND last.created_at < now() - make_interval(hours => $2)
        -- 9.1: 24-soat qoidasi faqat Instagram'da (Telegram'da cheklov yo'q)
        AND (p.platform = 'telegram' OR lastu.created_at >= now() - interval '23 hours')
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
