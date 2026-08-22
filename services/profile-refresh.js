// ============================================================
//  SERVICES/PROFILE-REFRESH.JS — kontakt profillarini KUNLIK avtomatik
//  tortish (ROADMAP-18 FAZA 7). "Profillarni yangilash" tugmasi qo'lda
//  ishlar edi — endi cron har kuni o'zi yuradi:
//    - profile_fetched_at bo'sh yoki 7 kundan eski kontaktlar
//    - bir yurishda 100 ta, so'rovlar orasida 300ms (Meta limiti)
//    - profile_unavailable = true bo'lganlar qayta urinilmaydi
//  Yangi kontakt kelganda webhook fonida baribir tortiladi (inbound.js) —
//  bu cron o'tkazib yuborilganlarni va eskirganlarni to'ldiradi.
// ============================================================
import { state, ACCOUNTS_MAP } from "../state.js";
import {
  listContactsNeedingProfile,
  listOAuthProjectsNeedingProfile,
  updateProjectIdentity,
} from "../db.js";
import { refreshContactProfile } from "./ig-profile.js";
import { fetchProfile } from "./instagram-oauth.js";
import { wrapCron } from "./cron-log.js";

const BATCH = 100;
const DELAY_MS = 300;

// ROADMAP-18 davomi: OAuth'da profil olinmagan AKKAUNTLARNI to'ldirish.
// "Yangi akkaunt" nomi va app-scoped ig_account_id shu yerda tuzatiladi:
// Meta API ishlay boshlagach /me haqiqiy user_id (17841...) va username
// qaytaradi — loyiha va xotira xaritasi yangilanadi.
async function fillProjectProfiles() {
  let projects = [];
  try {
    projects = await listOAuthProjectsNeedingProfile();
  } catch {
    return; // migratsiya hali o'tmagan bo'lishi mumkin — keyingi yurishda
  }
  for (const p of projects) {
    try {
      const profile = await fetchProfile(p.access_token, p.app_scoped_id);
      const realId =
        profile.instagramId && profile.instagramId !== p.ig_account_id
          ? profile.instagramId
          : null;
      await updateProjectIdentity(p.id, {
        igAccountId: realId,
        username: profile.username,
        fullName: profile.name,
        picture: profile.picture,
      });
      const entry = ACCOUNTS_MAP.get(String(p.ig_account_id)) || {
        projectId: p.id,
        token: p.access_token,
        name: p.name,
      };
      if (profile.username) entry.name = "@" + profile.username;
      if (realId) {
        ACCOUNTS_MAP.set(String(realId), entry); // eski kalit ham qoladi — zarar qilmaydi
        console.log(
          `🔧 Akkaunt IDsi tuzatildi: loyiha ${p.id} — ${p.ig_account_id} → ${realId}`
        );
      }
      if (profile.username) {
        console.log(`👤 Akkaunt profili to'ldirildi: loyiha ${p.id} → @${profile.username}`);
      }
    } catch (err) {
      console.warn(`⚠️ Akkaunt profili olinmadi (loyiha ${p.id}): ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

export async function runProfileRefreshPass() {
  if (!state.DB_READY) return;
  await fillProjectProfiles(); // avval akkauntlar (oz sonli), keyin kontaktlar
  const rows = await listContactsNeedingProfile(BATCH);
  if (!rows.length) return;
  let ok = 0;
  for (const c of rows) {
    try {
      if (await refreshContactProfile(c.id, c.ig_user_id, c.access_token)) ok++;
    } catch (err) {
      console.warn(`⚠️ Profil cron xatosi (#${c.id}): ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.log(`👤 Profil cron: ${ok}/${rows.length} ta profil olindi`);
}

export function startProfileRefreshScheduler() {
  const pass_ = wrapCron("profile-refresh", runProfileRefreshPass);
  setTimeout(pass_, 6 * 60 * 1000); // startupdan 6 daqiqa keyin birinchi yurish
  const t = setInterval(pass_, 24 * 60 * 60 * 1000);
  if (t.unref) t.unref();
}
