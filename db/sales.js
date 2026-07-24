// ============================================================
//  DB/SALES.JS — 10-bosqich: bron, to'lov, promo, referral,
//  kalkulyator, AI profil so'rovlari
// ============================================================
import { pool } from "./pool.js";

// ------------------------------------------------------------
//  10.1: BRON SOZLAMALARI
// ------------------------------------------------------------
export async function getBookingSettings(projectId) {
  const { rows } = await pool.query(
    `SELECT * FROM booking_settings WHERE project_id = $1`,
    [projectId]
  );
  return rows[0] || null;
}

export async function saveBookingSettings(projectId, s) {
  await pool.query(
    `INSERT INTO booking_settings
       (project_id, is_active, work_days, work_start, work_end,
        slot_duration_min, break_between_min, max_days_ahead)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (project_id) DO UPDATE SET
       is_active = EXCLUDED.is_active,
       work_days = EXCLUDED.work_days,
       work_start = EXCLUDED.work_start,
       work_end = EXCLUDED.work_end,
       slot_duration_min = EXCLUDED.slot_duration_min,
       break_between_min = EXCLUDED.break_between_min,
       max_days_ahead = EXCLUDED.max_days_ahead`,
    [
      projectId,
      Boolean(s.is_active),
      JSON.stringify(s.work_days || [1, 2, 3, 4, 5, 6]),
      s.work_start,
      s.work_end,
      s.slot_duration_min,
      s.break_between_min,
      s.max_days_ahead,
    ]
  );
}

// ------------------------------------------------------------
//  10.1: BRONLAR
// ------------------------------------------------------------
export async function listBookings(limit = 200) {
  const { rows } = await pool.query(
    `SELECT b.*, c.name AS contact_name, c.ig_user_id, p.name AS project_name
       FROM bookings b
       LEFT JOIN contacts c ON c.id = b.contact_id
       LEFT JOIN projects p ON p.id = b.project_id
      ORDER BY b.starts_at DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

// Band vaqtlar — slot hisoblash uchun (pending/confirmed, kelajakda)
export async function listActiveBookings(projectId) {
  const { rows } = await pool.query(
    `SELECT starts_at, duration_min FROM bookings
      WHERE project_id = $1 AND status IN ('pending','confirmed')
        AND starts_at >= now() - interval '1 hour'`,
    [projectId]
  );
  return rows;
}

export async function insertBooking({ projectId, contactId, serviceName, startsAt, durationMin, note, status = "pending" }) {
  const { rows } = await pool.query(
    `INSERT INTO bookings (project_id, contact_id, service_name, starts_at, duration_min, note, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [projectId || null, contactId || null, serviceName || null, startsAt, durationMin, note || null, status]
  );
  return rows[0].id;
}

export async function updateBookingStatus(id, status) {
  await pool.query(`UPDATE bookings SET status = $2 WHERE id = $1`, [id, status]);
}

// Mijozning eng yaqin faol broni (bekor qilish uchun)
export async function getUpcomingBooking(contactId) {
  const { rows } = await pool.query(
    `SELECT id, starts_at, service_name FROM bookings
      WHERE contact_id = $1 AND status IN ('pending','confirmed') AND starts_at > now()
      ORDER BY starts_at LIMIT 1`,
    [contactId]
  );
  return rows[0] || null;
}

// Eslatma: 20-28 soat ichida boshlanadigan, hali eslatilmaganlar
export async function claimReminderBookings() {
  const { rows } = await pool.query(
    `UPDATE bookings b
        SET reminded = true
       FROM contacts c, projects p
      WHERE b.id IN (
              SELECT id FROM bookings
               WHERE status IN ('pending','confirmed') AND NOT reminded
                 AND starts_at BETWEEN now() + interval '20 hours' AND now() + interval '28 hours'
            )
        AND c.id = b.contact_id AND p.id = c.project_id
      RETURNING b.id, b.starts_at, b.service_name, b.contact_id,
                c.ig_user_id, c.name AS contact_name,
                p.platform, p.access_token, p.ig_account_id`
  );
  return rows;
}

// ------------------------------------------------------------
//  10.3: TO'LOVLAR
// ------------------------------------------------------------
export async function listPayments(limit = 100) {
  const { rows } = await pool.query(
    `SELECT pm.*, c.name AS contact_name, c.ig_user_id, p.name AS project_name
       FROM payments pm
       LEFT JOIN contacts c ON c.id = pm.contact_id
       LEFT JOIN projects p ON p.id = pm.project_id
      ORDER BY pm.id DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function insertPayment({ projectId, contactId, amount, method, link }) {
  const { rows } = await pool.query(
    `INSERT INTO payments (project_id, contact_id, amount, method, link)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [projectId || null, contactId || null, amount || null, method || null, link || null]
  );
  return rows[0].id;
}

export async function setPaymentStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE payments SET status = $2, paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE paid_at END
      WHERE id = $1 RETURNING contact_id`,
    [id, status]
  );
  return rows[0] || null;
}

// ------------------------------------------------------------
//  10.4: PROMO KODLAR
// ------------------------------------------------------------
export async function listPromoCodes() {
  const { rows } = await pool.query(
    `SELECT pc.*, p.name AS project_name FROM promo_codes pc
       LEFT JOIN projects p ON p.id = pc.project_id
      ORDER BY pc.id DESC`
  );
  return rows;
}

export async function insertPromoCode({ projectId, code, discountPercent, discountAmount, maxUses, validUntil }) {
  const { rows } = await pool.query(
    `INSERT INTO promo_codes (project_id, code, discount_percent, discount_amount, max_uses, valid_until)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [projectId || null, code.toUpperCase(), discountPercent || null, discountAmount || null, maxUses || 1, validUntil || null]
  );
  return rows[0].id;
}

