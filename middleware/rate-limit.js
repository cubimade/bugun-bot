// ============================================================
//  MIDDLEWARE/RATE-LIMIT.JS — oddiy IP bo'yicha so'rov cheklovi
//  (ROADMAP-6 C1) Kutubxonasiz: Map + oynali hisoblagich.
// ============================================================
const buckets = new Map();

export function rateLimit({ windowMs = 60 * 1000, max = 60, name = "api" } = {}) {
  return (req, res, next) => {
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.ip ||
      "nomalum";
    const key = name + ":" + ip;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now - b.start >= windowMs) {
      b = { start: now, n: 0 };
      buckets.set(key, b);
    }
    b.n++;
    if (b.n > max) {
      if (b.n === max + 1) {
        console.warn(`🚦 Rate limit (${name}): ${ip} — daqiqasiga ${max} dan oshdi`);
      }
      return res.status(429).json({ error: "Juda ko'p so'rov — birozdan keyin urinib ko'ring" });
    }
    next();
  };
}

// Eski yozuvlarni tozalash — xotira o'smasin
const cleaner = setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now - b.start > 2 * 60 * 1000) buckets.delete(k);
  }
}, 60 * 1000);
if (cleaner.unref) cleaner.unref();
