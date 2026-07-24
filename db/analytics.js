// ============================================================
//  DB/ANALYTICS.JS — statistika va 5-bosqich analitika so'rovlari
//  (ROADMAP-6 A4 da db.js dan ajratilgan)
//  Vaqt filtri: today | 7d | 30d | all — FAQAT shu ro'yxatdan
//  (SQL'ga foydalanuvchi matni hech qachon qo'shilmaydi)
// ============================================================
import { pool } from "./pool.js";

const TZ = `AT TIME ZONE 'Asia/Tashkent'`;

export function normalizePeriod(p) {
  return ["today", "7d", "30d", "all"].includes(p) ? p : "7d";
}

// Joriy davr sharti (col — vaqt ustuni nomi, kod ichidan keladi)
function periodCond(period, col) {
  switch (period) {
    case "today": return `(${col} ${TZ})::date = (now() ${TZ})::date`;
    case "7d":    return `${col} >= now() - interval '7 days'`;
    case "30d":   return `${col} >= now() - interval '30 days'`;
    default:      return `TRUE`;
  }
}

// O'tgan (taqqoslash) davri sharti — trend hisoblash uchun
function prevPeriodCond(period, col) {
  switch (period) {
    case "today":
      return `(${col} ${TZ})::date = (now() ${TZ})::date - 1`;
    case "7d":
      return `${col} >= now() - interval '14 days' AND ${col} < now() - interval '7 days'`;
    case "30d":
      return `${col} >= now() - interval '60 days' AND ${col} < now() - interval '30 days'`;
    default:
      return `FALSE`; // "hammasi" uchun trend yo'q
  }
}

// ------------------------------------------------------------
//  Statistika (/stats sahifasi uchun)
// ------------------------------------------------------------
export async function getStats() {
  const [projects, contacts, messages, today, week, needsHuman, recent, topContacts] =
    await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS n FROM projects`),
      pool.query(`SELECT COUNT(*)::int AS n FROM contacts`),
      pool.query(`SELECT COUNT(*)::int AS n FROM messages`),
      // Bugungi xabarlar (O'zbekiston vaqti bo'yicha)
      pool.query(
        `SELECT COUNT(*)::int AS n FROM messages
         WHERE (created_at AT TIME ZONE 'Asia/Tashkent')::date =
               (now() AT TIME ZONE 'Asia/Tashkent')::date`
      ),
      // Oxirgi 7 kun faolligi (kun bo'yicha xabarlar soni)
      pool.query(
        `SELECT to_char((created_at AT TIME ZONE 'Asia/Tashkent')::date, 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS n
           FROM messages
          WHERE created_at >= now() - interval '7 days'
          GROUP BY 1 ORDER BY 1`
      ),
      pool.query(`SELECT COUNT(*)::int AS n FROM contacts WHERE needs_human`),
      pool.query(
        `SELECT m.role, m.text, m.created_at, c.ig_user_id, c.name
       FROM messages m
       JOIN contacts c ON c.id = m.contact_id
       ORDER BY m.created_at DESC
       LIMIT 30`
      ),
      pool.query(
        `SELECT c.ig_user_id, c.name, COUNT(m.id)::int AS msg_count, MAX(m.created_at) AS last_msg
       FROM contacts c
       LEFT JOIN messages m ON m.contact_id = c.id
       GROUP BY c.id
       ORDER BY msg_count DESC, last_msg DESC NULLS LAST
       LIMIT 10`
      ),
    ]);

  return {
    projects: projects.rows[0].n,
    contacts: contacts.rows[0].n,
    messages: messages.rows[0].n,
    today: today.rows[0].n,
    week: week.rows,
    needsHuman: needsHuman.rows[0].n,
    recent: recent.rows,
    topContacts: topContacts.rows,
  };
}

// ------------------------------------------------------------
//  Kunlik digest — AI xulosa uchun xom raqamlar (O'zbekiston vaqti)
// ------------------------------------------------------------
export async function getDailyDigest() {
  const TODAY = `(created_at AT TIME ZONE 'Asia/Tashkent')::date = (now() AT TIME ZONE 'Asia/Tashkent')::date`;
  const [todayMsgs, newContacts, needsHumanQ, topAccount, priceAsks] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS n FROM messages WHERE ${TODAY}`),
    pool.query(
      `SELECT COUNT(*)::int AS n FROM contacts
        WHERE (first_seen AT TIME ZONE 'Asia/Tashkent')::date = (now() AT TIME ZONE 'Asia/Tashkent')::date`
    ),
    pool.query(`SELECT COUNT(*)::int AS n FROM contacts WHERE needs_human`),
    pool.query(
      `SELECT p.name, COUNT(*)::int AS n
         FROM messages m
         JOIN contacts c ON c.id = m.contact_id
         JOIN projects p ON p.id = c.project_id
        WHERE (m.created_at AT TIME ZONE 'Asia/Tashkent')::date = (now() AT TIME ZONE 'Asia/Tashkent')::date
        GROUP BY p.name ORDER BY n DESC LIMIT 1`
    ),
    pool.query(
      `SELECT COUNT(DISTINCT contact_id)::int AS n FROM messages
        WHERE role = 'user' AND ${TODAY}
          AND (text ILIKE '%narx%' OR text ILIKE '%qancha%' OR text ILIKE '%price%' OR text ILIKE '%skidka%' OR text ILIKE '%chegirma%')`
    ),
  ]);
  return {
    todayMessages: todayMsgs.rows[0].n,
    newContacts: newContacts.rows[0].n,
    needsHuman: needsHumanQ.rows[0].n,
    topAccount: topAccount.rows[0]?.name || null,
    priceAsks: priceAsks.rows[0].n,
  };
}

