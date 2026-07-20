// ============================================================
//  CONFIG.JS — Barcha sozlamalar va muhit o'zgaruvchilari
//  Maxfiy qiymatlar (token, kalit) faqat process.env orqali o'qiladi,
//  hech qachon kodda yozilmaydi.
// ============================================================

// --- Server ---
export const PORT = process.env.PORT || 3000;

// --- Maxfiy kalitlar (faqat env) ---
export const IG_TOKEN = process.env.IG_ACCESS_TOKEN; // asosiy (fallback) token
export const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
export const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// --- Claude modeli ---
export const MODEL_HAIKU = "claude-haiku-4-5-20251001";

// --- Xulq sozlamalari ---
// Komment yozgan odamga avtomatik DM yuborish (ManyChat uslubi).
// Railway'da AUTO_DM_ON_COMMENT=false qilib o'chirsa bo'ladi.
export const AUTO_DM_ON_COMMENT =
  (process.env.AUTO_DM_ON_COMMENT ?? "true") !== "false";

// --- Ko'p akkaunt (multi-account) ro'yxati ---
// IG_ACCOUNTS env — JSON massiv:
//   [{"id":"1784...A","name":"Asosiy","token":"IGAA..."}, ...]
// "id" — akkauntning Instagram biznes IDsi (webhook'dagi entry.id).
export function parseAccounts() {
  try {
    if (process.env.IG_ACCOUNTS) return JSON.parse(process.env.IG_ACCOUNTS);
  } catch (err) {
    console.error("⚠️ IG_ACCOUNTS JSON o'qishda xatolik:", err.message);
  }
  return [];
}

// ============================================================
//  BOTNING "AQLI" — system promptlar
// ============================================================

// DM (shaxsiy suhbat) uchun asosiy prompt.
// {KNOWLEDGE} — akkauntning bilim bazasi qo'shiladigan joy (Bosqich 2).
export const SYSTEM_PROMPT = `Sen Elbek Eshmurodovning Instagram sahifasi uchun yordamchi assistentisan.
Elbek — shaxsiy brend va kontent-marketing bo'yicha mutaxassis.

Qanday javob berasan:
- Faqat o'zbek tilida (lotin alifbosida) yoz
- Do'stona, samimiy, lekin professional bo'l
- Odamlarga hurmat bilan murojaat qil ("siz")
- Qisqa va aniq javob ber (2-4 gap yetarli)
- Agar savol Elbek yoki uning xizmatlari haqida bo'lsa, yordam ber
- Agar biror narsani bilmasang, halol ayt va Elbek bilan bog'lanishni taklif qil
- Emoji'lardan me'yorida foydalanish mumkin

Sen mijoz bilan birinchi aloqadasan — iliq va yordamga tayyor bo'l.`;

// Kommentlarga javob uchun alohida, qisqaroq prompt.
export const COMMENT_SYSTEM_PROMPT = `Sen Elbek Eshmurodovning Instagram postlaridagi kommentlarga javob beruvchi assistentsan.
Qoidalar:
- Faqat o'zbek tilida (lotin alifbosida) yoz.
- JUDA qisqa javob ber — 1 gap, ko'pi bilan 2 gap.
- Iliq, do'stona, samimiy ohang. 1-2 ta emoji ishlatsa bo'ladi.
- Kommentga mos tabiiy javob yoz: minnatdorchilik, qisqa javob yoki savol bo'lsa DM'ga taklif.
- Reklama qilma, ortiqcha uzun yozma.`;
