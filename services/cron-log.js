// ============================================================
//  SERVICES/CRON-LOG.JS — cron o'tishlarini loglash va bazaga yozish
//  (ROADMAP-18 FAZA 4). Har scheduler o'z pass funksiyasini wrapCron()
//  bilan o'raydi: [CRON] boshlandi/tugadi/XATO loglari + cron_runs
//  jadvalida oxirgi ishga tushish vaqti. Shunda "cron ishladimi?"
//  savoliga loglardan ham, bazadan ham aniq javob bo'ladi.
// ============================================================
import { pool } from "../db/pool.js";
import { state } from "../state.js";

async function recordCronRun(name, ok, error, durationMs) {
  if (!state.DB_READY) return;
  try {
    await pool.query(
      `INSERT INTO cron_runs (name, last_run_at, last_ok_at, last_error, last_duration_ms, run_count)
       VALUES ($1, now(), CASE WHEN $2 THEN now() END, $3, $4, 1)
       ON CONFLICT (name) DO UPDATE SET
         last_run_at = now(),
         last_ok_at = CASE WHEN $2 THEN now() ELSE cron_runs.last_ok_at END,
         last_error = $3,
         last_duration_ms = $4,
         run_count = cron_runs.run_count + 1`,
      [name, ok, error, durationMs]
    );
  } catch (e) {
    // cron_runs yozilmasa ham cron'ning o'zi to'xtamasin
    console.error(`⚠️ cron_runs yozish xatosi (${name}):`, e.message);
  }
}

// quiet: har daqiqa/10 daqiqada yuradigan crontlarda har o'tishni loglash
// shovqin bo'ladi — ular faqat XATO'da loglanadi, lekin bazaga baribir yoziladi.
export function wrapCron(name, fn, { quiet = false } = {}) {
  return async (...args) => {
    const t0 = Date.now();
    if (!quiet) console.log(`[CRON] ${name} boshlandi`);
    try {
      const out = await fn(...args);
      const ms = Date.now() - t0;
      if (!quiet) console.log(`[CRON] ${name} tugadi — ${ms}ms`);
      recordCronRun(name, true, null, ms);
      return out;
    } catch (err) {
      console.error(`[CRON] ${name} XATO: ${err.message}`);
      recordCronRun(name, false, String(err.message || err).slice(0, 500), Date.now() - t0);
      return undefined; // cron xatosi jarayonni yiqitmaydi
    }
  };
}

// Diagnostika sahifasi uchun
export async function listCronRuns() {
  const { rows } = await pool.query(
    `SELECT name, last_run_at, last_ok_at, last_error, last_duration_ms, run_count
       FROM cron_runs ORDER BY name`
  );
  return rows;
}
