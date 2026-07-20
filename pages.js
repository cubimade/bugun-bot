// ============================================================
//  PAGES.JS — HTML sahifalar (privacy, data-deletion, stats)
//  index.js ni toza saqlash uchun barcha HTML shu yerda.
// ============================================================

// HTML uchun xavfsiz matn (XSS oldini olish)
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Sanani o'zbekcha formatда
function fmt(d) {
  return d ? new Date(d).toLocaleString("uz-UZ") : "—";
}

// ------------------------------------------------------------
//  Maxfiylik siyosati (Meta publish uchun talab qiladi)
// ------------------------------------------------------------
export function renderPrivacyPage() {
  return `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maxfiylik siyosati — Bugun Bot</title>
  <style>
    body { font-family: -apple-system, Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #222; }
    h1 { color: #1a1a2e; } h2 { color: #16213e; margin-top: 28px; }
    .date { color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Maxfiylik siyosati</h1>
  <p class="date">Oxirgi yangilanish: 2026-yil 20-iyul</p>
  <p>Ushbu maxfiylik siyosati "Bugun Bot" (Elbek Eshmurodovning Instagram avtomatik javob berish xizmati) qanday ma'lumotlarni qayta ishlashini tushuntiradi.</p>
  <h2>1. Qanday ma'lumot yig'amiz</h2>
  <p>Bot faqat siz Instagram orqali yuborgan xabarlarni qabul qiladi va ularga javob berish uchun ishlatadi. Biz sizning ismingiz (Instagram foydalanuvchi identifikatori) va yuborgan xabaringiz matnini qayta ishlaymiz.</p>
  <h2>2. Ma'lumotdan qanday foydalanamiz</h2>
  <p>Sizning xabaringiz avtomatik javob tayyorlash uchun sun'iy intellekt xizmatiga yuboriladi. Javob tayyorlangach, Instagram orqali sizga qaytariladi. Biz ma'lumotlaringizni uchinchi shaxslarga sotmaymiz.</p>
  <h2>3. Ma'lumotni saqlash</h2>
  <p>Suhbat tarixi xizmat sifatini yaxshilash uchun xavfsiz saqlanadi. Istagan vaqtda o'chirishni so'rashingiz mumkin.</p>
  <h2>4. Ma'lumotni o'chirish</h2>
  <p>Ma'lumotlaringizni o'chirishni so'rash uchun quyidagi manzilga murojaat qiling: elbeshmurodov@gmail.com</p>
  <h2>5. Aloqa</h2>
  <p>Savollaringiz bo'lsa, biz bilan bog'laning: elbeshmurodov@gmail.com</p>
</body>
</html>
  `;
}

// ------------------------------------------------------------
//  Ma'lumotni o'chirish sahifasi
// ------------------------------------------------------------
export function renderDataDeletionPage() {
  return `
<!DOCTYPE html>
<html lang="uz">
<head><meta charset="UTF-8"><title>Ma'lumotni o'chirish — Bugun Bot</title>
<style>body { font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.7; }</style>
</head>
<body>
  <h1>Ma'lumotni o'chirish</h1>
  <p>Agar ma'lumotlaringizni (suhbat tarixi) o'chirishni istasangiz, quyidagi manzilga murojaat qiling:</p>
  <p><strong>elbeshmurodov@gmail.com</strong></p>
  <p>So'rovingiz 48 soat ichida ko'rib chiqiladi.</p>
</body>
</html>
  `;
}

// ------------------------------------------------------------
//  Statistika sahifasi
// ------------------------------------------------------------
export function renderStatsPage(stats) {
  const topRows = stats.topContacts
    .map(
      (c) => `
      <tr>
        <td>${esc(c.name || c.ig_user_id)}</td>
        <td style="text-align:center">${c.msg_count}</td>
        <td>${fmt(c.last_msg)}</td>
      </tr>`
    )
    .join("");

  const recentRows = stats.recent
    .map(
      (m) => `
      <tr>
        <td>${fmt(m.created_at)}</td>
        <td><span class="badge ${m.role}">${m.role === "user" ? "Mijoz" : "Bot"}</span></td>
        <td>${esc(m.name || m.ig_user_id)}</td>
        <td>${esc(m.text)}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statistika — Bugun Bot</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Arial, sans-serif; background: #0f0f1e; color: #e8e8f0; margin: 0; padding: 24px; }
    h1 { color: #fff; margin: 0 0 4px; }
    .sub { color: #888; font-size: 14px; margin-bottom: 24px; }
    .cards { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
    .card { background: linear-gradient(135deg, #1a1a2e, #23234a); border: 1px solid #2d2d55; border-radius: 14px; padding: 20px 28px; min-width: 160px; }
    .card .num { font-size: 40px; font-weight: 700; color: #7c8cff; }
    .card .label { color: #aaa; font-size: 14px; margin-top: 4px; }
    h2 { color: #fff; font-size: 18px; margin: 28px 0 12px; }
    table { width: 100%; border-collapse: collapse; background: #16162a; border-radius: 12px; overflow: hidden; }
    th, td { padding: 10px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid #26264a; }
    th { background: #1e1e3a; color: #bbb; font-weight: 600; }
    td { color: #ddd; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge.user { background: #2a4d69; color: #9cd; }
    .badge.assistant { background: #3d2a5a; color: #c9a; }
    .wrap { overflow-x: auto; }
    .empty { color: #777; padding: 16px; }
  </style>
</head>
<body>
  <h1>📊 Bugun Bot — Statistika</h1>
  <div class="sub">Yangilangan: ${fmt(new Date())}</div>

  <div class="cards">
    <div class="card"><div class="num">${stats.projects}</div><div class="label">Akkauntlar</div></div>
    <div class="card"><div class="num">${stats.contacts}</div><div class="label">Mijozlar</div></div>
    <div class="card"><div class="num">${stats.messages}</div><div class="label">Jami xabarlar</div></div>
  </div>

  <h2>🏆 Eng faol mijozlar</h2>
  <div class="wrap">
    <table>
      <thead><tr><th>Mijoz</th><th style="text-align:center">Xabarlar</th><th>Oxirgi faollik</th></tr></thead>
      <tbody>${topRows || `<tr><td colspan="3" class="empty">Hali mijozlar yo'q</td></tr>`}</tbody>
    </table>
  </div>

  <h2>💬 Oxirgi suhbatlar</h2>
  <div class="wrap">
    <table>
      <thead><tr><th>Vaqt</th><th>Kim</th><th>Mijoz</th><th>Xabar</th></tr></thead>
      <tbody>${recentRows || `<tr><td colspan="4" class="empty">Hali xabarlar yo'q</td></tr>`}</tbody>
    </table>
  </div>
</body>
</html>
  `;
}
