// ============================================================
//  ROUTES/API-USERS.JS — 12.1: foydalanuvchilar boshqaruvi (owner),
//  12.2: biriktirish va ichki izohlar, 12.5: audit log
// ============================================================
import express from "express";
import crypto from "crypto";

import { protect, requireRole, invalidateSessionCache } from "../middleware/auth.js";
import { requireDb } from "../state.js";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  setUserProjects,
  assignContact,
  listInternalNotes,
  addInternalNote,
  deleteInternalNote,
  logAudit,
  listAuditLog,
} from "../db.js";

const router = express.Router();

const userLabel = (req) => req.user?.email || req.user?.name || "owner";

// --- Foydalanuvchilar (faqat owner) ---
router.get("/api/users", protect, requireRole("owner"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ users: await listUsers() });
  } catch (err) {
    next(err);
  }
});

// Operator biriktirish uchun qisqa ro'yxat (hamma rolga ochiq)
router.get("/api/users/list-brief", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const users = (await listUsers())
      .filter((u) => u.is_active)
      .map((u) => ({ id: u.id, name: u.name || u.email, role: u.role }));
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.post("/api/users", protect, requireRole("owner"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 200);
    const name = String(req.body?.name || "").trim().slice(0, 100);
    const role = ["admin", "operator"].includes(req.body?.role) ? req.body.role : "operator";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email noto'g'ri" });
    }
    // Vaqtinchalik parol — bir marta ko'rsatiladi
    const tempPassword = crypto.randomBytes(5).toString("base64url");
    const id = await createUser({ email, password: tempPassword, name, role });
    if (!id) return res.status(400).json({ error: "Bu email allaqachon mavjud" });
    const projectIds = (Array.isArray(req.body?.project_ids) ? req.body.project_ids : [])
      .map(Number)
      .filter(Boolean);
    if (projectIds.length) await setUserProjects(id, projectIds);
    logAudit(userLabel(req), "user_create", `${email} (${role})`).catch(() => {});
    console.log(`👤 Yangi foydalanuvchi: ${email} (${role})`);
    res.json({ ok: true, id, tempPassword });
  } catch (err) {
    next(err);
  }
});

router.post("/api/users/:id", protect, requireRole("owner"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    // O'zini o'chirib/pasaytirib qo'ymasin
    if (req.user.id === id && (b.role === "operator" || b.is_active === false)) {
      return res.status(400).json({ error: "O'z rolingizni pasaytira olmaysiz" });
    }
    let newPassword = null;
    if (b.reset_password) {
      newPassword = crypto.randomBytes(5).toString("base64url");
    }
    await updateUser(id, {
      name: b.name != null ? String(b.name).slice(0, 100) : null,
      role: ["owner", "admin", "operator"].includes(b.role) ? b.role : null,
      isActive: b.is_active != null ? Boolean(b.is_active) : null,
      password: newPassword,
    });
    if (Array.isArray(b.project_ids)) {
      await setUserProjects(id, b.project_ids.map(Number).filter(Boolean));
    }
    invalidateSessionCache(); // rol o'zgargan bo'lishi mumkin
    logAudit(userLabel(req), "user_update", `#${id}`).catch(() => {});
    res.json({ ok: true, tempPassword: newPassword });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/users/:id", protect, requireRole("owner"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (req.user.id === id) return res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
    await deleteUser(id);
    invalidateSessionCache();
    logAudit(userLabel(req), "user_delete", `#${id}`).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- 12.2: Suhbatni biriktirish ---
router.post("/api/contacts/:id/assign", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const contactId = Number(req.params.id);
    const userId = req.body?.user_id ? Number(req.body.user_id) : null;
    await assignContact(contactId, userId);
    logAudit(userLabel(req), "contact_assign", `mijoz #${contactId} → user #${userId || "—"}`).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- 12.2: Ichki izohlar (jamoa ko'radi, mijoz ko'rmaydi) ---
router.get("/api/internal-notes/:contactId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ notes: await listInternalNotes(Number(req.params.contactId)) });
  } catch (err) {
    next(err);
  }
});

router.post("/api/internal-notes/:contactId", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const text = String(req.body?.text || "").trim().slice(0, 1000);
    if (!text) return res.status(400).json({ error: "Matn bo'sh" });
    const id = await addInternalNote(
      Number(req.params.contactId),
      req.user?.id || null,
      req.user?.name || req.user?.email || "Owner",
      text
    );
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/internal-notes/note/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await deleteInternalNote(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- 12.5: Audit log (owner/admin) ---
router.get("/api/audit-log", protect, requireRole("owner", "admin"), async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ log: await listAuditLog(50) });
  } catch (err) {
    next(err);
  }
});

export default router;
