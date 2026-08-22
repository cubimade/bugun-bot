// ============================================================
//  SERVICES/PROJECT-CONFIG.JS — loyihaning ilova sozlamalari (ROADMAP-19)
//  Har loyihaga o'z Meta ilovasi: projects.ig_app_id / ig_app_secret_enc /
//  verify_token. Loyihada o'z ilovasi BO'LMASA — global env sozlamalariga
//  tushadi (mavjud oqim buzilmaydi, env zaxira bo'lib qoladi).
//
//  redirectUri DOIM global — bitta callback manzili barcha loyihalar uchun;
//  har mijoz o'z Meta panelida aynan shu manzilni qo'shadi.
// ============================================================
import { pool } from "../db/pool.js";
import { state } from "../state.js";
import { decrypt } from "./crypto.js";
import { IG_APP_ID, IG_APP_SECRET, VERIFY_TOKEN, OAUTH_REDIRECT_URI, APP_SECRET } from "../config.js";

// Global (env) sozlamalar — loyiha berilmaganda yoki loyihada ilova yo'q
// bo'lganda ishlatiladi. OAuth funksiyalarining default parametri ham shu.
export function globalAppConfig() {
  return {
    source: "global",
    projectId: null,
    igAppId: IG_APP_ID,
    igAppSecret: IG_APP_SECRET,
    appSecret: APP_SECRET, // webhook imzosi uchun (Meta App Secret)
    verifyToken: VERIFY_TOKEN,
    redirectUri: OAUTH_REDIRECT_URI,
  };
}

export async function getAppConfig(projectId) {
  if (!projectId || !state.DB_READY) return globalAppConfig();

  let p = null;
  try {
    const { rows } = await pool.query(
      `SELECT ig_app_id, ig_app_secret_enc, meta_app_secret_enc, verify_token
         FROM projects WHERE id = $1`,
      [projectId]
    );
    p = rows[0] || null;
  } catch (e) {
    console.error(`⚠️ Loyiha sozlamasini o'qib bo'lmadi (${projectId}):`, e.message);
    return globalAppConfig();
  }
  if (!p) return globalAppConfig();

  const own = Boolean(p.ig_app_id && p.ig_app_secret_enc);
  if (!own) {
    // Loyihada o'z ilovasi yo'q — global, lekin verify_token loyihaniki
    // bo'lishi mumkin (sehrgar avval token yaratib qo'ygan holat)
    return { ...globalAppConfig(), projectId, verifyToken: p.verify_token || VERIFY_TOKEN };
  }

  const igAppSecret = decrypt(p.ig_app_secret_enc);
  if (!igAppSecret) {
    // Shifr ochilmadi (kalit almashgan?) — xavfsiz tomon: globalga tushamiz
    console.error(`⚠️ Loyiha ${projectId} secret'i ochilmadi — global sozlamalar ishlatiladi`);
    return { ...globalAppConfig(), projectId };
  }

  return {
    source: "project",
    projectId,
    igAppId: p.ig_app_id,
    igAppSecret,
    // Instagram Login ilovalarida webhook imzosi ham shu ilova secret'i bilan;
    // alohida Meta App Secret saqlangan bo'lsa — o'sha ustun
    appSecret: decrypt(p.meta_app_secret_enc) || igAppSecret,
    verifyToken: p.verify_token || VERIFY_TOKEN,
    redirectUri: OAUTH_REDIRECT_URI,
  };
}
