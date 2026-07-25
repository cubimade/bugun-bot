// ============================================================
//  SERVICES/AI-CACHE.JS — AI natijalar uchun umumiy kesh:
//  - Xotira + database (ai_cache) — redeploy'da yo'qolmaydi
//  - Stale-while-revalidate: eskirgan javob DARHOL qaytadi,
//    AI orqa fonda yangilaydi (sahifa hech qachon bloklanmaydi)
// ============================================================
import { pool } from "../db/pool.js";

const MEM = new Map(); // key -> { data, at }
const INFLIGHT = new Map(); // key -> Promise (bir vaqtda bitta yangilash)

// Asosiy kirish nuqtasi.
// Qaytaradi: { data, cachedAt, pending, refreshing }
//  - data bor  → darhol ko'rsatish mumkin (fresh yoki stale)
//  - pending   → kesh bo'sh, AI orqa fonda ishlayapti — frontend polling qiladi
//  - force     → foydalanuvchi "yangilash" bosgan: sinxron kutamiz
export async function swrCache(key, ttlMs, computeFn, { force = false } = {}) {
  if (force) {
    const data = await runRefresh(key, computeFn);
    return { data, cachedAt: new Date().toISOString(), pending: data == null };
  }

  const now = Date.now();
  let hit = MEM.get(key);
  if (!hit) {
    // Restartdan keyin xotira bo'sh — database'dan tiklaymiz
    try {
      const { rows } = await pool.query(`SELECT data, updated_at FROM ai_cache WHERE key = $1`, [key]);
      if (rows[0]) {
        hit = { data: rows[0].data, at: new Date(rows[0].updated_at).getTime() };
        MEM.set(key, hit);
      }
    } catch (e) {
      console.error(`⚠️ ai_cache o'qish xatosi (${key}):`, e.message);
    }
  }

  if (hit && now - hit.at < ttlMs) {
    return { data: hit.data, cachedAt: new Date(hit.at).toISOString(), pending: false };
  }

  // Eskirgan yoki bo'sh — bloklamasdan orqa fonda yangilaymiz
  refreshInBackground(key, computeFn);
  if (hit) {
    return { data: hit.data, cachedAt: new Date(hit.at).toISOString(), pending: false, refreshing: true };
  }
  return { data: null, cachedAt: null, pending: true };
}

function refreshInBackground(key, computeFn) {
  if (INFLIGHT.has(key)) return;
  runRefresh(key, computeFn).catch((e) => console.error(`⚠️ AI kesh yangilash xatosi (${key}):`, e.message));
}

async function runRefresh(key, computeFn) {
  if (INFLIGHT.has(key)) return INFLIGHT.get(key);
  const p = (async () => {
    const data = await computeFn();
    // null = AI muvaffaqiyatsiz — keshlamaymiz, keyingi so'rov qayta urinadi
    if (data != null) {
      MEM.set(key, { data, at: Date.now() });
      try {
        await pool.query(
          `INSERT INTO ai_cache (key, data, updated_at) VALUES ($1, $2, now())
           ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [key, JSON.stringify(data)]
        );
      } catch (e) {
        console.error(`⚠️ ai_cache yozish xatosi (${key}):`, e.message);
      }
    }
    return data;
  })();
  INFLIGHT.set(key, p);
  try {
    return await p;
  } finally {
    INFLIGHT.delete(key);
  }
}
