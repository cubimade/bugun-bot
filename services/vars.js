// ============================================================
//  SERVICES/VARS.JS — {ism} shablon o'zgaruvchisi (ROADMAP-18 FAZA 7.4)
//  Muammo: ism yo'q bo'lsa "Salom {ism}!" → "Salom do'st!" yoki undan
//  yomoni raqamli IGSID ("Salom 300784!") ketardi. Endi:
//   - haqiqiy ism bo'lsa — o'rniga qo'yiladi
//   - ism yo'q/raqamli bo'lsa — {ism} atrofidagi vergul/bo'shliq bilan
//     birga olib tashlanadi: "Salom, {ism}!" → "Salom!"
// ============================================================

// Raqamli "ism" — bu IGSID placeholder, haqiqiy ism emas
export function validName(raw) {
  const name = String(raw || "").trim();
  return name && !/^\d+$/.test(name) ? name : null;
}

export function applyNameVar(message, rawName) {
  const msg = String(message ?? "");
  const name = validName(rawName);
  if (name) return msg.replaceAll("{ism}", name);
  return msg
    .replace(/[ \t]*,?[ \t]*\{ism\}/g, "") // "Salom, {ism}!" → "Salom!"
    .replace(/^[ \t]*,[ \t]*/gm, "")       // "{ism}, salom" → "salom" (bosh vergul)
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
