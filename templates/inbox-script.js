// templates/inbox-script.js — Suhbatlar (Inbox) sahifasi klient JS
// (13-audit: inbox.js 547 qator edi — klient JS shu faylga ajratildi)

export function inboxScript() {
  return `
let CONTACTS = [];
let ALL_TAGS = [];
let FILTER = new URLSearchParams(location.search).get("filter") || "all";
let SELECTED = Number(new URLSearchParams(location.search).get("contact")) || null;
let CURRENT = null; // ochiq suhbat kontakti

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
    $("convItems").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message);
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
    openModal("⚡ Tezkor javoblar", '<p class="muted" style="line-height:1.7">Hali tezkor javob yo\\'q.<br><a href="/dashboard/settings" style="color:var(--accent-soft)">Sozlamalar</a> sahifasida "Tezkor javoblar" bo\\'limidan qo\\'shing.</p>');
    return;
  }
  openModal("⚡ Tezkor javoblar", SAVED_REPLIES.map((r) => \`
    <button class="btn" style="width:100%;justify-content:flex-start;text-align:left;margin-bottom:8px;white-space:normal;padding:11px 14px" onclick="useQuickReply(\${r.id})">
      <span style="min-width:0"><strong style="display:block;margin-bottom:2px">\${esc(r.title)}</strong>
      <span class="small muted">\${esc(r.text.length > 90 ? r.text.slice(0, 90) + "…" : r.text)}</span></span>
    </button>\`).join(""));
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
      openModal("📎 Media", '<p class="muted" style="line-height:1.7">Kutubxona bo\\'sh.<br><a href="/dashboard/media" style="color:var(--accent-soft)">Media</a> sahifasida fayl yuklang.</p>');
      return;
    }
    openModal("📎 Media yuborish", '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;max-height:55vh;overflow-y:auto">' +
      media.map(function (m) {
        const prev = m.type === "image"
          ? '<img src="' + m.url + '" style="width:100%;height:76px;object-fit:cover;border-radius:8px" loading="lazy">'
          : '<div style="height:76px;display:flex;align-items:center;justify-content:center;font-size:30px;background:var(--panel2);border-radius:8px">' + (m.type === "video" ? "🎬" : "📄") + "</div>";
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
    toast("Media yuborildi ✓");
    const { contact, messages } = await api("/api/conversation/" + SELECTED);
    CURRENT = contact; renderChatHead(); renderMessages(messages);
  } catch (e) { toast("Xatolik: " + e.message, false); }
}

// 10.3: To'lov havolasi yuborish (operator)
function openPaymentModal() {
  if (!SELECTED) return toast("Avval suhbatni tanlang", false);
  openModal("💳 To'lov havolasi", '' +
    '<label class="lbl">Summa (so\\'m, ixtiyoriy)</label>' +
    '<input class="input" id="payAmount" type="number" min="0" placeholder="500000" style="margin-bottom:10px">' +
    '<label class="lbl">Usul</label>' +
    '<select class="input" id="payMethod" style="margin-bottom:14px">' +
      '<option value="click">Click</option><option value="payme">Payme</option><option value="uzum">Uzum</option>' +
    "</select>" +
    '<p class="small muted" style="margin-bottom:12px">Havolalar <a href="/dashboard/sales" style="color:var(--accent-soft)">Sotuv</a> sahifasida sozlanadi. Mijoz to\\'lagach, o\\'sha yerda "To\\'landi" deb belgilang — kontakt avtomatik "Sotildi" bosqichiga o\\'tadi.</p>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end">' +
      '<button class="btn" onclick="closeModal()">Bekor</button>' +
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
    toast("To'lov havolasi yuborildi ✓");
    const { contact, messages } = await api("/api/conversation/" + SELECTED);
    CURRENT = contact; renderChatHead(); renderMessages(messages);
  } catch (e) { toast("Xatolik: " + e.message, false); }
}

// 12.2: Operatorga biriktirish
async function openAssign() {
  try {
    const { users } = await api("/api/users/list-brief");
    if (!users.length) return toast("Jamoa a'zosi yo'q — Sozlamalarda qo'shing", false);
    openModal("👤 Suhbatni biriktirish", '<div style="display:grid;gap:8px">' +
      '<button class="btn" style="justify-content:flex-start" onclick="doAssign(null)">⬜ Biriktirmaslik</button>' +
      users.map(function (u) {
        return '<button class="btn" style="justify-content:flex-start;' + (CURRENT.assigned_user_id === u.id ? "border-color:var(--accent)" : "") + '" onclick="doAssign(' + u.id + ')">' +
          "👤 " + esc(u.name) + ' <span class="small muted">(' + u.role + ")</span></button>";
      }).join("") + "</div>");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function doAssign(userId) {
  try {
    await postJson("/api/contacts/" + SELECTED + "/assign", { user_id: userId });
    CURRENT.assigned_user_id = userId;
    const local = CONTACTS.find(function (c) { return c.id === SELECTED; });
    if (local) local.assigned_user_id = userId;
    closeModal();
    toast(userId ? "Biriktirildi ✓" : "Biriktirish olib tashlandi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
// 12.2: Ichki izohlar — faqat jamoa ko'radi (sariq fon)
async function openInternalNotes() {
  openModal("📝 Ichki izohlar — " + (CURRENT.name || CURRENT.ig_user_id),
    '<p class="small muted" style="margin-bottom:10px">Faqat jamoa ko\\'radi — mijozga yuborilmaydi.</p>' +
    '<div id="inotesList" style="max-height:40vh;overflow-y:auto;margin-bottom:12px">' + skeletonRows(2, 40) + "</div>" +
    '<div style="display:flex;gap:8px"><textarea class="input" id="inoteText" rows="2" maxlength="1000" placeholder="Izoh yozing..."></textarea>' +
    '<button class="btn btn-primary" onclick="addInote()">➕</button></div>');
  loadInotes();
}
async function loadInotes() {
  try {
    const { notes } = await api("/api/internal-notes/" + SELECTED);
    $("inotesList").innerHTML = notes.length ? notes.map(function (n) {
      return '<div style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.35);border-radius:10px;padding:9px 12px;margin-bottom:8px">' +
        '<div class="small" style="white-space:pre-wrap">' + esc(n.text) + "</div>" +
        '<div class="small muted" style="margin-top:4px;display:flex;gap:8px"><span>' + esc(n.user_name || "—") + "</span><span>" + fmt(n.created_at) + "</span>" +
        '<span style="flex:1"></span><button onclick="delInote(' + n.id + ')" style="background:none;border:none;color:var(--muted);cursor:pointer">🗑</button></div></div>';
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
    toast(v ? "Bot pauza qilindi — endi siz gaplashasiz 🔕" : "Bot qayta yoqildi ▶️");
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
  const chips = [
    { k: "all", label: "Hammasi" },
    { k: "human", label: "🙋 Odam kerak" },
    { k: "negative", label: "😟 Salbiy" },
    { k: "paused", label: "🔕 Pauzada" },
    { k: "story", label: "📸 Story javoblari" },
    { k: "ig", label: "📷 Instagram" },
    { k: "tg", label: "✈️ Telegram" },
    { k: "mine", label: "👤 Menga biriktirilgan" },
    { k: "unassigned", label: "⬜ Biriktirilmagan" },
    { k: "archived", label: "🗄 Arxiv" },
    ...ALL_TAGS.map((t) => ({ k: "tag:" + t, label: "🏷 " + t })),
  ];
  $("filters").innerHTML = chips.map((c) =>
    \`<button class="chip \${FILTER === c.k ? "on" : ""}" onclick="setFilter('\${esc(c.k).replace(/'/g, "\\\\'")}')">\${esc(c.label)}</button>\`
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
    more.textContent = "⬇ Ko'proq yuklash (" + CONTACTS.length + "/" + TOTAL + ")";
  }
  if (!items.length) { $("convItems").innerHTML = emptyState("💬", q ? "Topilmadi" : "Hali suhbatlar yo'q — bot birinchi xabarni kutmoqda"); return; }
  $("convItems").innerHTML = items.map((c) => \`
    <div class="conv-item \${c.needs_human ? "human" : ""} \${c.id === SELECTED ? "sel" : ""}" onclick="openChat(\${c.id})">
      \${avatar(c.name || c.ig_user_id, 40)}
      <div style="min-width:0;flex:1">
        <div style="display:flex;align-items:center;gap:6px">
          <span title="\${c.platform === "telegram" ? "Telegram" : "Instagram"}" style="font-size:11px">\${c.platform === "telegram" ? "✈️" : "📷"}</span>
          <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px">\${esc(c.name || c.ig_user_id)}</strong>
          \${c.needs_human ? '<span title="Odam kerak">🙋</span>' : ""}
          \${c.bot_paused ? '<span title="Bot pauzada — operator gaplashadi">🔕</span>' : ""}
          \${c.sentiment === "negative" ? '<span title="Salbiy kayfiyat — tez aralashing!">😟</span>' : ""}
          \${c.has_story ? '<span title="Story\\'ga javob yozgan">📸</span>' : ""}
          \${c.language && c.language !== "uz" ? '<span title="Mijoz tili">' + (c.language === "ru" ? "🇷🇺" : "🇬🇧") + "</span>" : ""}
        </div>
        <div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(c.last_text || "—")}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="small muted">\${timeAgo(c.last_seen)}</span>
        \${c.unread ? \`<span class="badge" style="background:var(--grad);color:#fff">\${c.unread}</span>\` : ""}
      </div>
    </div>\`).join("");
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
  } catch (e) { $("chatMsgs").innerHTML = emptyState("⚠️", "Suhbat yuklanmadi: " + e.message); }
}
function renderChatHead() {
  const c = CURRENT;
  $("chatHead").innerHTML = \`
    <button class="btn btn-sm back-btn" onclick="closeChat()">←</button>
    \${avatar(c.name || c.ig_user_id, 36)}
    <div style="min-width:0;flex:1">
      <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
        <strong>\${esc(c.name || c.ig_user_id)}</strong>
        \${c.needs_human ? '<span class="badge b-amber">🙋 odam kerak</span>' : ""}
        \${c.bot_paused ? '<span class="badge b-amber">🔕 bot pauzada</span>' : ""}
        \${sentimentBadge(c.sentiment)}
        \${c.language ? '<span class="badge b-gray" title="Mijoz tili">' + (c.language === "ru" ? "🇷🇺 RU" : c.language === "en" ? "🇬🇧 EN" : "🇺🇿 UZ") + "</span>" : ""}
      </div>
      <div class="small muted" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        \${esc(c.project_name || "")} · ID: \${esc(c.ig_user_id)}
        <span id="tagBadges">\${(c.tags || []).map((t) => \`<span class="badge b-indigo">\${esc(t)}</span>\`).join(" ")}</span>
      </div>
    </div>
    <button class="btn btn-sm" onclick="togglePause()" title="\${c.bot_paused ? "Bot bu suhbatda yana javob beradi" : "Bot bu suhbatda javob bermaydi — siz gaplashasiz"}">\${c.bot_paused ? "▶️ Botni yoqish" : "🔕 Botni pauza"}</button>
    <button class="btn btn-sm" onclick="openProfile(SELECTED)">👤 Profil</button>
    <button class="btn btn-sm" onclick="openTagEditor()" title="Teg qo'shish">🏷</button>
    <button class="btn btn-sm" onclick="openAssign()" title="Operatorga biriktirish">👤➕</button>
    <button class="btn btn-sm" onclick="openInternalNotes()" title="Ichki izohlar (mijoz ko'rmaydi)" style="background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.4)">📝</button>
    <button class="btn btn-sm" onclick="toggleArchive()" title="\${c.archived ? "Arxivdan chiqarish" : "Inbox'dan yashirish (o'chirilmaydi)"}">\${c.archived ? "📤 Chiqarish" : "🗄 Arxivlash"}</button>
    \${c.needs_human ? '<button class="btn btn-sm" onclick="resolveHuman()" title="Hal qilindi deb belgilash">✓ Hal qilindi</button>' : ""}\`;
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
    toast(v ? "Suhbat arxivlandi 🗄" : "Arxivdan chiqarildi 📤");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
let MSG_COUNT = 0;
let LAST_MSGS = [];
function renderMessages(messages, highlightNew) {
  LAST_MSGS = messages;
  if (!messages.length) { $("chatMsgs").innerHTML = emptyState("💬", "Xabarlar yo'q"); MSG_COUNT = 0; return; }
  const prevCount = MSG_COUNT;
  $("chatMsgs").innerHTML = messages.map((m, i) => {
    const op = m.role === "assistant" && m.is_operator;
    const fresh = highlightNew && i >= prevCount;
    // D5: bot javobi ostida 👍/👎 (operator javobida emas)
    const rate = m.role === "assistant" && !op && m.id ? \`
      <div class="rate-row">
        <button class="rate-btn\${m.rating === 1 ? " on" : ""}" onclick="rateMsg(\${m.id}, \${m.rating === 1 ? 0 : 1})" title="Yaxshi javob">👍</button>
        <button class="rate-btn\${m.rating === -1 ? " on" : ""}" onclick="rateMsg(\${m.id}, \${m.rating === -1 ? 0 : -1})" title="Yomon javob">👎</button>
      </div>\` : "";
    const srcTag = m.source === "story_reply" ? '<div class="op-tag" style="color:var(--accent-2)">📸 Story javobi</div>'
      : m.source === "comment" ? '<div class="op-tag">💬 Komment</div>'
      : m.source === "followup" ? '<div class="op-tag" style="color:var(--warning)">⏰ Follow-up</div>' : "";
    return \`
    <div class="bubble-row \${m.role === "assistant" ? "from-bot" : "from-user"}\${fresh ? " fresh" : ""}">
      <div class="bubble\${op ? " from-op" : ""}">\${op ? '<div class="op-tag">👤 Operator</div>' : srcTag}\${esc(m.text)}<div class="t">\${fmt(m.created_at)}\${m.role === "assistant" ? " · ✓" : ""}</div>\${rate}</div>
    </div>\`;
  }).join("");
  MSG_COUNT = messages.length;
  $("chatMsgs").scrollTop = $("chatMsgs").scrollHeight;
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
    toast("Javob yuborildi ✓ — bot 30 daqiqa pauzada 🔕");
    const { contact, messages } = await api("/api/conversation/" + SELECTED);
    CURRENT = contact; renderChatHead(); renderMessages(messages);
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) { local.last_text = text; local.needs_human = false; local.bot_paused = contact.bot_paused; }
    renderList();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false; btn.innerHTML = 'Yuborish';
}

async function resolveHuman() {
  try {
    await postJson("/api/contacts/" + SELECTED + "/needs-human", { value: false });
    CURRENT.needs_human = false;
    const local = CONTACTS.find((c) => c.id === SELECTED);
    if (local) local.needs_human = false;
    renderChatHead(); renderList();
    toast("Hal qilindi deb belgilandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}

function openTagEditor() {
  const tags = CURRENT.tags || [];
  openModal("Teglar — " + (CURRENT.name || CURRENT.ig_user_id), \`
    <div id="tagList" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      \${tags.length ? "" : '<span class="muted small">Hali teg yo\\'q</span>'}
      \${tags.map((t) => \`<span class="badge b-indigo" style="font-size:12px;padding:4px 11px">\${esc(t)}
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
  try { await saveTags([...(CURRENT.tags || []), t]); toast("Teg qo'shildi ✓"); }
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

loadData();`;
}
