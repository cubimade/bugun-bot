// ============================================================
//  SERVICES/SEGMENTS.JS — 11.2: segmentlarni kunlik yangilash
//  vip / faol / uxlagan / sovuq (db/analytics2.js dagi SQL)
// ============================================================
import { state } from "../state.js";
import { recomputeSegments } from "../db.js";

export async function runSegmentsPass() {
  if (!state.DB_READY) return;
  try {
    const n = await recomputeSegments();
    console.log(`🧩 Segmentlar yangilandi (${n} ta kontakt)`);
  } catch (err) {
    console.error("⚠️ Segmentlarni yangilashda xatolik:", err.message);
  }
}

export function startSegmentsScheduler() {
  // Startupdan 5 daqiqa keyin, so'ng har 12 soatda
  setTimeout(runSegmentsPass, 5 * 60 * 1000);
  const t = setInterval(runSegmentsPass, 12 * 60 * 60 * 1000);
  if (t.unref) t.unref();
}
