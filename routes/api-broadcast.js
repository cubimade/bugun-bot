// ============================================================
//  ROUTES/API-BROADCAST.JS — ommaviy xabar: jonli progress,
//  rejalashtirish, scheduler (ROADMAP-6 A3 da index.js dan ajratilgan)
//  Ishlar xotirada: jobId -> { total, sent, failed, done }
// ============================================================
import express from "express";

import { protect } from "../middleware/auth.js";
import { state, ACCOUNTS_MAP, requireDb } from "../state.js";
import { IG_TOKEN } from "../config.js";
import { sendInstagramMessage } from "../instagram.js";
import {
  saveMessage,
  listBroadcastRecipients,
  getProjectToken,
  insertBroadcast,
  listBroadcasts,
  insertScheduledBroadcast,
  claimDueBroadcasts,
  finishBroadcast,
  cancelScheduledBroadcast,
} from "../db.js";

const router = express.Router();

const BROADCAST_JOBS = new Map();
let BROADCAST_SEQ = 1;

// D3: Shablon o'zgaruvchilari — {ism} va {akkaunt} haqiqiy qiymatga almashadi
function applyVars(message, recipient, accountName) {
  return message
    .replaceAll("{ism}", (recipient.name || "").trim() || "do'st")
    .replaceAll("{akkaunt}", accountName || "");
}

// Qabul qiluvchilar sonini oldindan ko'rish
router.get("/api/broadcast/recipients", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.query.projectId);
    const tag = req.query.tag ? String(req.query.tag) : null;
    if (!projectId) return res.status(400).json({ error: "projectId majburiy" });
    const recipients = await listBroadcastRecipients(projectId, tag);
    res.json({ count: recipients.length });
  } catch (err) {
    next(err);
  }
});

router.post("/api/broadcast", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const projectId = Number(req.body?.projectId);
    const tag = req.body?.tag ? String(req.body.tag) : null;
    const message = String(req.body?.message || "").trim();
    if (!projectId || !message) {
      return res.status(400).json({ error: "projectId va message majburiy" });
    }
    if (message.length > 900) {
      return res.status(400).json({ error: "Xabar juda uzun (900 belgigacha)" });
    }

    const project = await getProjectToken(projectId);
    if (!project) return res.status(404).json({ error: "Akkaunt topilmadi" });
    const token =
      project.access_token ||
      ACCOUNTS_MAP.get(String(project.ig_account_id || ""))?.token ||
      IG_TOKEN;
    if (!token) return res.status(400).json({ error: "Bu akkaunt uchun token topilmadi" });

    // C3: Rejalashtirish — sana berilsa hozir yubormaymiz, server o'zi vaqtida yuboradi
    const scheduledAt = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null;
    if (scheduledAt) {
      if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 30 * 1000) {
        return res.status(400).json({ error: "Rejalashtirish vaqti kelajakda bo'lishi kerak" });
      }
      const id = await insertScheduledBroadcast({
        projectId,
        audience: tag ? `Teg: ${tag}` : "Hammasi (24 soat)",
        tag,
        message,
        scheduledAt: scheduledAt.toISOString(),
      });
      console.log(`🗓 Broadcast rejalashtirildi (#${id}): ${scheduledAt.toISOString()}`);
      return res.json({ scheduled: true, id, scheduledAt: scheduledAt.toISOString() });
    }

    const recipients = await listBroadcastRecipients(projectId, tag);
    if (!recipients.length) {
      return res.status(400).json({ error: "Yuborish uchun mijoz yo'q (24 soat qoidasi)" });
    }

    const jobId = String(BROADCAST_SEQ++);
    const job = { total: recipients.length, sent: 0, failed: 0, done: false };
    BROADCAST_JOBS.set(jobId, job);
    res.json({ jobId, total: job.total });

    // Fon jarayoni: ketma-ket yuboramiz (Instagram rate-limit uchun pauza bilan)
    (async () => {
      for (const r of recipients) {
        try {
          const text = applyVars(message, r, project.name);
          const result = await sendInstagramMessage(r.ig_user_id, text, token);
          if (result.ok) {
            job.sent++;
            await saveMessage(r.id, "assistant", text);
          } else {
            job.failed++;
          }
        } catch (err) {
          job.failed++;
          console.error(`⚠️ Broadcast xatoligi (mijoz ${r.id}):`, err.message);
        }
        await new Promise((ok) => setTimeout(ok, 350));
      }
      job.done = true;
      try {
        await insertBroadcast({
          projectId,
          audience: tag ? `Teg: ${tag}` : "Hammasi (24 soat)",
          message,
          total: job.total,
          sent: job.sent,
          failed: job.failed,
        });
      } catch (err) {
        console.error("⚠️ Broadcast tarixini saqlashda xatolik:", err.message);
      }
      console.log(`📢 Broadcast tugadi: ${job.sent}/${job.total} yuborildi, ${job.failed} xato`);
      // Xotirani tozalash (5 daqiqadan keyin)
      setTimeout(() => BROADCAST_JOBS.delete(jobId), 5 * 60 * 1000);
    })();
  } catch (err) {
    next(err);
  }
});

