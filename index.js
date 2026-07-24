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

import { PORT } from "./config.js";
import { setupDatabase } from "./state.js";
import { recordError } from "./logger.js";
import { APP_VERSION } from "./templates.js";
import webhookRouter from "./routes/webhook.js";
import apiRouter from "./routes/api.js";
import { startBroadcastScheduler } from "./routes/api-broadcast.js";
import dashboardRouter from "./routes/dashboard.js";
import publicRouter from "./routes/public.js";

const APP = express();
APP.use(express.json());
// Statik fayllar (dizayn CSS/JS) — 1 kun keshlanadi, ?v= bilan yangilanadi
APP.use(express.static("public", { maxAge: "1d" }));

// ============================================================
//  MARSHRUTLAR
// ============================================================
APP.use(webhookRouter);
APP.use(apiRouter);
APP.use(dashboardRouter);
APP.use(publicRouter);

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
});
