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
import { state } from "../state.js";
import { listContactsNeedingProfile } from "../db.js";
import { refreshContactProfile } from "./ig-profile.js";
import { wrapCron } from "./cron-log.js";

const BATCH = 100;
const DELAY_MS = 300;

export async function runProfileRefreshPass() {
  if (!state.DB_READY) return;
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
