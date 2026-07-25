// ============================================================
//  DB/ANALYTICS2.JS — 11-bosqich: moliya (11.1), segmentlar (11.2),
//  yo'qotish tahlili (11.3), prognoz (11.4), A/B (11.5)
// ============================================================
import { pool } from "./pool.js";

// ------------------------------------------------------------
//  11.1: MOLIYAVIY KO'RSATKICHLAR
// ------------------------------------------------------------
export async function getFinance(avgCheck = 0) {
  const [contacts, won, paid, monthly] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS n FROM contacts WHERE NOT archived`),
    pool.query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(deal_amount),0)::float AS amount
                  FROM contacts WHERE stage = 'won'`),
    pool.query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(amount),0)::float AS total
                  FROM payments WHERE status = 'paid'`),
    pool.query(
      `SELECT to_char(d.m, 'YYYY-MM') AS month,
              COALESCE(p.total, 0)::float AS paid,
              COALESCE(w.n, 0)::int AS won
         FROM generate_series(date_trunc('month', now()) - interval '11 months',
                              date_trunc('month', now()), interval '1 month') d(m)
         LEFT JOIN (SELECT date_trunc('month', paid_at) m, SUM(amount) total
                      FROM payments WHERE status = 'paid' GROUP BY 1) p ON p.m = d.m
         LEFT JOIN (SELECT date_trunc('month', stage_changed_at) m, COUNT(*) n
                      FROM contacts WHERE stage = 'won' GROUP BY 1) w ON w.m = d.m
        ORDER BY d.m`
    ),
  ]);
  const leads = contacts.rows[0].n;
  const wonN = won.rows[0].n;
  const paidSum = paid.rows[0].total;
  const dealSum = won.rows[0].amount;
  // Daromad: to'langan to'lovlar; ular yo'q bo'lsa — kanban summalari;
  // u ham bo'lmasa o'rtacha chek bo'yicha taxmin.
  const revenue = paidSum > 0 ? paidSum : dealSum > 0 ? dealSum : wonN * avgCheck;
  const revenueIsEstimate = paidSum === 0;
  // LTV: daromad / sotib olgan mijozlar
  const ltv = wonN > 0 ? Math.round(revenue / wonN) : 0;
  return {
    leads,
    won: wonN,
    conversion: leads ? Math.round((wonN / leads) * 1000) / 10 : 0,
    paidSum,
    revenue: Math.round(revenue),
    revenueIsEstimate,
    ltv,
    monthly: monthly.rows.map((r) => ({
      month: r.month,
      revenue: r.paid > 0 ? r.paid : r.won * avgCheck,
      won: r.won,
    })),
  };
}

// ------------------------------------------------------------
//  11.2: SEGMENTLAR — kunlik qayta hisoblash
//  vip: sotib olgan; faol: 7 kun ichida yozgan; uxlagan: 30+ kun jim;
//  sovuq: qolganlar (yozgan, lekin qiziqmagan)
// ------------------------------------------------------------
export async function recomputeSegments() {
  // Faqat qiymati O'ZGARADIGAN qatorlar yoziladi — butun jadvalga lock qo'ymaslik
  // uchun (aks holda scheduler paytida webhook yozuvlari kutib qolardi)
  const { rowCount } = await pool.query(
    `UPDATE contacts SET segment = calc.seg
       FROM (SELECT id, CASE
               WHEN stage = 'won' THEN 'vip'
               WHEN last_seen >= now() - interval '7 days' THEN 'faol'
               WHEN last_seen < now() - interval '30 days' THEN 'uxlagan'
               ELSE 'sovuq'
             END AS seg
             FROM contacts WHERE NOT archived) calc
      WHERE contacts.id = calc.id AND contacts.segment IS DISTINCT FROM calc.seg`
  );
  return rowCount;
}

export async function segmentCounts() {
  const { rows } = await pool.query(
    `SELECT segment, COUNT(*)::int AS n FROM contacts
      WHERE NOT archived AND segment IS NOT NULL GROUP BY segment`
  );
  return Object.fromEntries(rows.map((r) => [r.segment, r.n]));
}

// ------------------------------------------------------------
//  11.3: YO'QOTILGAN MIJOZLAR — voronka tushishi + suhbat namunalari
// ------------------------------------------------------------
export async function getFunnelDrop() {
  const { rows } = await pool.query(
    `SELECT stage, COUNT(*)::int AS n FROM contacts WHERE NOT archived GROUP BY stage`
  );
  return Object.fromEntries(rows.map((r) => [r.stage, r.n]));
}

// Yo'qotilgan/qotib qolgan mijozlarning oxirgi suhbat parchalari (AI uchun)
export async function getLostSamples(limit = 25) {
  const { rows } = await pool.query(
    `SELECT c.id, c.stage,
            (SELECT string_agg(sub.line, E'\n') FROM (
               SELECT (CASE WHEN m.role = 'user' THEN 'Mijoz: ' ELSE 'Bot: ' END) || left(m.text, 160) AS line
                 FROM messages m WHERE m.contact_id = c.id
                ORDER BY m.created_at DESC LIMIT 4
            ) sub) AS convo_tail
       FROM contacts c
      WHERE NOT c.archived
        AND (c.stage = 'lost'
             OR (c.stage IN ('new','interested')
                 AND c.last_seen < now() - interval '7 days'))
        AND EXISTS (SELECT 1 FROM messages m WHERE m.contact_id = c.id AND m.role = 'user')
      ORDER BY c.last_seen DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

