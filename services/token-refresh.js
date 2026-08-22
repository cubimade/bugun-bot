// ============================================================
//  SERVICES/TOKEN-REFRESH.JS — OAuth tokenlarini avtomatik uzaytirish
//  (ROADMAP-15, 6-bo'lim)
//
//  Kuniga 1 marta ishlaydi: muddati 10 kundan kam qolgan OAuth tokenlarni
//  yana 60 kunga uzaytiradi. 60 kun ichida uzaytirilmagan token butunlay
//  o'ladi va faqat qayta OAuth yordam beradi — shuning uchun bu job muhim.
//
//  Meta talablari: token kamida 24 soatlik, muddati tugamagan va
//  instagram_business_basic ruxsati berilgan bo'lishi kerak.
//  DIQQAT: loglarda token chop etilmaydi.
// ============================================================
import { state, ACCOUNTS_MAP } from "../state.js";
import { wrapCron } from "./cron-log.js";
import {
  listExpiringOAuthTokens,
  updateProjectToken,
  cleanupOAuthStates,
} from "../db.js";
import { refreshToken } from "./instagram-oauth.js";
import { recordError } from "../logger.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Bitta akkaunt tokenini uzaytirish — qo'lda tugma ham shuni chaqiradi.
// Natija: { ok: true, expiresAt } yoki { ok: false, error }
export async function refreshProjectToken(project) {
  try {
    const { token, expiresIn } = await refreshToken(project.access_token);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await updateProjectToken(project.id, token, expiresAt);

    // Xotira xaritasidagi token ham yangilansin (bot darhol yangisidan foydalansin)
    const key = String(project.ig_account_id || "");
    const acct = ACCOUNTS_MAP.get(key);
    if (acct) ACCOUNTS_MAP.set(key, { ...acct, token });

    console.log(
      `🔄 Token uzaytirildi: @${project.ig_username || project.ig_account_id} ` +
        `→ ${expiresAt.toISOString().slice(0, 10)} gacha`
    );
    return { ok: true, expiresAt };
  } catch (err) {
    console.error(
      `⚠️ Token uzaytirilmadi (@${project.ig_username || project.ig_account_id}): ${err.message}`
    );
    return { ok: false, error: err.message };
  }
}

// Kunlik yurish — muddati yaqinlashgan tokenlar + eski state'larni tozalash
export async function refreshExpiringTokens() {
  if (!state.DB_READY) return { checked: 0, ok: 0, failed: 0 };
  let ok = 0;
  let failed = 0;
  let rows = [];
  try {
    rows = await listExpiringOAuthTokens(10);
  } catch (err) {
    recordError("token-refresh", err);
    return { checked: 0, ok: 0, failed: 0 };
  }

  for (const p of rows) {
    const r = await refreshProjectToken(p);
    if (r.ok) ok++;
    else failed++;
  }

  if (rows.length) {
    console.log(`🔑 Token uzaytirish yakuni: ${ok} ta muvaffaqiyatli, ${failed} ta xato.`);
  }

  // oauth_states jadvali cheksiz o'smasin
  try {
    const removed = await cleanupOAuthStates();
    if (removed) console.log(`🧹 ${removed} ta eski OAuth state o'chirildi.`);
  } catch (err) {
    recordError("token-refresh", err);
  }

  return { checked: rows.length, ok, failed };
}

// Startupdan 2 daqiqa keyin bir marta, so'ng har 24 soatda
// (backup scheduler bilan bir xil uslub — ROADMAP-6 F1)
export function startTokenRefreshScheduler() {
  // ROADMAP-18 FAZA 4: [CRON] loglari + cron_runs jadvali
  const pass_ = wrapCron("token-refresh", refreshExpiringTokens);
  setTimeout(pass_, 2 * 60 * 1000); // DB tayyor bo'lishini kutamiz
  const t = setInterval(pass_, DAY_MS);
  if (t.unref) t.unref();
}
