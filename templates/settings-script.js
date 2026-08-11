// templates/settings-script.js — Sozlamalar sahifasi klient JS (asosiy qism):
// sozlamalarni yuklash, bot/AI/follow-up/lead-magnit/salomlashish tugmalari
// (13-audit: settings.js 792 qator edi — klient JS shu faylga ajratildi)

export function settingsScriptMain() {
  return `
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
      <button class="btn btn-sm" onclick="GB_ROWS.splice(\${i},1);renderGbRows()" data-tip="O'chirish">🗑</button>
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
}`;
}
