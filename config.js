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

// --- Claude modellari ---
export const MODEL_HAIKU = "claude-haiku-4-5-20251001"; // arzon, tez — oddiy savollar
export const MODEL_SONNET = "claude-sonnet-5"; // aqlliroq — murakkab savollar

// Oddiy savolga Haiku, murakkabga Sonnet tanlaydi (arzon + aqlli muvozanat).
export function pickModel(text) {
  const t = String(text || "");
  if (t.length > 220) return MODEL_SONNET;
  const hints = [
    "nega",
    "qanday qilib",
    "farqi",
    "taqqosla",
    "tushuntir",
    "batafsil",
    "strategiya",
    "muammo",
    "maslahat",
  ];
  const low = t.toLowerCase();
  return hints.some((h) => low.includes(h)) ? MODEL_SONNET : MODEL_HAIKU;
}

// --- "Odam kerak" (jonli operator) aniqlash ---
const HUMAN_KEYWORDS = [
  "odam bilan",
  "operator",
  "menejer",
  "menejyer",
  "jonli",
  "human",
  "qo'ng'iroq",
  "telefon",
  "murojaat qilaman",
];
export function needsHuman(text) {
  const t = String(text || "").toLowerCase();
  return HUMAN_KEYWORDS.some((k) => t.includes(k));
}

// --- Ish vaqti (O'zbekiston, UTC+5) ---
export const WORK_HOURS_ENABLED = (process.env.WORK_HOURS_ENABLED ?? "false") === "true";
export const WORK_START = Number(process.env.WORK_START ?? 9);
export const WORK_END = Number(process.env.WORK_END ?? 21);
export const TZ_OFFSET = Number(process.env.TZ_OFFSET ?? 5);
export const OFF_HOURS_MESSAGE =
  process.env.OFF_HOURS_MESSAGE ??
  "Rahmat, xabaringiz qabul qilindi! 🙏 Hozir ish vaqtimiz tugagan — ish vaqtida (ertaga) albatta javob beramiz. 😊";

export function isWithinWorkHours(date = new Date()) {
  if (!WORK_HOURS_ENABLED) return true;
  const local = new Date(date.getTime() + TZ_OFFSET * 3600 * 1000);
  const h = local.getUTCHours();
  if (WORK_START <= WORK_END) return h >= WORK_START && h < WORK_END;
  return h >= WORK_START || h < WORK_END; // tungi smena (masalan 22–06)
}

// --- Rate limiting (spam himoyasi) ---
export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 8);
export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000);

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

// ============================================================
//  BILIM BAZASI — akkauntga xos biznes ma'lumotini promptga qo'shish
//  (Bosqich 2). Agar bilim bazasi bo'sh bo'lsa — umumiy prompt.
// ============================================================
function withKnowledge(basePrompt, knowledge) {
  if (!knowledge || !knowledge.trim()) return basePrompt;
  return `${basePrompt}

--- BIZNES MA'LUMOTI (shu akkaunt uchun, undan foydalanib javob ber) ---
${knowledge.trim()}
--- MA'LUMOT TUGADI ---
Agar savolga javob yuqoridagi ma'lumotda bo'lsa, aniq va ishonchli ayt.
Ma'lumotda yo'q narsani o'ylab topma — halol ayt va bog'lanishni taklif qil.`;
}

export function buildSystemPrompt(knowledge) {
  return withKnowledge(SYSTEM_PROMPT, knowledge);
}

export function buildCommentSystemPrompt(knowledge) {
  return withKnowledge(COMMENT_SYSTEM_PROMPT, knowledge);
}
