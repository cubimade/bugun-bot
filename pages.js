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
//  Dashboard (boshqaruv paneli) — bir sahifали ilova (Tailwind CDN)
//  Ma'lumotlar /api/* endpointlaridan JS orqali olinadi.
// ------------------------------------------------------------
export function renderDashboardPage() {
  return `<!DOCTYPE html>
<html lang="uz" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boshqaruv paneli — Bugun Bot</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">
  <div class="max-w-6xl mx-auto p-5">
    <header class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold">🤖 Bugun Bot — Boshqaruv paneli</h1>
        <p class="text-slate-400 text-sm mt-1">Instagram AI avtomatik javob tizimi</p>
      </div>
      <a href="/stats" class="text-indigo-400 text-sm hover:underline">Statistika →</a>
    </header>

    <!-- Statistika kartalari -->
    <div id="cards" class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10"></div>

    <!-- Ulangan akkauntlar -->
    <section class="mb-10">
      <h2 class="text-lg font-semibold mb-3">👥 Ulangan akkauntlar</h2>
      <div id="accounts" class="space-y-3 text-slate-400 text-sm">Yuklanmoqda…</div>
    </section>

    <!-- Oxirgi suhbatlar -->
    <section>
      <h2 class="text-lg font-semibold mb-3">💬 Oxirgi suhbatlar</h2>
      <div id="conversations" class="space-y-2 text-slate-400 text-sm">Yuklanmoqda…</div>
    </section>
  </div>

  <!-- Modal (bilim bazasi / suhbat uchun) -->
  <div id="modal" class="fixed inset-0 bg-black/60 hidden items-center justify-center p-4 z-50">
    <div class="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-700">
      <div class="flex items-center justify-between p-4 border-b border-slate-700">
        <h3 id="modalTitle" class="font-semibold"></h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-white text-xl leading-none">✕</button>
      </div>
      <div id="modalBody" class="p-4 overflow-y-auto"></div>
    </div>
  </div>

  <script>
    const $ = (id) => document.getElementById(id);
    const esc = (s) => { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; };
    const fmt = (d) => d ? new Date(d).toLocaleString("uz-UZ") : "—";

    async function api(path, opts) {
      const r = await fetch(path, opts);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }

    function card(num, label) {
      return \`<div class="bg-gradient-to-br from-slate-800 to-slate-700/60 border border-slate-700 rounded-xl p-5">
        <div class="text-3xl font-bold text-indigo-400">\${num}</div>
        <div class="text-slate-400 text-sm mt-1">\${label}</div></div>\`;
    }

    async function loadStats() {
      try {
        const s = await api("/api/stats");
        $("cards").innerHTML = card(s.projects, "Akkauntlar") + card(s.contacts, "Mijozlar") + card(s.messages, "Jami xabarlar");
      } catch (e) { $("cards").innerHTML = '<div class="text-slate-500">Statistika yuklanmadi</div>'; }
    }

    async function loadAccounts() {
      try {
        const { projects } = await api("/api/projects");
        if (!projects.length) { $("accounts").textContent = "Hali akkaunt yo'q"; return; }
        $("accounts").innerHTML = projects.map((p) => \`
          <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <div class="font-medium text-slate-100">\${esc(p.name)}</div>
              <div class="text-xs text-slate-500 mt-0.5">ID: \${esc(p.ig_account_id || "—")} · \${p.contacts} mijoz · \${p.messages} xabar
                \${p.knowledge_base ? '· <span class="text-emerald-400">bilim bazasi bor</span>' : '· <span class="text-slate-500">bilim bazasi bo\\'sh</span>'}</div>
            </div>
            <button onclick="editKnowledge(\${p.id}, '\${esc(p.name).replace(/'/g, "&#39;")}')"
              class="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg">Bilim bazasi</button>
          </div>\`).join("");
      } catch (e) { $("accounts").textContent = "Akkauntlar yuklanmadi"; }
    }

    async function loadConversations() {
      try {
        const { contacts } = await api("/api/contacts");
        if (!contacts.length) { $("conversations").textContent = "Hali suhbat yo'q"; return; }
        $("conversations").innerHTML = contacts.map((c) => \`
          <div onclick="viewConversation(\${c.id})"
            class="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-indigo-500">
            <div class="min-w-0">
              <div class="font-medium text-slate-100 truncate">\${esc(c.name || c.ig_user_id)}
                <span class="text-xs text-slate-500 font-normal">· \${esc(c.project_name)}</span></div>
              <div class="text-xs text-slate-500 truncate mt-0.5">\${esc(c.last_text || "")}</div>
            </div>
            <div class="text-xs text-slate-500 shrink-0 text-right">\${c.msg_count} xabar<br>\${fmt(c.last_seen)}</div>
          </div>\`).join("");
      } catch (e) { $("conversations").textContent = "Suhbatlar yuklanmadi"; }
    }

    function openModal(title) { $("modalTitle").textContent = title; $("modal").classList.remove("hidden"); $("modal").classList.add("flex"); }
    function closeModal() { $("modal").classList.add("hidden"); $("modal").classList.remove("flex"); }

    async function editKnowledge(projectId, name) {
      openModal("Bilim bazasi — " + name);
      $("modalBody").innerHTML = '<div class="text-slate-400">Yuklanmoqda…</div>';
      try {
        const { knowledge } = await api("/api/knowledge/" + projectId);
        $("modalBody").innerHTML = \`
          <p class="text-sm text-slate-400 mb-2">Biznes nomi, xizmatlar, narxlar, aloqa, ish vaqti, FAQ — bot shu ma'lumotdan foydalanadi.</p>
          <textarea id="kbText" rows="12" class="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"></textarea>
          <div class="flex items-center gap-3 mt-3">
            <button onclick="saveKnowledge(\${projectId})" class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg">Saqlash</button>
            <span id="kbStatus" class="text-sm text-slate-400"></span>
          </div>\`;
        $("kbText").value = knowledge || "";
      } catch (e) { $("modalBody").innerHTML = '<div class="text-red-400">Yuklashda xatolik</div>'; }
    }

    async function saveKnowledge(projectId) {
      $("kbStatus").textContent = "Saqlanmoqda…";
      try {
        await api("/api/knowledge/" + projectId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ knowledge: $("kbText").value }),
        });
        $("kbStatus").textContent = "✅ Saqlandi";
        loadAccounts();
      } catch (e) { $("kbStatus").textContent = "❌ Xatolik"; }
    }

    async function viewConversation(contactId) {
      openModal("Suhbat");
      $("modalBody").innerHTML = '<div class="text-slate-400">Yuklanmoqda…</div>';
      try {
        const { contact, messages } = await api("/api/conversation/" + contactId);
        $("modalTitle").textContent = "Suhbat — " + (contact?.name || contact?.ig_user_id || "");
        if (!messages.length) { $("modalBody").innerHTML = '<div class="text-slate-400">Xabarlar yo\\'q</div>'; return; }
        $("modalBody").innerHTML = messages.map((m) => {
          const me = m.role === "assistant";
          return \`<div class="flex \${me ? "justify-end" : "justify-start"} mb-2">
            <div class="max-w-[80%] rounded-2xl px-3 py-2 text-sm \${me ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-100"}">
              \${esc(m.text)}<div class="text-[10px] opacity-60 mt-1">\${fmt(m.created_at)}</div>
            </div></div>\`;
        }).join("");
      } catch (e) { $("modalBody").innerHTML = '<div class="text-red-400">Yuklashda xatolik</div>'; }
    }

    $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });

    loadStats(); loadAccounts(); loadConversations();
  </script>
</body>
</html>`;
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
