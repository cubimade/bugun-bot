// ============================================================
//  BUGUN-BOT — Instagram AI chat-bot (v3 — ko'p sahifali platforma)
//  Elbek Eshmurodov uchun | Claude API + PostgreSQL | Railway
//
//  Fayllar tuzilishi (ROADMAP-6 A da bo'lingan):
//    config.js            — sozlamalar, promptlar, env o'zgaruvchilar
//    claude.js            — AI javob mantiqi (Claude)
//    instagram.js         — Instagram'ga xabar/komment yuborish
//    db.js                — PostgreSQL (re-export, haqiqiy kod db/ papkada)
//    state.js             — umumiy server holati (DB, akkauntlar, sozlamalar)
//    middleware/auth.js   — Basic Auth
//    routes/webhook.js    — Instagram webhook (GET verify + POST)
//    routes/api.js        — /api/* (analitika va broadcast alohida faylda)
//    routes/dashboard.js  — /dashboard* sahifalari
//    routes/public.js     — /, /privacy, /data-deletion, /stats
//    templates.js         — dashboard sahifalari (re-export, kod templates/ da)
//    pages.js             — ommaviy sahifalar (privacy, data-deletion, stats)
//    public/              — statik fayllar (app.css, app.js)
//    index.js             — express sozlash, marshrutlarni ulash (shu fayl)
// ============================================================

import express from "express";
import compression from "compression";

import { PORT } from "./config.js";
import { setupDatabase } from "./state.js";
import { recordError } from "./logger.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { APP_VERSION } from "./templates.js";
import webhookRouter from "./routes/webhook.js";
import apiRouter from "./routes/api.js";
import { startBroadcastScheduler } from "./routes/api-broadcast.js";
import { startBackupScheduler } from "./services/backup.js";
import { startFollowupScheduler } from "./services/followup.js";
import dashboardRouter from "./routes/dashboard.js";
import publicRouter from "./routes/public.js";

const APP = express();
APP.use(compression()); // B5: gzip — HTML/JSON javoblar kichrayadi
// C2: rawBody — webhook imzosini (X-Hub-Signature-256) tekshirish uchun kerak
APP.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
// Statik fayllar (dizayn CSS/JS) — 1 kun keshlanadi, ?v= bilan yangilanadi
APP.use(express.static("public", { maxAge: "1d" }));

// ============================================================
//  MARSHRUTLAR (C1: rate limit bilan)
//  /webhook — Meta yuboradi (burst bo'lishi mumkin), /api — dashboard
// ============================================================
APP.use("/webhook", rateLimit({ max: 300, name: "webhook" }));
APP.use("/api", rateLimit({ max: 120, name: "api" }));
APP.use(webhookRouter);
APP.use(apiRouter);
APP.use(dashboardRouter);
APP.use(publicRouter);

// ============================================================
//  E5: 404 — topilmagan sahifa (barcha marshrutlardan keyin)
// ============================================================
APP.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Endpoint topilmadi" });
  }
  res.status(404).send(`<!DOCTYPE html>
<html lang="uz" data-theme="dark"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>404 — Bugun Bot</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/app.css">
<script>(function(){var t;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark"){t="dark"}document.documentElement.setAttribute("data-theme",t)})()</script>
</head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh">
<div class="card" style="text-align:center;padding:48px 40px;max-width:420px">
  <div style="font-size:56px;margin-bottom:12px">🤖❓</div>
  <h1 style="font-size:26px;margin-bottom:8px">404 — Sahifa topilmadi</h1>
  <p class="muted" style="margin-bottom:22px">Bunday manzil yo'q yoki ko'chirilgan bo'lishi mumkin.</p>
  <a class="btn btn-primary" href="/dashboard">← Boshqaruv paneliga qaytish</a>
</div></body></html>`);
});

// ============================================================
//  MARKAZLASHTIRILGAN XATO BOSHQARUVI
// ============================================================
// Express marshrutlaridagi kutilmagan xatolar shu yerga tushadi.
APP.use((err, req, res, next) => {
  recordError("route", err);
  if (!res.headersSent) {
    res.status(500).send("<h1>Xatolik</h1><p>Ichki xatolik yuz berdi.</p>");
  }
});

// Butun jarayon darajasidagi ushlanmagan xatolar — server o'chib qolmasin.
process.on("unhandledRejection", (reason) => {
  recordError("unhandledRejection", reason);
});
process.on("uncaughtException", (err) => {
  recordError("uncaughtException", err);
});

// ============================================================
//  SERVERNI ISHGA TUSHIRISH
// ============================================================
APP.listen(PORT, async () => {
  console.log(`🚀 Bugun-bot ${PORT}-portda ishga tushdi! (v${APP_VERSION} — ko'p sahifali platforma)`);
  await setupDatabase();
  startBroadcastScheduler();
  startBackupScheduler(); // F1: kunlik JSON zaxira (oxirgi 7 kun)
  startFollowupScheduler(); // 7.5: jim qolgan mijozga eslatma (soatlik)
});
