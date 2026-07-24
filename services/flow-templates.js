// ============================================================
//  SERVICES/FLOW-TEMPLATES.JS — 8.4: tayyor flow shablonlari
//  Har shablon: meta + nodes (ref bilan) + edges. Bir bosishda yaratiladi.
// ============================================================
import { insertFlow, saveFlowGraph } from "../db.js";

// Har shablon: name, description, emoji, triggerType, triggerValue,
// nodes: [{ref, type, config, x, y}], edges: [{from, to, label}]
export const FLOW_TEMPLATES = {
  greeting_menu: {
    name: "Salomlashish + menyu",
    description: "Yangi mijozga: salom + 3 tugma (Narxlar / Xizmatlar / Bog'lanish)",
    emoji: "👋",
    triggerType: "new_contact",
    nodes: [
      { ref: "start", type: "buttons", x: 60, y: 140, config: { text: "Assalomu alaykum, {ism}! 👋 Bizga xush kelibsiz. Sizga qanday yordam bera olamiz?", buttons: ["Narxlar", "Xizmatlar", "Bog'lanish"] } },
      { ref: "price", type: "message", x: 380, y: 20, config: { text: "Narxlarimiz haqida to'liq ma'lumot: (shu yerga narxlaringizni yozing) 💰" } },
      { ref: "services", type: "message", x: 380, y: 160, config: { text: "Bizning xizmatlarimiz: (shu yerga xizmatlaringizni yozing) ✨" } },
      { ref: "contact", type: "message", x: 380, y: 300, config: { text: "Bog'lanish uchun: telefon raqamingizni qoldiring — menejerimiz tez orada aloqaga chiqadi 📞" } },
      { ref: "handoff", type: "action", x: 700, y: 300, config: { action: "handoff" } },
    ],
    edges: [
      { from: "start", to: "price", label: "Narxlar" },
      { from: "start", to: "services", label: "Xizmatlar" },
      { from: "start", to: "contact", label: "Bog'lanish" },
      { from: "contact", to: "handoff", label: null },
    ],
  },

  price_inquiry: {
    name: "Narx so'rovi",
    description: "\"NARX\" deb yozganga: qaysi xizmat? → tugmalar → narx + bog'lanish",
    emoji: "💰",
    triggerType: "keyword",
    triggerValue: "narx, narxi, qancha, price",
    nodes: [
      { ref: "ask", type: "buttons", x: 60, y: 140, config: { text: "Qaysi xizmat qiziqtirdi? 😊", buttons: ["Xizmat 1", "Xizmat 2", "Xizmat 3"] } },
      { ref: "p1", type: "buttons", x: 380, y: 20, config: { text: "Xizmat 1 narxi: ... so'm. Batafsil ma'lumot kerakmi?", buttons: ["Bog'lanish"] } },
      { ref: "p2", type: "buttons", x: 380, y: 160, config: { text: "Xizmat 2 narxi: ... so'm. Batafsil ma'lumot kerakmi?", buttons: ["Bog'lanish"] } },
      { ref: "p3", type: "buttons", x: 380, y: 300, config: { text: "Xizmat 3 narxi: ... so'm. Batafsil ma'lumot kerakmi?", buttons: ["Bog'lanish"] } },
      { ref: "tag", type: "action", x: 700, y: 140, config: { action: "add_tag", value: "qiziqqan" } },
      { ref: "contact", type: "message", x: 700, y: 260, config: { text: "Ajoyib! Telefon raqamingizni yozib qoldiring — menejerimiz bog'lanadi 📞" } },
      { ref: "handoff", type: "action", x: 1000, y: 260, config: { action: "handoff" } },
    ],
    edges: [
      { from: "ask", to: "p1", label: "Xizmat 1" },
      { from: "ask", to: "p2", label: "Xizmat 2" },
      { from: "ask", to: "p3", label: "Xizmat 3" },
      { from: "p1", to: "tag", label: "Bog'lanish" },
      { from: "p2", to: "tag", label: "Bog'lanish" },
      { from: "p3", to: "tag", label: "Bog'lanish" },
      { from: "tag", to: "contact", label: null },
      { from: "contact", to: "handoff", label: null },
    ],
  },

  lead_collect: {
    name: "Lead yig'ish",
    description: "Savol-javob: qiziqish → telefon so'rash → operatorga uzatish",
    emoji: "📋",
    triggerType: "keyword",
    triggerValue: "ariza, yozilish, ro'yxat, konsultatsiya",
    nodes: [
      { ref: "hello", type: "message", x: 60, y: 140, config: { text: "Rahmat, {ism}! Sizga mos taklif tayyorlashimiz uchun bir-ikki savol beramiz 😊" } },
      { ref: "need", type: "buttons", x: 380, y: 140, config: { text: "Sizga nima muhimroq?", buttons: ["Tezlik", "Sifat", "Narx"] } },
      { ref: "phone", type: "message", x: 700, y: 140, config: { text: "Tushunarli! Endi telefon raqamingizni yozib qoldiring — mutaxassisimiz siz bilan bog'lanadi 📞" } },
      { ref: "tag", type: "action", x: 1020, y: 80, config: { action: "add_tag", value: "lead" } },
      { ref: "handoff", type: "action", x: 1020, y: 220, config: { action: "handoff" } },
    ],
    edges: [
      { from: "hello", to: "need", label: null },
      { from: "need", to: "phone", label: "Tezlik" },
      { from: "need", to: "phone", label: "Sifat" },
      { from: "need", to: "phone", label: "Narx" },
      { from: "phone", to: "tag", label: null },
      { from: "tag", to: "handoff", label: null },
    ],
  },

  story_offer: {
    name: "Story javobi — maxsus taklif",
    description: "Story'ga javob berganlarga minnatdorchilik + maxsus taklif",
    emoji: "📸",
    triggerType: "story",
    nodes: [
      { ref: "thanks", type: "message", x: 60, y: 140, config: { text: "Story'imga javob berganingiz uchun rahmat, {ism}! 🙌" } },
      { ref: "offer", type: "buttons", x: 380, y: 140, config: { text: "Sizga maxsus taklifimiz bor — faqat story ko'rganlar uchun! 🎁 Qiziqtiradimi?", buttons: ["Ha, qiziq!", "Yo'q, rahmat"] } },
      { ref: "yes", type: "message", x: 700, y: 60, config: { text: "Zo'r! Taklif: (shu yerga taklifingizni yozing). Batafsil uchun telefon raqamingizni qoldiring 📞" } },
      { ref: "tag", type: "action", x: 1020, y: 60, config: { action: "add_tag", value: "issiq" } },
      { ref: "no", type: "message", x: 700, y: 240, config: { text: "Yaxshi, bemalol! Savollaringiz bo'lsa — bemalol yozing 😊" } },
    ],
    edges: [
      { from: "thanks", to: "offer", label: null },
      { from: "offer", to: "yes", label: "Ha, qiziq!" },
      { from: "offer", to: "no", label: "Yo'q, rahmat" },
      { from: "yes", to: "tag", label: null },
    ],
  },

  winback: {
    name: "Qaytarish (win-back)",
    description: "Javob bergach jim qolganlarga kutish + chegirma taklifi",
    emoji: "🔄",
    triggerType: "keyword",
    triggerValue: "o'ylab ko'raman, keyin yozaman, hozir emas",
    nodes: [
      { ref: "ok", type: "message", x: 60, y: 140, config: { text: "Albatta, {ism}! Bemalol o'ylab ko'ring 😊" } },
      { ref: "wait", type: "delay", x: 380, y: 140, config: { amount: 20, unit: "soat" } },
      { ref: "offer", type: "buttons", x: 700, y: 140, config: { text: "{ism}, yaxshi yangilik! 🎉 Bugun murojaat qilsangiz — maxsus chegirma beramiz. Qiziqtiradimi?", buttons: ["Ha, batafsil", "Yo'q"] } },
      { ref: "yes", type: "message", x: 1020, y: 60, config: { text: "Ajoyib! Telefon raqamingizni yozing — menejerimiz chegirma bilan bog'lanadi 📞" } },
      { ref: "handoff", type: "action", x: 1340, y: 60, config: { action: "handoff" } },
      { ref: "no", type: "message", x: 1020, y: 240, config: { text: "Tushunarli! Xohlagan payt yozing — doim yordamga tayyormiz 🙌" } },
    ],
    edges: [
      { from: "ok", to: "wait", label: null },
      { from: "wait", to: "offer", label: null },
      { from: "offer", to: "yes", label: "Ha, batafsil" },
      { from: "offer", to: "no", label: "Yo'q" },
      { from: "yes", to: "handoff", label: null },
    ],
  },
};

export async function createFlowFromTemplate(key, projectId = null) {
  const t = FLOW_TEMPLATES[key];
  if (!t) throw new Error("Shablon topilmadi");
  const id = await insertFlow({
    projectId,
    name: t.name,
    triggerType: t.triggerType,
    triggerValue: t.triggerValue || null,
  });
  await saveFlowGraph(id, t.nodes, t.edges);
  return id;
}
