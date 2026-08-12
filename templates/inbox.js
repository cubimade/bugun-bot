// templates/inbox.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
// 13-audit: 547 qatorli fayl bo'lindi — klient JS inbox-script.js'da.
import { renderLayout } from "./layout.js";
import { ICONS, DRAWER_HTML } from "./components.js";
import { inboxScript } from "./inbox-script.js";


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
    .chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; background: var(--panel2); color: var(--muted); border: 1px solid var(--border); cursor: pointer; transition: all .18s; }
    .chip .ic { width: 13px; height: 13px; }
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
    .op-tag svg { width: 11px; height: 11px; vertical-align: -1px; margin-right: 3px; }
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
        <input class="input" id="search" placeholder="Qidirish (ism, xabar)..." oninput="renderList()">
        <div class="filters" id="filters"></div>
      </div>
      <div class="conv-items" id="convItems">${'<div class="skeleton" style="height:58px;margin:8px 10px"></div>'.repeat(5)}</div>
      <div style="text-align:center;padding:8px">
        <button class="btn btn-plain btn-sm" id="loadMore" style="display:none" onclick="loadMore()">Ko'proq yuklash</button>
      </div>
    </div>
    <div class="chat-pane" id="chatPane">
      <div id="chatEmpty" class="empty" style="margin:auto"><span class="empty-ic">${ICONS.messageCircle}</span>Suhbatni tanlang<br><span class="small muted">Chapdagi ro'yxatdan mijozni bosing</span></div>
      <div class="chat-head" id="chatHead" style="display:none"></div>
      <div class="chat-msgs" id="chatMsgs" style="display:none"></div>
      <div class="composer" id="composer" style="display:none">
        <button class="btn btn-plain" onclick="openQuickReplies()" data-tip="Tezkor javoblar" style="padding:9px 12px">${ICONS.zap}</button>
        <button class="btn btn-plain" onclick="openMediaPicker()" data-tip="Media yuborish" style="padding:9px 12px">${ICONS.media}</button>
        <button class="btn btn-plain" onclick="openPaymentModal()" data-tip="To'lov havolasi yuborish" style="padding:9px 12px">${ICONS.card}</button>
        <textarea class="input" id="replyText" rows="1" placeholder="Qo'lda javob yozish... (bot o'rniga siz)"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendReply();}"></textarea>
        <button class="btn btn-primary" id="sendBtn" onclick="sendReply()">${ICONS.send} Yuborish</button>
      </div>
    </div>
  </div>
  ${DRAWER_HTML}`;

  return renderLayout({
    title: "Suhbatlar",
    active: "inbox",
    headerAction: `<a class="btn btn-secondary" href="/dashboard/contacts">${ICONS.contacts} Kontaktlar</a>`,
    content,
    script: inboxScript(),
  });
}
