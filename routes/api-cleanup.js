// ============================================================
//  ROUTES/API-CLEANUP.JS — ma'lumot tozalash (ROADMAP-18 FAZA 6)
//  Production'dagi test axlati va dublikatlarni ANIQLAB KO'RSATADI —
//  hech narsa avtomatik O'CHIRILMAYDI, foydalanuvchi tasdiqlaydi
//  (o'chirish mavjud DELETE /api/accounts/:id va /api/flows/:id orqali).
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import { pool } from "../db/pool.js";

const router = express.Router();

// Ma'nosiz matn heuristikasi: "lkdalksdak[ldasd" kabi klaviatura axlati.
// Bo'sh, juda qisqa, yoki probelsiz-unlisiz uzun satrlar belgilanadi.
function looksLikeJunk(text) {
  const t = String(text || "").trim();
  if (t.length < 3) return true;
  if (t.length >= 8 && !/\s/.test(t)) {
    const vowels = (t.match(/[aeiouаеёиоуыэюяoʻ']/gi) || []).length;
    if (vowels / t.length < 0.28) return true; // unlilar juda kam — mash
    if (/[\[\]\\{}|<>~^]/.test(t)) return true; // tasodifiy belgilar
  }
  return false;
}

router.get("/api/cleanup/scan", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const [accounts, flows, keywords, nameless] = await Promise.all([
      // Bo'sh akkauntlar: 0 kontakt, 0 xabar, token yo'q
      pool.query(
        `SELECT p.id, p.name, p.platform, p.created_at
           FROM projects p
          WHERE p.access_token IS NULL
            AND NOT EXISTS (SELECT 1 FROM contacts c WHERE c.project_id = p.id)
          ORDER BY p.id`
      ),
      // Dublikat flow'lar: bir xil nomli guruhlar (eng eskisi "asl" hisoblanadi)
      pool.query(
        `SELECT f.id, f.name, f.is_active, f.created_at,
                (SELECT COUNT(*)::int FROM contact_flow_state s
                  WHERE s.flow_id = f.id AND s.status = 'active') AS active_contacts
           FROM flows f
          WHERE lower(trim(f.name)) IN (
            SELECT lower(trim(name)) FROM flows GROUP BY 1 HAVING COUNT(*) > 1
          )
          ORDER BY lower(trim(f.name)), f.id`
      ),
      pool.query(
        `SELECT id, keyword, reply_text, is_active FROM keyword_rules ORDER BY id`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS n FROM contacts
          WHERE (name IS NULL OR trim(name) = '') AND (username IS NULL OR trim(username) = '')`
      ),
    ]);

    const junkKeywords = keywords.rows
      .filter((k) => looksLikeJunk(k.reply_text))
      .map((k) => ({
        id: k.id,
        keyword: k.keyword,
        reply_text: String(k.reply_text || "").slice(0, 120),
        is_active: k.is_active,
      }));

    // Dublikat guruhlar: nom bo'yicha guruhlab, birinchisini (eng eski id)
    // "asl" deb belgilaymiz — UI'da o'chirish taklif qilinmaydi
    const groups = new Map();
    for (const f of flows.rows) {
      const key = String(f.name || "").trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    }
    const dupFlows = [...groups.values()].map((list) => ({
      name: list[0].name,
      original: list[0],
      duplicates: list.slice(1),
    }));

    res.json({
      emptyAccounts: accounts.rows,
      dupFlows,
      junkKeywords,
      namelessContacts: nameless.rows[0].n,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
