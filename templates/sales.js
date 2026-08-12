// templates/sales.js — 10.2-10.5: Sotuv vositalari sahifasi
// To'lov havolalari + to'lovlar ro'yxati, promo-kodlar, referral, kalkulyator
import { renderLayout } from "./layout.js";
import { ICONS } from "./components.js";

export function renderSalesPage() {
  const content = `
  <div style="display:grid;gap:14px;max-width:860px">

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.card} To'lov usullari</h3>
      <p class="small muted" style="margin-bottom:14px">Havolalarni kiriting — mijoz "to'lov" desa yoki siz inbox'dan to'lov havolasi tugmasi bossangiz, bot shu havolalarni yuboradi. Karta ma'lumotlari platformada SAQLANMAYDI.</p>
      <div style="display:grid;gap:10px;margin-bottom:14px">
        <div><label class="lbl">Click havolasi</label><input class="input" id="payClick" maxlength="300" placeholder="https://my.click.uz/..."></div>
        <div><label class="lbl">Payme havolasi</label><input class="input" id="payPayme" maxlength="300" placeholder="https://payme.uz/..."></div>
        <div><label class="lbl">Uzum havolasi</label><input class="input" id="payUzum" maxlength="300" placeholder="https://uzum.uz/..."></div>
      </div>
      <button class="btn-secondary" onclick="savePayLinks(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:12px;display:flex;align-items:center;gap:8px">${ICONS.receipt} To'lovlar</h3>
      <div id="payList"><div class="skeleton" style="height:50px"></div></div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.tag} Promo-kodlar</h3>
      <p class="small muted" style="margin-bottom:12px">Mijoz kodni yozsa — bot tekshiradi va tasdiqlaydi. Flow'dagi "Chegirma kodi berish" amali avtomatik kod yaratadi.</p>
      <div style="display:grid;grid-template-columns:1fr 90px 90px 130px auto;gap:8px;margin-bottom:12px" class="pr-cols">
        <input class="input" id="prCode" maxlength="20" placeholder="KOD (masalan: YOZ25)">
        <input class="input" id="prPct" type="number" min="1" max="99" placeholder="%">
        <input class="input" id="prUses" type="number" min="1" value="10" title="Necha marta ishlatiladi">
        <input class="input" id="prUntil" type="date" title="Amal qilish muddati" style="color-scheme:dark">
        <button class="btn-secondary" onclick="addPromo(this)" title="Promo-kod qo'shish">${ICONS.plus}</button>
      </div>
      <div id="promoList"><div class="skeleton" style="height:44px"></div></div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.flow} Referral</h3>
      <p class="small muted" style="margin-bottom:12px">Mijoz "taklif havolasi" so'rasa — bot unikal kod/havola beradi. Yangi mijoz shu kod bilan kelsa, kim taklif qilgani yoziladi.</p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <label class="switch"><input type="checkbox" id="refBonus"><span class="slider"></span></label>
        <div class="small"><strong>Bonus:</strong> taklif qilganga avto promo-kod</div>
        <input class="input" id="refPct" type="number" min="1" max="90" value="10" style="width:80px" title="Bonus foizi">%
        <button class="btn-secondary btn-sm" onclick="saveRefBonus(this)">Saqlash</button>
      </div>
      <div id="refTop"><div class="skeleton" style="height:44px"></div></div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.dollarSign} Narx kalkulyatori</h3>
      <p class="small muted" style="margin-bottom:12px">Yoqilsa — mijoz "narx qancha" desa bot savollarni tugmalar bilan beradi va taxminiy narxni aytadi. Variant formati: <code>Nomi | qo'shiladigan summa | ko'paytiruvchi</code> (masalan: <code>10 ta post | 1000000 | 1</code>).</p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
        <label class="switch"><input type="checkbox" id="calcOn"><span class="slider"></span></label>
        <span class="small"><strong>Kalkulyator yoqilgan</strong></span>
        <label class="lbl" style="margin:0">Boshlang'ich narx:</label>
        <input class="input" id="calcBase" type="number" min="0" style="width:140px" placeholder="0">
      </div>
      <div id="calcRules" style="display:grid;gap:12px;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px">
        <button class="btn-plain btn-sm" onclick="addCalcRule()">${ICONS.plus} Savol qo'shish</button>
        <button class="btn-secondary btn-sm" onclick="saveCalc(this)">${ICONS.check} Kalkulyatorni saqlash</button>
      </div>
    </div>
  </div>
  <style>@media (max-width:700px){ .pr-cols { grid-template-columns:1fr 1fr !important; } }</style>`;

  const script = `
let PROMOS = [], CALC_RULES = [];
async function loadAll() {
  try {
    const [s, pay, pr, ref, cr] = await Promise.all([
      api("/api/settings"), api("/api/payments"), api("/api/promos"), api("/api/referrals"), api("/api/price-rules"),
    ]);
    const st = s.settings;
    $("payClick").value = st.pay_click || "";
    $("payPayme").value = st.pay_payme || "";
    $("payUzum").value = st.pay_uzum || "";
    $("refBonus").checked = st.referral_bonus_enabled === "true";
    $("refPct").value = st.referral_bonus_percent || "10";
    $("calcOn").checked = st.calc_enabled === "true";
    $("calcBase").value = st.calc_base_price || "0";
    renderPayments(pay.payments || []);
    PROMOS = pr.promos || [];
    renderPromos();
    renderRefTop(ref.top || []);
    CALC_RULES = (cr.rules || []).map(function (r) { return { question: r.question, options: r.options || [] }; });
    renderCalcRules();
  } catch (e) { toast("Yuklashda xatolik: " + e.message, false); }
}
async function savePayLinks(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      pay_click: $("payClick").value.trim(),
      pay_payme: $("payPayme").value.trim(),
      pay_uzum: $("payUzum").value.trim(),
    });
    toast("To'lov havolalari saqlandi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
const PAY_STATUS = { pending: ['${ICONS.clock}', "Kutilmoqda", "pill-warn"], paid: ['${ICONS.check}', "To'landi", "pill-ok"], failed: ['${ICONS.close}', "Xato", "pill-danger"] };
function renderPayments(list) {
  if (!list.length) { $("payList").innerHTML = emptyState('${ICONS.receipt}', "Hali to'lov yo'q — inbox'da to'lov havolasi tugmasi orqali yuboring"); return; }
  $("payList").innerHTML = '<div class="group-list">' + list.map(function (p, i) {
    const st = PAY_STATUS[p.status] || PAY_STATUS.pending;
    return '<div class="group-row">' +
      '<div class="row-body">' +
        '<p class="row-title">' + (p.contact_id ? '<a href="/dashboard/inbox?contact=' + p.contact_id + '">' + esc(p.contact_name || p.ig_user_id || "mijoz") + "</a>" : "—") + "</p>" +
        '<p class="row-sub">' + (p.amount ? Number(p.amount).toLocaleString("uz-UZ") + " so'm" : "summa yo'q") + " · " + (p.method || "").toUpperCase() + " · " + timeAgo(p.created_at) + "</p>" +
      "</div>" +
      '<span class="pill ' + st[2] + '">' + st[0] + " " + st[1] + "</span>" +
      (p.status === "pending" ? '<button class="btn-secondary btn-sm" onclick="setPay(' + p.id + ',\\'paid\\')">' + '${ICONS.check}' + " To'landi</button>" +
        '<button class="btn-danger btn-sm" onclick="setPay(' + p.id + ',\\'failed\\')" title="Xato deb belgilash">' + '${ICONS.close}' + "</button>" : "") +
      "</div>" + (i < list.length - 1 ? '<div class="separator no-avatar"></div>' : "");
  }).join("") + "</div>";
}
async function setPay(id, status) {
  try {
    await postJson("/api/payments/" + id + "/status", { status });
    toast(status === "paid" ? "To'lov tasdiqlandi — mijoz 'Sotildi' bosqichiga o'tdi" : "Holat o'zgardi");
    loadAll();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function renderPromos() {
  if (!PROMOS.length) { $("promoList").innerHTML = '<span class="small muted">Hali promo-kod yo\\'q</span>'; return; }
  $("promoList").innerHTML = PROMOS.map(function (p) {
    const disc = p.discount_percent ? p.discount_percent + "%" : Number(p.discount_amount).toLocaleString("uz-UZ") + " so'm";
    return '<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--border);' + (p.is_active ? "" : "opacity:.5") + '">' +
      '<span class="pill pill-plain" style="font-size:12.5px">${ICONS.tag} ' + esc(p.code) + "</span>" +
      '<span class="small" style="flex:1">' + disc + ' chegirma · <span class="muted">' + p.used_count + "/" + p.max_uses + " ishlatilgan" +
        (p.valid_until ? " · " + new Date(p.valid_until).toLocaleDateString("uz-UZ") + " gacha" : "") + "</span></span>" +
      '<button class="btn-plain btn-sm" onclick="togglePromo(' + p.id + "," + !p.is_active + ')" title="' + (p.is_active ? "Faolsizlantirish" : "Faollashtirish") + '">' + (p.is_active ? '${ICONS.close}' : '${ICONS.play}') + "</button>" +
      '<button class="btn-danger btn-sm" onclick="delPromo(' + p.id + ')" title="O\\'chirish">${ICONS.trash}</button>' +
    "</div>";
  }).join("");
}
async function addPromo(btn) {
  const code = $("prCode").value.trim();
  const pct = Number($("prPct").value);
  if (!code || !pct) return toast("Kod va foiz majburiy", false);
  btn.disabled = true;
  try {
    await postJson("/api/promos", {
      code, discount_percent: pct,
      max_uses: Number($("prUses").value) || 1,
      valid_until: $("prUntil").value || null,
    });
    $("prCode").value = ""; $("prPct").value = "";
    toast("Promo-kod yaratildi");
    const pr = await api("/api/promos"); PROMOS = pr.promos || []; renderPromos();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function togglePromo(id, val) {
  try {
    await postJson("/api/promos/" + id, { is_active: val });
    const p = PROMOS.find(function (x) { return x.id === id; });
    if (p) p.is_active = val;
    renderPromos();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function delPromo(id) {
  try {
    await api("/api/promos/" + id, { method: "DELETE" });
    PROMOS = PROMOS.filter(function (x) { return x.id !== id; });
    renderPromos();
    toast("O'chirildi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function renderRefTop(top) {
  if (!top.length) { $("refTop").innerHTML = '<span class="small muted">Hali referral yo\\'q — mijozlar "taklif havolasi" deb so\\'rashi mumkin</span>'; return; }
  $("refTop").innerHTML = '<strong class="small" style="display:flex;align-items:center;gap:6px;margin-bottom:6px">${ICONS.trendingUp} Top taklifchilar:</strong>' +
    top.map(function (r, i) {
      return '<div style="display:flex;gap:9px;padding:6px 0;border-bottom:1px solid var(--border)" class="small">' +
        "<span>" + (i + 1) + ".</span>" +
        '<a style="flex:1;color:var(--accent-soft)" href="/dashboard/inbox?contact=' + r.id + '">' + esc(r.name || r.ig_user_id) + "</a>" +
        "<strong>" + r.invited + " ta</strong></div>";
    }).join("");
}
async function saveRefBonus(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      referral_bonus_enabled: String($("refBonus").checked),
      referral_bonus_percent: $("refPct").value,
    });
    toast("Referral sozlamalari saqlandi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
// --- Kalkulyator qoidalari ---
function renderCalcRules() {
  if (!CALC_RULES.length) { $("calcRules").innerHTML = '<span class="small muted">Hali savol yo\\'q — "Savol qo\\'shish" ni bosing</span>'; return; }
  $("calcRules").innerHTML = CALC_RULES.map(function (r, i) {
    const optsRaw = (r.options || []).map(function (o) { return o.label + " | " + (o.add || 0) + " | " + (o.mult || 1); }).join("\\n");
    return '<div style="background:var(--panel2);border-radius:12px;padding:12px">' +
      '<div style="display:flex;gap:8px;margin-bottom:8px">' +
        '<input class="input" value="' + esc(r.question) + '" placeholder="Savol (masalan: Nechta post kerak?)" oninput="CALC_RULES[' + i + '].question=this.value">' +
        '<button class="btn-danger btn-sm" onclick="CALC_RULES.splice(' + i + ',1);renderCalcRules()" title="O\\'chirish">${ICONS.trash}</button></div>' +
      '<textarea class="input" rows="3" placeholder="Variant | summa | koeff (har qatorda)" oninput="parseOpts(' + i + ', this.value)">' + esc(optsRaw) + "</textarea>" +
    "</div>";
  }).join("");
}
function parseOpts(i, raw) {
  CALC_RULES[i].options = raw.split("\\n").map(function (line) {
    const parts = line.split("|").map(function (s) { return s.trim(); });
    if (!parts[0]) return null;
    return { label: parts[0].slice(0, 20), add: Number(parts[1]) || 0, mult: Number(parts[2]) || 1 };
  }).filter(Boolean);
}
function addCalcRule() {
  if (CALC_RULES.length >= 10) return toast("Maksimum 10 ta savol", false);
  CALC_RULES.push({ question: "", options: [] });
  renderCalcRules();
}
async function saveCalc(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      calc_enabled: String($("calcOn").checked),
      calc_base_price: $("calcBase").value || "0",
    });
    const r = await postJson("/api/price-rules", { rules: CALC_RULES });
    toast("Kalkulyator saqlandi (" + r.count + " ta savol)");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
loadAll();`;

  return renderLayout({
    title: "Sotuv",
    active: "sales",
    headerAction: "",
    content,
    script,
  });
}
