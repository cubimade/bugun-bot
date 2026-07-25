// ============================================================
//  ROUTES/AUTH.JS — 12.1: kirish sahifasi va sessiya endpointlari
//  GET  /login      — login formasi (ochiq)
//  POST /api/login  — email+parol YOKI faqat eski DASHBOARD_PASSWORD
//  POST /api/logout — sessiyani o'chirish
//  GET  /api/me     — joriy foydalanuvchi (rol, nav uchun)
// ============================================================
import express from "express";
import crypto from "crypto";

import { protect, parseCookies, invalidateSessionCache } from "../middleware/auth.js";
import { state, requireDb } from "../state.js";
import {
  verifyUserLogin,
  createSession,
  deleteSession,
  ensureOwnerUser,
  logAudit,
} from "../db.js";
import { APP_VERSION } from "../templates.js";

const router = express.Router();

const OWNER_EMAIL = "elbeshmurodov@gmail.com";

function setSessionCookie(res, sid, days) {
  const maxAge = days * 24 * 3600;
  res.setHeader(
    "Set-Cookie",
    `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "development" ? "" : "; Secure"}`
  );
}

router.get("/login", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="uz" data-theme="dark"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kirish — Bugun Bot</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/app.min.css?v=${APP_VERSION}">
<script>(function(){var t;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark"){t="dark"}document.documentElement.setAttribute("data-theme",t)})()</script>
</head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px">
<div class="card glow" style="width:100%;max-width:380px;padding:32px 28px">
  <div style="text-align:center;margin-bottom:22px">
    <div style="font-size:40px;margin-bottom:8px">🤖</div>
    <h1 style="font-size:22px" class="grad-text">BUGUN BOT</h1>
    <p class="small muted" style="margin-top:4px">Boshqaruv paneliga kirish</p>
  </div>
  <label class="lbl">Email (jamoa a'zolari uchun)</label>
  <input class="input" id="email" type="email" autocomplete="username" placeholder="siz@misol.uz — yoki bo'sh qoldiring" style="margin-bottom:12px">
  <label class="lbl">Parol</label>
  <input class="input" id="password" type="password" autocomplete="current-password" placeholder="Parol" style="margin-bottom:12px"
    onkeydown="if(event.key==='Enter')doLogin()">
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:16px" class="small">
    <input type="checkbox" id="remember" checked> Meni eslab qol (30 kun)
  </label>
  <button class="btn btn-primary" id="loginBtn" style="width:100%;justify-content:center" onclick="doLogin()">Kirish →</button>
  <div id="err" class="small" style="color:var(--danger);margin-top:12px;text-align:center;display:none"></div>
  <p class="small muted" style="margin-top:16px;text-align:center;line-height:1.6">Asosiy parol bilan kirsangiz — email shart emas.</p>
</div>
<script>
async function doLogin() {
  const btn = document.getElementById("loginBtn");
  const err = document.getElementById("err");
  err.style.display = "none";
  btn.disabled = true; btn.textContent = "Tekshirilmoqda...";
  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value,
        remember: document.getElementById("remember").checked,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Kirish xatosi");
    location.href = d.redirect || "/dashboard";
  } catch (e) {
    err.textContent = e.message;
    err.style.display = "";
    btn.disabled = false; btn.textContent = "Kirish →";
  }
}
</script></body></html>`);
});

// Parolni doimiy vaqtda solishtirish — javob tezligidan parolni topib
// bo'lmasin (timing attack himoyasi)
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

router.post("/api/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    const remember = Boolean(req.body?.remember);
    if (!password) return res.status(400).json({ error: "Parolni kiriting" });

    const dashPass = process.env.DASHBOARD_PASSWORD;
    let user = null;

    // 1) Jamoa a'zosi: email + parol (DB'da bo'lsa)
    if (state.DB_READY && email) {
      user = await verifyUserLogin(email, password);
    }

    // 2) LEGACY: asosiy DASHBOARD_PASSWORD (email'siz ham) — owner sifatida.
    //    Bu yo'l HAR DOIM ochiq qoladi (migratsiya kafolati).
    if (!user && dashPass && safeEqual(password, dashPass)) {
      if (state.DB_READY) {
        await ensureOwnerUser(OWNER_EMAIL, dashPass).catch(() => {});
        user = await verifyUserLogin(OWNER_EMAIL, password);
      }
      if (!user) {
        // DB o'chiq bo'lsa ham kirish ishlaydi — cookie'siz, Basic kabi emas,
        // lekin sahifalar protect'da legacy Basic bilan ochiladi. Bu holatda
        // faqat DB tiklanganda sessiya beriladi.
        return res.status(503).json({ error: "Database hozircha ulanmagan — birozdan keyin urinib ko'ring yoki Basic Auth (brauzer so'rovi) dan foydalaning" });
      }
    }

    if (!user) {
      return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
    }
    if (!requireDb(req, res)) return;

    const sid = await createSession(user.id, remember ? 30 : 7);
    setSessionCookie(res, sid, remember ? 30 : 7);
    logAudit(user.email || user.name, "login", `rol: ${user.role}`).catch(() => {});
    console.log(`🔓 Kirish: ${user.email} (${user.role})`);
    res.json({ ok: true, redirect: user.role === "operator" ? "/dashboard/inbox" : "/dashboard" });
  } catch (err) {
    next(err);
  }
});

router.post("/api/logout", async (req, res) => {
  const sid = parseCookies(req).sid;
  if (sid) {
    invalidateSessionCache(sid);
    if (state.DB_READY) await deleteSession(sid).catch(() => {});
  }
  res.setHeader("Set-Cookie", "sid=; Path=/; HttpOnly; Max-Age=0");
  res.json({ ok: true });
});

// GET /logout — havola orqali chiqish
router.get("/logout", async (req, res) => {
  const sid = parseCookies(req).sid;
  if (sid) {
    invalidateSessionCache(sid);
    if (state.DB_READY) await deleteSession(sid).catch(() => {});
  }
  res.setHeader("Set-Cookie", "sid=; Path=/; HttpOnly; Max-Age=0");
  res.redirect("/login");
});

// Joriy foydalanuvchi — klient nav'ni rolga qarab ko'rsatadi
router.get("/api/me", protect, (req, res) => {
  const u = req.user || {};
  res.json({
    user: {
      id: u.id || null,
      email: u.email || null,
      name: u.name || "Owner",
      role: u.role || "owner",
      legacy: Boolean(u.legacy),
      projectIds: u.project_ids || [],
    },
  });
});

export default router;
