// ============================================================
//  SERVICES/BOOKING.JS — 10.1: bron mantiqi
//  Bo'sh slotlarni hisoblash (Asia/Tashkent, UTC+5) va eslatma.
// ============================================================
import { TZ_OFFSET } from "../config.js";
import { state, ACCOUNTS_MAP } from "../state.js";
import { IG_TOKEN } from "../config.js";
import { senderFor } from "./channels.js";
import {
  getBookingSettings,
  listActiveBookings,
  claimReminderBookings,
  saveMessage,
} from "../db.js";

const TZ_MS = TZ_OFFSET * 3600 * 1000;

// Mahalliy (UTC+5) ko'rinishda formatlash
export function fmtLocal(date) {
  const d = new Date(new Date(date).getTime() + TZ_MS);
  const days = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dd}.${mm} (${days[d.getUTCDay()]}) ${hh}:${mi}`;
}

// Bo'sh slotlar — eng yaqin `count` tasi
export async function computeFreeSlots(projectId, count = 6) {
  const s = await getBookingSettings(projectId);
  if (!s || !s.is_active) return null;

  const busy = (await listActiveBookings(projectId)).map((b) => ({
    start: new Date(b.starts_at).getTime(),
    end: new Date(b.starts_at).getTime() + b.duration_min * 60000,
  }));

  const workDays = Array.isArray(s.work_days) ? s.work_days : [1, 2, 3, 4, 5, 6];
  const step = (s.slot_duration_min + s.break_between_min) * 60000;
  const durMs = s.slot_duration_min * 60000;
  const minLead = Date.now() + 2 * 3600 * 1000; // kamida 2 soat oldindan

  const slots = [];
  for (let day = 0; day <= s.max_days_ahead && slots.length < count; day++) {
    // Mahalliy kun boshlanishi
    const localNow = new Date(Date.now() + TZ_MS);
    const dayStart = Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate() + day
    );
    const d = new Date(dayStart);
    const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // 1=Dush..7=Yak
    if (!workDays.includes(weekday)) continue;

    for (let h = s.work_start; slots.length < count; ) {
      const slotLocal = dayStart + h * 3600 * 1000;
      const slotUtc = slotLocal - TZ_MS;
      const endLocalH = (slotLocal - dayStart + durMs) / 3600000;
      if (endLocalH > s.work_end) break;
      if (slotUtc >= minLead) {
        const conflict = busy.some((b) => slotUtc < b.end && slotUtc + durMs > b.start);
        if (!conflict) slots.push(new Date(slotUtc));
      }
      h += step / 3600000;
    }
  }
  return { settings: s, slots };
}

// Mijoz "bron" so'zlarini yozdimi
const BOOKING_WORDS = [
  "bron", "band qil", "band qilmoqchi", "yozilmoqchi", "yoziling", "navbat",
  "qachon kelay", "qabulga", "uchrashuv", "vaqt band", "запис", "бронь",
];
export function asksBooking(text) {
  const t = String(text || "").toLowerCase();
  return BOOKING_WORDS.some((w) => t.includes(w));
}

const CANCEL_WORDS = ["bekor qil", "bekor qilaman", "kelolmayman", "kela olmayman", "отмен"];
export function asksCancelBooking(text) {
  const t = String(text || "").toLowerCase();
  return CANCEL_WORDS.some((w) => t.includes(w));
}

// Bilim bazasidan manzil qatorini topish (tasdiq xabari uchun)
export function extractAddress(knowledge) {
  const m = String(knowledge || "").match(/manzil\s*:?\s*(.+)/i);
  return m ? m[1].trim().slice(0, 150) : null;
}

// ------------------------------------------------------------
//  Eslatma scheduler — 1 kun oldin (20-28 soat oynasi), soatiga bir
// ------------------------------------------------------------
export async function runBookingReminderPass() {
  if (!state.DB_READY) return;
  try {
    const due = await claimReminderBookings();
    for (const b of due) {
      const token =
        b.access_token || ACCOUNTS_MAP.get(String(b.ig_account_id || ""))?.token || IG_TOKEN;
      if (!token) continue;
      const msg = `Eslatma: ertaga ${fmtLocal(b.starts_at)} da${b.service_name ? ` "${b.service_name}" uchun` : ""} bron qilingansiz. Kutamiz! 😊 Kela olmasangiz, "bekor qilaman" deb yozing.`;
      try {
        const r = await senderFor(b.platform || "instagram", token).text(b.ig_user_id, msg);
        if (r.ok && b.contact_id) {
          await saveMessage(b.contact_id, "assistant", msg, false, "booking");
        }
        console.log(`📅 Bron eslatmasi yuborildi (bron #${b.id})`);
      } catch (err) {
        console.error(`⚠️ Bron eslatmasi xatoligi (#${b.id}):`, err.message);
      }
      await new Promise((ok) => setTimeout(ok, 300));
    }
  } catch (err) {
    console.error("⚠️ Bron eslatma scheduler xatoligi:", err.message);
  }
}

export function startBookingScheduler() {
  setTimeout(runBookingReminderPass, 3 * 60 * 1000);
  const t = setInterval(runBookingReminderPass, 60 * 60 * 1000);
  if (t.unref) t.unref();
}
