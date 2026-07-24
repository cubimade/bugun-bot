// templates/bookings.js — 10.1: Bron / navbat sahifasi
// Sozlamalar (akkaunt bo'yicha) + bronlar ro'yxati + qo'lda qo'shish
import { renderLayout } from "./layout.js";
import { ICONS } from "./components.js";

export function renderBookingsPage() {
  const content = `
  <div class="card" style="margin-bottom:14px">
    <h3 style="margin-bottom:4px">⚙️ Bron sozlamalari</h3>
    <p class="small muted" style="margin-bottom:14px">Yoqilsa — mijoz "bron", "navbat", "qachon kelay" desa bot bo'sh vaqtlarni tugma qilib yuboradi, mijoz tanlaydi va tasdiqlaydi. 1 kun oldin avtomatik eslatma boradi.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:12px" class="bk-cols">
      <div><label class="lbl">Akkaunt</label>
        <select class="input" id="bkProject" onchange="loadBkSettings()"></select></div>
      <div><label class="lbl">Holat</label>
        <div style="display:flex;align-items:center;gap:10px;padding-top:8px">
          <label class="switch"><input type="checkbox" id="bkActive"><span class="slider"></span></label>
          <span class="small">Bron yoqilgan</span>
        </div></div>
      <div><label class="lbl">Seans (daqiqa)</label>
        <input class="input" id="bkDur" type="number" min="10" max="480" value="60"></div>
      <div><label class="lbl">Tanaffus (daqiqa)</label>
        <input class="input" id="bkBreak" type="number" min="0" max="120" value="0"></div>
      <div><label class="lbl">Boshlanishi (soat)</label>
        <select class="input" id="bkStart">${Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
      <div><label class="lbl">Tugashi (soat)</label>
        <select class="input" id="bkEnd">${Array.from({ length: 24 }, (_, h) => `<option value="${h + 1}">${String(h + 1).padStart(2, "0")}:00</option>`).join("")}</select></div>
      <div><label class="lbl">Necha kun oldindan</label>
        <input class="input" id="bkAhead" type="number" min="1" max="60" value="7"></div>
    </div>
    <label class="lbl">Ish kunlari</label>
    <div id="bkDays" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px"></div>
    <button class="btn btn-primary" onclick="saveBkSettings(this)">${ICONS.check} Saqlash</button>
  </div>

  <div class="card">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <h3 style="flex:1">📅 Bronlar</h3>
      <div class="seg" id="bkFilter">
        <button class="on" data-f="upcoming">Kelgusi</button>
        <button data-f="all">Hammasi</button>
      </div>
      <button class="btn btn-sm btn-primary" onclick="addBookingModal()">➕ Qo'lda bron</button>
    </div>
    <div id="bkList"><div class="skeleton" style="height:60px;margin-bottom:8px"></div><div class="skeleton" style="height:60px"></div></div>
  </div>
  <style>@media (max-width:640px){ .bk-cols { grid-template-columns:1fr 1fr !important; } }</style>`;

  const script = `
const DAY_LABELS = { 1: "Du", 2: "Se", 3: "Chor", 4: "Pay", 5: "Ju", 6: "Shan", 7: "Yak" };
let PROJECTS = [], BOOKINGS = [], BK_DAYS = [1,2,3,4,5,6], BK_FILTER = "upcoming", CONTACTS_CACHE = null;
const STATUS_META = {
  pending:   { label: "⏳ Kutilmoqda", cls: "b-amber" },
  confirmed: { label: "✅ Tasdiqlangan", cls: "b-green" },
  cancelled: { label: "❌ Bekor", cls: "b-red" },
  done:      { label: "🏁 Bo'ldi", cls: "b-gray" },
};
function fmtL(d) {
  return new Date(d).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
async function init() {
  try {
    const p = await api("/api/projects");
    PROJECTS = (p.projects || []);
    $("bkProject").innerHTML = PROJECTS.map(function (x) {
      return '<option value="' + x.id + '">' + esc(x.name) + "</option>";
    }).join("");
    await loadBkSettings();
    await loadBookings();
  } catch (e) { toast("Yuklashda xatolik: " + e.message, false); }
}
function renderDays() {
  $("bkDays").innerHTML = [1,2,3,4,5,6,7].map(function (d) {
    return '<button class="chip ' + (BK_DAYS.includes(d) ? "on" : "") + '" onclick="toggleDay(' + d + ')">' + DAY_LABELS[d] + "</button>";
  }).join("");
}
function toggleDay(d) {
  BK_DAYS = BK_DAYS.includes(d) ? BK_DAYS.filter(function (x) { return x !== d; }) : BK_DAYS.concat(d);
  renderDays();
}
async function loadBkSettings() {
  try {
    const { settings: s } = await api("/api/booking-settings/" + $("bkProject").value);
    $("bkActive").checked = Boolean(s.is_active);
    $("bkDur").value = s.slot_duration_min;
    $("bkBreak").value = s.break_between_min;
    $("bkStart").value = String(s.work_start);
    $("bkEnd").value = String(s.work_end);
    $("bkAhead").value = s.max_days_ahead;
    BK_DAYS = Array.isArray(s.work_days) ? s.work_days : [1,2,3,4,5,6];
    renderDays();
  } catch (e) { toast("Sozlamalar yuklanmadi: " + e.message, false); }
}
async function saveBkSettings(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/booking-settings/" + $("bkProject").value, {
      is_active: $("bkActive").checked,
      work_days: BK_DAYS,
      work_start: Number($("bkStart").value),
      work_end: Number($("bkEnd").value),
      slot_duration_min: Number($("bkDur").value),
      break_between_min: Number($("bkBreak").value),
      max_days_ahead: Number($("bkAhead").value),
    });
    toast("Bron sozlamalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
document.querySelectorAll("#bkFilter button").forEach(function (b) {
  b.onclick = function () {
    document.querySelectorAll("#bkFilter button").forEach(function (x) { x.classList.remove("on"); });
    b.classList.add("on");
    BK_FILTER = b.dataset.f;
    renderBookings();
  };
});
async function loadBookings() {
  try {
    const r = await api("/api/bookings");
    BOOKINGS = r.bookings || [];
    renderBookings();
  } catch (e) { $("bkList").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message); }
}
function renderBookings() {
  let items = BOOKINGS;
  if (BK_FILTER === "upcoming") {
    items = items.filter(function (b) {
      return new Date(b.starts_at) > new Date() && (b.status === "pending" || b.status === "confirmed");
    }).sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
  }
  if (!items.length) {
    $("bkList").innerHTML = emptyState("📅", BK_FILTER === "upcoming" ? "Kelgusi bron yo'q" : "Hali bron yo'q");
    return;
  }
  $("bkList").innerHTML = items.map(function (b) {
    const st = STATUS_META[b.status] || STATUS_META.pending;
    return '<div class="card" style="padding:11px 13px;margin-bottom:8px">' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<strong style="min-width:110px">🕐 ' + fmtL(b.starts_at) + "</strong>" +
        '<span class="badge ' + st.cls + '">' + st.label + "</span>" +
        '<span class="small" style="flex:1;min-width:0">' +
          (b.contact_id ? '<a href="/dashboard/inbox?contact=' + b.contact_id + '" style="color:var(--accent-soft)">' + esc(b.contact_name || b.ig_user_id || "mijoz") + "</a>" : '<span class="muted">' + esc(b.note || "qo\\'lda") + "</span>") +
          (b.service_name ? ' · <span class="muted">' + esc(b.service_name) + "</span>" : "") +
          ' · <span class="muted">' + b.duration_min + " daq · " + esc(b.project_name || "") + "</span>" +
        "</span>" +
        '<span style="display:flex;gap:5px">' +
          (b.status !== "confirmed" && b.status !== "done" ? '<button class="btn btn-sm" onclick="setBk(' + b.id + ',\\'confirmed\\')" title="Tasdiqlash">✅</button>' : "") +
          (b.status !== "done" && b.status !== "cancelled" ? '<button class="btn btn-sm" onclick="setBk(' + b.id + ',\\'done\\')" title="Bo\\'ldi">🏁</button>' : "") +
          (b.status !== "cancelled" ? '<button class="btn btn-sm" onclick="setBk(' + b.id + ',\\'cancelled\\')" title="Bekor qilish">❌</button>' : "") +
        "</span>" +
      "</div></div>";
  }).join("");
}
async function setBk(id, status) {
  try {
    await postJson("/api/bookings/" + id + "/status", { status });
    const b = BOOKINGS.find(function (x) { return x.id === id; });
    if (b) b.status = status;
    renderBookings();
    toast("Holat o'zgardi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function addBookingModal() {
  if (!CONTACTS_CACHE) {
    try { CONTACTS_CACHE = (await api("/api/contacts?limit=100")).contacts || []; } catch (e) { CONTACTS_CACHE = []; }
  }
  openModal("➕ Qo'lda bron", '' +
    '<label class="lbl">Akkaunt</label>' +
    '<select class="input" id="nbProject" style="margin-bottom:10px">' + PROJECTS.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + "</option>"; }).join("") + "</select>" +
    '<label class="lbl">Mijoz (ixtiyoriy)</label>' +
    '<select class="input" id="nbContact" style="margin-bottom:10px"><option value="">— tanlanmagan —</option>' +
      CONTACTS_CACHE.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name || c.ig_user_id) + "</option>"; }).join("") + "</select>" +
    '<label class="lbl">Sana va vaqt</label>' +
    '<input type="datetime-local" class="input" id="nbAt" style="margin-bottom:10px;color-scheme:dark">' +
    '<label class="lbl">Xizmat / izoh (ixtiyoriy)</label>' +
    '<input class="input" id="nbService" maxlength="120" style="margin-bottom:14px" placeholder="Masalan: konsultatsiya">' +
    '<div style="display:flex;gap:10px;justify-content:flex-end">' +
      '<button class="btn" onclick="closeModal()">Bekor</button>' +
      '<button class="btn btn-primary" onclick="createBooking()">Qo\\'shish</button></div>');
}
async function createBooking() {
  const at = $("nbAt").value;
  if (!at) return toast("Sana va vaqtni kiriting", false);
  try {
    await postJson("/api/bookings", {
      project_id: $("nbProject").value,
      contact_id: $("nbContact").value || null,
      starts_at: new Date(at).toISOString(),
      service_name: $("nbService").value.trim(),
      note: $("nbContact").value ? "" : "qo'lda kiritilgan",
    });
    closeModal(); toast("Bron qo'shildi ✓");
    loadBookings();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
init();`;

  return renderLayout({
    title: "Bronlar",
    active: "bookings",
    headerAction: "",
    content,
    script,
  });
}