// ------------------------------------------------------------
//  A2/B: Statistika kartalari — davr bo'yicha son, trend, sparkline
// ------------------------------------------------------------
export async function getStatsForPeriod(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const MP = prevPeriodCond(p, "m.created_at");
  const C = periodCond(p, "first_seen");
  const CP = prevPeriodCond(p, "first_seen");

  // Grafik seriyasi: today → soatlik (24), 7d → 7 kun, 30d/all → 30 kun
  const seriesQ =
    p === "today"
      ? `SELECT EXTRACT(HOUR FROM created_at ${TZ})::int AS x, COUNT(*)::int AS n
           FROM messages
          WHERE (created_at ${TZ})::date = (now() ${TZ})::date
          GROUP BY 1 ORDER BY 1`
      : `SELECT to_char((created_at ${TZ})::date, 'YYYY-MM-DD') AS x, COUNT(*)::int AS n
           FROM messages
          WHERE created_at >= now() - interval '${p === "7d" ? 7 : 30} days'
          GROUP BY 1 ORDER BY 1`;

  const [core, series, sparks, newContacts] = await Promise.all([
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM projects) AS projects,
         (SELECT COUNT(*)::int FROM contacts) AS contacts_total,
         (SELECT COUNT(*)::int FROM contacts WHERE ${C}) AS contacts_new,
         (SELECT COUNT(DISTINCT m.contact_id)::int FROM messages m WHERE ${M}) AS contacts_active,
         (SELECT COUNT(DISTINCT m.contact_id)::int FROM messages m WHERE ${MP}) AS contacts_active_prev,
         (SELECT COUNT(*)::int FROM messages m WHERE ${M}) AS messages_cur,
         (SELECT COUNT(*)::int FROM messages m WHERE ${MP}) AS messages_prev,
         (SELECT COUNT(*)::int FROM messages
           WHERE (created_at ${TZ})::date = (now() ${TZ})::date) AS today,
         (SELECT COUNT(*)::int FROM contacts WHERE needs_human) AS needs_human`
    ),
    pool.query(seriesQ),
    // Sparkline: har doim oxirgi 7 kun (kunma-kun) — xabar, faol mijoz, odam-kerak
    pool.query(
      `WITH days AS (
         SELECT generate_series(
           (now() ${TZ})::date - 6, (now() ${TZ})::date, interval '1 day'
         )::date AS d
       )
       SELECT to_char(days.d, 'YYYY-MM-DD') AS day,
              COALESCE(msg.n, 0) AS msgs,
              COALESCE(act.n, 0) AS active,
              COALESCE(hum.n, 0) AS human
         FROM days
         LEFT JOIN (
           SELECT (created_at ${TZ})::date AS d, COUNT(*)::int AS n
             FROM messages WHERE created_at >= now() - interval '8 days' GROUP BY 1
         ) msg ON msg.d = days.d
         LEFT JOIN (
           SELECT (created_at ${TZ})::date AS d, COUNT(DISTINCT contact_id)::int AS n
             FROM messages WHERE created_at >= now() - interval '8 days' GROUP BY 1
         ) act ON act.d = days.d
         LEFT JOIN (
           SELECT (last_seen ${TZ})::date AS d, COUNT(*)::int AS n
             FROM contacts WHERE needs_human AND last_seen >= now() - interval '8 days' GROUP BY 1
         ) hum ON hum.d = days.d
        ORDER BY days.d`
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM contacts WHERE ${C}) AS cur,
         (SELECT COUNT(*)::int FROM contacts WHERE ${CP}) AS prev`
    ),
  ]);

  const r = core.rows[0];
  const pct = (cur, prev) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : null;

  return {
    period: p,
    projects: r.projects,
    contactsTotal: r.contacts_total,
    contactsActive: r.contacts_active,
    contactsNew: newContacts.rows[0].cur,
    messages: r.messages_cur,
    today: r.today,
    needsHuman: r.needs_human,
    trends: {
      messages: p === "all" ? null : pct(r.messages_cur, r.messages_prev),
      contacts: p === "all" ? null : pct(r.contacts_active, r.contacts_active_prev),
      newContacts: p === "all" ? null : pct(newContacts.rows[0].cur, newContacts.rows[0].prev),
    },
    prevRaw: { messages: r.messages_prev, contactsActive: r.contacts_active_prev },
    series: series.rows,
    sparks: {
      msgs: sparks.rows.map((x) => x.msgs),
      active: sparks.rows.map((x) => x.active),
      human: sparks.rows.map((x) => x.human),
    },
  };
}