router.get("/api/broadcast/status/:jobId", protect, (req, res) => {
  const job = BROADCAST_JOBS.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Ish topilmadi" });
  res.json(job);
});

router.get("/api/broadcasts", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    res.json({ broadcasts: await listBroadcasts(20) });
  } catch (err) {
    next(err);
  }
});

// Rejalashtirilgan (hali yuborilmagan) broadcastni bekor qilish
router.delete("/api/broadcasts/:id", protect, async (req, res, next) => {
  if (!requireDb(req, res)) return;
  try {
    const id = await cancelScheduledBroadcast(Number(req.params.id));
    if (!id) {
      return res.status(400).json({ error: "Faqat rejalashtirilgan broadcastni bekor qilish mumkin" });
    }
    console.log(`🗑 Rejalashtirilgan broadcast bekor qilindi (#${id})`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
//  C3: BROADCAST SCHEDULER — har daqiqada vaqti kelganlarni yuboradi
// ============================================================
export function startBroadcastScheduler() {
  setInterval(async () => {
    if (!state.DB_READY) return;
    try {
      const due = await claimDueBroadcasts();
      for (const b of due) {
        try {
          const project = await getProjectToken(b.project_id);
          const token =
            project?.access_token ||
            ACCOUNTS_MAP.get(String(project?.ig_account_id || ""))?.token ||
            IG_TOKEN;
          if (!token) {
            await finishBroadcast(b.id, { total: 0, sent: 0, failed: 0, status: "failed" });
            continue;
          }
          const recipients = await listBroadcastRecipients(b.project_id, b.tag);
          let sent = 0;
          let failed = 0;
          for (const r of recipients) {
            try {
              const text = applyVars(b.message, r, project?.name);
              const result = await sendInstagramMessage(r.ig_user_id, text, token);
              if (result.ok) {
                sent++;
                await saveMessage(r.id, "assistant", text);
              } else {
                failed++;
              }
            } catch (err) {
              failed++;
            }
            await new Promise((ok) => setTimeout(ok, 350));
          }
          await finishBroadcast(b.id, { total: recipients.length, sent, failed, status: "sent" });
          console.log(`🗓📢 Rejalashtirilgan broadcast #${b.id} yuborildi: ${sent}/${recipients.length}`);
        } catch (err) {
          console.error(`⚠️ Rejalashtirilgan broadcast #${b.id} xatoligi:`, err.message);
          try {
            await finishBroadcast(b.id, { total: 0, sent: 0, failed: 0, status: "failed" });
          } catch (e2) {
            /* jim */
          }
        }
      }
    } catch (err) {
      console.error("⚠️ Broadcast scheduler xatoligi:", err.message);
    }
  }, 60 * 1000);
}

export default router;
