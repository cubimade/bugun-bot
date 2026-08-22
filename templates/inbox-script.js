// templates/inbox-script.js — Suhbatlar (Inbox) sahifasi klient JS
// (13-audit: inbox.js 547 qator edi — klient JS shu faylga ajratildi)

export function inboxScript() {
  return `
let CONTACTS = [];
let ALL_TAGS = [];
let FILTER = new URLSearchParams(location.search).get("filter") || "all";
let SELECTED = Number(new URLSearchParams(location.search).get("contact")) || null;
let CURRENT = null; // ochiq suhbat kontakti

// ROADMAP-17 FAZA 2.1 — client-side (klient JS'da server ICONS mavjud emas), shu sabab
// interfeys ikonkalari mahalliy inline SVG sifatida beriladi (server ICONS bilan bir xil chiziq uslubi)
function II(p) { return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
// Kichik status-belgilar uchun (\`.ic\` klassi 19px'ni majburlaydi — bu yerda o'lcham to'g'ridan-to'g'ri beriladi)
function IIs(p) { return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:-2px">' + p + '</svg>'; }
const ICON = {
  alert: II('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  chat: II('<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 20l1.1-5.5a8.4 8.4 0 0 1-1-4A8.5 8.5 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z"/>'),
  chevron: II('<path d="M9 18l6-6-6-6"/>').replace('class="ic"', 'class="ic chevron"'),
  thumb: II('<path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3z"/><path d="M7 10l4.5-7a1.7 1.7 0 0 1 3 1.4L14 9h5.3a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.9 20H7"/>'),
  person: II('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"/>'),
  tag: II('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none"/>'),
  bellOff: II('<path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 8-2.5 8h17S18 14 18 8z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/><path d="M3 3l18 18"/>'),
  play: II('<path d="M6 4l14 8-14 8V4z"/>'),
  flag: II('<path d="M4 22V4"/><path d="M4 4h14l-3 4 3 4H4"/>'),
  card: II('<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/>'),
  media: II('<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/>'),
  zap: II('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
  trash: II('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  check: II('<path d="M20 6L9 17l-5-5"/>'),
  pencil: II('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
  close: II('<path d="M18 6L6 18M6 6l12 12"/>'),
  plus: II('<path d="M12 5v14M5 12h14"/>'),
  clock: II('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
  archive: II('<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M10 13h4"/>'),
};

let SAVED_REPLIES = [];
let TOTAL = 0;
const PAGE = 50;
async function loadData() {
  try {
    const [c, t] = await Promise.all([api("/api/contacts?limit=" + PAGE), api("/api/tags")]);
    CONTACTS = c.contacts; TOTAL = c.total ?? c.contacts.length; ALL_TAGS = t.tags || [];
    renderFilters(); renderList();
    if (SELECTED) openChat(SELECTED, true);
  } catch (e) {
    $("convItems").innerHTML = emptyState(ICON.alert, "Yuklashda xatolik: " + e.message);
  }
  try { SAVED_REPLIES = (await api("/api/saved-replies")).replies || []; } catch (e) { /* jim */ }
}
// B2: pagination — keyingi 50 suhbatni qo'shib yuklash
async function loadMore() {
  const btn = $("loadMore");
  btn.disabled = true;
  try {
    const c = await api("/api/contacts?limit=" + PAGE + "&offset=" + CONTACTS.length);
    const bor = new Set(CONTACTS.map((x) => x.id));
    CONTACTS = CONTACTS.concat((c.contacts || []).filter((x) => !bor.has(x.id)));
    TOTAL = c.total ?? TOTAL;
    renderList();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}

// C2: Tezkor javoblar — bir bosishda tayyor matn
function openQuickReplies() {
  if (!SAVED_REPLIES.length) {
    openModal("Tezkor javoblar", '<p class="muted" style="line-height:1.7">Hali tezkor javob yo\\'q.<br><a href="/dashboard/settings" style="color:var(--accent-soft)">Sozlamalar</a> sahifasida "Tezkor javoblar" bo\\'limidan qo\\'shing.</p>');
    return;
  }
  openModal("Tezkor javoblar", '<div class="group-list">' + SAVED_REPLIES.map((r, i) => \`
    <div class="group-row" style="cursor:pointer" onclick="useQuickReply(\${r.id})">
      <div class="row-body">
        <p class="row-title">\${esc(r.title)}</p>
        <p class="row-sub">\${esc(r.text.length > 90 ? r.text.slice(0, 90) + "…" : r.text)}</p>
      </div>
    </div>\${i < SAVED_REPLIES.length - 1 ? '<div class="separator no-avatar"></div>' : ""}\`).join("") + "</div>");
}
function useQuickReply(id) {
  const r = SAVED_REPLIES.find((x) => x.id === id);
  if (!r) return;
  // D3: shablon o'zgaruvchilari — joriy suhbat qiymatlari bilan
  $("replyText").value = r.text
    .replaceAll("{ism}", (CURRENT?.name || "").trim() || "do'st")
    .replaceAll("{akkaunt}", CURRENT?.project_name || "");
  closeModal();
  $("replyText").focus();
  $("replyText").dispatchEvent(new Event("input"));
}

// 9.5: Media yuborish — kutubxonadan tanlab mijozga jo'natish
async function openMediaPicker() {
  if (!SELECTED) return toast("Avval suhbatni tanlang", false);
  try {
    const { media } = await api("/api/media");
    if (!media.length) {
      openModal("Media", '<p class="muted" style="line-height:1.7">Kutubxona bo\\'sh.<br><a href="/dashboard/media" style="color:var(--accent-soft)">Media</a> sahifasida fayl yuklang.</p>');
      return;
    }
    openModal("Media yuborish", '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;max-height:55vh;overflow-y:auto">' +
      media.map(function (m) {
        const prev = m.type === "image"
          ? '<img src="' + m.url + '" style="width:100%;height:76px;object-fit:cover;border-radius:8px" loading="lazy">'
          : '<div style="height:76px;display:flex;align-items:center;justify-content:center;color:var(--muted);background:var(--panel2);border-radius:8px">' + ICON.media + "</div>";
        return '<div onclick="sendMedia(' + m.id + ')" style="cursor:pointer">' + prev +
          '<div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px">' + esc(m.name) + "</div></div>";
      }).join("") + "</div>");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function sendMedia(mediaId) {
  closeModal();
  try {
    toast("Yuborilmoqda...");
    await postJson("/api/reply-media", { contactId: SELECTED, mediaId });
    toast("Media yuborildi");
    const { contact, messages } = await api("/api/conversation/" + SELECTED);
    CURRENT = contact; renderChatHead(); renderMessages(messages);
  } catch (e) { toast("Xatolik: " + e.message, false); }
}

// 10.3: To'lov havolasi yuborish (operator)
function openPaymentModal() {
  if (!SELECTED) return toast("Avval suhbatni tanlang", false);
  openModal("To'lov havolasi", '' +
    '<label class="lbl">Summa (so\\'m, ixtiyoriy)</label>' +
    '<input class="input" id="payAmount" type="number" min="0" placeholder="500000" style="margin-bottom:10px">' +
    '<label class="lbl">Usul</label>' +
    '<select class="input" id="payMethod" style="margin-bottom:14px">' +
      '<option value="click">Click</option><option value="payme">Payme</option><option value="uzum">Uzum</option>' +
    "</select>" +
    '<p class="small muted" style="margin-bottom:12px">Havolalar <a href="/dashboard/sales" style="color:var(--accent-soft)">Sotuv</a> sahifasida sozlanadi. Mijoz to\\'lagach, o\\'sha yerda "To\\'landi" deb belgilang — kontakt avtomatik "Sotildi" bosqichiga o\\'tadi.</p>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end">' +
      '<button class="btn btn-plain" onclick="closeModal()">Bekor</button>' +
      '<button class="btn btn-primary" onclick="sendPayment()">Yuborish</button></div>');
}
async function sendPayment() {
  try {
    await postJson("/api/payments", {
      contactId: SELECTED,
      amount: $("payAmount").value || null,
      method: $("payMethod").value,
    });
    closeModal();
    toast("To'lov havolasi yuborildi");
    const { contact, messages } = await api("/api/conversation/" + SELECTED);
    CURRENT = contact; renderChatHead(); renderMessages(messages);
  } catch (e) { toast("Xatolik: " + e.message, false); }
}

// 12.2: Operatorga biriktirish
async function openAssign() {
  try {
    const { users } = await api("/api/users/list-brief");
    if (!users.length) return toast("Jamoa a'zosi yo'q — Sozlamalarda qo'shing", false);
    const rows = [{ id: null, name: "Biriktirmaslik", role: "" }].concat(users);
    openModal("Suhbatni biriktirish", '<div class="group-list">' + rows.map(function (u, i) {
      const on = CURRENT.assigned_user_id === u.id;
      return '<div class="group-row" style="cursor:pointer" onclick="doAssign(' + (u.id === null ? "null" : u.id) + ')">' +
        ICON.person +
        '<div class="row-body"><p class="row-title">' + esc(u.name) + '</p>' +
        (u.role ? '<p class="row-sub">' + esc(u.role) + '</p>' : '') + '</div>' +
        (on ? '<span class="pill pill-ok">tanlangan</span>' : '') + '</div>' +
        (i < rows.length - 1 ? '<div class="separator no-avatar"></div>' : '');
    }).join("") + '</div>');
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function doAssign(userId) {
  try {
    await postJson("/api/contacts/" + SELECTED + "/assign", { user_id: userId });
    CURRENT.assigned_user_id = userId;
    const local = CONTACTS.find(function (c) { return c.id === SELECTED; });
    if (local) local.assigned_user_id = userId;
    closeModal();
    toast(userId ? "Biriktirildi" : "Biriktirish olib tashlandi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
// 12.2: Ichki izohlar — faqat jamoa ko'radi (sariq fon)
async function openInternalNotes() {
  openModal("Ichki izohlar — " + (CURRENT.name || CURRENT.ig_user_id),
    '<p class="small muted" style="margin-bottom:10px">Faqat jamoa ko\\'radi — mijozga yuborilmaydi.</p>' +
    '<div id="inotesList" style="max-height:40vh;overflow-y:auto;margin-bottom:12px">' + skeletonRows(2, 40) + "</div>" +
    '<div style="display:flex;gap:8px"><textarea class="input" id="inoteText" rows="2" maxlength="1000" placeholder="Izoh yozing..."></textarea>' +
    '<button class="btn btn-primary" onclick="addInote()">' + ICON.plus + '</button></div>');
  loadInotes();
}
async function loadInotes() {
  try {
    const { notes } = await api("/api/internal-notes/" + SELECTED);
    $("inotesList").innerHTML = notes.length ? notes.map(function (n) {
      return '<div style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.35);border-radius:10px;padding:9px 12px;margin-bottom:8px">' +
        '<div class="small" style="white-space:pre-wrap">' + esc(n.text) + "</div>" +
        '<div class="small muted" style="margin-top:4px;display:flex;gap:8px"><span>' + esc(n.user_name || "—") + "</span><span>" + fmt(n.created_at) + "</span>" +
        '<span style="flex:1"></span><button onclick="delInote(' + n.id + ')" class="btn btn-plain" style="padding:0 4px;color:var(--muted)">' + ICON.trash + '</button></div></div>';
    }).join("") : '<span class="small muted">Hali izoh yo\\'q</span>';
  } catch (e) { $("inotesList").innerHTML = '<span class="small muted">Yuklanmadi: ' + esc(e.message) + "</span>"; }
}
async function addInote() {
  const text = $("inoteText").value.trim();
  if (!text) return;
  try {
    await postJson("/api/internal-notes/" + SELECTED, { text });
    $("inoteText").value = "";
    loadInotes();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function delInote(id) {
  try {
    await api("/api/internal-notes/note/" + id, { method: "DELETE" });
    loadInotes();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}

// C1: Bot pauza (operator rejimi)
async function togglePause() {
  try {
    const v = !CURRENT.bot_paused;
    await postJson("/api/contacts/" + SELECTED + "/pause", { value: v });
    CURRENT.bot_paused = v; CURRENT.paused_until = null;
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) { local.bot_paused = v; local.paused_until = null; }
    renderChatHead(); renderList();
    toast(v ? "Bot pauza qilindi — endi siz gaplashasiz" : "Bot qayta yoqildi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
// Drawer'dan pauza o'zgarsa — inbox ro'yxatini ham yangilaymiz
function onPauseChanged(id, v) {
  const local = CONTACTS.find((c) => c.id === id);
  if (local) { local.bot_paused = v; local.paused_until = null; }
  if (CURRENT && CURRENT.id === id) { CURRENT.bot_paused = v; renderChatHead(); }
  renderList();
}
function renderFilters() {
  // ROADMAP-17 FAZA 2.1 — chip'lardagi emoji o'rniga ikon (mavjud bo'lganda), aks holda faqat matn.
  // Instagram/Telegram brend ramzlari (📷/✈️) va til bayroqchalari uchun mos generik ikon yo'q — ataylab qoldirilgan.
  const chips = [
    { k: "all", label: "Hammasi" },
    { k: "human", label: "Odam kerak", icon: ICON.flag },
    { k: "negative", label: "Salbiy" },
    { k: "paused", label: "Pauzada", icon: ICON.bellOff },
    { k: "story", label: "Story javoblari", icon: ICON.media },
    { k: "ig", label: "📷 Instagram" },
    { k: "tg", label: "✈️ Telegram" },
    { k: "mine", label: "Menga biriktirilgan", icon: ICON.person },
    { k: "unassigned", label: "Biriktirilmagan" },
    { k: "archived", label: "Arxiv", icon: ICON.archive },
    ...ALL_TAGS.map((t) => ({ k: "tag:" + t, label: t, icon: ICON.tag })),
  ];
  $("filters").innerHTML = chips.map((c) =>
    \`<button class="chip \${FILTER === c.k ? "on" : ""}" onclick="setFilter('\${esc(c.k).replace(/'/g, "\\\\'")}')">\${c.icon || ""}\${esc(c.label)}</button>\`
  ).join("");
}
function setFilter(k) { FILTER = k; renderFilters(); renderList(); }
function matchesFilter(c) {
  // D4: arxivlanganlar faqat "Arxiv" filtrida ko'rinadi
  if (FILTER === "archived") return c.archived;
  if (c.archived) return false;
  if (FILTER === "human") return c.needs_human;
  if (FILTER === "negative") return c.sentiment === "negative";
  if (FILTER === "paused") return c.bot_paused;
  if (FILTER === "story") return c.has_story;
  if (FILTER === "ig") return c.platform !== "telegram";
  if (FILTER === "tg") return c.platform === "telegram";
  if (FILTER === "mine") return window.ME && c.assigned_user_id === window.ME.id;
  if (FILTER === "unassigned") return !c.assigned_user_id;
  if (FILTER.startsWith("tag:")) return (c.tags || []).includes(FILTER.slice(4));
  return true;
}
function renderList() {
  const q = ($("search").value || "").toLowerCase().trim();
  const items = CONTACTS.filter(matchesFilter).filter((c) =>
    !q || String(c.name || "").toLowerCase().includes(q) ||
    String(c.ig_user_id).includes(q) || String(c.last_text || "").toLowerCase().includes(q)
  );
  const more = $("loadMore");
  if (more) {
    more.style.display = CONTACTS.length < TOTAL ? "" : "none";
    more.textContent = "Ko'proq yuklash (" + CONTACTS.length + "/" + TOTAL + ")";
  }
  if (!items.length) { $("convItems").innerHTML = emptyState(ICON.chat, q ? "Topilmadi" : "Hali suhbatlar yo'q — bot birinchi xabarni kutmoqda"); return; }
  // ROADMAP-17 FAZA 2.2 — Suhbatlar ro'yxati: guruhlangan ro'yxat (bitta blok, ajratgich chiziqlar)
  $("convItems").innerHTML = '<div class="group-list">' + items.map((c, i) => \`
    <div class="group-row conv-item \${c.needs_human ? "human" : ""} \${c.id === SELECTED ? "sel" : ""}" onclick="openChat(\${c.id})">
      \${contactAvatar(c, 40)}
      <div class="row-body">
        <p class="row-title" style="display:flex;align-items:center;gap:5px;white-space:normal;overflow:visible">
          <span data-tip="\${c.platform === "telegram" ? "Telegram" : "Instagram"}" style="font-size:11px;flex-shrink:0">\${c.platform === "telegram" ? "✈️" : "📷"}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">\${esc(contactTitle(c))}</span>
          \${c.needs_human ? '<span data-tip="Odam kerak" style="flex-shrink:0;color:var(--warning)">' + IIs('<path d="M4 22V4"/><path d="M4 4h14l-3 4 3 4H4"/>') + "</span>" : ""}
          \${c.bot_paused ? '<span data-tip="Bot pauzada — operator gaplashadi" style="flex-shrink:0;color:var(--text-3)">' + IIs('<path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 8-2.5 8h17S18 14 18 8z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/><path d="M3 3l18 18"/>') + "</span>" : ""}
          \${c.sentiment === "negative" ? '<span data-tip="Salbiy kayfiyat — tez aralashing!" style="flex-shrink:0;color:var(--danger)">' + IIs('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>') + "</span>" : ""}
          \${c.has_story ? '<span data-tip="Story\\'ga javob yozgan" style="flex-shrink:0;color:var(--text-3)">' + IIs('<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/>') + "</span>" : ""}
          \${c.language && c.language !== "uz" ? '<span data-tip="Mijoz tili" style="flex-shrink:0">' + (c.language === "ru" ? "🇷🇺" : "🇬🇧") + "</span>" : ""}
        </p>
        <p class="row-sub">\${esc(c.last_text || "—")}</p>
      </div>
      <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="small muted">\${timeAgo(c.last_seen)}</span>
        \${c.unread ? \`<span class="pill pill-ok">\${c.unread}</span>\` : ""}
      </div>
      \${ICON.chevron}
    </div>\${i < items.length - 1 ? '<div class="separator"></div>' : ""}\`).join("") + "</div>";
}

async function openChat(contactId, silent) {
  SELECTED = contactId;
  history.replaceState(null, "", "/dashboard/inbox?contact=" + contactId + (FILTER !== "all" ? "&filter=" + FILTER : ""));
  $("inboxWrap").classList.add("chat-open");
  $("chatEmpty").style.display = "none";
  ["chatHead", "chatMsgs"].forEach((id) => $(id).style.display = "");
  $("composer").style.display = "flex";
  if (!silent) renderList();
  $("chatMsgs").innerHTML = skeletonRows(4, 40);
  try {
    const { contact, messages } = await api("/api/conversation/" + contactId);
    CURRENT = contact;
    const local = CONTACTS.find((c) => c.id === contactId);
    if (local) { local.unread = 0; local.needs_human = contact.needs_human; }
    renderChatHead();
    renderMessages(messages);
    renderList();
  } catch (e) { $("chatMsgs").innerHTML = emptyState(ICON.alert, "Suhbat yuklanmadi: " + e.message); }
}
function renderChatHead() {
  const c = CURRENT;
  $("chatHead").innerHTML = \`
    <button class="btn btn-plain btn-sm back-btn" onclick="closeChat()">←</button>
    \${contactAvatar(c, 36)}
    <div style="min-width:0;flex:1">
      <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
        <strong>\${esc(contactTitle(c))}</strong>
        \${c.username && c.full_name ? '<span class="small muted">' + esc(c.full_name) + "</span>" : ""}
        \${c.needs_human ? '<span class="pill pill-warn">odam kerak</span>' : ""}
        \${c.bot_paused ? '<span class="pill pill-plain">bot pauzada</span>' : ""}
        \${sentimentBadge(c.sentiment)}
        \${c.language ? '<span class="pill pill-plain" data-tip="Mijoz tili">' + (c.language === "ru" ? "🇷🇺 RU" : c.language === "en" ? "🇬🇧 EN" : "🇺🇿 UZ") + "</span>" : ""}
      </div>
      <div class="small muted" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span data-tip="Qaysi akkauntingizga yozgan">\${c.platform === "telegram" ? "✈️" : "📷"} \${esc(c.project_name || "")}\${c.account_username ? " (@" + esc(c.account_username) + ")" : ""}</span>
        · \${esc(contactSubtitle(c) || ("ID: " + c.ig_user_id))}
        <span id="tagBadges">\${(c.tags || []).map((t) => \`<span class="pill pill-plain">\${esc(t)}</span>\`).join(" ")}</span>
      </div>
    </div>
    <button class="btn btn-plain btn-sm" onclick="togglePause()" data-tip="\${c.bot_paused ? "Bot bu suhbatda yana javob beradi" : "Bot bu suhbatda javob bermaydi — siz gaplashasiz"}">\${c.bot_paused ? ICON.play : ICON.bellOff}</button>
    <button class="btn btn-plain btn-sm" onclick="openProfile(SELECTED)" data-tip="Profil">\${ICON.person}</button>
    <button class="btn btn-plain btn-sm" onclick="openTagEditor()" data-tip="Teg qo'shish">\${ICON.tag}</button>
    <button class="btn btn-plain btn-sm" onclick="openAssign()" data-tip="Operatorga biriktirish">\${ICON.person}</button>
    <button class="btn btn-plain btn-sm" onclick="openInternalNotes()" data-tip="Ichki izohlar (mijoz ko'rmaydi)" style="background:rgba(251,191,36,.12)">\${ICON.pencil}</button>
    <button class="btn btn-plain btn-sm" onclick="toggleArchive()" data-tip="\${c.archived ? "Arxivdan chiqarish" : "Inbox'dan yashirish (o'chirilmaydi)"}">\${ICON.archive}</button>
    \${c.needs_human ? '<button class="btn btn-plain btn-sm" onclick="resolveHuman()" data-tip="Hal qilindi deb belgilash">' + ICON.check + " Hal qilindi</button>" : ""}\`;
}
// D4: suhbatni arxivlash — inbox'dan yashiriladi, lekin o'chmaydi
async function toggleArchive() {
  try {
    const v = !CURRENT.archived;
    await postJson("/api/contacts/" + SELECTED + "/archive", { value: v });
    CURRENT.archived = v;
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) local.archived = v;
    renderChatHead(); renderList();
    toast(v ? "Suhbat arxivlandi" : "Arxivdan chiqarildi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
// ROADMAP-18 FAZA 1: avto-scroll — ochilganda darrov pastga, yangi xabarda
// foydalanuvchi pastda bo'lsa yumshoq scroll, yuqorida bo'lsa "↓ Yangi xabar" tugmasi.
function scrollToBottom(smooth) {
  const el = $("chatMsgs");
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "instant" });
}
function isNearBottom() {
  const el = $("chatMsgs");
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}
function hideNewMsgBtn() { $("newMsgBtn").classList.remove("show"); }

let MSG_COUNT = 0;
let LAST_MSGS = [];
function renderMessages(messages, highlightNew) {
  LAST_MSGS = messages;
  if (!messages.length) { $("chatMsgs").innerHTML = emptyState(ICON.chat, "Xabarlar yo'q"); MSG_COUNT = 0; return; }
  const prevCount = MSG_COUNT;
  const wasNearBottom = isNearBottom();
  $("chatMsgs").innerHTML = messages.map((m, i) => {
    const op = m.role === "assistant" && m.is_operator;
    const fresh = highlightNew && i >= prevCount;
    // D5: bot javobi ostida 👍/👎 (operator javobida emas) — CSS .rate-btn.down o'zi svg'ni flip qiladi
    const rate = m.role === "assistant" && !op && m.id ? \`
      <div class="rate-row">
        <button class="rate-btn\${m.rating === 1 ? " on" : ""}" onclick="rateMsg(\${m.id}, \${m.rating === 1 ? 0 : 1})" data-tip="Yaxshi javob">\${ICON.thumb}</button>
        <button class="rate-btn down\${m.rating === -1 ? " on" : ""}" onclick="rateMsg(\${m.id}, \${m.rating === -1 ? 0 : -1})" data-tip="Yomon javob">\${ICON.thumb}</button>
      </div>\` : "";
    const srcTag = m.source === "story_reply" ? '<div class="op-tag" style="color:var(--accent-2)">' + ICON.media + ' Story javobi</div>'
      : m.source === "comment" ? '<div class="op-tag">' + ICON.chat + ' Komment</div>'
      : m.source === "followup" ? '<div class="op-tag" style="color:var(--warning)">' + ICON.clock + ' Follow-up</div>' : "";
    // 16 (2.2): har xabar ustida KIM yozgani — mijoz ismi / Bot (AI) /
    // Operator / Avtomatlashtirish. Ketma-ket bir xil yuboruvchida
    // takrorlanmaydi (suhbat toza ko'rinadi).
    const prev = messages[i - 1];
    const who = senderLabel(m, CURRENT);
    const sameAsPrev = prev && senderLabel(prev, CURRENT) === who;
    const whoTag = sameAsPrev ? "" : \`<div class="op-tag">\${who}</div>\`;
    return \`
    <div class="bubble-row \${m.role === "assistant" ? "from-bot" : "from-user"}\${fresh ? " fresh" : ""}">
      <div class="bubble\${op ? " from-op" : ""}">\${whoTag}\${srcTag}\${esc(m.text)}<div class="t">\${fmt(m.created_at)}\${m.role === "assistant" ? " · ✓" : ""}</div>\${rate}</div>
    </div>\`;
  }).join("");
  MSG_COUNT = messages.length;
  if (!highlightNew) {
    // Suhbat endi ochildi — darrov oxirgi xabarga
    scrollToBottom(false);
    hideNewMsgBtn();
  } else if (wasNearBottom) {
    scrollToBottom(true);
    hideNewMsgBtn();
  } else if (messages.length > prevCount) {
    // Foydalanuvchi yuqorida o'qiyapti — tegmaymiz, tugma ko'rsatamiz
    $("newMsgBtn").classList.add("show");
  }
}
// D5: bahoni saqlash va lokal yangilash (scroll saqlanadi)
async function rateMsg(id, value) {
  try {
    await postJson("/api/messages/" + id + "/rate", { value });
    const m = LAST_MSGS.find((x) => x.id === id);
    if (m) m.rating = value === 0 ? null : value;
    const keep = $("chatMsgs").scrollTop;
    renderMessages(LAST_MSGS);
    $("chatMsgs").scrollTop = keep;
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function closeChat() {
  $("inboxWrap").classList.remove("chat-open");
  SELECTED = null; CURRENT = null;
  history.replaceState(null, "", "/dashboard/inbox");
  renderList();
}

async function sendReply() {
  const text = $("replyText").value.trim();
  if (!text || !SELECTED) return;
  const btn = $("sendBtn");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    await postJson("/api/reply", { contactId: SELECTED, text });
    $("replyText").value = "";
    $("replyText").style.height = "auto";
    toast("Javob yuborildi — bot 30 daqiqa pauzada");
    const { contact, messages } = await api("/api/conversation/" + SELECTED);
    CURRENT = contact; renderChatHead(); renderMessages(messages);
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) { local.last_text = text; local.needs_human = false; local.bot_paused = contact.bot_paused; }
    renderList();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false; btn.innerHTML = 'Yuborish';
  $("replyText").focus();
}

async function resolveHuman() {
  try {
    await postJson("/api/contacts/" + SELECTED + "/needs-human", { value: false });
    CURRENT.needs_human = false;
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) local.needs_human = false;
    renderChatHead(); renderList();
    toast("Hal qilindi deb belgilandi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}

function openTagEditor() {
  const tags = CURRENT.tags || [];
  openModal("Teglar — " + (CURRENT.name || CURRENT.ig_user_id), \`
    <div id="tagList" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      \${tags.length ? "" : '<span class="muted small">Hali teg yo\\'q</span>'}
      \${tags.map((t) => \`<span class="pill pill-plain" style="padding:4px 6px 4px 11px">\${esc(t)}
        <button onclick="removeTag('\${esc(t).replace(/'/g, "\\\\'")}')" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 4px">✕</button></span>\`).join("")}
    </div>
    <div style="display:flex;gap:8px">
      <input class="input" id="newTag" placeholder="Yangi teg (masalan: VIP, qiziqqan)" list="tagSuggest"
        onkeydown="if(event.key==='Enter'){event.preventDefault();addTag();}">
      <datalist id="tagSuggest">\${ALL_TAGS.map((t) => \`<option value="\${esc(t)}">\`).join("")}</datalist>
      <button class="btn btn-primary" onclick="addTag()">Qo'shish</button>
    </div>\`);
}
async function saveTags(tags) {
  const r = await postJson("/api/contacts/" + SELECTED + "/tags", { tags });
  CURRENT.tags = r.tags;
  const local = CONTACTS.find((c) => c.id === SELECTED);
  if (local) local.tags = r.tags;
  r.tags.forEach((t) => { if (!ALL_TAGS.includes(t)) ALL_TAGS.push(t); });
  renderChatHead(); renderFilters(); renderList(); openTagEditor();
}
async function addTag() {
  const t = $("newTag").value.trim();
  if (!t) return;
  try { await saveTags([...(CURRENT.tags || []), t]); toast("Teg qo'shildi"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
async function removeTag(t) {
  try { await saveTags((CURRENT.tags || []).filter((x) => x !== t)); toast("Teg o'chirildi"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}

// Real-vaqt his: har 15 soniyada yangilanish, yangi xabar yumshoq highlight bilan
setInterval(async () => {
  try {
    // Yuklangan oynani yangilaymiz (pagination saqlanadi)
    const r = await api("/api/contacts?limit=" + Math.max(CONTACTS.length, PAGE));
    const openUnread = SELECTED ? (CONTACTS.find((c) => c.id === SELECTED)?.unread || 0) : 0;
    CONTACTS = r.contacts;
    TOTAL = r.total ?? TOTAL;
    if (SELECTED) {
      const cur = CONTACTS.find((c) => c.id === SELECTED);
      if (cur && cur.unread > openUnread) {
        // Ochiq suhbatga yangi xabar keldi — chatni yangilaymiz (highlight bilan)
        const { contact, messages } = await api("/api/conversation/" + SELECTED);
        CURRENT = contact; renderChatHead(); renderMessages(messages, true);
        cur.unread = 0;
      } else if (cur) cur.unread = 0;
    }
    renderList();
  } catch (e) { /* jim — keyingi urinishda */ }
}, 15000);

// Yozish maydoni: avto-balandlik (Enter=yuborish, Shift+Enter=yangi qator)
$("replyText").addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 120) + "px";
});

// Foydalanuvchi o'zi pastga tushsa — "Yangi xabar" tugmasi yashirinadi
$("chatMsgs").addEventListener("scroll", function () {
  if (isNearBottom()) hideNewMsgBtn();
});

loadData();`;
}