// ------------------------------------------------------------
//  C1: Donut — suhbatlar holati (o'zaro istisno kategoriyalar)
//  ustuvorlik: odam kerak > pauzada > javob berilgan > javobsiz
// ------------------------------------------------------------
export async function getDonutData(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const { rows } = await pool.query(
    `WITH davr AS (
       SELECT DISTINCT m.contact_id AS id FROM messages m WHERE ${M}
     ),
     holat AS (
       SELECT c.id,
              CASE
                WHEN c.needs_human THEN 'human'
                WHEN c.bot_paused THEN 'paused'
                WHEN EXISTS (SELECT 1 FROM messages b
                              WHERE b.contact_id = c.id AND b.role = 'assistant') THEN 'answered'
                ELSE 'silent'
              END AS s
         FROM contacts c
         JOIN davr ON davr.id = c.id
     )
     SELECT s, COUNT(*)::int AS n FROM holat GROUP BY s`
  );
  const out = { answered: 0, human: 0, paused: 0, silent: 0 };
  for (const r of rows) out[r.s] = r.n;
  return out;
}

// ------------------------------------------------------------
//  C2: Soatlik heatmap — 7 kun × 24 soat (mijoz xabarlari)
// ------------------------------------------------------------
export async function getHeatmapData(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "created_at");
  const { rows } = await pool.query(
    `SELECT EXTRACT(DOW FROM created_at ${TZ})::int AS dow,
            EXTRACT(HOUR FROM created_at ${TZ})::int AS hour,
            COUNT(*)::int AS n
       FROM messages
      WHERE role = 'user' AND ${M}
      GROUP BY 1, 2`
  );
  return rows;
}