// ------------------------------------------------------------
//  11.4: PROGNOZ — oxirgi 60 kun kunlik ma'lumot
// ------------------------------------------------------------
export async function getDailyTrend() {
  const { rows } = await pool.query(
    `SELECT d.day::date AS day,
            COALESCE(nc.n, 0)::int AS new_contacts,
            COALESCE(w.n, 0)::int AS won
       FROM generate_series(now()::date - 59, now()::date, interval '1 day') d(day)
       LEFT JOIN (SELECT first_seen::date dd, COUNT(*) n FROM contacts GROUP BY 1) nc ON nc.dd = d.day::date
       LEFT JOIN (SELECT stage_changed_at::date dd, COUNT(*) n FROM contacts WHERE stage='won' GROUP BY 1) w ON w.dd = d.day::date
      ORDER BY d.day`
  );
  return rows;
}

// ------------------------------------------------------------
//  11.5: A/B TESTLAR
// ------------------------------------------------------------
export async function listAbTests() {
  const { rows } = await pool.query(
    `SELECT t.*, p.name AS project_name FROM ab_tests t
       LEFT JOIN projects p ON p.id = t.project_id
      ORDER BY t.id DESC`
  );
  return rows;
}

export async function getActiveAbTest(projectId, testType) {
  const { rows } = await pool.query(
    `SELECT * FROM ab_tests
      WHERE status = 'running' AND test_type = $2
        AND (project_id IS NULL OR project_id = $1)
      ORDER BY (project_id IS NOT NULL) DESC, id DESC LIMIT 1`,
    [projectId, testType]
  );
  return rows[0] || null;
}

export async function insertAbTest({ projectId, name, testType, variantA, variantB, splitPercent }) {
  const { rows } = await pool.query(
    `INSERT INTO ab_tests (project_id, name, test_type, variant_a, variant_b, split_percent)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [projectId || null, name, testType, variantA, variantB, splitPercent]
  );
  return rows[0].id;
}

export async function setAbTestStatus(id, status) {
  await pool.query(
    `UPDATE ab_tests SET status = $2, ended_at = CASE WHEN $2 <> 'running' THEN now() ELSE NULL END
      WHERE id = $1`,
    [id, status]
  );
}

export async function getAbTest(id) {
  const { rows } = await pool.query(`SELECT * FROM ab_tests WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function setContactAbVariant(contactId, variant) {
  await pool.query(
    `UPDATE contacts SET ab_variant = $2 WHERE id = $1 AND ab_variant IS NULL`,
    [contactId, variant]
  );
}

// Natijalar: har variant bo'yicha kontaktlar, javob berganlar, konversiya
export async function getAbResults(test) {
  const { rows } = await pool.query(
    `SELECT c.ab_variant AS v,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM messages m
                                     WHERE m.contact_id = c.id AND m.role = 'user') >= 2)::int AS replied,
            COUNT(*) FILTER (WHERE c.stage IN ('interested','negotiation','won'))::int AS converted
       FROM contacts c
      WHERE c.ab_variant IN ('A','B')
        AND c.first_seen >= $1
        AND ($2::int IS NULL OR c.project_id = $2)
      GROUP BY c.ab_variant`,
    [test.started_at, test.project_id]
  );
  const out = { A: { total: 0, replied: 0, converted: 0 }, B: { total: 0, replied: 0, converted: 0 } };
  for (const r of rows) out[r.v] = { total: r.total, replied: r.replied, converted: r.converted };
  return out;
}
