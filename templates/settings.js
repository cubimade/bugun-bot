// templates/settings.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
import { renderLayout } from "./layout.js";
import { esc, I, ICONS, DRAWER_HTML, APP_VERSION, NAV_ITEMS } from "./components.js";

// ============================================================
//  7. SOZLAMALAR — /dashboard/settings
//  Bot sozlamalari · AI sozlamalari · Tizim holati
// ============================================================
export function renderSettingsPage() {
  const content = `
  <div style="display:grid;gap:14px;max-width:760px">

    <div class="card">
      <h3 style="margin-bottom:4px">🤖 Bot sozlamalari</h3>
      <p class="small muted" style="margin-bottom:16px">Ish vaqti va salomlashish — botning mijozlar bilan muomalasi.</p>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <label class="switch">
          <input type="checkbox" id="whEnabled" onchange="$('whFields').style.opacity=this.checked?'1':'.45'">
          <span class="slider"></span>
        </label>
        <div><strong class="small">Ish vaqti rejimi</strong>
        <div class="small muted">Yoqilsa — ish vaqtidan tashqari bot AI o'rniga tayyor xabar yuboradi</div></div>
      </div>
      <div id="whFields" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div><label class="lbl">Boshlanishi (soat)</label>
          <select class="input" id="whStart">${Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
        <div><label class="lbl">Tugashi (soat)</label>
          <select class="input" id="whEnd">${Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
      </div>
      <label class="lbl">Ish vaqtidan tashqari xabar</label>
      <textarea class="input" id="offMsg" rows="2" maxlength="500" style="margin-bottom:14px"></textarea>
      <label class="lbl">Salomlashish uslubi (birinchi xabarda, ixtiyoriy)</label>
      <input class="input" id="greetMsg" maxlength="300" placeholder="Masalan: Assalomu alaykum! BUGUN MEDIA'ga xush kelibsiz 👋" style="margin-bottom:14px">
      <label class="lbl">📸 Story javobiga salomlashish (ixtiyoriy)</label>
      <input class="input" id="storyGreet" maxlength="300" placeholder="Masalan: Story'imga javob berganingiz uchun rahmat! 🙌" style="margin-bottom:14px">
      <label class="lbl">🖼 Rasm kelganda javob (ixtiyoriy)</label>
      <input class="input" id="mediaImg" maxlength="500" placeholder="Rasmni oldim! 📸 Savolingizni yozib yuborsangiz, aniq javob beraman." style="margin-bottom:14px">
      <label class="lbl">🎤 Ovozli xabarga javob (ixtiyoriy)</label>
      <input class="input" id="mediaAud" maxlength="500" placeholder="Ovozli xabaringizni oldim 🎤 Savolingizni matn bilan yozing." style="margin-bottom:14px">
      <label class="lbl">🤬 So'kinish filtri — qo'pol so'zlar (vergul bilan; mos kelsa bot javob bermaydi, operatorga uzatiladi)</label>
      <input class="input" id="badWords" maxlength="1000" placeholder="so'z1, so'z2, ..." style="margin-bottom:14px">
      <label class="lbl">🏷 Brend nomi (sidebar'da ko'rinadi — white-label uchun)</label>
      <input class="input" id="brandName" maxlength="40" placeholder="BUGUN BOT" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="saveBotSettings(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🔘 Salomlashish tugmalari</h3>
      <p class="small muted" style="margin-bottom:14px">Yoqilsa — yangi mijozning birinchi xabariga AI o'rniga tayyor salom + tugmalar yuboriladi (masalan: Narxlar / Xizmatlar / Bog'lanish). Tugma bosilganda mos javob boradi. Tugma sarlavhasi 20 belgigacha.</p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <label class="switch"><input type="checkbox" id="gbEnabled" onchange="$('gbFields').style.opacity=this.checked?'1':'.45'"><span class="slider"></span></label>
        <div><strong class="small">Tugmalar yoqilgan</strong>
        <div class="small muted">O'chirilsa — yangi mijozga odatdagidek AI javob beradi</div></div>
      </div>
      <div id="gbFields">
        <label class="lbl">Salom matni (tugmalar bilan birga yuboriladi)</label>
        <textarea class="input" id="gbText" rows="2" maxlength="500" placeholder="Assalomu alaykum! 👋 Sizga qanday yordam bera olamiz? Quyidagi tugmalardan tanlang:" style="margin-bottom:12px"></textarea>
        <div id="gbList" style="display:grid;gap:10px;margin-bottom:12px"></div>
        <button class="btn btn-sm" onclick="addGbRow()" style="margin-bottom:14px">➕ Tugma qo'shish (maks 13)</button>
      </div>
      <button class="btn btn-primary" onclick="saveGreetingButtons(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🧠 AI sozlamalari</h3>
      <p class="small muted" style="margin-bottom:16px">Bot ikki modelni aqlli almashtiradi — xarajat va sifat muvozanati.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px" class="ai-cols">
        <div style="background:var(--panel2);border-radius:12px;padding:14px">
          <span class="badge b-green">Haiku 4.5</span>
          <div class="small muted" style="margin-top:8px">Oddiy, qisqa savollar — tez va tejamkor javob</div>
        </div>
        <div style="background:var(--panel2);border-radius:12px;padding:14px">
          <span class="badge b-indigo">Sonnet 5</span>
          <div class="small muted" style="margin-top:8px">Murakkab savollar (nega, taqqosla, strategiya...) va uzun xabarlar</div>
        </div>
      </div>
      <label class="lbl">Javob uzunligi</label>
      <select class="input" id="replyLen" style="margin-bottom:16px">
        <option value="qisqa">Qisqa (1-2 gap)</option>
        <option value="orta">O'rtacha (2-4 gap) — tavsiya</option>
        <option value="batafsil">Batafsil (4-6 gap)</option>
      </select>
      <label class="lbl">🌐 Qo'llab-quvvatlanadigan tillar (bot mijoz tilida javob beradi)</label>
      <div style="display:flex;gap:16px;margin-bottom:12px" class="small">
        <label style="display:flex;align-items:center;gap:6px;opacity:.7"><input type="checkbox" checked disabled> 🇺🇿 O'zbek</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="langRu"> 🇷🇺 Русский</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="langEn"> 🇬🇧 English</label>
      </div>
      <label class="lbl">Standart til (aniqlanmaganda)</label>
      <select class="input" id="defLang" style="margin-bottom:16px">
        <option value="uz">🇺🇿 O'zbek</option>
        <option value="ru">🇷🇺 Русский</option>
        <option value="en">🇬🇧 English</option>
      </select>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <label class="switch"><input type="checkbox" id="salesMode"><span class="slider"></span></label>
        <div><strong class="small">💼 Sotuv rejimi</strong>
        <div class="small muted">Bot shunchaki javob bermaydi: ehtiyojni aniqlaydi, yechim taklif qiladi, e'tirozlarga javob beradi va harakatga chaqiradi. Bilim bazasidagi "E'tirozlarga javoblar" bo'limidan foydalanadi.</div></div>
      </div>
      <button class="btn btn-primary" onclick="saveAiSettings(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">⏰ Follow-up (eslatma)</h3>
      <p class="small muted" style="margin-bottom:14px">Mijoz yozdi, bot javob berdi, mijoz jim qoldi — belgilangan vaqtdan keyin bot bir marta eslatadi. Instagram qoidasi: faqat mijozning oxirgi xabaridan 24 soat ichida yuboriladi.</p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <label class="switch"><input type="checkbox" id="fuEnabled" onchange="$('fuFields').style.opacity=this.checked?'1':'.45'"><span class="slider"></span></label>
        <div><strong class="small">Follow-up yoqilgan</strong>
        <div class="small muted">O'chirilsa hech qanday eslatma yuborilmaydi</div></div>
      </div>
      <div id="fuFields">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div><label class="lbl">Kutish vaqti</label>
            <select class="input" id="fuWait">
              <option value="4">4 soat</option>
              <option value="12">12 soat (tavsiya)</option>
              <option value="23">23 soat</option>
              <option value="48">48 soat (24h qoidasi tufayli kam ishlaydi)</option>
              <option value="72">3 kun (24h qoidasi tufayli kam ishlaydi)</option>
            </select></div>
          <div><label class="lbl">Maksimal urinishlar</label>
            <select class="input" id="fuMax">
              <option value="1">1 marta (tavsiya)</option>
              <option value="2">2 marta</option>
              <option value="3">3 marta</option>
            </select></div>
        </div>
        <label class="lbl">Eslatma matni ({ism} va {akkaunt} ishlaydi)</label>
        <textarea class="input" id="fuText" rows="2" maxlength="500" placeholder="{ism}, savolingiz qoldimi? 😊 Yordam kerak bo'lsa, bemalol yozing!" style="margin-bottom:14px"></textarea>
      </div>
      <button class="btn btn-primary" onclick="saveFollowupSettings(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🎁 Lead magnit</h3>
      <p class="small muted" style="margin-bottom:14px">Mijoz kalit so'z yozsa (masalan "PDF") — bot faylni yuboradi va kontaktga "lead" tegi qo'yiladi. Telegram'da fayl, Instagram'da rasm/havola bo'lib boradi.</p>
      <div id="lmStats" class="small muted" style="margin-bottom:12px"></div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <label class="switch"><input type="checkbox" id="lmEnabled" onchange="$('lmFields').style.opacity=this.checked?'1':'.45'"><span class="slider"></span></label>
        <div><strong class="small">Lead magnit yoqilgan</strong></div>
      </div>
      <div id="lmFields">
        <label class="lbl">Kalit so'zlar (vergul bilan)</label>
        <input class="input" id="lmKeyword" maxlength="200" placeholder="PDF, qo'llanma, checklist" style="margin-bottom:12px">
        <label class="lbl">Xabar matni (fayl bilan birga)</label>
        <textarea class="input" id="lmText" rows="2" maxlength="500" placeholder="Mana va'da qilingan material! 🎁" style="margin-bottom:12px"></textarea>
        <label class="lbl">Fayl URL (media kutubxonadan yoki tashqi https://)</label>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <input class="input" id="lmMedia" maxlength="500" placeholder="https://...">
          <button class="btn btn-sm" onclick="pickLmMedia()">📎</button>
        </div>
      </div>
      <button class="btn btn-primary" onclick="saveLeadMagnet(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">⚡ Tezkor javoblar</h3>
      <p class="small muted" style="margin-bottom:14px">Inbox'da bir bosishda qo'yiladigan tayyor javoblar (masalan "Narxlar haqida", "Aloqa ma'lumoti").</p>
      <div id="qrList"><div class="skeleton" style="height:44px"></div></div>
      <div style="display:grid;gap:8px;margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        <input class="input" id="qrTitle" placeholder="Sarlavha (masalan: Narxlar haqida)" maxlength="80">
        <textarea class="input" id="qrText" rows="3" maxlength="1000" placeholder="Javob matni — inbox'da shu matn qo'yiladi..."></textarea>
        <button class="btn btn-primary" style="justify-self:start" onclick="addQuickReply(this)">${ICONS.plus} Qo'shish</button>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🏷 Avto-teglash qoidalari</h3>
      <p class="small muted" style="margin-bottom:14px">Mijoz xabarida so'z uchrasa — kontaktga avtomatik teg qo'yiladi (masalan "narx" → qiziqqan). Inbox va Kontaktlarda teg bo'yicha filtrlash mumkin.</p>
      <div id="trList"><div class="skeleton" style="height:44px"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:14px;border-top:1px solid var(--border);padding-top:14px" class="tr-cols">
        <input class="input" id="trWord" placeholder="So'z (masalan: narx)" maxlength="100">
        <input class="input" id="trTag" placeholder="Teg (masalan: qiziqqan)" maxlength="30">
        <button class="btn btn-primary" onclick="addTagRule(this)">${ICONS.plus}</button>
      </div>
    </div>

    <div class="card" id="usersCard" style="display:none">
      <h3 style="margin-bottom:4px">👥 Jamoa (foydalanuvchilar)</h3>
      <p class="small muted" style="margin-bottom:14px">Jamoa a'zolari email + parol bilan kiradi. <strong>Owner</strong> — hamma narsa; <strong>Admin</strong> — foydalanuvchilardan tashqari hammasi; <strong>Operator</strong> — faqat Inbox va Kontaktlar (tanlangan akkauntlar bo'yicha). Asosiy parol (DASHBOARD_PASSWORD) bilan kirish har doim ishlaydi.</p>
      <div id="usersList"><div class="skeleton" style="height:44px"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 130px auto;gap:8px;margin-top:14px;border-top:1px solid var(--border);padding-top:14px" class="us-cols">
        <input class="input" id="nuEmail" type="email" placeholder="email@misol.uz">
        <input class="input" id="nuName" maxlength="100" placeholder="Ism">
        <select class="input" id="nuRole">
          <option value="operator">Operator</option>
          <option value="admin">Admin</option>
        </select>
        <button class="btn btn-primary" onclick="addUser(this)">${ICONS.plus}</button>
      </div>
      <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px">
        <button class="btn btn-sm" onclick="loadAudit()">📜 Audit log (kim nima o'zgartirdi)</button>
        <div id="auditList" style="margin-top:10px"></div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🔔 Telegram bildirishnomalar (admin)</h3>
      <p class="small muted" style="margin-bottom:14px">Muhim hodisalar Telegram'ingizga boradi. Telegram bot ulangan bo'lishi va chat ID kiritilishi kerak (@userinfobot orqali bilib oling).</p>
      <label class="lbl">Telegram chat ID</label>
      <input class="input" id="ntChat" maxlength="30" placeholder="123456789" style="margin-bottom:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px" class="ai-cols">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntHuman"> 🙋 "Odam kerak" suhbat</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntNegative"> 😟 Salbiy kayfiyat</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntBooking"> 📅 Yangi bron</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntPayment"> 💰 To'lov qilindi</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntDown"> ⚠️ Tizim muammosi</label>
      </div>
      <button class="btn btn-primary" onclick="saveNotify(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">📬 Haftalik hisobot (Telegram)</h3>
      <p class="small muted" style="margin-bottom:14px">Har dushanba ~09:00 da asosiy ko'rsatkichlar (xabarlar, yangi mijozlar, daromad, segmentlar + AI xulosa) Telegram'ingizga boradi. Telegram bot ulangan bo'lishi kerak. Chat ID'ni bilish uchun Telegram'da <strong>@userinfobot</strong> ga yozing.</p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <label class="switch"><input type="checkbox" id="repEnabled"><span class="slider"></span></label>
        <div><strong class="small">Hisobot yoqilgan</strong></div>
      </div>
      <label class="lbl">Telegram chat ID (masalan: 123456789)</label>
      <input class="input" id="repChat" maxlength="30" placeholder="123456789" style="margin-bottom:14px">
      <button class="btn btn-primary" onclick="saveReport(this)">${ICONS.check} Saqlash</button>
      <a class="btn" href="/api/report/weekly.html" target="_blank" style="margin-left:8px">🖨 Hisobotni hozir ko'rish</a>
    </div>

    <div class="card" id="integCard" style="display:none">
      <h3 style="margin-bottom:4px">🔌 Integratsiyalar</h3>
      <p class="small muted" style="margin-bottom:14px">Chiquvchi webhook: hodisa bo'lganda (yangi kontakt, sotuv, bron, to'lov) belgilangan URL'ga POST yuboriladi — n8n/Zapier/Make shu orqali ulanadi. Kontaktlar CSV eksporti (Google Sheets uchun): Kontaktlar sahifasida "⬇ CSV". Tashqi tizimlar uchun API: <code>GET/POST /api/v1/contacts</code> (X-API-Key bilan).</p>
      <strong class="small">📡 Chiquvchi webhooklar</strong>
      <div id="whList" style="margin:8px 0"><div class="skeleton" style="height:38px"></div></div>
      <div style="display:grid;gap:8px;margin-bottom:8px">
        <input class="input" id="whUrl" maxlength="300" placeholder="https://n8n.misol.uz/webhook/...">
        <div style="display:flex;gap:12px;flex-wrap:wrap" class="small">
          <label style="display:flex;gap:6px;cursor:pointer"><input type="checkbox" class="whEv" value="new_contact" checked> Yangi kontakt</label>
          <label style="display:flex;gap:6px;cursor:pointer"><input type="checkbox" class="whEv" value="won"> Sotuv</label>
          <label style="display:flex;gap:6px;cursor:pointer"><input type="checkbox" class="whEv" value="booking"> Bron</label>
          <label style="display:flex;gap:6px;cursor:pointer"><input type="checkbox" class="whEv" value="payment_paid"> To'lov</label>
          <button class="btn btn-sm btn-primary" onclick="addWebhook(this)">➕ Qo'shish</button>
        </div>
      </div>
      <details class="small muted" style="margin-bottom:14px"><summary style="cursor:pointer">n8n bilan ulash yo'riqnomasi</summary>
        <ol style="margin:8px 0 0 18px;line-height:1.8">
          <li>n8n'da yangi workflow → <strong>Webhook</strong> node qo'shing (HTTP Method: POST)</li>
          <li>Webhook URL'ni nusxalab yuqoridagi maydonga qo'ying, hodisalarni tanlang</li>
          <li>Qo'shilganda beriladigan <strong>secret</strong> bilan X-Bugun-Signature (HMAC-SHA256) imzosini tekshirishingiz mumkin</li>
          <li>"Test" tugmasi bilan sinab ko'ring — n8n'da test hodisa ko'rinadi</li>
        </ol>
      </details>
      <strong class="small">🔑 API kalitlar (tashqi tizimlar uchun)</strong>
      <div id="akList" style="margin:8px 0"><div class="skeleton" style="height:32px"></div></div>
      <div style="display:flex;gap:8px">
        <input class="input" id="akName" maxlength="100" placeholder="Kalit nomi (masalan: CRM)">
        <button class="btn btn-sm btn-primary" onclick="addApiKey(this)">➕</button>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">🖥 Tizim</h3>
      <p class="small muted" style="margin-bottom:16px">Server va database holati.</p>
      <div id="sysInfo"><div class="skeleton" style="height:100px"></div></div>
    </div>
  </div>

  <style>
    .switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; display: inline-block; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; inset: 0; background: var(--panel2); border: 1px solid var(--border); border-radius: 999px; cursor: pointer; transition: .25s; }
    .slider:before { content: ""; position: absolute; width: 18px; height: 18px; left: 2px; top: 2px; background: var(--muted); border-radius: 50%; transition: .25s; }
    .switch input:checked + .slider { background: var(--grad); border-color: transparent; }
    .switch input:checked + .slider:before { transform: translateX(20px); background: #fff; }
    @media (max-width: 600px) { .ai-cols { grid-template-columns: 1fr !important; } .tr-cols { grid-template-columns: 1fr !important; } .gb-cols { grid-template-columns: 1fr !important; } .us-cols { grid-template-columns: 1fr !important; } }
  </style>`;

  const script = `
async function loadSettings() {
  try {
    const { settings: s } = await api("/api/settings");
    $("whEnabled").checked = s.work_hours_enabled === "true";
    $("whFields").style.opacity = $("whEnabled").checked ? "1" : ".45";
    $("whStart").value = String(parseInt(s.work_start, 10) || 9);
    $("whEnd").value = String(parseInt(s.work_end, 10) || 21);
    $("offMsg").value = s.off_hours_message || "";
    $("greetMsg").value = s.greeting_message || "";
    $("storyGreet").value = s.story_reply_greeting || "";
    $("mediaImg").value = s.media_image_reply || "";
    $("mediaAud").value = s.media_audio_reply || "";
    $("badWords").value = s.bad_words || "";
    $("brandName").value = s.brand_name || "";
    $("replyLen").value = s.reply_length || "orta";
    $("salesMode").checked = s.sales_mode === "true";
    const langs = (s.supported_languages || "uz,ru,en").split(",");
    $("langRu").checked = langs.includes("ru");
    $("langEn").checked = langs.includes("en");
    $("defLang").value = s.default_language || "uz";
    $("fuEnabled").checked = s.followup_enabled === "true";
    $("fuFields").style.opacity = $("fuEnabled").checked ? "1" : ".45";
    $("fuWait").value = s.followup_wait_hours || "12";
    $("fuMax").value = s.followup_max || "1";
    $("fuText").value = s.followup_text || "";
    $("gbEnabled").checked = s.greeting_buttons_enabled === "true";
    $("gbFields").style.opacity = $("gbEnabled").checked ? "1" : ".45";
    $("gbText").value = s.greeting_buttons_text || "";
    try { GB_ROWS = JSON.parse(s.greeting_buttons || "[]"); } catch (e) { GB_ROWS = []; }
    if (!Array.isArray(GB_ROWS)) GB_ROWS = [];
    renderGbRows();
    $("lmEnabled").checked = s.lead_magnet_enabled === "true";
    $("lmFields").style.opacity = $("lmEnabled").checked ? "1" : ".45";
    $("lmKeyword").value = s.lead_magnet_keyword || "";
    $("lmText").value = s.lead_magnet_text || "";
    $("lmMedia").value = s.lead_magnet_media || "";
    $("repEnabled").checked = s.report_telegram_enabled === "true";
    $("repChat").value = s.report_tg_chat_id || "";
    $("ntChat").value = s.notify_tg_chat_id || "";
    $("ntHuman").checked = s.notify_human === "true";
    $("ntNegative").checked = s.notify_negative === "true";
    $("ntBooking").checked = s.notify_booking === "true";
    $("ntPayment").checked = s.notify_payment === "true";
    $("ntDown").checked = s.notify_down === "true";
  } catch (e) { toast("Sozlamalar yuklanmadi: " + e.message, false); }
}
// 12.3: bildirishnoma sozlamalari
async function saveNotify(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      notify_tg_chat_id: $("ntChat").value.trim(),
      notify_human: String($("ntHuman").checked),
      notify_negative: String($("ntNegative").checked),
      notify_booking: String($("ntBooking").checked),
      notify_payment: String($("ntPayment").checked),
      notify_down: String($("ntDown").checked),
    });
    toast("Bildirishnoma sozlamalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
// 11.7: haftalik hisobot sozlamalari
async function saveReport(btn) {
  if ($("repEnabled").checked && !$("repChat").value.trim()) {
    return toast("Chat ID kiriting (@userinfobot orqali bilib oling)", false);
  }
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      report_telegram_enabled: String($("repEnabled").checked),
      report_tg_chat_id: $("repChat").value.trim(),
    });
    toast("Hisobot sozlamalari saqlandi ✓ — har dushanba ~09:00 da boradi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
// 9.6: Lead magnit
async function loadLmStats() {
  try {
    const s = await api("/api/lead-magnet/stats");
    $("lmStats").innerHTML = "📊 Yuborilgan: <strong>" + s.sent + "</strong> ta · Mijozga aylangan (lead + sotildi): <strong>" + s.converted + "</strong> ta";
  } catch (e) { /* jim */ }
}
async function pickLmMedia() {
  try {
    const { media } = await api("/api/media");
    if (!media.length) return toast("Kutubxona bo'sh — Media sahifasida fayl yuklang", false);
    openModal("📎 Fayl tanlash", '<div style="display:grid;gap:8px;max-height:55vh;overflow-y:auto">' +
      media.map(function (m) {
        return '<button class="btn" style="justify-content:flex-start" onclick="$(\\'lmMedia\\').value=location.origin+\\'/media/' + m.id + '\\';closeModal();toast(\\'Fayl tanlandi ✓\\')">' +
          (m.type === "image" ? "🖼" : m.type === "video" ? "🎬" : "📄") + " " + esc(m.name) + "</button>";
      }).join("") + "</div>");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function saveLeadMagnet(btn) {
  if ($("lmEnabled").checked && !$("lmKeyword").value.trim()) {
    return toast("Kamida bitta kalit so'z kiriting", false);
  }
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      lead_magnet_enabled: String($("lmEnabled").checked),
      lead_magnet_keyword: $("lmKeyword").value.trim(),
      lead_magnet_text: $("lmText").value.trim(),
      lead_magnet_media: $("lmMedia").value.trim(),
    });
    toast("Lead magnit saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
loadLmStats();
// 8.1: Salomlashish tugmalari boshqaruvi
let GB_ROWS = [];
function renderGbRows() {
  if (!GB_ROWS.length) {
    $("gbList").innerHTML = '<span class="small muted">Hali tugma yo\\'q — "Tugma qo\\'shish" ni bosing</span>';
    return;
  }
  $("gbList").innerHTML = GB_ROWS.map((b, i) => \`
    <div style="display:grid;grid-template-columns:150px 1fr auto;gap:8px;align-items:start" class="gb-cols">
      <input class="input" maxlength="20" placeholder="Tugma (maks 20)" value="\${esc(b.title || "")}"
        oninput="GB_ROWS[\${i}].title=this.value">
      <textarea class="input" rows="2" maxlength="900" placeholder="Bosilganda yuboriladigan javob"
        oninput="GB_ROWS[\${i}].reply=this.value">\${esc(b.reply || "")}</textarea>
      <button class="btn btn-sm" onclick="GB_ROWS.splice(\${i},1);renderGbRows()" title="O'chirish">🗑</button>
    </div>\`).join("");
}
function addGbRow() {
  if (GB_ROWS.length >= 13) return toast("Maksimum 13 ta tugma", false);
  GB_ROWS.push({ title: "", reply: "" });
  renderGbRows();
}
async function saveGreetingButtons(btn) {
  const clean = GB_ROWS.map((b) => ({ title: (b.title || "").trim().slice(0, 20), reply: (b.reply || "").trim() }))
    .filter((b) => b.title && b.reply);
  if ($("gbEnabled").checked && !clean.length) return toast("Kamida bitta to'liq tugma kiriting (sarlavha + javob)", false);
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      greeting_buttons_enabled: String($("gbEnabled").checked),
      greeting_buttons_text: $("gbText").value.trim(),
      greeting_buttons: JSON.stringify(clean),
    });
    GB_ROWS = clean;
    renderGbRows();
    toast("Salomlashish tugmalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function saveBotSettings(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      work_hours_enabled: String($("whEnabled").checked),
      work_start: $("whStart").value,
      work_end: $("whEnd").value,
      off_hours_message: $("offMsg").value.trim(),
      greeting_message: $("greetMsg").value.trim(),
      story_reply_greeting: $("storyGreet").value.trim(),
      media_image_reply: $("mediaImg").value.trim(),
      media_audio_reply: $("mediaAud").value.trim(),
      bad_words: $("badWords").value.trim(),
      brand_name: $("brandName").value.trim(),
    });
    toast("Bot sozlamalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function saveFollowupSettings(btn) {
  btn.disabled = true;
  try {
    await postJson("/api/settings", {
      followup_enabled: String($("fuEnabled").checked),
      followup_wait_hours: $("fuWait").value,
      followup_max: $("fuMax").value,
      followup_text: $("fuText").value.trim(),
    });
    toast("Follow-up sozlamalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function saveAiSettings(btn) {
  btn.disabled = true;
  try {
    const langs = ["uz"];
    if ($("langRu").checked) langs.push("ru");
    if ($("langEn").checked) langs.push("en");
    await postJson("/api/settings", {
      reply_length: $("replyLen").value,
      sales_mode: String($("salesMode").checked),
      supported_languages: langs.join(","),
      default_language: $("defLang").value,
    });
    toast("AI sozlamalari saqlandi ✓");
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
// 7.8: Avto-teg qoidalari boshqaruvi
let TAG_RULES = [];
async function loadTagRules() {
  try {
    const { rules } = await api("/api/tag-rules");
    TAG_RULES = rules || [];
    renderTagRules();
  } catch (e) { $("trList").innerHTML = '<span class="small muted">Yuklanmadi: ' + esc(e.message) + "</span>"; }
}
function renderTagRules() {
  if (!TAG_RULES.length) { $("trList").innerHTML = '<span class="small muted">Hali qoida yo\\'q</span>'; return; }
  $("trList").innerHTML = TAG_RULES.map((r) => \`
    <div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--border);\${r.is_active ? "" : "opacity:.5"}">
      <span class="small" style="flex:1;min-width:0">"<strong>\${esc(r.keyword)}</strong>" → <span class="badge b-indigo">\${esc(r.tag_name)}</span>
        <span class="muted">\${r.project_name ? "· " + esc(r.project_name) : ""}</span></span>
      <button class="btn btn-sm" onclick="toggleTagRule(\${r.id}, \${!r.is_active})" title="\${r.is_active ? "To'xtatish" : "Yoqish"}">\${r.is_active ? "⏸" : "▶️"}</button>
      <button class="btn btn-sm" onclick="delTagRule(\${r.id})" title="O'chirish">🗑</button>
    </div>\`).join("");
}
async function addTagRule(btn) {
  const keyword = $("trWord").value.trim();
  const tag_name = $("trTag").value.trim();
  if (!keyword || !tag_name) return toast("So'z va teg majburiy", false);
  btn.disabled = true;
  try {
    await postJson("/api/tag-rules", { keyword, tag_name });
    $("trWord").value = ""; $("trTag").value = "";
    toast("Qoida qo'shildi ✓");
    loadTagRules();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function toggleTagRule(id, val) {
  try {
    await postJson("/api/tag-rules/" + id, { is_active: val });
    const r = TAG_RULES.find((x) => x.id === id);
    if (r) r.is_active = val;
    renderTagRules();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function delTagRule(id) {
  try {
    await api("/api/tag-rules/" + id, { method: "DELETE" });
    TAG_RULES = TAG_RULES.filter((x) => x.id !== id);
    renderTagRules();
    toast("Qoida o'chirildi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadTagRules();

function fmtUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return (d ? d + " kun " : "") + (h ? h + " soat " : "") + m + " daqiqa";
}
async function loadSystem() {
  try {
    const s = await api("/api/system");
    $("sysInfo").innerHTML = \`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
        \${sysRow("Versiya", "v" + s.version)}
        \${sysRow("Server", '<span class="dot dot-green"></span> ishlayapti')}
        \${sysRow("Database", s.db ? '<span class="dot dot-green"></span> ulangan' : '<span class="dot dot-red"></span> uzilgan')}
        \${sysRow("Akkauntlar", s.accounts + " ta faol")}
        \${sysRow("Oxirgi deploy", fmt(s.startedAt))}
        \${sysRow("Ishlash vaqti", fmtUptime(s.uptimeSec))}
        \${sysRow("Node.js", s.node)}
      </div>\`;
  } catch (e) { $("sysInfo").innerHTML = emptyState("🖥", "Tizim ma'lumoti yuklanmadi"); }
}
function sysRow(label, valueHtml) {
  return \`<div style="background:var(--panel2);border-radius:12px;padding:12px">
    <div class="small muted" style="margin-bottom:4px">\${label}</div>
    <div style="display:flex;align-items:center;gap:7px;font-weight:600;font-size:13px">\${valueHtml}</div></div>\`;
}
// C2: Tezkor javoblarni boshqarish
async function loadQuickReplies() {
  try {
    const { replies } = await api("/api/saved-replies");
    if (!replies.length) {
      $("qrList").innerHTML = emptyState("⚡", "Hali tezkor javob yo'q — birinchisini qo'shing");
      return;
    }
    $("qrList").innerHTML = replies.map((r) => \`
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="min-width:0;flex:1">
          <strong class="small" style="display:block">\${esc(r.title)}</strong>
          <span class="small muted" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(r.text)}</span>
        </div>
        <button class="btn btn-sm btn-danger" onclick="deleteQuickReply(\${r.id})" title="O'chirish">✕</button>
      </div>\`).join("");
  } catch (e) { $("qrList").innerHTML = emptyState("⚡", "Yuklanmadi: " + e.message); }
}
async function addQuickReply(btn) {
  const title = $("qrTitle").value.trim();
  const text = $("qrText").value.trim();
  if (!title || !text) return toast("Sarlavha va matn majburiy", false);
  btn.disabled = true;
  try {
    await postJson("/api/saved-replies", { title, text });
    $("qrTitle").value = ""; $("qrText").value = "";
    toast("Tezkor javob qo'shildi ✓");
    loadQuickReplies();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function deleteQuickReply(id) {
  try {
    await api("/api/saved-replies/" + id, { method: "DELETE" });
    toast("O'chirildi");
    loadQuickReplies();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
// ===== 12.1: foydalanuvchilar boshqaruvi (faqat owner ko'radi) =====
let USERS = [], US_PROJECTS = [];
async function initUsers() {
  try {
    const me = await api("/api/me");
    if (me.user.role !== "owner") return;
    $("usersCard").style.display = "";
    const p = await api("/api/projects");
    US_PROJECTS = (p.projects || []);
    loadUsers();
  } catch (e) { /* legacy — usersCard owner uchun ochiladi */ }
}
async function loadUsers() {
  try {
    const { users } = await api("/api/users");
    USERS = users || [];
    renderUsers();
  } catch (e) { $("usersList").innerHTML = '<span class="small muted">Yuklanmadi: ' + esc(e.message) + "</span>"; }
}
function renderUsers() {
  if (!USERS.length) { $("usersList").innerHTML = '<span class="small muted">Hali jamoa a\\'zosi yo\\'q — pastda qo\\'shing</span>'; return; }
  const ROLE_LBL = { owner: "👑 Owner", admin: "🛠 Admin", operator: "🎧 Operator" };
  $("usersList").innerHTML = USERS.map(function (u) {
    const projs = (u.project_ids || []).map(function (pid) {
      const p = US_PROJECTS.find(function (x) { return x.id === pid; });
      return p ? p.name : "#" + pid;
    });
    return '<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;' + (u.is_active ? "" : "opacity:.5") + '">' +
      '<span class="small" style="flex:1;min-width:0"><strong>' + esc(u.name || u.email) + "</strong>" +
        ' <span class="muted">' + esc(u.email) + "</span><br>" +
        '<span class="badge ' + (u.role === "owner" ? "b-green" : u.role === "admin" ? "b-indigo" : "b-gray") + '">' + ROLE_LBL[u.role] + "</span>" +
        (u.role === "operator" ? ' <span class="muted small">' + (projs.length ? "akkauntlar: " + esc(projs.join(", ")) : "barcha akkauntlar") + "</span>" : "") +
        (u.last_login ? ' <span class="muted small">· oxirgi kirish: ' + timeAgo(u.last_login) + "</span>" : "") + "</span>" +
      (u.role !== "owner" ? '<button class="btn btn-sm" onclick="editUserProjects(' + u.id + ')" title="Akkauntlarni biriktirish">📱</button>' : "") +
      '<button class="btn btn-sm" onclick="resetUserPassword(' + u.id + ')" title="Parolni yangilash">🔑</button>' +
      (u.role !== "owner" ? '<button class="btn btn-sm" onclick="toggleUser(' + u.id + "," + !u.is_active + ')">' + (u.is_active ? "⏸" : "▶️") + "</button>" +
        '<button class="btn btn-sm" onclick="delUser(' + u.id + ')">🗑</button>' : "") +
    "</div>";
  }).join("");
}
async function addUser(btn) {
  const email = $("nuEmail").value.trim();
  if (!email) return toast("Email kiriting", false);
  btn.disabled = true;
  try {
    const r = await postJson("/api/users", { email, name: $("nuName").value.trim(), role: $("nuRole").value });
    openModal("✅ Foydalanuvchi qo'shildi", '<p style="line-height:1.8">Vaqtinchalik parol (bir marta ko\\'rsatiladi, nusxalab yuboring):</p>' +
      '<div class="card" style="padding:14px;text-align:center;font-size:18px;font-weight:700;letter-spacing:1px;margin:10px 0">' + esc(r.tempPassword) + "</div>" +
      '<p class="small muted">Kirish: ' + location.origin + "/login — email: " + esc(email) + "</p>" +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" onclick="closeModal()">Yopish</button></div>');
    $("nuEmail").value = ""; $("nuName").value = "";
    loadUsers();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
function editUserProjects(id) {
  const u = USERS.find(function (x) { return x.id === id; });
  const cur = u.project_ids || [];
  openModal("📱 Akkauntlar — " + esc(u.name || u.email), '<p class="small muted" style="margin-bottom:10px">Operator faqat belgilangan akkauntlarning suhbatlarini ko\\'radi. Hech biri belgilanmasa — hammasini ko\\'radi.</p>' +
    US_PROJECTS.map(function (p) {
      return '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer" class="small">' +
        '<input type="checkbox" class="upChk" value="' + p.id + '"' + (cur.includes(p.id) ? " checked" : "") + "> " + esc(p.name) + "</label>";
    }).join("") +
    '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">' +
      '<button class="btn" onclick="closeModal()">Bekor</button>' +
      '<button class="btn btn-primary" onclick="saveUserProjects(' + id + ')">Saqlash</button></div>');
}
async function saveUserProjects(id) {
  const ids = Array.from(document.querySelectorAll(".upChk:checked")).map(function (c) { return Number(c.value); });
  try {
    await postJson("/api/users/" + id, { project_ids: ids });
    closeModal(); toast("Saqlandi ✓");
    loadUsers();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function resetUserPassword(id) {
  try {
    const r = await postJson("/api/users/" + id, { reset_password: true });
    openModal("🔑 Yangi parol", '<div class="card" style="padding:14px;text-align:center;font-size:18px;font-weight:700;letter-spacing:1px;margin:10px 0">' + esc(r.tempPassword) + "</div>" +
      '<p class="small muted">Bir marta ko\\'rsatiladi — nusxalab yuboring.</p>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" onclick="closeModal()">Yopish</button></div>');
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function toggleUser(id, val) {
  try {
    await postJson("/api/users/" + id, { is_active: val });
    loadUsers();
    toast(val ? "Faollashtirildi ▶️" : "To'xtatildi ⏸");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function delUser(id) {
  const u = USERS.find(function (x) { return x.id === id; });
  openModal("Foydalanuvchini o'chirish", '<p style="margin-bottom:16px"><strong>' + esc(u ? (u.name || u.email) : "") + '</strong> o\\'chirilsinmi?</p>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" onclick="closeModal()">Bekor</button>' +
    '<button class="btn btn-danger" onclick="doDelUser(' + id + ')">Ha, o\\'chirish</button></div>');
}
async function doDelUser(id) {
  try {
    await api("/api/users/" + id, { method: "DELETE" });
    closeModal(); toast("O'chirildi");
    loadUsers();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function loadAudit() {
  $("auditList").innerHTML = skeletonRows(3, 30);
  try {
    const { log } = await api("/api/audit-log");
    $("auditList").innerHTML = log.length ? log.map(function (l) {
      return '<div class="small" style="padding:5px 0;border-bottom:1px solid var(--border)">' +
        '<span class="muted">' + fmt(l.created_at) + "</span> · <strong>" + esc(l.user_label || "system") + "</strong> · " +
        esc(l.action) + (l.details ? ' <span class="muted">(' + esc(l.details) + ")</span>" : "") + "</div>";
    }).join("") : '<span class="small muted">Hali yozuv yo\\'q</span>';
  } catch (e) { $("auditList").innerHTML = '<span class="small muted">Yuklanmadi: ' + esc(e.message) + "</span>"; }
}
// ===== 12.4: integratsiyalar (owner/admin) =====
async function initInteg() {
  try {
    const me = await api("/api/me");
    if (!["owner", "admin"].includes(me.user.role)) return;
    $("integCard").style.display = "";
    loadWebhooks();
    if (me.user.role === "owner") loadApiKeys();
    else $("akList").innerHTML = '<span class="small muted">Faqat owner boshqaradi</span>';
  } catch (e) { /* jim */ }
}
const EV_LBL = { new_contact: "yangi kontakt", won: "sotuv", booking: "bron", payment_paid: "to'lov" };
async function loadWebhooks() {
  try {
    const { webhooks } = await api("/api/webhooks");
    $("whList").innerHTML = webhooks.length ? webhooks.map(function (w) {
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;' + (w.is_active ? "" : "opacity:.5") + '">' +
        '<span class="small" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(w.url) +
        ' <span class="muted">(' + (w.events || []).map(function (e) { return EV_LBL[e] || e; }).join(", ") + ")</span></span>" +
        '<button class="btn btn-sm" onclick="testWebhook(' + w.id + ')" title="Test yuborish">🧪</button>' +
        '<button class="btn btn-sm" onclick="toggleWebhook(' + w.id + "," + !w.is_active + ')">' + (w.is_active ? "⏸" : "▶️") + "</button>" +
        '<button class="btn btn-sm" onclick="delWebhook(' + w.id + ')">🗑</button></div>';
    }).join("") : '<span class="small muted">Hali webhook yo\\'q</span>';
  } catch (e) { $("whList").innerHTML = '<span class="small muted">Yuklanmadi</span>'; }
}
async function addWebhook(btn) {
  const url = $("whUrl").value.trim();
  const events = Array.from(document.querySelectorAll(".whEv:checked")).map(function (c) { return c.value; });
  if (!url) return toast("URL kiriting", false);
  btn.disabled = true;
  try {
    const r = await postJson("/api/webhooks", { url, events });
    openModal("✅ Webhook qo'shildi", '<p class="small" style="margin-bottom:8px">Imzo tekshirish uchun secret (bir marta ko\\'rsatiladi):</p>' +
      '<div class="card" style="padding:12px;font-family:monospace;font-size:13px;word-break:break-all">' + esc(r.secret) + "</div>" +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" onclick="closeModal()">Yopish</button></div>');
    $("whUrl").value = "";
    loadWebhooks();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
async function testWebhook(id) {
  try {
    const r = await postJson("/api/webhooks/" + id + "/test", {});
    toast(r.ok ? "Test yuborildi ✓ (HTTP " + r.status + ")" : "Yuborilmadi: " + (r.error || "HTTP " + r.status), r.ok);
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
async function toggleWebhook(id, val) {
  try { await postJson("/api/webhooks/" + id, { is_active: val }); loadWebhooks(); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
async function delWebhook(id) {
  try { await api("/api/webhooks/" + id, { method: "DELETE" }); loadWebhooks(); toast("O'chirildi"); }
  catch (e) { toast("Xatolik: " + e.message, false); }
}
async function loadApiKeys() {
  try {
    const { keys } = await api("/api/api-keys");
    $("akList").innerHTML = keys.length ? keys.map(function (k) {
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)" class="small">' +
        "<span style='flex:1'>🔑 " + esc(k.name) + ' <span class="muted">' + esc(k.key_hint || "") + (k.last_used ? " · ishlatilgan: " + timeAgo(k.last_used) : "") + "</span></span>" +
        '<button class="btn btn-sm" onclick="delApiKey(' + k.id + ')">🗑</button></div>';
    }).join("") : '<span class="small muted">Hali kalit yo\\'q</span>';
  } catch (e) { /* jim */ }
}
async function addApiKey(btn) {
  btn.disabled = true;
  try {
    const r = await postJson("/api/api-keys", { name: $("akName").value.trim() || "API kalit" });
    openModal("🔑 API kalit yaratildi", '<p class="small" style="margin-bottom:8px">Bir marta ko\\'rsatiladi — nusxalab oling:</p>' +
      '<div class="card" style="padding:12px;font-family:monospace;font-size:13px;word-break:break-all">' + esc(r.key) + "</div>" +
      '<p class="small muted" style="margin-top:10px">Ishlatish: <code>curl -H "X-API-Key: ..." ' + location.origin + "/api/v1/contacts</code></p>" +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" onclick="closeModal()">Yopish</button></div>');
    $("akName").value = "";
    loadApiKeys();
  } catch (e) { toast("Xatolik: " + e.message, false); }
  btn.disabled = false;
}
initInteg();
initUsers();
loadSettings(); loadSystem(); loadQuickReplies();`;

  return renderLayout({
    title: "Sozlamalar",
    active: "settings",
    headerAction: "",
    content,
    script,
  });
}
