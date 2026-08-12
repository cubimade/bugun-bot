// templates/settings-content.js — Sozlamalar sahifasi HTML qismi
// (13-audit: settings.js 792 qator edi — HTML shu faylga ajratildi)
import { ICONS } from "./components.js";

export function settingsContent() {
  return `
  <div style="display:grid;gap:14px;max-width:760px">

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.cpu} Bot sozlamalari</h3>
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
      <label class="lbl" style="display:flex;align-items:center;gap:6px">${ICONS.media} Story javobiga salomlashish (ixtiyoriy)</label>
      <input class="input" id="storyGreet" maxlength="300" placeholder="Masalan: Story'imga javob berganingiz uchun rahmat! 🙌" style="margin-bottom:14px">
      <label class="lbl" style="display:flex;align-items:center;gap:6px">${ICONS.media} Rasm kelganda javob (ixtiyoriy)</label>
      <input class="input" id="mediaImg" maxlength="500" placeholder="Rasmni oldim! 📸 Savolingizni yozib yuborsangiz, aniq javob beraman." style="margin-bottom:14px">
      <label class="lbl">🎤 Ovozli xabarga javob (ixtiyoriy)</label>
      <input class="input" id="mediaAud" maxlength="500" placeholder="Ovozli xabaringizni oldim 🎤 Savolingizni matn bilan yozing." style="margin-bottom:14px">
      <label class="lbl" style="display:flex;align-items:center;gap:6px">${ICONS.alert} So'kinish filtri — qo'pol so'zlar (vergul bilan; mos kelsa bot javob bermaydi, operatorga uzatiladi)</label>
      <input class="input" id="badWords" maxlength="1000" placeholder="so'z1, so'z2, ..." style="margin-bottom:14px">
      <label class="lbl" style="display:flex;align-items:center;gap:6px">${ICONS.tag} Brend nomi (sidebar'da ko'rinadi — white-label uchun)</label>
      <input class="input" id="brandName" maxlength="40" placeholder="BUGUN BOT" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="saveBotSettings(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.messageCircle} Salomlashish tugmalari</h3>
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
        <button class="btn btn-secondary btn-sm" onclick="addGbRow()" style="margin-bottom:14px">${ICONS.plus} Tugma qo'shish (maks 13)</button>
      </div>
      <button class="btn btn-primary" onclick="saveGreetingButtons(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.sparkle} AI sozlamalari</h3>
      <p class="small muted" style="margin-bottom:16px">Bot ikki modelni aqlli almashtiradi — xarajat va sifat muvozanati.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px" class="ai-cols">
        <div style="background:var(--panel2);border-radius:12px;padding:14px">
          <span class="pill pill-ok">Haiku 4.5</span>
          <div class="small muted" style="margin-top:8px">Oddiy, qisqa savollar — tez va tejamkor javob</div>
        </div>
        <div style="background:var(--panel2);border-radius:12px;padding:14px">
          <span class="pill pill-plain">Sonnet 5</span>
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
        <div><strong class="small" style="display:inline-flex;align-items:center;gap:6px">${ICONS.dollarSign} Sotuv rejimi</strong>
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
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.target} Lead magnit</h3>
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
          <button class="btn btn-secondary btn-sm" onclick="pickLmMedia()" title="Media kutubxonadan tanlash">${ICONS.media}</button>
        </div>
      </div>
      <button class="btn btn-primary" onclick="saveLeadMagnet(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.zap} Tezkor javoblar</h3>
      <p class="small muted" style="margin-bottom:14px">Inbox'da bir bosishda qo'yiladigan tayyor javoblar (masalan "Narxlar haqida", "Aloqa ma'lumoti").</p>
      <div id="qrList"><div class="skeleton" style="height:44px"></div></div>
      <div style="display:grid;gap:8px;margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        <input class="input" id="qrTitle" placeholder="Sarlavha (masalan: Narxlar haqida)" maxlength="80">
        <textarea class="input" id="qrText" rows="3" maxlength="1000" placeholder="Javob matni — inbox'da shu matn qo'yiladi..."></textarea>
        <button class="btn btn-primary" style="justify-self:start" onclick="addQuickReply(this)">${ICONS.plus} Qo'shish</button>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.tag} Avto-teglash qoidalari</h3>
      <p class="small muted" style="margin-bottom:14px">Mijoz xabarida so'z uchrasa — kontaktga avtomatik teg qo'yiladi (masalan "narx" → qiziqqan). Inbox va Kontaktlarda teg bo'yicha filtrlash mumkin.</p>
      <div id="trList"><div class="skeleton" style="height:44px"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:14px;border-top:1px solid var(--border);padding-top:14px" class="tr-cols">
        <input class="input" id="trWord" placeholder="So'z (masalan: narx)" maxlength="100">
        <input class="input" id="trTag" placeholder="Teg (masalan: qiziqqan)" maxlength="30">
        <button class="btn btn-primary" onclick="addTagRule(this)">${ICONS.plus}</button>
      </div>
    </div>

    <div class="card" id="usersCard" style="display:none">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.person} Jamoa (foydalanuvchilar)</h3>
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
        <button class="btn btn-plain btn-sm" onclick="loadAudit()">${ICONS.book} Audit log (kim nima o'zgartirdi)</button>
        <div id="auditList" style="margin-top:10px"></div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.bell} Telegram bildirishnomalar (admin)</h3>
      <p class="small muted" style="margin-bottom:14px">Muhim hodisalar Telegram'ingizga boradi. Telegram bot ulangan bo'lishi va chat ID kiritilishi kerak (@userinfobot orqali bilib oling).</p>
      <label class="lbl">Telegram chat ID</label>
      <input class="input" id="ntChat" maxlength="30" placeholder="123456789" style="margin-bottom:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px" class="ai-cols">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntHuman"> ${ICONS.helpCircle} "Odam kerak" suhbat</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntNegative"> ${ICONS.alert} Salbiy kayfiyat</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntBooking"> ${ICONS.calendar} Yangi bron</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntPayment"> ${ICONS.dollarSign} To'lov qilindi</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" class="small"><input type="checkbox" id="ntDown"> ${ICONS.alert} Tizim muammosi</label>
      </div>
      <button class="btn btn-primary" onclick="saveNotify(this)">${ICONS.check} Saqlash</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.chartBar} Haftalik hisobot (Telegram)</h3>
      <p class="small muted" style="margin-bottom:14px">Har dushanba ~09:00 da asosiy ko'rsatkichlar (xabarlar, yangi mijozlar, daromad, segmentlar + AI xulosa) Telegram'ingizga boradi. Telegram bot ulangan bo'lishi kerak. Chat ID'ni bilish uchun Telegram'da <strong>@userinfobot</strong> ga yozing.</p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <label class="switch"><input type="checkbox" id="repEnabled"><span class="slider"></span></label>
        <div><strong class="small">Hisobot yoqilgan</strong></div>
      </div>
      <label class="lbl">Telegram chat ID (masalan: 123456789)</label>
      <input class="input" id="repChat" maxlength="30" placeholder="123456789" style="margin-bottom:14px">
      <button class="btn btn-primary" onclick="saveReport(this)">${ICONS.check} Saqlash</button>
      <a class="btn btn-plain" href="/api/report/weekly.html" target="_blank" style="margin-left:8px">${ICONS.receipt} Hisobotni hozir ko'rish</a>
    </div>

    <div class="card" id="integCard" style="display:none">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.puzzle} Integratsiyalar</h3>
      <p class="small muted" style="margin-bottom:14px">Chiquvchi webhook: hodisa bo'lganda (yangi kontakt, sotuv, bron, to'lov) belgilangan URL'ga POST yuboriladi — n8n/Zapier/Make shu orqali ulanadi. Kontaktlar CSV eksporti (Google Sheets uchun): Kontaktlar sahifasida "⬇ CSV". Tashqi tizimlar uchun API: <code>GET/POST /api/v1/contacts</code> (X-API-Key bilan).</p>
      <strong class="small" style="display:inline-flex;align-items:center;gap:6px">${ICONS.broadcast} Chiquvchi webhooklar</strong>
      <div id="whList" style="margin:8px 0"><div class="skeleton" style="height:38px"></div></div>
      <div style="display:grid;gap:8px;margin-bottom:8px">
        <input class="input" id="whUrl" maxlength="300" placeholder="https://n8n.misol.uz/webhook/...">
        <div style="display:flex;gap:12px;flex-wrap:wrap" class="small">
          <label style="display:flex;gap:6px;cursor:pointer"><input type="checkbox" class="whEv" value="new_contact" checked> Yangi kontakt</label>
          <label style="display:flex;gap:6px;cursor:pointer"><input type="checkbox" class="whEv" value="won"> Sotuv</label>
          <label style="display:flex;gap:6px;cursor:pointer"><input type="checkbox" class="whEv" value="booking"> Bron</label>
          <label style="display:flex;gap:6px;cursor:pointer"><input type="checkbox" class="whEv" value="payment_paid"> To'lov</label>
          <button class="btn btn-sm btn-primary" onclick="addWebhook(this)">${ICONS.plus} Qo'shish</button>
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
      <strong class="small" style="display:inline-flex;align-items:center;gap:6px">${ICONS.key} API kalitlar (tashqi tizimlar uchun)</strong>
      <div id="akList" style="margin:8px 0"><div class="skeleton" style="height:32px"></div></div>
      <div style="display:flex;gap:8px">
        <input class="input" id="akName" maxlength="100" placeholder="Kalit nomi (masalan: CRM)">
        <button class="btn btn-sm btn-secondary" onclick="addApiKey(this)" title="Yangi API kalit">${ICONS.plus}</button>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">${ICONS.server} Tizim</h3>
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
}