export async function deletePromoCode(id) {
  await pool.query(`DELETE FROM promo_codes WHERE id = $1`, [id]);
}

export async function updatePromoCode(id, { isActive }) {
  await pool.query(`UPDATE promo_codes SET is_active = COALESCE($2, is_active) WHERE id = $1`, [
    id,
    isActive ?? null,
  ]);
}

// Kodni tekshirib, amal qilsa used_count'ni atomik oshiradi
export async function redeemPromoCode(code, projectId) {
  const { rows } = await pool.query(
    `UPDATE promo_codes
        SET used_count = used_count + 1
      WHERE upper(code) = upper($1)
        AND is_active
        AND (project_id IS NULL OR project_id = $2)
        AND used_count < max_uses
        AND (valid_until IS NULL OR valid_until > now())
      RETURNING id, code, discount_percent, discount_amount`,
    [code, projectId]
  );
  return rows[0] || null;
}

// Matnda faol promo-kod bormi (yozilgan so'zlarni kodlar bilan solishtiramiz)
export async function findPromoInText(text, projectId) {
  const words = String(text || "").toUpperCase().match(/[A-Z0-9-]{4,20}/g) || [];
  if (!words.length) return null;
  const { rows } = await pool.query(
    `SELECT code FROM promo_codes
      WHERE upper(code) = ANY($1)
        AND is_active AND (project_id IS NULL OR project_id = $2)`,
    [words, projectId]
  );
  return rows[0]?.code || null;
}

// ------------------------------------------------------------
//  10.5: REFERRAL
// ------------------------------------------------------------
export async function ensureReferralCode(contactId) {
  const { rows } = await pool.query(`SELECT referral_code FROM contacts WHERE id = $1`, [contactId]);
  if (rows[0]?.referral_code) return rows[0].referral_code;
  // REF + 5 belgi — matn ichidan oson topiladi
  for (let i = 0; i < 5; i++) {
    const code = "REF" + Math.random().toString(36).slice(2, 7).toUpperCase();
    try {
      await pool.query(`UPDATE contacts SET referral_code = $2 WHERE id = $1`, [contactId, code]);
      return code;
    } catch {
      /* takror kod — qayta urinamiz */
    }
  }
  return null;
}

export async function findContactByReferralCode(code) {
  const { rows } = await pool.query(
    `SELECT id, name, ig_user_id, project_id FROM contacts WHERE upper(referral_code) = upper($1)`,
    [code]
  );
  return rows[0] || null;
}

export async function setReferredBy(contactId, referrerId) {
  const { rows } = await pool.query(
    `UPDATE contacts SET referred_by = $2
      WHERE id = $1 AND referred_by IS NULL AND id <> $2
      RETURNING id`,
    [contactId, referrerId]
  );
  return Boolean(rows[0]);
}

// Kontakt izohiga qo'shimcha yozish (kalkulyator natijasi va h.k.)
export async function appendContactNote(contactId, text) {
  await pool.query(
    `UPDATE contacts
        SET note = left(COALESCE(note, '') || CASE WHEN COALESCE(note,'') = '' THEN '' ELSE E'\n' END || $2, 2000)
      WHERE id = $1`,
    [contactId, text]
  );
}

export async function referralStats(limit = 10) {
  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.ig_user_id, COUNT(c.id)::int AS invited
       FROM contacts c
       JOIN contacts r ON r.id = c.referred_by
      GROUP BY r.id, r.name, r.ig_user_id
      ORDER BY invited DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

// ------------------------------------------------------------
//  10.2: NARX KALKULYATORI
// ------------------------------------------------------------
export async function listPriceRules(projectId = null) {
  const { rows } = await pool.query(
    `SELECT id, project_id, question, options, sort_order FROM price_rules
      WHERE ($1::int IS NULL OR project_id IS NULL OR project_id = $1)
      ORDER BY sort_order, id`,
    [projectId]
  );
  return rows;
}

export async function replacePriceRules(rules) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM price_rules`);
    let i = 0;
    for (const r of rules) {
      await client.query(
        `INSERT INTO price_rules (project_id, question, options, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [r.project_id || null, r.question, JSON.stringify(r.options || []), i++]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ------------------------------------------------------------
//  10.6: AI PROFIL
// ------------------------------------------------------------
export async function mergeContactProfile(contactId, patch) {
  await pool.query(
    `UPDATE contacts SET profile = COALESCE(profile, '{}'::jsonb) || $2::jsonb WHERE id = $1`,
    [contactId, JSON.stringify(patch)]
  );
}

export async function setContactName(contactId, name) {
  await pool.query(
    `UPDATE contacts SET name = $2 WHERE id = $1 AND (name IS NULL OR name = '')`,
    [contactId, name]
  );
}
