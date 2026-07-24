// ============================================================
//  SERVICES/BACKUP.JS — kunlik avtomatik zaxira (ROADMAP-6 F1)
//  Muhim jadvallarni JSON sifatida /backups papkaga yozadi.
//  Oxirgi 7 kun saqlanadi, eskisi o'chiriladi.
//  Eslatma: Railway diski efemer — deploy'da o'chadi. Doimiy zaxira uchun
//  Railway Postgres backup ham yoqilgan (DEPLOYMENT.md ga qarang).
//  access_token FAYLGA YOZILMAYDI (xavfsizlik).
// ============================================================
import fs from "fs";
import path from "path";
import { pool } from "../db.js";
import { state } from "../state.js";

const BACKUP_DIR = "backups";
const KEEP_DAYS = 7;

const today10 = () => new Date().toISOString().slice(0, 10);

export async function runBackup() {
  if (!state.DB_READY) return;
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const file = path.join(BACKUP_DIR, `backup-${today10()}.json`);
    if (fs.existsSync(file)) return; // bugungisi bor

    const [projects, contacts, messages, savedReplies, settings, broadcasts] =
      await Promise.all([
        pool.query(`SELECT id, name, ig_account_id, knowledge_base, created_at FROM projects`),
        pool.query(`SELECT * FROM contacts`),
        pool.query(`SELECT * FROM messages`),
        pool.query(`SELECT * FROM saved_replies`),
        pool.query(`SELECT * FROM settings`),
        pool.query(`SELECT * FROM broadcasts`),
      ]);

    const data = {
      createdAt: new Date().toISOString(),
      projects: projects.rows,
      contacts: contacts.rows,
      messages: messages.rows,
      saved_replies: savedReplies.rows,
      settings: settings.rows,
      broadcasts: broadcasts.rows,
    };
    fs.writeFileSync(file, JSON.stringify(data));
    console.log(`💾 Zaxira yozildi: ${file} (${messages.rows.length} xabar, ${contacts.rows.length} mijoz)`);

    // Eski zaxiralarni tozalash (7 kundan eski)
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(BACKUP_DIR)) {
      const m = f.match(/^backup-(\d{4}-\d{2}-\d{2})\.json$/);
      if (m && new Date(m[1]).getTime() < cutoff) {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`🧹 Eski zaxira o'chirildi: ${f}`);
      }
    }
  } catch (err) {
    console.error("⚠️ Zaxira xatoligi:", err.message);
  }
}

// Startupda bir marta (bugungisi bo'lmasa) + har 24 soatda
export function startBackupScheduler() {
  setTimeout(runBackup, 30 * 1000); // DB tayyor bo'lishini kutamiz
  const t = setInterval(runBackup, 24 * 60 * 60 * 1000);
  if (t.unref) t.unref();
}
