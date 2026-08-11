// ============================================================
//  ROUTES/API-CONTACTS.JS — kontakt va suhbat endpointlari
//  (13-audit: api.js 610 qator edi — shu guruh alohida faylga ajratildi)
//  Kontaktlar ro'yxati, qidiruv, bildirishnoma, arxiv, GDPR o'chirish,
//  eksport, baholash, suhbat, teglar, odam-kerak, profil, pauza, izoh,
//  duplikatlar.
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import {
  listContacts,
  countContacts,
  searchAll,
  listNeedsHuman,
  setContactArchived,
  rateMessage,
  deleteContact,
  pool,
  getContact,
  getContactMessages,
  markContactRead,
  listAllTags,
  setContactTags,
  setNeedsHuman,
  setBotPaused,
  stopContactFlows,
  setContactNote,
  listContactsNeedingProfile,
} from "../db.js";
import { refreshContactProfile } from "../services/ig-profile.js";

const router = express.Router();

// ------------------------------------------------------------
//  16 (2.1): Mavjud kontaktlar profilini bir martalik to'ldirish.
//  Meta limiti: soatiga ~200 so'rov — shuning uchun so'rovlar orasida
//  200ms tanaffus va bir yurishda ko'pi bilan 200 ta kontakt.
//  Uzoq davom etadi → javob DARHOL qaytariladi, ish fonda ketadi.
// ------------------------------------------------------------
let PROFILE_FILL = { running: false, done: 0, ok: 0, total: 0, startedAt: null };

router.post("/api/contacts/refresh-profiles", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    if (PROFILE_FILL.running) {
      return res.status(409).json({ error: "Yangilash allaqachon ketmoqda", progress: PROFILE_FILL });
    }
    const rows = await listContactsNeedingProfile(200);
    if (!rows.length) {
      return res.json({ ok: true, total: 0, message: "Hamma profil yangi — yangilash shart emas" });
    }

    PROFILE_FILL = { running: true, done: 0, ok: 0, total: rows.length, startedAt: Date.now() };
    res.json({ ok: true, started: true, total: rows.length });

    // Fon: javob yuborilgandan keyin
    (async () => {
      for (const c of rows) {
        try {
          const updated = await refreshContactProfile(c.id, c.ig_user_id, c.access_token);
          if (updated) PROFILE_FILL.ok++;
        } catch (err) {
          console.warn(`⚠️ Profil to'ldirish xatosi (#${c.id}): ${err.message}`);
        }
        PROFILE_FILL.done++;
        await new Promise((r) => setTimeout(r, 200)); // rate limit
      }
      console.log(`👤 Profil to'ldirish yakuni: ${PROFILE_FILL.ok}/${PROFILE_FILL.total} ta olindi.`);
      PROFILE_FILL.running = false;
    })().catch((err) => {
      console.error("⚠️ Profil to'ldirish to'xtadi:", err.message);
      PROFILE_FILL.running = false;
    });
  } catch (err) {
    PROFILE_FILL.running = false;
    next(err);
  }
});

// Jarayon holati (tugma yonida "42/79" ko'rsatish uchun)
router.get("/api/contacts/refresh-profiles/status", protect, (req, res) => {
  res.json({ progress: PROFILE_FILL });
});

router.get("/api/contacts", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    // B2: pagination — limit + offset, jami soni bilan ("Ko'proq yuklash" uchun)
    const limit = Math.min(Number(req.query.limit) || 50, 300);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    // 12.1: operator faqat o'ziga biriktirilgan akkauntlarni ko'radi
    const scope =
      req.user?.role === "operator" && (req.user.project_ids || []).length
        ? req.user.project_ids
        : null;
    const [contacts, total] = await Promise.all([
      listContacts(limit, offset, scope),
      countContacts(),
    ]);
    res.json({ contacts, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

// --- D1: Global qidiruv — kontakt ismi/ID va xabar matni bo'yicha ---
router.get("/api/search", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const q = String(req.query.q || "").trim().slice(0, 100);
    if (q.length < 2) return res.json({ contacts: [], messages: [] });
    res.json(await searchAll(q));
  } catch (err) {
    next(err);
  }
});

// --- D2: Bildirishnomalar — yangi "odam kerak" suhbatlar ---
router.get("/api/notifications", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const items = await listNeedsHuman(20);
    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

// --- D4: Suhbatni arxivlash / chiqarish ---
router.post("/api/contacts/:id/archive", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    const value = Boolean(req.body?.value);
    await setContactArchived(contactId, value);
    res.json({ ok: true, value });
  } catch (err) {
    next(err);
  }
});