// ------------------------------------------------------------
//  7.3: Mijoz manbalari — dm / story_reply / comment bo'yicha
//  nechta mijoz yozgani (davr ichida, distinct kontakt)
// ------------------------------------------------------------
export async function getSourceBreakdown(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const { rows } = await pool.query(
    `SELECT m.source, COUNT(DISTINCT m.contact_id)::int AS n
       FROM messages m
      WHERE m.role = 'user' AND ${M}
      GROUP BY m.source`
  );
  const out = { dm: 0, story_reply: 0, comment: 0 };
  for (const r of rows) out[r.source] = (out[r.source] || 0) + r.n;
  return out;
}

// ------------------------------------------------------------
//  C3: Akkauntlar taqqoslashi — mijoz/xabar soni, faoldan pastga
// ------------------------------------------------------------
export async function getAccountsComparison(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const { rows } = await pool.query(
    `SELECT p.id, p.name,
            COUNT(DISTINCT m.contact_id)::int AS contacts,
            COUNT(m.id)::int AS messages
       FROM projects p
       LEFT JOIN contacts c ON c.project_id = p.id
       LEFT JOIN messages m ON m.contact_id = c.id AND ${M}
      GROUP BY p.id, p.name
      ORDER BY messages DESC, contacts DESC`
  );
  return rows;
}

// ------------------------------------------------------------
//  C4: Konversiya voronkasi
//  yozgan → suhbatlashgan (2+ xabar) → qiziqqan (narx) → aloqaga chiqqan
// ------------------------------------------------------------
export async function getFunnelData(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");
  const { rows } = await pool.query(
    `WITH davr AS (
       SELECT m.contact_id AS id,
              COUNT(*) FILTER (WHERE m.role = 'user')::int AS user_msgs,
              bool_or(m.role = 'user' AND (
                m.text ILIKE '%narx%' OR m.text ILIKE '%qancha%' OR m.text ILIKE '%price%'
                OR m.text ILIKE '%xizmat%' OR m.text ILIKE '%chegirma%' OR m.text ILIKE '%skidka%'
              )) AS interested,
              bool_or(m.role = 'user' AND (
                m.text ILIKE '%telegram%' OR m.text ILIKE '%telefon%' OR m.text ILIKE '%nomer%'
                OR m.text ILIKE '%raqam%' OR m.text ILIKE '%bog''lan%' OR m.text ILIKE '%aloqa%'
              )) AS contacted
         FROM messages m
        WHERE ${M}
        GROUP BY m.contact_id
     )
     SELECT COUNT(*)::int AS wrote,
            COUNT(*) FILTER (WHERE user_msgs >= 2)::int AS engaged,
            COUNT(*) FILTER (WHERE interested)::int AS interested,
            COUNT(*) FILTER (WHERE contacted OR EXISTS (
              SELECT 1 FROM contacts c WHERE c.id = davr.id AND c.needs_human
            ))::int AS contacted
       FROM davr`
  );
  return rows[0];
}

