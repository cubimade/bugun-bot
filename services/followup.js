// ============================================================
//  SERVICES/FOLLOWUP.JS — jim qolgan mijozga eslatma (ROADMAP-7.5)
//  Har soatda: shartlarga mos kontaktlar topiladi va follow-up
//  yuboriladi. Instagram 24-soat qoidasi SQL darajasida qat'iy
//  (mijozning oxirgi xabari 23 soatdan eski bo'lsa — nomzod emas).
// ============================================================
import { state, ACCOUNTS_MAP } from "../state.js";
import { IG_TOKEN } from "../config.js";
import { sendInstagramMessage } from "../instagram.js";
import {
  findFollowupCandidates,
  markFollowupSent,
  saveMessage,
} from "../db.js";

const DEFAULT_TEXT = "{ism}, savolingiz qoldimi? 😊 Yordam kerak bo'lsa, bemalol yozing!";

function applyVars(text, c) {
  return text
    .replaceAll("{ism}", (c.name || "").trim() || "do'st")
    .replaceAll("{akkaunt}", c.project_name || "");
}

export async function runFollowupPass() {
  if (!state.DB_READY) return;
  if (state.SETTINGS.followup_enabled !== "true") return;

  const waitHours = Math.min(Math.max(parseInt(state.SETTINGS.followup_wait_hours, 10) || 12, 1), 72);
  const maxCount = Math.min(Math.max(parseInt(state.SETTINGS.followup_max, 10) || 1, 1), 3);
  const text = (state.SETTINGS.followup_text || "").trim() || DEFAULT_TEXT;

  try {
    const candidates = await findFollowupCandidates({ waitHours, maxCount });
    if (!candidates.length) return;
    console.log(`⏰ Follow-up: ${candidates.length} ta nomzod (kutish ${waitHours} soat, maks ${maxCount})`);

    for (const c of candidates) {
      // 24-soat qoidasi ikkinchi qatlam tekshiruvi (SQL'da ham bor)
      const userAgeH = (Date.now() - new Date(c.last_user_at).getTime()) / 3600000;
      if (userAgeH >= 23) {
        console.log(`⏭ Follow-up o'tkazildi (mijoz ${c.id}): 24-soat oynasi yopilgan (${userAgeH.toFixed(1)} soat)`);
        continue;
      }
      const token =
        c.access_token ||
        ACCOUNTS_MAP.get(String(c.ig_account_id || ""))?.token ||
        IG_TOKEN;
      if (!token) continue;

      const msg = applyVars(text, c);
      try {
        const result = await sendInstagramMessage(c.ig_user_id, msg, token);
        if (result.ok) {
          await saveMessage(c.id, "assistant", msg, false, "followup");
          await markFollowupSent(c.id);
          console.log(`⏰ Follow-up yuborildi (mijoz ${c.id})`);
        } else {
          console.error(`⚠️ Follow-up yuborilmadi (mijoz ${c.id}): ${result.error}`);
        }
      } catch (err) {
        console.error(`⚠️ Follow-up xatoligi (mijoz ${c.id}):`, err.message);
      }
      await new Promise((ok) => setTimeout(ok, 350));
    }
  } catch (err) {
    console.error("⚠️ Follow-up scheduler xatoligi:", err.message);
  }
}

export function startFollowupScheduler() {
  // Startupdan 2 daqiqa keyin birinchi urinish, so'ng har soatda
  setTimeout(runFollowupPass, 2 * 60 * 1000);
  const t = setInterval(runFollowupPass, 60 * 60 * 1000);
  if (t.unref) t.unref();
}