// --- F2: Kontaktni butunlay o'chirish (GDPR) — xabarlar ham o'chadi ---
router.delete("/api/contacts/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const id = await deleteContact(Number(req.params.id));
    if (!id) return res.status(404).json({ error: "Mijoz topilmadi" });
    console.log(`🗑 Kontakt butunlay o'chirildi (GDPR): ${id}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- F3: To'liq ma'lumot eksporti (barcha kontakt + suhbatlar JSON) ---
router.get("/api/export/full.json", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const [projects, contacts, messages] = await Promise.all([
      pool.query(`SELECT id, name, ig_account_id, knowledge_base, created_at FROM projects`),
      pool.query(`SELECT * FROM contacts ORDER BY id`),
      pool.query(`SELECT * FROM messages ORDER BY contact_id, created_at`),
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bugun-bot-export-${stamp}.json"`);
    res.send(JSON.stringify({
      exportedAt: new Date().toISOString(),
      projects: projects.rows,
      contacts: contacts.rows,
      messages: messages.rows,
    }));
  } catch (err) {
    next(err);
  }
});

// --- D5: Bot javobini baholash (👍/👎) ---
router.post("/api/messages/:id/rate", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const messageId = Number(req.params.id);
    const value = Number(req.body?.value);
    if (![1, -1, 0].includes(value)) {
      return res.status(400).json({ error: "value 1, -1 yoki 0 bo'lishi kerak" });
    }
    await rateMessage(messageId, value);
    res.json({ ok: true, value });
  } catch (err) {
    next(err);
  }
});

router.get("/api/conversation/:contactId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.contactId);
    const contact = await getContact(contactId);
    if (!contact) return res.status(404).json({ error: "Mijoz topilmadi" });
    // 12.1: operator ko'lami — faqat biriktirilgan akkaunt mijozlari
    if (
      req.user?.role === "operator" &&
      (req.user.project_ids || []).length &&
      !req.user.project_ids.includes(contact.project_id)
    ) {
      return res.status(403).json({ error: "Bu suhbat sizga ochiq emas" });
    }
    const messages = await getContactMessages(contactId);
    await markContactRead(contactId); // suhbat ochildi — o'qildi deb belgilaymiz
    res.json({ contact, messages });
  } catch (err) {
    next(err);
  }
});

// --- Teglar ---
router.get("/api/tags", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ tags: await listAllTags() });
  } catch (err) {
    next(err);
  }
});

router.post("/api/contacts/:id/tags", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    let tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    // Tozalash: satr, bo'sh emas, 30 belgigacha, ko'pi bilan 15 ta, takrorsiz
    tags = [...new Set(
      tags
        .map((t) => String(t).trim().slice(0, 30))
        .filter(Boolean)
    )].slice(0, 15);
    await setContactTags(contactId, tags);
    res.json({ ok: true, tags });
  } catch (err) {
    next(err);
  }
});

// --- "Odam kerak" holatini boshqarish (hal qilindi deb belgilash) ---
router.post("/api/contacts/:id/needs-human", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    const value = Boolean(req.body?.value);
    await setNeedsHuman(contactId, value);
    res.json({ ok: true, value });
  } catch (err) {
    next(err);
  }
});

// --- C4: Kontakt profili (drawer uchun — xabarlarsiz, yengil) ---
router.get("/api/contacts/:id/profile", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contact = await getContact(Number(req.params.id));
    if (!contact) return res.status(404).json({ error: "Mijoz topilmadi" });
    res.json({ contact });
  } catch (err) {
    next(err);
  }
});

// --- C1: Bot pauza (operator rejimi) — qo'lda yoqish/o'chirish ---
router.post("/api/contacts/:id/pause", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    const value = Boolean(req.body?.value);
    // Qo'lda pauza — muddatsiz (operator o'zi qayta yoqadi)
    await setBotPaused(contactId, value, null);
    // 8.7: operator aralashdi — faol flow to'xtatiladi (to'qnashuv bo'lmasin)
    if (value) await stopContactFlows(contactId).catch(() => {});
    console.log(`${value ? "🔕 Bot pauza qilindi" : "▶️ Bot qayta yoqildi"} (mijoz ${contactId})`);
    res.json({ ok: true, value });
  } catch (err) {
    next(err);
  }
});

// --- C4: Mijoz izohi (nota) — mini-CRM ---
router.post("/api/contacts/:id/note", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    const note = String(req.body?.note ?? "").slice(0, 2000);
    await setContactNote(contactId, note);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- 12.5: Duplikat kontaktlar (bir xil telefon/email, AI profildan) ---
router.get("/api/duplicates", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(NULLIF(profile->>'telefon',''), profile->>'email') AS key,
              json_agg(json_build_object('id', id, 'name', name, 'ig_user_id', ig_user_id)) AS contacts
         FROM contacts
        WHERE (NULLIF(profile->>'telefon','') IS NOT NULL OR NULLIF(profile->>'email','') IS NOT NULL)
          AND NOT archived
        GROUP BY 1
       HAVING COUNT(*) > 1
        LIMIT 20`
    );
    res.json({ duplicates: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
