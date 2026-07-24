// templates/broadcast.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";

// ============================================================
//  4. BROADCAST — /dashboard/broadcast
//  Forma + oldindan ko'rish + 24 soat ogohlantirishi + progress + tarix
// ============================================================
export function renderBroadcastPage() {
  const content = `
  <div class="card" style="display:flex;gap:12px;align-items:flex-start;border-color:rgba(245,158,11,.45);background:rgba(245,158,11,.06);margin-bottom:18px">
    <span style="font-size:20px">⚠️</span>
    <div>
      <strong style="color:#fbbf24">Instagram 24 soat qoidasi</strong>
      <div class="small muted" style="margin-top:2px">Xabar faqat oxirgi 24 soat ichida sizga yozgan mijozlarga yuboriladi. Boshqalarga Instagram ruxsat bermaydi.</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px" class="two-col">
    <div class="card">
      <h3 style="margin-bottom:14px">📢 Yangi broadcast</h3>
      <label class="lbl">Akkaunt</label>
      <select class="input" id="account" onchange="updateCount()" style="margin-bottom:12px"></select>
      <label class="lbl">Auditoriya</label>
      <select class="input" id="audience" onchange="updateCount()" style="margin-bottom:12px">
        <option value="">Hammasi (24 soat ichida yozganlar)</option>
      </select>
      <label class="lbl">Xabar matni</label>
      <textarea class="input" id="message" rows="5" maxlength="900" placeholder="Salom! Sizga maxsus taklifimiz bor..." oninput="updatePreview()"></textarea>
      <div class="small muted" style="text-align:right;margin:4px 0 14px"><span id="charCount">0</span>/900</div>
      <label class="lbl">Qachon yuborilsin?</label>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <select class="input" id="whenSel" style="width:auto" onchange="toggleSchedule()">
          <option value="now">Hozir yuborish</option>
          <option value="later">🗓 Rejalashtirish</option>
        </select>
        <input type="datetime-local" class="input" id="schedAt" style="display:none;width:auto;color-scheme:dark">
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" id="sendBtn" onclick="confirmSend()">${ICONS.broadcast} Yuborish</button>
        <span class="small muted" id="countInfo"></span>
      </div>
      <div id="progressWrap" style="display:none;margin-top:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px" class="small">
          <span id="progressLabel">Yuborilmoqda...</span><span id="progressNums"></span>
        </div>
        <div style="height:10px;background:var(--panel2);border-radius:999px;overflow:hidden">
          <div id="progressBar" style="height:100%;width:0%;background:var(--grad);border-radius:999px;transition:width .4s"></div>
        </div>
        <div id="progressResult" class="small" style="margin-top:8px"></div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <h3 style="margin-bottom:12px">👁 Oldindan ko'rish</h3>
        <div style="background:var(--bg);border-radius:12px;padding:16px;min-height:90px;display:flex;justify-content:flex-end">
          <div id="preview" style="max-width:85%;padding:9px 13px;border-radius:16px;border-bottom-right-radius:5px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:14px;white-space:pre-wrap;word-break:break-word;box-shadow:0 4px 14px rgba(99,102,241,.25)">
            <span class="muted" style="color:rgba(255,255,255,.65)">Xabar matni shu yerda ko'rinadi...</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">🕓 Oldingi broadcastlar</h3>
        <div id="history"><div class="skeleton" style="height:48px"></div></div>
      </div>
    </div>
  </div>
  <style>@media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } }</style>`;

  const script = `
let PROJECTS = [];
async function loadData() {
  try {
    const [p, t] = await Promise.all([api("/api/projects"), api("/api/tags")]);
    PROJECTS = p.projects;
    $("account").innerHTML = PROJECTS.length
      ? PROJECTS.map((x) => \`<option value="\${x.id}">\${esc(x.name)}</option>\`).join("")
      : '<option value="">Akkaunt yo\\'q</option>';
    $("audience").innerHTML = '<option value="">Hammasi (24 soat ichida yozganlar)</option>' +
      (t.tags || []).map((x) => \`<option value="\${esc(x)}">🏷 Teg: \${esc(x)}</option>\`).join("");
    updateCount();
  } catch (e) { toast("Yuklashda xatolik: " + e.message, false); }
  loadHistory();
}
async function loadHistory() {
  try {
    const { broadcasts } = await api("/api/broadcasts");
    if (!broadcasts.length) { $("history").innerHTML = emptyState("📢", "Hali broadcast yo'q"); return; }
    $("history").innerHTML = broadcasts.map((b) => \`
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <strong class="small">\${esc(b.project_name || "—")}</strong>
          <span class="small muted">\${b.status === "scheduled" ? "" : timeAgo(b.created_at)}</span>
        </div>
        <div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:3px 0">\${esc(b.message)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <span class="badge b-gray">\${esc(b.audience)}</span>
          \${broadcastStatus(b)}
        </div>
      </div>\`).join("");
  } catch (e) { $("history").innerHTML = emptyState("📢", "Tarix yuklanmadi"); }
}
function broadcastStatus(b) {
  if (b.status === "scheduled") {
    return \`<span class="badge b-cyan">🗓 \${fmt(b.scheduled_at)}</span>
      <button class="btn btn-sm btn-danger" style="padding:2px 9px;font-size:11px" onclick="cancelScheduled(\${b.id})">Bekor qilish</button>\`;
  }
  if (b.status === "sending") return '<span class="badge b-amber">⏳ yuborilmoqda...</span>';
  if (b.status === "failed") return '<span class="badge b-red">✕ xato</span>';
  return \`<span class="badge b-green">✓ \${b.sent}/\${b.total}</span>\` +
    (b.failed ? \` <span class="badge b-red">✕ \${b.failed}</span>\` : "");
}
async function cancelScheduled(id) {
  try {
    await api("/api/broadcasts/" + id, { method: "DELETE" });
    toast("Rejalashtirilgan broadcast bekor qilindi");
    loadHistory();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function toggleSchedule() {
  const later = $("whenSel").value === "later";
  $("schedAt").style.display = later ? "" : "none";
  if (later && !$("schedAt").value) {
    // Standart: 1 soat keyin (lokal vaqt, datetime-local formatida)
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const p = (n) => String(n).padStart(2, "0");
    $("schedAt").value = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  $("sendBtn").innerHTML = later ? "🗓 Rejalashtirish" : "Yuborish";
}
let COUNT = 0;
async function updateCount() {
  const pid = $("account").value;
  if (!pid) { $("countInfo").textContent = ""; return; }
  $("countInfo").innerHTML = '<span class="spinner" style="width:13px;height:13px"></span> hisoblanmoqda...';
  try {
    const tag = $("audience").value;
    const { count } = await api("/api/broadcast/recipients?projectId=" + pid + (tag ? "&tag=" + encodeURIComponent(tag) : ""));
    COUNT = count;
    $("countInfo").innerHTML = count
      ? \`<strong style="color:#4ade80">\${count} ta mijozga</strong> yuboriladi\`
      : '<span style="color:var(--warn)">Hozircha mos mijoz yo\\'q (24 soat qoidasi)</span>';
  } catch (e) { $("countInfo").textContent = ""; }
}
function updatePreview() {
  const v = $("message").value;
  $("charCount").textContent = v.length;
  $("preview").innerHTML = v ? esc(v) : '<span style="color:rgba(255,255,255,.65)">Xabar matni shu yerda ko\\'rinadi...</span>';
}
function confirmSend() {
  const msg = $("message").value.trim();
  if (!$("account").value) return toast("Akkaunt tanlang", false);
  if (!msg) return toast("Xabar matnini yozing", false);
  const later = $("whenSel").value === "later";
  if (later) {
    const v = $("schedAt").value;
    if (!v) return toast("Sana va vaqtni tanlang", false);
    const when = new Date(v);
    if (isNaN(when.getTime()) || when.getTime() < Date.now() + 60 * 1000) {
      return toast("Vaqt kamida 1 daqiqa kelajakda bo'lishi kerak", false);
    }
    openModal("Rejalashtirishni tasdiqlash", \`
      <p style="margin-bottom:8px"><strong>\${fmt(when)}</strong> da yuboriladi — o'sha paytda 24 soat qoidasiga mos mijozlarga:</p>
      <div style="background:var(--panel2);border-radius:12px;padding:12px;margin-bottom:16px;white-space:pre-wrap;font-size:13px">\${esc(msg)}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn" onclick="closeModal()">Bekor qilish</button>
        <button class="btn btn-primary" onclick="closeModal();doSend()">🗓 Rejalashtirish</button>
      </div>\`);
    return;
  }
  if (!COUNT) return toast("Yuborish uchun mijoz yo'q (24 soat qoidasi)", false);
  openModal("Tasdiqlash", \`
    <p style="margin-bottom:8px"><strong>\${COUNT} ta mijozga</strong> quyidagi xabar yuboriladi:</p>
    <div style="background:var(--panel2);border-radius:12px;padding:12px;margin-bottom:16px;white-space:pre-wrap;font-size:13px">\${esc(msg)}</div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Bekor qilish</button>
      <button class="btn btn-primary" onclick="closeModal();doSend()">Ha, yuborish</button>
    </div>\`);
}
async function doSend() {
  const btn = $("sendBtn");
  const later = $("whenSel").value === "later";
  btn.disabled = true;

  // Rejalashtirish: server o'zi vaqtida yuboradi, progress kerak emas
  if (later) {
    try {
      const r = await postJson("/api/broadcast", {
        projectId: Number($("account").value),
        tag: $("audience").value || null,
        message: $("message").value.trim(),
        scheduledAt: new Date($("schedAt").value).toISOString(),
      });
      toast("Broadcast rejalashtirildi 🗓 " + fmt(r.scheduledAt));
      $("message").value = ""; updatePreview();
      loadHistory();
    } catch (e) { toast("Xatolik: " + e.message, false); }
    btn.disabled = false;
    return;
  }

  $("progressWrap").style.display = "";
  $("progressResult").textContent = "";
  $("progressBar").style.width = "0%";
  $("progressLabel").textContent = "Yuborilmoqda...";
  try {
    const { jobId, total } = await postJson("/api/broadcast", {
      projectId: Number($("account").value),
      tag: $("audience").value || null,
      message: $("message").value.trim(),
    });
    $("progressNums").textContent = "0/" + total;
    const timer = setInterval(async () => {
      try {
        const j = await api("/api/broadcast/status/" + jobId);
        const donePct = Math.round(((j.sent + j.failed) / j.total) * 100);
        $("progressBar").style.width = donePct + "%";
        $("progressNums").textContent = (j.sent + j.failed) + "/" + j.total;
        if (j.done) {
          clearInterval(timer);
          $("progressLabel").textContent = "Tugadi ✓";
          $("progressResult").innerHTML =
            \`<span style="color:#4ade80">✓ \${j.sent} ta yuborildi</span>\` +
            (j.failed ? \` · <span style="color:#f87171">✕ \${j.failed} ta xato</span>\` : "");
          toast("Broadcast tugadi: " + j.sent + "/" + j.total + " yuborildi ✓");
          btn.disabled = false;
          $("message").value = ""; updatePreview();
          loadHistory(); updateCount();
        }
      } catch (e) { clearInterval(timer); btn.disabled = false; }
    }, 1000);
  } catch (e) {
    toast("Xatolik: " + e.message, false);
    $("progressWrap").style.display = "none";
    btn.disabled = false;
  }
}
loadData();`;

  return renderLayout({
    title: "Broadcast",
    active: "broadcast",
    headerAction: "",
    content,
    script,
  });
}
