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
// ROADMAP-19 FAZA 2: state loyiha kontekstini olib yuradi (project_id, app_id)
export async function saveOAuthState(state, projectId = null, appId = null) {
  await pool.query(
    `INSERT INTO oauth_states (state, project_id, app_id) VALUES ($1, $2, $3)`,
    [state, projectId || null, appId || null]
  );
}

// Bir martalik: UPDATE ... RETURNING — ikkinchi urinishda qator qaytmaydi.
// 15 daqiqadan eski state ham qabul qilinmaydi.
// Natija: null (yaroqsiz) yoki { projectId, appId } (yaroqli).
export async function consumeOAuthState(state) {
  if (!state) return null;
  const { rows } = await pool.query(
    `UPDATE oauth_states SET used = TRUE
      WHERE state = $1 AND used = FALSE
        AND created_at > now() - INTERVAL '15 minutes'
      RETURNING state, project_id, app_id`,
    [String(state)]
  );
  if (!rows.length) return null;
  return { projectId: rows[0].project_id || null, appId: rows[0].app_id || null };
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
//  ROADMAP-19 FAZA 2: akkauntni MAVJUD loyihaga biriktirish
//  (?project=<id> bilan boshlangan OAuth — sehrgar loyihasi).
//  Agar shu ig_account_id allaqachon BOSHQA loyihada bo'lsa — o'sha
//  loyiha yangilanadi (dublikat yaratilmaydi) va uning id'si qaytadi.
// ------------------------------------------------------------
export async function attachOAuthAccountToProject(
  projectId,
  { igAccountId, appScopedId, username, fullName, picture, token, expiresAt, scopes }
) {
  const { rows: existing } = await pool.query(
    `SELECT id FROM projects WHERE ig_account_id = $1 AND id <> $2 LIMIT 1`,
    [String(igAccountId), projectId]
  );
  const targetId = existing[0]?.id || projectId;
  if (existing[0]) {
    console.warn(
      `⚠️ Akkaunt ${igAccountId} allaqachon loyiha ${existing[0].id} da — o'sha loyiha yangilanadi (so'ralgan: ${projectId})`
    );
  }
  await pool.query(
    `UPDATE projects
        SET ig_account_id = $2,
            app_scoped_id = COALESCE($3, app_scoped_id),
            ig_username = COALESCE($4, ig_username),
            ig_name = COALESCE($5, ig_name),
            profile_picture_url = COALESCE($6, profile_picture_url),
            access_token = $7,
            token_expires_at = $8,
            token_source = 'oauth',
            token_last_refreshed_at = now(),
            granted_scopes = $9,
            platform = 'instagram',
            name = CASE
              WHEN $4 IS NOT NULL AND (name = 'Yangi akkaunt' OR name LIKE 'IG %')
                THEN '@' || $4
              ELSE name END
      WHERE id = $1`,
    [
      targetId,
      String(igAccountId),
      appScopedId ? String(appScopedId) : null,
      username || null,
      fullName || null,
      picture || null,
      token,
      expiresAt,
      scopes || null,
    ]
  );
  return { projectId: targetId, created: false };
}

// Sehrgar/OAuth holatini belgilash. errorText — FAZA 6: xato sababi
// bazaga yoziladi va akkaunt kartochkasida ko'rinadi ('error' holatida).
export async function setAppSetupStatus(projectId, status, errorText = null) {
  await pool.query(
    `UPDATE projects
        SET app_setup_status = $2,
            app_setup_error = $3,
            app_setup_checked_at = now()
      WHERE id = $1`,
    [projectId, status, errorText ? String(errorText).slice(0, 500) : null]
  );
  console.log(`ℹ️ Loyiha ${projectId} app holati: ${status}${errorText ? " (" + errorText + ")" : ""}`);
}

// ------------------------------------------------------------
//  ROADMAP-19 FAZA 3: webhook yo'naltirish yordamchilari
// ------------------------------------------------------------
// entry[].id bo'yicha nomzod loyihalar (ig_account_id YOKI app_scoped_id).
// O'z ilovasi borlari imzo tekshiruvida ishlatiladi.
export async function findProjectsByIgIds(ids) {
  const clean = [...new Set((ids || []).map((x) => String(x)).filter(Boolean))];
  if (!clean.length) return [];
  const { rows } = await pool.query(
    `SELECT id, name, ig_account_id, app_scoped_id, ig_app_id,
            (ig_app_id IS NOT NULL AND ig_app_secret_enc IS NOT NULL) AS has_own_app
       FROM projects
      WHERE ig_account_id = ANY($1) OR app_scoped_id = ANY($1)`,
    [clean]
  );
  return rows;
}

// GET /webhook verify: hub.verify_token birorta loyihanikiga mosmi?
export async function verifyTokenExistsInAnyProject(token) {
  if (!token) return false;
  const { rows } = await pool.query(
    `SELECT 1 FROM projects WHERE verify_token = $1 LIMIT 1`,
    [String(token)]
  );
  return rows.length > 0;
}

// ------------------------------------------------------------
//  TOKEN UZAYTIRISH (kunlik job va qo'lda tugma uchun)
// ------------------------------------------------------------
// Meta qoidasi: token kamida 24 soatlik bo'lishi va muddati tugamagan
// bo'lishi kerak. Shuning uchun token_last_refreshed_at ham filtrlanadi.
export async function listExpiringOAuthTokens(days = 10) {
  const { rows } = await pool.query(
    `SELECT id, ig_account_id, ig_username, access_token, token_expires_at,
            app_setup_status
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
