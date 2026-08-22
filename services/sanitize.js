// ============================================================
//  SERVICES/SANITIZE.JS — Instagram DM markdown'ni render qilmaydi:
//  **qalin** mijozga yulduzchalar bilan xom ko'rinardi (ROADMAP-18 FAZA 3).
//  Yuborishdan oldingi OXIRGI nuqtada chaqiriladi (instagram.js) — shunda
//  barcha yo'llar qamrab olinadi: AI javob, kalit so'z, flow, broadcast,
//  follow-up, komment javobi. Telegram'ga TEGILMAYDI — u markdown'ni
//  qo'llab-quvvatlaydi, matn o'z holicha ketadi.
// ============================================================

export function sanitizeForInstagram(text) {
  return String(text ?? "")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1") // ***qalin kursiv***
    .replace(/\*\*(.+?)\*\*/g, "$1") // **qalin**
    // *kursiv* — ehtiyotkor: "2*3*4" kabi matematik ifodalar buzilmaydi
    // (yulduzcha so'z chegarasida bo'lishi va ichki matn bo'shliq bilan
    //  boshlanmasligi/tugamasligi shart)
    .replace(/(?<!\S)\*(?!\s)(.+?)(?<!\s)\*(?!\S)/g, "$1")
    .replace(/(?<!\S)_(?!\s)(.+?)(?<!\s)_(?!\S)/g, "$1") // _kursiv_
    .replace(/`{1,3}(.+?)`{1,3}/gs, "$1") // `kod` va ```kod bloki```
    .replace(/^#{1,6}\s+/gm, "") // ## sarlavha
    .replace(/^\s*[-*+]\s+/gm, "• ") // ro'yxat → bullet
    .replace(/^\s*(\d+)\.\s+/gm, "$1. ") // raqamli ro'yxat qoladi (chekinishsiz)
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1: $2") // [matn](havola) → matn: havola
    .replace(/\n{3,}/g, "\n\n") // ortiqcha bo'sh qatorlar
    .trim();
}
