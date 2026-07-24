// ============================================================
//  STATE.JS — server bo'ylab umumiy holat (ROADMAP-6 A3 da ajratilgan)
//  DB_READY, DEFAULT_PROJECT_ID, SETTINGS — state obyektida (mutatsiya
//  qilinadi, shuning uchun live obyekt sifatida eksport qilinadi).
//  ACCOUNTS_MAP — entry.id (string) -> { projectId, token, name }
// ============================================================
import { parseAccounts, IG_TOKEN } from "./config.js";
import {
  initDb,
  getOrCreateProject,
  listAccountsWithTokens,
  getAllSettings,
  seedDefaultTagRules,
} from "./db.js";

export const state = {
  DB_READY: false,
  DEFAULT_PROJECT_ID: null,
  SETTINGS: {},
};

export const ACCOUNTS_MAP = new Map();
export const IG_ACCOUNTS = parseAccounts();
export const STARTED_AT = new Date();

// Dashboard sozlamalarini database'dan qayta yuklash (env'dan ustun turadi)
export async function reloadSettings() {
  if (!state.DB_READY) return;
  try {
    state.SETTINGS = await getAllSettings();
  } catch (err) {
    console.error("⚠️ Sozlamalarni yuklashda xatolik:", err.message);
  }
}

export function workHoursOverrides() {
  const o = {};
  if (state.SETTINGS.work_hours_enabled != null)
    o.enabled = state.SETTINGS.work_hours_enabled === "true";
  if (state.SETTINGS.work_start != null) o.start = state.SETTINGS.work_start;
  if (state.SETTINGS.work_end != null) o.end = state.SETTINGS.work_end;
  return o;
}

export async function setupDatabase() {
  try {
    state.DB_READY = await initDb();
  } catch (err) {
    console.error("⚠️ Database sozlashda xatolik:", err.message);
    state.DB_READY = false;
  }

  // Asosiy (fallback) loyiha — ro'yxatda yo'q akkauntlar uchun
  if (state.DB_READY) {
    try {
      state.DEFAULT_PROJECT_ID = await getOrCreateProject("Elbek Eshmurodov Instagram");
      console.log(`✅ Asosiy loyiha tayyor (id: ${state.DEFAULT_PROJECT_ID}).`);
    } catch (err) {
      console.error("⚠️ Asosiy loyiha yaratishda xatolik:", err.message);
    }
  }

  // Har bir akkauntni loyiha sifatida ro'yxatga olib, tokenini eslab qolamiz
  for (const a of IG_ACCOUNTS) {
    if (!a?.id || !a?.token) {
      console.warn("⚠️ IG_ACCOUNTS elementida id yoki token yo'q — o'tkazamiz");
      continue;
    }
    let projectId = state.DEFAULT_PROJECT_ID;
    if (state.DB_READY) {
      try {
        projectId = await getOrCreateProject(a.name || `IG ${a.id}`, String(a.id), a.token);
      } catch (err) {
        console.error(`⚠️ Akkaunt loyihasini yaratishda xatolik (${a.id}):`, err.message);
      }
    }
    ACCOUNTS_MAP.set(String(a.id), { projectId, token: a.token, name: a.name });
  }

  // Database'da saqlangan akkauntlarni ham yuklaymiz (dashboard orqali
  // qo'shilganlar restart'dan keyin ham ishlashi uchun). Env ustuvor.
  if (state.DB_READY) {
    try {
      for (const p of await listAccountsWithTokens()) {
        const key = String(p.ig_account_id);
        if (!ACCOUNTS_MAP.has(key)) {
          ACCOUNTS_MAP.set(key, { projectId: p.id, token: p.access_token, name: p.name });
        }
      }
    } catch (err) {
      console.error("⚠️ DB akkauntlarini yuklashda xatolik:", err.message);
    }
  }

  if (ACCOUNTS_MAP.size > 0) {
    console.log(`✅ ${ACCOUNTS_MAP.size} ta Instagram akkaunt sozlandi (multi-account).`);
  } else {
    console.log("ℹ️ Ro'yxatda akkaunt yo'q — bitta akkaunt rejimida (IG_ACCESS_TOKEN).");
  }

  await reloadSettings();
  if (Object.keys(state.SETTINGS).length) {
    console.log(`⚙️ ${Object.keys(state.SETTINGS).length} ta sozlama database'dan yuklandi.`);
  }

  // 7.8: standart avto-teg qoidalari (faqat jadval bo'sh bo'lsa)
  if (state.DB_READY) {
    try {
      await seedDefaultTagRules();
    } catch (err) {
      console.error("⚠️ Standart teg qoidalarini qo'shishda xatolik:", err.message);
    }
  }
}

// entry.id bo'yicha to'g'ri akkauntni (loyiha + token) topish.
// Ro'yxatda bo'lmasa — asosiy loyiha va fallback token ishlatiladi.
export function resolveAccount(entryId) {
  const acct = ACCOUNTS_MAP.get(String(entryId));
  if (acct) {
    return { projectId: acct.projectId ?? state.DEFAULT_PROJECT_ID, token: acct.token };
  }
  return { projectId: state.DEFAULT_PROJECT_ID, token: IG_TOKEN };
}

// Yangi akkauntni ro'yxatga olish (dashboard "Yangi akkaunt qo'shish" uchun).
// DB'ga yozadi va xotira xaritasini darhol yangilaydi (restart shart emas).
export async function registerAccount({ name, igAccountId, token }) {
  let projectId = state.DEFAULT_PROJECT_ID;
  if (state.DB_READY) {
    projectId = await getOrCreateProject(
      name || `IG ${igAccountId}`,
      String(igAccountId),
      token
    );
  }
  ACCOUNTS_MAP.set(String(igAccountId), { projectId, token, name });
  return projectId;
}

// Route ichida: DB tayyor bo'lmasa 503 qaytarib false beradi
export function requireDb(req, res) {
  if (!state.DB_READY) {
    res.status(503).json({ error: "Database o'chiq" });
    return false;
  }
  return true;
}