// ------------------------------------------------------------
//  D: 6 metrika
// ------------------------------------------------------------
export async function getMetrics(period) {
  const p = normalizePeriod(period);
  const M = periodCond(p, "m.created_at");

  const [respTime, convLen, weekdays, unanswered, repeats, newVsOld, ratings] = await Promise.all([
    // 1. O'rtacha javob vaqti: user → keyingi assistant orasidagi sekundlar (10 daqiqagacha)
    pool.query(
      `WITH juft AS (
         SELECT m.created_at AS t,
                LAG(m.role) OVER (PARTITION BY m.contact_id ORDER BY m.created_at) AS prev_role,
                LAG(m.created_at) OVER (PARTITION BY m.contact_id ORDER BY m.created_at) AS prev_t,
                m.role
           FROM messages m
          WHERE ${M}
       )
       SELECT AVG(EXTRACT(EPOCH FROM (t - prev_t)))::float AS avg_s,
              COUNT(*)::int AS n
         FROM juft
        WHERE role = 'assistant' AND prev_role = 'user'
          AND t - prev_t < interval '10 minutes'`
    ),
    // 2. O'rtacha suhbat davomiyligi: kontaktga o'rtacha xabar soni
    pool.query(
      `SELECT COALESCE(AVG(n), 0)::float AS avg_msgs
         FROM (SELECT COUNT(*)::int AS n FROM messages m WHERE ${M} GROUP BY m.contact_id) t`
    ),
    // 3. Hafta kunlari bo'yicha taqsimot (mijoz xabarlari)
    pool.query(
      `SELECT EXTRACT(DOW FROM m.created_at ${TZ})::int AS dow, COUNT(*)::int AS n
         FROM messages m
        WHERE m.role = 'user' AND ${M}
        GROUP BY 1 ORDER BY 1`
    ),
    // 4. Javobsiz qolgan savollar: bot "bilmayman" tipidagi javoblari
    pool.query(
      `SELECT COUNT(*)::int AS n FROM messages m
        WHERE m.role = 'assistant' AND ${M}
          AND (m.text ILIKE '%bilmayman%' OR m.text ILIKE '%kechirasiz%'
               OR m.text ILIKE '%aniq emas%' OR m.text ILIKE '%ma''lumot yo''q%'
               OR m.text ILIKE '%javob berolmayman%' OR m.text ILIKE '%operator%')`
    ),
    // 5. Takroriy mijozlar: 2+ turli kunda yozganlar
    pool.query(
      `WITH kunlar AS (
         SELECT m.contact_id, COUNT(DISTINCT (m.created_at ${TZ})::date)::int AS d
           FROM messages m
          WHERE m.role = 'user' AND ${M}
          GROUP BY m.contact_id
       )
       SELECT COUNT(*) FILTER (WHERE d >= 2)::int AS repeat,
              COUNT(*)::int AS total
         FROM kunlar`
    ),
    // 6. Yangi vs qaytgan: davrda yozganlardan first_seen davr ichida/oldin
    pool.query(
      `WITH faol AS (SELECT DISTINCT m.contact_id AS id FROM messages m WHERE ${M})
       SELECT COUNT(*) FILTER (WHERE ${periodCond(p, "c.first_seen")})::int AS fresh,
              COUNT(*)::int AS total
         FROM contacts c JOIN faol ON faol.id = c.id`
    ),
    // 7 (D5). Bot javoblari bahosi: 👍/👎 nisbat
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE m.rating = 1)::int AS pos,
              COUNT(*) FILTER (WHERE m.rating = -1)::int AS neg
         FROM messages m
        WHERE m.role = 'assistant' AND ${M}`
    ),
  ]);

  const rt = respTime.rows[0];
  const rp = repeats.rows[0];
  const nv = newVsOld.rows[0];
  return {
    period: p,
    avgResponseSec: rt.avg_s != null ? Math.round(rt.avg_s * 10) / 10 : null,
    avgResponseSample: rt.n,
    avgConversationMsgs: Math.round(convLen.rows[0].avg_msgs * 10) / 10,
    weekdays: weekdays.rows,
    unanswered: unanswered.rows[0].n,
    repeatCustomers: { count: rp.repeat, total: rp.total,
      pct: rp.total ? Math.round((rp.repeat / rp.total) * 100) : 0 },
    newVsReturning: { fresh: nv.fresh, returning: nv.total - nv.fresh, total: nv.total },
    ratings: (() => {
      const { pos, neg } = ratings.rows[0];
      const rated = pos + neg;
      return { pos, neg, rated, pct: rated ? Math.round((pos / rated) * 100) : null };
    })(),
  };
}

// ------------------------------------------------------------
//  F1: CSV eksport uchun kontaktlar (davr bo'yicha)
// ------------------------------------------------------------
export async function listContactsForExport(period) {
  const p = normalizePeriod(period);
  const C = p === "all" ? "TRUE" : periodCond(p, "c.last_seen");
  const { rows } = await pool.query(
    `SELECT c.name, c.ig_user_id, p.name AS project_name,
            array_to_string(c.tags, '; ') AS tags,
            COUNT(m.id)::int AS msg_count,
            c.first_seen, c.last_seen, c.note
       FROM contacts c
       JOIN projects p ON p.id = c.project_id
       LEFT JOIN messages m ON m.contact_id = c.id
      WHERE ${C}
      GROUP BY c.id, p.name
      ORDER BY c.last_seen DESC`
  );
  return rows;
}
