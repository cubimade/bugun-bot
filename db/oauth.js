// ============================================================
//  DB/OAUTH.JS — Instagram OAuth uchun database amallari (ROADMAP-15)
//  - oauth_states: CSRF himoyasi (bir martalik state)
//  - upsertOAuthProject: akkauntni qo'shish/yangilash (dublikat yaratmaydi)
//  - listExpiringOAuthTokens / updateProjectToken: kunlik uzaytirish uchun
//  DIQQAT: bu yerda access_token hech qachon log qilinmaydi.
// ============================================================
import { pool } from "./pool.js";

// ------------------------------------------------------------
//  STATE (CSRF) — yaratish, bir marta ishlatish, tozalash
// ------------------------------------------------------------
export async function saveOAuthState(state) {
  await pool.query(`INSERT INTO oauth_states (state) VALUES ($1)`, [state]);
}

// Bir martalik: UPDATE ... RETURNING — ikkinchi urinishda qator qaytmaydi.
// 15 daqiqadan eski state ham qabul qilinmaydi.
export async function consumeOAuthState(state) {
  if (!state) return false;
  const { rows } = await pool.query(
    `UPDATE oauth_states SET used = TRUE
      WHERE state = $1 AND used = FALSE
        AND created_at > now() - INTERVAL '15 minutes'
      RETURNING state`,
    [String(state)]
  );
  return rows.length > 0;
}

// Eski yozuvlarni tozalash (jadval cheksiz o'smasin)
export async function cleanupOAuthStates() {
  const { rowCount } = await pool.query(
    `DELETE FROM oauth_states WHERE created_at < now() - INTERVAL '1 day'`
  );
  return rowCount || 0;
}

// ------------------------------------------------------------
//  AKKAUNTNI SAQLASH — bor bo'lsa yangilanadi, dublikat yaratilmaydi
//  igAccountId — me?fields=user_id dan olingan haqiqiy akkaunt IDsi.
// ------------------------------------------------------------
export async function upsertOAuthProject({
  igAccountId,
  appScopedId,
  name,
  username,
  fullName,
  picture,
  token,
  expiresAt,
  scopes,
}) {
  const { rows } = await pool.query(
    `INSERT INTO projects
       (name, ig_account_id, app_scoped_id, access_token, platform,
        ig_username, ig_name, profile_picture_url,
        token_expires_at, token_source, token_last_refreshed_at, granted_scopes)
     VALUES ($1, $2, $3, $4, 'instagram', $5, $6, $7, $8, 'oauth', now(), $9)
     ON CONFLICT (ig_account_id) DO UPDATE SET
       access_token            = EXCLUDED.access_token,
       app_scoped_id           = COALESCE(EXCLUDED.app_scoped_id, projects.app_scoped_id),
       ig_username             = EXCLUDED.ig_username,
       ig_name                 = EXCLUDED.ig_name,
       profile_picture_url     = EXCLUDED.profile_picture_url,
       token_expires_at        = EXCLUDED.token_expires_at,
       token_source            = 'oauth',
       token_last_refreshed_at = now(),
       granted_scopes          = EXCLUDED.granted_scopes,
       platform                = 'instagram'
     RETURNING id, (xmax = 0) AS created`,
    [
      name,
      String(igAccountId),
      appScopedId ? String(appScopedId) : null,
      token,
      username || null,
      fullName || null,
      picture || null,
      expiresAt,
      scopes || null,
    ]
  );
  return { projectId: rows[0].id, created: rows[0].created };
}

// ------------------------------------------------------------
//  ROADMAP-18 davomi: profil to'liq olinmagan OAuth akkauntlar —
//  kunlik cron ularni to'ldiradi va haqiqiy ID aniqlansa tuzatadi
// ------------------------------------------------------------
export async function listOAuthProjectsNeedingProfile() {
  const { rows } = await pool.query(
    `SELECT id, name, ig_account_id, app_scoped_id, access_token
       FROM projects
      WHERE token_source = 'oauth'
        AND access_token IS NOT NULL
        AND (ig_username IS NULL OR ig_account_id = app_scoped_id)`
  );
  return rows;
}

// Profil kelgach: username/nom/rasm va (farq qilsa) haqiqiy akkaunt ID yangilanadi.
// Nom faqat placeholder bo'lsa almashtiriladi — foydalanuvchi qo'ygan nom saqlanadi.
export async function updateProjectIdentity(projectId, { igAccountId, username, fullName, picture }) {
  await pool.query(
    `UPDATE projects
        SET ig_account_id = COALESCE($2, ig_account_id),
            ig_username = COALESCE($3, ig_username),
            ig_name = COALESCE($4, ig_name),
            profile_picture_url = COALESCE($5, profile_picture_url),
            name = CASE
              WHEN $3 IS NOT NULL AND (name = 'Yangi akkaunt' OR name LIKE 'IG %' OR name = ig_account_id)
                THEN '@' || $3
              ELSE name END
      WHERE id = $1`,
    [projectId, igAccountId || null, username || null, fullName || null, picture || null]
  );
}

// ------------------------------------------------------------
//  TOKEN UZAYTIRISH (kunlik job va qo'lda tugma uchun)
// ------------------------------------------------------------
// Meta qoidasi: token kamida 24 soatlik bo'lishi va muddati tugamagan
// bo'lishi kerak. Shuning uchun token_last_refreshed_at ham filtrlanadi.
export async function listExpiringOAuthTokens(days = 10) {
  const { rows } = await pool.query(
    `SELECT id, ig_account_id, ig_username, access_token, token_expires_at
       FROM projects
      WHERE token_source = 'oauth'
        AND access_token IS NOT NULL
        AND token_expires_at IS NOT NULL
        AND token_expires_at < now() + make_interval(days => $1::int)
        AND token_expires_at > now()
        AND (token_last_refreshed_at IS NULL
             OR token_last_refreshed_at < now() - INTERVAL '24 hours')
      ORDER BY token_expires_at`,
    [Number(days) || 10]
  );
  return rows;
}

export async function updateProjectToken(projectId, token, expiresAt) {
  await pool.query(
    `UPDATE projects
        SET access_token = $2,
            token_expires_at = $3,
            token_last_refreshed_at = now()
      WHERE id = $1`,
    [projectId, token, expiresAt]
  );
}

// Bitta akkauntning OAuth holati (qo'lda uzaytirish tugmasi uchun)
export async function getOAuthProject(projectId) {
  const { rows } = await pool.query(
    `SELECT id, name, ig_account_id, ig_username, access_token,
            token_source, token_expires_at, token_last_refreshed_at
       FROM projects WHERE id = $1`,
    [projectId]
  );
  return rows[0] || null;
}
