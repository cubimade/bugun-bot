// ============================================================
//  ROUTES/API-MEDIA.JS — 9.5: media kutubxona API
//  Yuklash JSON+base64 orqali (multipart parser kerak emas).
//  GET /media/:id — OMMAVIY (Instagram/Telegram serverlari yuklaydi).
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { requireDb, state } from "../state.js";
import {
  listMedia,
  insertMedia,
  deleteMedia,
  getMediaFile,
  totalMediaSize,
  setMediaPortfolio,
} from "../db.js";

const router = express.Router();

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB / fayl
const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB jami

const ALLOWED_MIME = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "file",
  "video/mp4": "video",
};

router.get("/api/media", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const [items, total] = await Promise.all([listMedia(), totalMediaSize()]);
    res.json({
      media: items.map((m) => ({ ...m, url: `/media/${m.id}` })),
      totalSize: total,
      maxTotal: MAX_TOTAL_BYTES,
      maxFile: MAX_FILE_BYTES,
    });
  } catch (err) {
    next(err);
  }
});

// Yuklash: { name, data: "data:image/png;base64,...", project_id? }
router.post("/api/media", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const name = String(req.body?.name || "fayl").trim().slice(0, 150);
    const dataUrl = String(req.body?.data || "");
    const m = dataUrl.match(/^data:([\w/.+-]+);base64,(.+)$/s);
    if (!m) return res.status(400).json({ error: "Fayl formati noto'g'ri" });
    const mime = m[1].toLowerCase();
    const type = ALLOWED_MIME[mime];
    if (!type) {
      return res.status(400).json({ error: "Ruxsat etilgan turlar: JPG, PNG, GIF, WEBP, PDF, MP4" });
    }
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > MAX_FILE_BYTES) {
      return res.status(400).json({ error: "Fayl juda katta (maks 5 MB)" });
    }
    const total = await totalMediaSize();
    if (total + buf.length > MAX_TOTAL_BYTES) {
      return res.status(400).json({
        error: `Kutubxona to'lgan (${Math.round(total / 1e6)}/100 MB) — avval eski fayllarni o'chiring`,
      });
    }
    const projectId = Number(req.body?.project_id) || null;
    const id = await insertMedia({ projectId, name, type, mime, size: buf.length, data: buf });
    console.log(`🖼 Media yuklandi: ${name} (${Math.round(buf.length / 1024)} KB, #${id})`);
    res.json({ ok: true, id, url: `/media/${id}` });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/media/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await deleteMedia(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/api/media/:id/portfolio", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    await setMediaPortfolio(Number(req.params.id), Boolean(req.body?.value));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
//  OMMAVIY fayl xizmati — Instagram/Telegram shu URL'dan yuklaydi.
//  Parol YO'Q (tashqi platformalar auth yubora olmaydi), lekin ID'siz
//  fayl topib bo'lmaydi va faqat o'qish mumkin.
// ============================================================
router.get("/media/:id", async (req, res) => {
  if (!state.DB_READY) return res.sendStatus(503);
  try {
    const f = await getMediaFile(Number(req.params.id));
    if (!f || !f.data) return res.sendStatus(404);
    res.setHeader("Content-Type", f.mime || "application/octet-stream");
    res.setHeader("Content-Length", f.data.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(f.name)}"`);
    res.send(f.data);
  } catch (err) {
    res.sendStatus(500);
  }
});

export default router;
