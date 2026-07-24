// ============================================================
//  MIDDLEWARE/AUTH.JS — 12.1: sessiya + rollar (owner/admin/operator)
//
//  MUHIM (buzilmasin!): eski DASHBOARD_PASSWORD bilan kirish HAR DOIM
//  ishlaydi — ikki yo'l bilan:
//   1) Basic Auth header (curl/skriptlar, eski xatti-harakat)
//   2) /login formasi (email'siz, faqat parol) — owner sifatida kiradi
//  Sessiya cookie faqat QO'SHIMCHA qulaylik — fallback o'chirilmagan.
// ============================================================
import { state } from "../state.js";

// Sessiya keshi (60s) — har so'rovda DB'ga bormaslik uchun
const SESSION_CACHE = new Map(); // sid -> { at, user }
const CACHE_TTL = 60 * 1000;

export function parseCookies(req) {
  const out = {};
  const raw = req.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Sessiya keshi tozalash (logout yoki foydalanuvchi o'zgarganda)
export function invalidateSessionCache(sid) {
  if (sid) SESSION_CACHE.delete(sid);
  else SESSION_CACHE.clear();
}

async function sessionUser(sid) {
  if (!sid || !state.DB_READY) return null;
  const hit = SESSION_CACHE.get(sid);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.user;
  try {
    const { getSessionUser } = await import("../db.js");
    const user = await getSessionUser(sid);
    SESSION_CACHE.set(sid, { at: Date.now(), user });
    return user;
  } catch {
    return null;
  }
}

// Operator faqat Inbox va Kontaktlar bilan ishlaydi
const OPERATOR_ALLOW = [
  /^\/dashboard\/inbox/,
  /^\/dashboard\/contacts/,
  /^\/api\/contacts/,
  /^\/api\/conversation/,
  /^\/api\/reply/,
  /^\/api\/reply-media/,
  /^\/api\/tags/,
  /^\/api\/saved-replies/,
  /^\/api\/notifications/,
  /^\/api\/search/,
  /^\/api\/media$/,
  /^\/api\/me/,
  /^\/api\/messages\/\d+\/rate/,
  /^\/api\/internal-notes/,
  /^\/api\/users\/list-brief/,
];

function authorize(req, res, next) {
  const u = req.user;
  if (u.role === "operator") {
    const p = (req.originalUrl || req.url).split("?")[0];
    if (p === "/dashboard" || p === "/dashboard/") return res.redirect("/dashboard/inbox");
    if (!OPERATOR_ALLOW.some((rx) => rx.test(p))) {
      if (p.startsWith("/api/")) {
        return res.status(403).json({ error: "Ruxsat yo'q (operator roli)" });
      }
      return res.redirect("/dashboard/inbox");
    }
  }
  return next();
}

export async function protect(req, res, next) {
  try {
    // 1) Sessiya cookie (12.1)
    const sid = parseCookies(req).sid;
    if (sid) {
      const user = await sessionUser(sid);
      if (user) {
        req.user = user;
        return authorize(req, res, next);
      }
    }

    // 2) LEGACY: DASHBOARD_PASSWORD — Basic Auth (HAR DOIM ishlaydi!)
    const pass = process.env.DASHBOARD_PASSWORD;
    if (!pass) {
      // Parol o'rnatilmagan — ochiq (eski xatti-harakat saqlanadi)
      req.user = { role: "owner", legacy: true, name: "Owner" };
      return next();
    }
    const hdr = req.get("authorization") || "";
    const [scheme, encoded] = hdr.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString();
      const pwd = decoded.slice(decoded.indexOf(":") + 1);
      if (pwd === pass) {
        req.user = { role: "owner", legacy: true, name: "Owner" };
        return authorize(req, res, next);
      }
    }

    // 3) Kirish yo'q: API → 401 JSON, sahifa → login formasi
    if ((req.originalUrl || req.url).startsWith("/api/")) {
      return res.status(401).json({ error: "Kirish kerak — /login" });
    }
    return res.redirect("/login");
  } catch (err) {
    // Auth tizimida kutilmagan xato — xavfsiz fallback: eski Basic Auth talab
    console.error("⚠️ Auth xatoligi:", err.message);
    res.set("WWW-Authenticate", 'Basic realm="Bugun Bot Dashboard"');
    return res.status(401).send("Ruxsat yo'q — parol kerak");
  }
}

// Rol talab qiluvchi middleware (masalan faqat owner)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Kirish kerak" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Ruxsat yo'q (${roles.join("/")} kerak)` });
    }
    next();
  };
}
