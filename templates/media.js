// templates/media.js — 9.5: Media kutubxona sahifasi
// Galereya, yuklash (base64), o'chirish, URL nusxalash, portfolio belgisi
import { renderLayout } from "./layout.js";
import { ICONS } from "./components.js";

export function renderMediaPage() {
  const content = `
  <div class="card" style="margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <input type="file" id="fileInp" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4" style="display:none" onchange="uploadFile(this)">
      <button class="btn btn-primary" onclick="$('fileInp').click()">${ICONS.plus} Fayl yuklash</button>
      <span class="small muted">JPG, PNG, GIF, WEBP, PDF, MP4 · maks 5 MB / fayl</span>
      <span style="flex:1"></span>
      <div style="min-width:180px">
        <div class="small muted" style="margin-bottom:4px">Joy: <span id="usageTxt">—</span></div>
        <div style="height:6px;background:var(--panel2);border-radius:99px;overflow:hidden">
          <div id="usageBar" style="height:100%;width:0;background:var(--grad);border-radius:99px"></div>
        </div>
      </div>
    </div>
    <p class="small muted" style="margin-top:10px">⭐ Portfolio belgisi qo'yilgan rasmlar — mijoz "ishlaringizni ko'rsating" deb so'raganda bot avtomatik yuboradi. Media'ni inbox, flow va broadcast'da ishlatish mumkin.</p>
  </div>
  <div id="gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">
    ${'<div class="card skeleton" style="height:180px"></div>'.repeat(4)}
  </div>`;

  const script = `
let MEDIA = [];
async function loadMedia() {
  try {
    const r = await api("/api/media");
    MEDIA = r.media || [];
    const pct = Math.min(100, Math.round((r.totalSize / r.maxTotal) * 100));
    $("usageTxt").textContent = (r.totalSize / 1e6).toFixed(1) + " / 100 MB";
    $("usageBar").style.width = pct + "%";
    if (pct > 85) $("usageBar").style.background = "var(--danger)";
    renderGallery();
  } catch (e) { $("gallery").innerHTML = emptyState("⚠️", "Yuklashda xatolik: " + e.message); }
}
function renderGallery() {
  document.querySelector(".page-head h1").textContent = "Media · " + MEDIA.length + " ta";
  if (!MEDIA.length) {
    $("gallery").innerHTML = '<div style="grid-column:1/-1">' + emptyState("🖼", "Hali fayl yo'q — birinchisini yuklang") + "</div>";
    return;
  }
  $("gallery").innerHTML = MEDIA.map(function (m) {
    const preview = m.type === "image"
      ? '<img src="' + m.url + '" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:9px;background:var(--panel2)" loading="lazy">'
      : '<div style="height:120px;display:flex;align-items:center;justify-content:center;font-size:42px;background:var(--panel2);border-radius:9px">' + (m.type === "video" ? "🎬" : "📄") + "</div>";
    return '<div class="card" style="padding:10px">' +
      preview +
      '<div class="small" style="margin:8px 0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(m.name) + '">' +
        (m.is_portfolio ? "⭐ " : "") + esc(m.name) + "</div>" +
      '<div class="small muted" style="margin-bottom:8px">' + (m.size / 1024).toFixed(0) + " KB</div>" +
      '<div style="display:flex;gap:5px;flex-wrap:wrap">' +
        '<button class="btn btn-sm" onclick="copyUrl(' + m.id + ')" title="URL nusxalash">🔗</button>' +
        (m.type === "image" ? '<button class="btn btn-sm" onclick="togglePortfolio(' + m.id + "," + !m.is_portfolio + ')" title="Portfolio">' + (m.is_portfolio ? "⭐" : "☆") + "</button>" : "") +
        '<button class="btn btn-sm btn-danger" onclick="delMedia(' + m.id + ')" title="O\\'chirish">🗑</button>' +
      "</div></div>";
  }).join("");
}
function uploadFile(inp) {
  const f = inp.files && inp.files[0];
  if (!f) return;
  if (f.size > 5 * 1024 * 1024) { toast("Fayl juda katta (maks 5 MB)", false); inp.value = ""; return; }
  const reader = new FileReader();
  reader.onload = async function () {
    try {
      toast("Yuklanmoqda...");
      await postJson("/api/media", { name: f.name, data: reader.result });
      toast("Fayl yuklandi ✓");
      loadMedia();
    } catch (e) { toast("Xatolik: " + e.message, false); }
    inp.value = "";
  };
  reader.readAsDataURL(f);
}
function copyUrl(id) {
  const url = location.origin + "/media/" + id;
  navigator.clipboard.writeText(url).then(function () { toast("URL nusxalandi: " + url); })
    .catch(function () { prompt("URL:", url); });
}
async function togglePortfolio(id, val) {
  try {
    await postJson("/api/media/" + id + "/portfolio", { value: val });
    const m = MEDIA.find(function (x) { return x.id === id; });
    if (m) m.is_portfolio = val;
    renderGallery();
    toast(val ? "Portfolio'ga qo'shildi ⭐" : "Portfolio'dan olindi");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function delMedia(id) {
  const m = MEDIA.find(function (x) { return x.id === id; });
  openModal("Faylni o'chirish", '<p style="margin-bottom:16px">"<strong>' + esc(m ? m.name : "") + '</strong>" o\\'chirilsinmi? Bu fayl ishlatilgan flow/kalit so\\'zlarda rasm ochilmay qoladi.</p>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" onclick="closeModal()">Bekor</button>' +
    '<button class="btn btn-danger" onclick="doDelMedia(' + id + ')">Ha, o\\'chirish</button></div>');
}
async function doDelMedia(id) {
  try {
    await api("/api/media/" + id, { method: "DELETE" });
    closeModal(); toast("Fayl o'chirildi");
    loadMedia();
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
loadMedia();`;

  return renderLayout({
    title: "Media",
    active: "media",
    headerAction: "",
    content,
    script,
  });
}
