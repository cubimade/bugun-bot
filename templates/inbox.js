// templates/inbox.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";


// ============================================================
//  Qolgan sahifalar — vaqtinchalik (vazifa 3-8'da to'ldiriladi)
// ============================================================
// ============================================================
//  2. SUHBATLAR (Inbox) — /dashboard/inbox
//  Chap: suhbatlar ro'yxati (qidiruv + filtrlar). O'ng: to'liq chat.
// ============================================================
export function renderInboxPage() {
  const content = `
  <style>
    .inbox-wrap { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 170px); min-height: 460px; border: 1px solid var(--glass-border); border-radius: 18px; overflow: hidden; background: var(--glass-bg); backdrop-filter: blur(18px) saturate(160%); -webkit-backdrop-filter: blur(18px) saturate(160%); box-shadow: var(--shadow-glass), inset 0 1px 0 var(--rim-light); }
    .conv-list { border-right: 1px solid var(--border); display: flex; flex-direction: column; min-width: 0; }
    .conv-tools { padding: 12px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 9px; }
    .filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; background: var(--panel2); color: var(--muted); border: 1px solid var(--border); cursor: pointer; transition: all .18s; }
    .chip:hover { color: var(--text); }
    .chip.on { background: var(--grad); color: #fff; border-color: transparent; }
    .conv-items { flex: 1; overflow-y: auto; }
    .conv-item { display: flex; gap: 10px; padding: 11px 12px; cursor: pointer; border-left: 3px solid transparent; transition: background .15s; align-items: center; }
    .conv-item:hover { background: var(--panel2); }
    .conv-item.sel { background: rgba(99,102,241,.12); border-left-color: var(--accent); }
    .conv-item.human { border-left-color: var(--warn); }
    .conv-item.human.sel { border-left-color: var(--accent); }
    .chat-pane { display: flex; flex-direction: column; min-width: 0; background: var(--glass-bg); }
    .chat-head { padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--row-hover); display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
    .chat-msgs { flex: 1; overflow-y: auto; padding: 18px 16px; display: flex; flex-direction: column; gap: 4px; }
    .bubble-row { display: flex; margin-bottom: 6px; animation: bubbleIn .22s ease; }
    @keyframes bubbleIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
    .bubble { max-width: 74%; padding: 9px 13px; border-radius: 16px; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
    .bubble .t { font-size: 10px; opacity: .6; margin-top: 3px; text-align: right; }
    .from-user { justify-content: flex-start; }
    .from-user .bubble { background: var(--glass-bg-strong); backdrop-filter: blur(10px) saturate(160%); -webkit-backdrop-filter: blur(10px) saturate(160%); border: 1px solid var(--glass-border); box-shadow: inset 0 1px 0 var(--rim-light); border-bottom-left-radius: 5px; }
    .from-bot { justify-content: flex-end; }
    .from-bot .bubble { background: var(--gradient-brand); color: #fff; border-bottom-right-radius: 5px; box-shadow: 0 4px 14px rgba(99,102,241,.25); }
    .from-bot .bubble.from-op { background: rgba(34,211,238,.08); border: 1px solid rgba(34,211,238,.45); color: var(--text-1); box-shadow: none; }
    .op-tag { font-size: 10px; color: var(--accent-3); font-weight: 700; letter-spacing: .3px; margin-bottom: 3px; text-transform: uppercase; }
    .bubble-row.fresh .bubble { animation: freshGlow 1.8s ease; }
    @keyframes freshGlow { 0% { box-shadow: 0 0 0 3px rgba(34,211,238,.45); } 100% { box-shadow: 0 0 0 3px rgba(34,211,238,0); } }
    .composer { padding: 12px; border-top: 1px solid var(--border); background: var(--row-hover); display: flex; gap: 9px; align-items: flex-end; }
    .composer textarea { resize: none; max-height: 120px; min-height: 42px; }
    .back-btn { display: none; }
    @media (max-width: 900px) {
      .inbox-wrap { grid-template-columns: 1fr; height: calc(100vh - 150px); }
      .chat-pane { display: none; }
      .inbox-wrap.chat-open .conv-list { display: none; }
      .inbox-wrap.chat-open .chat-pane { display: flex; }
      .back-btn { display: inline-flex; }
    }
  </style>

  <div class="inbox-wrap" id="inboxWrap">
    <div class="conv-list">
      <div class="conv-tools">
        <input class="input" id="search" placeholder="🔍 Qidirish (ism, xabar)..." oninput="renderList()">
        <div class="filters" id="filters"></div>
      </div>
      <div class="conv-items" id="convItems">${'<div class="skeleton" style="height:58px;margin:8px 10px"></div>'.repeat(5)}</div>
      <div style="text-align:center;padding:8px">
        <button class="btn btn-sm" id="loadMore" style="display:none" onclick="loadMore()">⬇ Ko'proq yuklash</button>
      </div>
    </div>
    <div class="chat-pane" id="chatPane">
      <div id="chatEmpty" class="empty" style="margin:auto"><span class="emoji">💬</span>Suhbatni tanlang<br><span class="small muted">Chapdagi ro'yxatdan mijozni bosing</span></div>
      <div class="chat-head" id="chatHead" style="display:none"></div>
      <div class="chat-msgs" id="chatMsgs" style="display:none"></div>
      <div class="composer" id="composer" style="display:none">
        <button class="btn" onclick="openQuickReplies()" title="Tezkor javoblar" style="padding:9px 12px">⚡</button>
        <textarea class="input" id="replyText" rows="1" placeholder="Qo'lda javob yozish... (bot o'rniga siz)"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendReply();}"></textarea>
        <button class="btn btn-primary" id="sendBtn" onclick="sendReply()">${ICONS.send} Yuborish</button>
      </div>
    </div>
  </div>
  ${DRAWER_HTML}`;

  const script = `
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
          <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px">\${esc(c.name || c.ig_user_id)}</strong>
          \${c.needs_human ? '<span title="Odam kerak">🙋</span>' : ""}
          \${c.bot_paused ? '<span title="Bot pauzada — operator gaplashadi">🔕</span>' : ""}
          \${c.sentiment === "negative" ? '<span title="Salbiy kayfiyat — tez aralashing!">😟</span>' : ""}
          \${c.has_story ? '<span title="Story\\'ga javob yozgan">📸</span>' : ""}
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
      </div>
      <div class="small muted" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        \${esc(c.project_name || "")} · ID: \${esc(c.ig_user_id)}
        <span id="tagBadges">\${(c.tags || []).map((t) => \`<span class="badge b-indigo">\${esc(t)}</span>\`).join(" ")}</span>
      </div>
    </div>
    <button class="btn btn-sm" onclick="togglePause()" title="\${c.bot_paused ? "Bot bu suhbatda yana javob beradi" : "Bot bu suhbatda javob bermaydi — siz gaplashasiz"}">\${c.bot_paused ? "▶️ Botni yoqish" : "🔕 Botni pauza"}</button>
    <button class="btn btn-sm" onclick="openProfile(SELECTED)">👤 Profil</button>
    <button class="btn btn-sm" onclick="openTagEditor()" title="Teg qo'shish">🏷</button>
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

  return renderLayout({
    title: "Suhbatlar",
    active: "inbox",
    headerAction: `<a class="btn" href="/dashboard/contacts">${ICONS.contacts} Kontaktlar</a>`,
    content,
    script,
  });
}
