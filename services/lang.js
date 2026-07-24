// ============================================================
//  SERVICES/LANG.JS — 9.3: mijoz tilini aniqlash (uz / ru / en)
//  AI'siz, tez heuristika: alifbo + keng tarqalgan so'zlar.
//  Aniqlanmasa null qaytadi (til o'zgartirilmaydi).
// ============================================================

// O'zbek kirillchasiga xos harflar (rus alifbosida yo'q)
const UZ_CYRILLIC = /[ўқғҳ]/i;

const UZ_WORDS = [
  "salom", "assalomu", "rahmat", "qancha", "narxi", "narx", "kerak", "bormi",
  "qanday", "uchun", "haqida", "iltimos", "mumkinmi", "qachon", "yaxshi",
  "va", "bilan", "ham", "sizda", "olsam", "buyurtma", "to'lov", "yetkazib",
];
const RU_WORDS = [
  "привет", "здравствуйте", "сколько", "цена", "стоит", "можно", "как",
  "когда", "спасибо", "пожалуйста", "есть", "нужно", "хочу", "заказ",
  "доставка", "оплата", "что", "это", "для", "вы",
];
const EN_WORDS = [
  "hello", "hi", "price", "how", "much", "what", "when", "can", "you",
  "thanks", "thank", "need", "want", "order", "delivery", "payment",
  "the", "is", "do", "please",
];

function countWords(text, words) {
  let n = 0;
  for (const w of words) {
    if (new RegExp(`(^|[^a-zа-яё'])${w}([^a-zа-яё']|$)`, "i").test(text)) n++;
  }
  return n;
}

// null = ishonchli aniqlanmadi (tilni o'zgartirmaymiz)
export function detectLanguage(text) {
  const t = String(text || "").toLowerCase().trim();
  if (t.length < 2) return null;

  const cyr = (t.match(/[а-яёўқғҳ]/gi) || []).length;
  const lat = (t.match(/[a-z]/gi) || []).length;
  const total = cyr + lat;
  if (!total) return null;

  // Kirill ustun: o'zbek kirillchasi belgilari bo'lsa — uz, aks holda ru
  if (cyr / total > 0.6) {
    if (UZ_CYRILLIC.test(t)) return "uz";
    // Rus so'zlari tasdiqlasa — ru; bo'lmasa ham kirill ko'pincha ru
    return countWords(t, UZ_WORDS) > countWords(t, RU_WORDS) ? "uz" : "ru";
  }

  // Lotin ustun: so'z lug'atlari bo'yicha
  const uzScore = countWords(t, UZ_WORDS) + (/[o'g']/.test(t) && /(o'|g')/.test(t) ? 1 : 0);
  const enScore = countWords(t, EN_WORDS);
  if (uzScore === 0 && enScore === 0) return null; // aniqlanmadi
  return uzScore >= enScore ? "uz" : "en";
}

export const LANG_LABELS = { uz: "O'zbek", ru: "Русский", en: "English" };
export const LANG_FLAGS = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

// System promptga qo'shimcha ko'rsatma
export function languageInstruction(lang) {
  if (lang === "ru") {
    return "\n\nMUHIM: Mijoz RUS tilida yozmoqda — javobni to'liq RUS TILIDA ber. Bilim bazasi o'zbekcha bo'lsa, ma'lumotni rus tiliga tarjima qilib yetkaz.";
  }
  if (lang === "en") {
    return "\n\nIMPORTANT: The customer writes in ENGLISH — reply fully in ENGLISH. If the knowledge base is in Uzbek, translate the information to English.";
  }
  return "";
}
