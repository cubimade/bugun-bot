// ============================================================
//  SERVICES/FOLLOWUP.JS — jim qolgan mijozga eslatma (ROADMAP-7.5)
//  Har soatda: shartlarga mos kontaktlar topiladi va follow-up
//  yuboriladi. Instagram 24-soat qoidasi SQL darajasida qat'iy
//  (mijozning oxirgi xabari 23 soatdan eski bo'lsa — nomzod emas).
// ============================================================
import { state, ACCOUNTS_MAP } from "../state.js";
import { wrapCron } from "./cron-log.js";
import { IG_TOKEN } from "../config.js";
import { senderFor } from "./channels.js";
import {
  findFollowupCandidates,
  markFollowupSent,
  saveMessage,
  getActiveAbTest,
  setContactAbVariant,
} from "../db.js";
import { applyNameVar } from "./vars.js";

const DEFAULT_TEXT = "{ism}, savolingiz qoldimi? 😊 Yordam kerak bo'lsa, bemalol yozing!";

// FAZA 7.4: ism yo'q bo'lsa {ism} toza olib tashlanadi ("Salom!" kabi)
function applyVars(text, c) {
  return applyNameVar(text, c.name)
    .replaceAll("{akkaunt}", c.project_name || "");
}

let FOLLOWUP_RUNNING = false; // tick ustma-ust tushmasin (takroriy xabar himoyasi)

export async function runFollowupPass() {
  if (!state.DB_READY) return;
  if (state.SETTINGS.followup_enabled !== "true") return;
  if (FOLLOWUP_RUNNING) return;
  FOLLOWUP_RUNNING = true;
  try {
    await followupPassBody();
  } finally {
    FOLLOWUP_RUNNING = false;
  }
}

async function followupPassBody() {
  const waitHours = Math.min(Math.max(parseInt(state.SETTINGS.followup_wait_hours, 10) || 12, 1), 72);
  const maxCount = Math.min(Math.max(parseInt(state.SETTINGS.followup_max, 10) || 1, 1), 3);
  const text = (state.SETTINGS.followup_text || "").trim() || DEFAULT_TEXT;

  try {
    const candidates = await findFollowupCandidates({ waitHours, maxCount });
    if (!candidates.length) return;
    // 11.5: follow-up matni A/B testi (global — barcha loyihalar uchun bittasi)
    let abTest = null;
    try {
      abTest = await getActiveAbTest(null, "followup");
    } catch {
      /* jim */
    }
    console.log(`⏰ Follow-up: ${candidates.length} ta nomzod (kutish ${waitHours} soat, maks ${maxCount})`);

    for (const c of candidates) {
      // 24-soat qoidasi ikkinchi qatlam tekshiruvi (faqat Instagram; SQL'da ham bor)
      const userAgeH = (Date.now() - new Date(c.last_user_at).getTime()) / 3600000;
      if (c.platform !== "telegram" && userAgeH >= 23) {
        console.log(`⏭ Follow-up o'tkazildi (mijoz ${c.id}): 24-soat oynasi yopilgan (${userAgeH.toFixed(1)} soat)`);
        continue;
      }
      const token =
        c.access_token ||
        ACCOUNTS_MAP.get(String(c.ig_account_id || ""))?.token ||
        IG_TOKEN;
      if (!token) continue;

      // 11.5: A/B — variant matni (variant yo'q bo'lsa hozir belgilanadi)
      let textToUse = text;
      if (abTest) {
        let v = c.ab_variant;
        if (v !== "A" && v !== "B") {
          v = Math.random() * 100 < abTest.split_percent ? "A" : "B";
          setContactAbVariant(c.id, v).catch(() => {});
        }
        const vt = v === "A" ? abTest.variant_a : abTest.variant_b;
        if ((vt || "").trim()) textToUse = vt.trim();
      }
      const msg = applyVars(textToUse, c);
      try {
        // AVVAL belgilaymiz: parallel tick/instance bo'lsa ham mijozga TAKRORIY
        // xabar ketmaydi (yuborilmay qolsa bitta imkoniyat yo'qoladi — spamdan arzon xato)
        await markFollowupSent(c.id);
        const result = await senderFor(c.platform || "instagram", token).text(c.ig_user_id, msg);
        if (result.ok) {
          await saveMessage(c.id, "assistant", msg, false, "followup");
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
  // ROADMAP-18 FAZA 4: [CRON] loglari + cron_runs jadvali
  const pass_ = wrapCron("followup", runFollowupPass);
  setTimeout(pass_, 2 * 60 * 1000);
  const t = setInterval(pass_, 60 * 60 * 1000);
  if (t.unref) t.unref();
}
