// templates/flows-editor-script.js — Flow muharriri klient JS
// (pan/zoom/drag/ulash — pointer events; 13-audit'da flows.js'dan ajratildi)

export function flowEditorScript(flowId) {
  return `
const FLOW_ID = ${Number(flowId)};
let FLOW = null, NODES = [], EDGES = [], SEQ = 1;
let VIEW = { x: 40, y: 20, z: 1 };
let SEL = null, DRAG = null, PAN = null, CONNECT = null, DIRTY = false;
const ICSTYLE = 'class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const TYPE_META = {
  message: { icon: '<svg ' + ICSTYLE + '><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 20l1.1-5.5a8.4 8.4 0 0 1-1-4A8.5 8.5 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z"/></svg>', label: "Xabar" },
  buttons: { icon: '<svg ' + ICSTYLE + '><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>', label: "Tugmalar" },
  condition: { icon: '<svg ' + ICSTYLE + '><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.7"/><path d="M12 17h.01"/></svg>', label: "Shart" },
  action: { icon: '<svg ' + ICSTYLE + '><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>', label: "Amal" },
  delay: { icon: '<svg ' + ICSTYLE + '><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>', label: "Kutish" },
};
const SVG_CLOSE_SM = '<svg class="ic" style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
const SVG_TRASH_SM = '<svg class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const SVG_PLUS_SM = '<svg class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const SVG_MEDIA_SM = '<svg class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg>';
const SVG_ALERT_SM = '<svg class="ic" style="width:12px;height:12px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const SVG_FLAG_SM = '<svg class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4h14l-3 4 3 4H4"/></svg>';
const SVG_NEXT_SM = '<svg class="ic" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
const ACTION_LABELS = { add_tag: "Teg qo'shish", remove_tag: "Tegni olib tashlash", handoff: "Operatorga uzatish", pause_bot: "Botni pauza qilish", set_stage: "Voronka bosqichi", give_promo: "Chegirma kodi berish" };

function ports(n) {
  if (n.type === "buttons") return (n.config.buttons || []).map(String);
  if (n.type === "condition") return ["ha", "yo'q"];
  return [null];
}
function summary(n) {
  const c = n.config || {};
  if (n.type === "message") return c.text ? esc(c.text) : '<i class="muted">matn kiriting…</i>';
  if (n.type === "buttons") return (c.text ? esc(c.text) : '<i class="muted">savol matni…</i>');
  if (n.type === "condition") return (c.kind === "has_tag" ? "Teg bor: " : c.kind === "subscribed" ? "Kanalga obuna (TG): " : "Xabarda so'z bor: ") + "<strong>" + esc(c.value || "?") + "</strong>";
  if (n.type === "action") return (ACTION_LABELS[c.action] || "amal tanlang…") + (c.value ? ": <strong>" + esc(c.value) + "</strong>" : "");
  if (n.type === "delay") {
    const warn = c.unit === "soat" && Number(c.amount) > 24;
    return (c.amount || 1) + " " + (c.unit || "daqiqa") + " kutish" + (warn ? ' <span style="color:var(--danger);display:inline-flex;align-items:center;gap:3px">' + SVG_ALERT_SM + " 24h+</span>" : "");
  }
  return "";
}

async function load() {
  try {
    const r = await api("/api/flows/" + FLOW_ID);
    FLOW = r.flow;
    NODES = (r.nodes || []).map(function (n) {
      return { ref: "s" + n.id, type: n.type, config: n.config || {}, x: n.position_x, y: n.position_y };
    });
    EDGES = (r.edges || []).map(function (e) {
      return { from: "s" + e.from_node_id, to: "s" + e.to_node_id, label: e.condition_label };
    });
    $("fName").value = FLOW.name;
    $("fTrigger").value = FLOW.trigger_type;
    $("fTrigVal").value = FLOW.trigger_value || "";
    $("fActive").checked = FLOW.is_active;
    onTriggerChange();
    document.querySelector(".page-head h1").textContent = "Muharrir: " + FLOW.name;
    renderAll();
  } catch (e) { toast("Yuklashda xatolik: " + e.message, false); }
}
function onTriggerChange() {
  const t = $("fTrigger").value;
  $("fTrigVal").style.display = (t === "keyword" || t === "comment" || t === "story") ? "" : "none";
  $("fTrigVal").placeholder = t === "story" ? "Kalit so'z (bo'sh = har qanday story javobi)" : "Kalit so'zlar (vergul bilan)";
}

// ---------- RENDER ----------
function applyView() {
  $("fbWorld").style.transform = "translate(" + VIEW.x + "px," + VIEW.y + "px) scale(" + VIEW.z + ")";
  $("zoomLbl").textContent = Math.round(VIEW.z * 100) + "%";
}
function renderAll() { renderNodes(); renderEdges(); applyView(); }
function renderNodes() {
  $("fbNodes").innerHTML = NODES.map(function (n) {
    const m = TYPE_META[n.type];
    const pr = ports(n).map(function (p, i) {
      return '<div class="fport-row"><span>' + (p === null ? "keyingi" : esc(p)) + ' →</span>' +
        '<span class="fdot" data-ref="' + n.ref + '" data-port="' + (p === null ? "" : esc(p)) + '"></span></div>';
    }).join("");
    return '<div class="fnode' + (SEL === n.ref ? " sel" : "") + '" data-ref="' + n.ref + '" style="left:' + n.x + "px;top:" + n.y + 'px">' +
      '<div class="fdot-in" data-ref="' + n.ref + '"></div>' +
      '<div class="fnode-head">' + m.icon + "<span>" + m.label + "</span>" +
        '<span class="fx" data-del="' + n.ref + '" title="O\\'chirish">' + SVG_CLOSE_SM + "</span></div>" +
      '<div class="fnode-body"><div class="fnode-sum">' + summary(n) + "</div>" + pr + "</div>" +
    "</div>";
  }).join("");
}
function portPos(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const w = $("fbWorld").getBoundingClientRect();
  return { x: (r.left + r.width / 2 - w.left) / VIEW.z, y: (r.top + r.height / 2 - w.top) / VIEW.z };
}
function edgePath(a, b) {
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  return "M" + a.x + "," + a.y + " C" + (a.x + dx) + "," + a.y + " " + (b.x - dx) + "," + b.y + " " + b.x + "," + b.y;
}
function renderEdges() {
  let html = "";
  EDGES.forEach(function (e, i) {
    const a = portPos('.fdot[data-ref="' + e.from + '"][data-port="' + (e.label || "") + '"]') ||
              portPos('.fdot[data-ref="' + e.from + '"]');
    const b = portPos('.fdot-in[data-ref="' + e.to + '"]');
    if (!a || !b) return;
    const d = edgePath(a, b);
    html += '<path class="fedge" d="' + d + '"/>' +
            '<path class="fedge-hit" data-ei="' + i + '" d="' + d + '"/>';
  });
  if (CONNECT && CONNECT.cur) {
    const a = portPos('.fdot[data-ref="' + CONNECT.from + '"][data-port="' + (CONNECT.label || "") + '"]');
    if (a) html += '<path class="fedge" style="opacity:.5;stroke-dasharray:6 4" d="' + edgePath(a, CONNECT.cur) + '"/>';
  }
  $("fbSvg").innerHTML = html;
}

// ---------- NODE QO'SHISH / O'CHIRISH ----------
function addNode(type) {
  const cv = $("fbCanvas").getBoundingClientRect();
  const x = Math.round((cv.width / 2 - VIEW.x) / VIEW.z - 105 + Math.random() * 40);
  const y = Math.round((cv.height / 2 - VIEW.y) / VIEW.z - 40 + Math.random() * 40);
  const defaults = {
    message: { text: "" },
    buttons: { text: "", buttons: ["Variant 1", "Variant 2"] },
    condition: { kind: "contains", value: "" },
    action: { action: "add_tag", value: "" },
    delay: { amount: 30, unit: "daqiqa" },
  };
  const n = { ref: "n" + SEQ++, type: type, config: defaults[type], x: x, y: y };
  NODES.push(n); DIRTY = true;
  renderAll();
  selectNode(n.ref);
}
function deleteNode(ref) {
  NODES = NODES.filter(function (n) { return n.ref !== ref; });
  EDGES = EDGES.filter(function (e) { return e.from !== ref && e.to !== ref; });
  if (SEL === ref) closePanel();
  DIRTY = true;
  renderAll();
}

// ---------- TANLASH / PANEL ----------
function selectNode(ref) {
  SEL = ref;
  renderNodes(); renderEdges();
  const n = NODES.find(function (x) { return x.ref === ref; });
  if (!n) return;
  $("fbPanel").style.display = "";
  $("fbPanelTitle").textContent = TYPE_META[n.type].label;
  $("fbPanelBody").innerHTML = panelForm(n);
}
function closePanel() {
  SEL = null;
  $("fbPanel").style.display = "none";
  renderNodes(); renderEdges();
}
function panelForm(n) {
  const c = n.config;
  if (n.type === "message") {
    return '<label class="lbl">Xabar matni ({ism} ishlaydi)</label>' +
      '<textarea class="input" rows="5" maxlength="900" oninput="cfg(\\'text\\', this.value)">' + esc(c.text || "") + "</textarea>" +
      '<label class="lbl" style="margin-top:10px">Rasm URL (ixtiyoriy, https://...)</label>' +
      '<input class="input" id="pnMediaUrl" maxlength="500" value="' + esc(c.media_url || "") + '" oninput="cfg(\\'media_url\\', this.value)">' +
      '<button class="btn btn-sm btn-plain" style="margin-top:6px" onclick="pickMedia()">' + SVG_MEDIA_SM + " Kutubxonadan tanlash</button>";
  }
  if (n.type === "buttons") {
    const btns = (c.buttons || []).map(function (b, i) {
      return '<div style="display:flex;gap:6px;margin-bottom:6px">' +
        '<input class="input" maxlength="20" value="' + esc(b) + '" oninput="renameBtn(' + i + ', this.value)">' +
        '<button class="btn btn-sm btn-plain" onclick="delBtn(' + i + ')">' + SVG_TRASH_SM + "</button></div>";
    }).join("");
    const urlRaw = (c.url_buttons || []).map(function (u) { return u.title + " | " + u.url; }).join("\\n");
    return '<label class="lbl">Savol matni</label>' +
      '<textarea class="input" rows="3" maxlength="900" oninput="cfg(\\'text\\', this.value)">' + esc(c.text || "") + "</textarea>" +
      '<label class="lbl" style="margin-top:10px">Tugmalar (2-5 ta, maks 20 belgi)</label>' + btns +
      '<button class="btn btn-sm btn-secondary" onclick="addBtn()">' + SVG_PLUS_SM + " Tugma</button>" +
      '<label class="lbl" style="margin-top:12px">URL tugmalar (ixtiyoriy, har qatorda: Sarlavha | https://...)</label>' +
      '<textarea class="input" rows="2" placeholder="Saytimiz | https://example.uz" oninput="setUrlButtons(this.value)">' + esc(urlRaw) + "</textarea>" +
      '<p class="small muted" style="margin-top:8px">Har tugmadan alohida chiziq torting — bosilganda o\\'sha yo\\'l davom etadi. URL tugmalar Telegram\\'da inline ochiladi, Instagram\\'da matn havola bo\\'lib boradi.</p>';
  }
  if (n.type === "condition") {
    return '<label class="lbl">Shart turi</label>' +
      '<select class="input" onchange="cfg(\\'kind\\', this.value)">' +
        '<option value="contains"' + (c.kind === "contains" ? " selected" : "") + '>Xabarda so\\'z bor</option>' +
        '<option value="has_tag"' + (c.kind === "has_tag" ? " selected" : "") + ">Kontaktda teg bor</option>" +
        '<option value="subscribed"' + (c.kind === "subscribed" ? " selected" : "") + ">Kanalga obuna (faqat Telegram)</option>" +
      "</select>" +
      '<label class="lbl" style="margin-top:10px">Qiymat (so\\'z, teg yoki @kanal)</label>' +
      '<input class="input" maxlength="100" value="' + esc(c.value || "") + '" oninput="cfg(\\'value\\', this.value)">' +
      '<p class="small muted" style="margin-top:8px">"ha" va "yo\\'q" chiqishlaridan mos yo\\'llarga chiziq torting. Obuna tekshirish uchun bot kanalda ADMIN bo\\'lishi shart.</p>';
  }
  if (n.type === "action") {
    return '<label class="lbl">Amal</label>' +
      '<select class="input" onchange="cfg(\\'action\\', this.value); selectNode(SEL)">' +
        Object.keys(ACTION_LABELS).map(function (k) {
          return '<option value="' + k + '"' + (c.action === k ? " selected" : "") + ">" + ACTION_LABELS[k] + "</option>";
        }).join("") +
      "</select>" +
      ((c.action === "add_tag" || c.action === "remove_tag" || c.action === "set_stage" || c.action === "give_promo")
        ? '<label class="lbl" style="margin-top:10px">' + (c.action === "set_stage" ? "Bosqich (new/interested/negotiation/won/lost)" : c.action === "give_promo" ? "Chegirma foizi (masalan: 10)" : "Teg nomi") + "</label>" +
          '<input class="input" maxlength="50" value="' + esc(c.value || "") + '" oninput="cfg(\\'value\\', this.value)">'
        : "");
  }
  if (n.type === "delay") {
    return '<label class="lbl">Qancha kutsin?</label>' +
      '<div style="display:flex;gap:8px">' +
        '<input class="input" type="number" min="1" max="10080" value="' + (c.amount || 30) + '" oninput="cfg(\\'amount\\', this.value)">' +
        '<select class="input" onchange="cfg(\\'unit\\', this.value)">' +
          '<option value="daqiqa"' + (c.unit !== "soat" ? " selected" : "") + ">daqiqa</option>" +
          '<option value="soat"' + (c.unit === "soat" ? " selected" : "") + ">soat</option>" +
        "</select>" +
      "</div>" +
      '<p class="small muted" style="margin-top:8px">24 soatdan uzun kutish: Instagram 24-soat qoidasi tufayli xabar yuborilmasligi mumkin. Mijoz kutish paytida yozsa — flow to\\'xtaydi, AI javob beradi.</p>';
  }
  return "";
}
function cfg(key, val) {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  n.config[key] = val;
  DIRTY = true;
  renderNodes(); renderEdges();
}
// 9.5: kutubxonadan rasm tanlash (message node uchun)
async function pickMedia() {
  try {
    const { media } = await api("/api/media");
    const imgs = (media || []).filter(function (m) { return m.type === "image"; });
    if (!imgs.length) return toast("Kutubxonada rasm yo'q — Media sahifasida yuklang", false);
    openModal("Rasm tanlash", '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;max-height:55vh;overflow-y:auto">' +
      imgs.map(function (m) {
        return '<div onclick="useMedia(' + m.id + ')" style="cursor:pointer"><img src="' + m.url + '" style="width:100%;height:76px;object-fit:cover;border-radius:8px" loading="lazy">' +
          '<div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px">' + esc(m.name) + "</div></div>";
      }).join("") + "</div>");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
function useMedia(id) {
  const url = location.origin + "/media/" + id;
  cfg("media_url", url);
  const inp = $("pnMediaUrl");
  if (inp) inp.value = url;
  closeModal();
  toast("Rasm tanlandi");
}
function setUrlButtons(raw) {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  n.config.url_buttons = raw.split("\\n").map(function (line) {
    const i = line.indexOf("|");
    if (i < 1) return null;
    const title = line.slice(0, i).trim(), url = line.slice(i + 1).trim();
    return title && /^https?:\\/\\//.test(url) ? { title: title, url: url } : null;
  }).filter(Boolean);
  DIRTY = true;
}
function addBtn() {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  n.config.buttons = n.config.buttons || [];
  if (n.config.buttons.length >= 5) return toast("Maksimum 5 ta tugma", false);
  n.config.buttons.push("Variant " + (n.config.buttons.length + 1));
  DIRTY = true;
  selectNode(SEL);
}
function delBtn(i) {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  const old = n.config.buttons[i];
  n.config.buttons.splice(i, 1);
  EDGES = EDGES.filter(function (e) { return !(e.from === n.ref && e.label === old); });
  DIRTY = true;
  selectNode(SEL);
}
function renameBtn(i, val) {
  const n = NODES.find(function (x) { return x.ref === SEL; });
  if (!n) return;
  const old = n.config.buttons[i];
  n.config.buttons[i] = val;
  EDGES.forEach(function (e) { if (e.from === n.ref && e.label === old) e.label = val; });
  DIRTY = true;
  renderNodes(); renderEdges();
}

// ---------- POINTER: drag / pan / ulash ----------
const cv = $("fbCanvas");
cv.addEventListener("pointerdown", function (e) {
  const dot = e.target.closest(".fdot");
  const del = e.target.closest("[data-del]");
  const nodeEl = e.target.closest(".fnode");
  if (del) { deleteNode(del.dataset.del); return; }
  if (dot) {
    CONNECT = { from: dot.dataset.ref, label: dot.dataset.port || null, cur: null };
    cv.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  const hit = e.target.closest(".fedge-hit");
  if (hit) {
    const i = Number(hit.dataset.ei);
    const eg = EDGES[i];
    openModal("Chiziqni o'chirish", '<p style="margin-bottom:16px">Bu ulanish o\\'chirilsinmi?' + (eg && eg.label ? ' ("' + esc(eg.label) + '")' : "") + "</p>" +
      '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-plain" onclick="closeModal()">Yo\\'q</button>' +
      '<button class="btn btn-danger" onclick="EDGES.splice(' + i + ',1);DIRTY=true;renderEdges();closeModal()">Ha, o\\'chirish</button></div>');
    return;
  }
  if (nodeEl && !e.target.closest("input,textarea,select,button")) {
    const n = NODES.find(function (x) { return x.ref === nodeEl.dataset.ref; });
    DRAG = { n: n, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
    cv.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  PAN = { sx: e.clientX, sy: e.clientY, ox: VIEW.x, oy: VIEW.y };
  cv.classList.add("panning");
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener("pointermove", function (e) {
  if (CONNECT) {
    const w = $("fbWorld").getBoundingClientRect();
    CONNECT.cur = { x: (e.clientX - w.left) / VIEW.z, y: (e.clientY - w.top) / VIEW.z };
    renderEdges();
  } else if (DRAG) {
    const dx = (e.clientX - DRAG.sx) / VIEW.z, dy = (e.clientY - DRAG.sy) / VIEW.z;
    if (Math.abs(dx) + Math.abs(dy) > 3) DRAG.moved = true;
    DRAG.n.x = Math.round(DRAG.ox + dx);
    DRAG.n.y = Math.round(DRAG.oy + dy);
    const el = document.querySelector('.fnode[data-ref="' + DRAG.n.ref + '"]');
    if (el) { el.style.left = DRAG.n.x + "px"; el.style.top = DRAG.n.y + "px"; }
    renderEdges();
  } else if (PAN) {
    VIEW.x = PAN.ox + (e.clientX - PAN.sx);
    VIEW.y = PAN.oy + (e.clientY - PAN.sy);
    applyView();
  }
});
cv.addEventListener("pointerup", function (e) {
  if (CONNECT) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const nodeEl = target && target.closest ? target.closest(".fnode, .fdot-in") : null;
    if (nodeEl && nodeEl.dataset.ref && nodeEl.dataset.ref !== CONNECT.from) {
      // Bitta portdan bitta chiziq — eskisini almashtiramiz
      EDGES = EDGES.filter(function (eg) { return !(eg.from === CONNECT.from && (eg.label || null) === CONNECT.label); });
      EDGES.push({ from: CONNECT.from, to: nodeEl.dataset.ref, label: CONNECT.label });
      DIRTY = true;
    }
    CONNECT = null;
    renderEdges();
  }
  if (DRAG) { if (!DRAG.moved) selectNode(DRAG.n.ref); else DIRTY = true; DRAG = null; }
  if (PAN) { PAN = null; cv.classList.remove("panning"); }
});
cv.addEventListener("wheel", function (e) {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 0.12 : -0.12);
}, { passive: false });
function zoomAt(cx, cy, dz) {
  const r = cv.getBoundingClientRect();
  const px = cx - r.left, py = cy - r.top;
  const wx = (px - VIEW.x) / VIEW.z, wy = (py - VIEW.y) / VIEW.z;
  VIEW.z = Math.min(2, Math.max(0.35, VIEW.z + dz));
  VIEW.x = px - wx * VIEW.z;
  VIEW.y = py - wy * VIEW.z;
  applyView(); renderEdges();
}
function zoomBy(dz) {
  const r = cv.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, dz);
}

// ---------- SAQLASH / SINASH ----------
async function saveAll(btn) {
  if (btn) btn.disabled = true;
  try {
    await postJson("/api/flows/" + FLOW_ID, {
      name: $("fName").value.trim() || "Nomsiz flow",
      trigger_type: $("fTrigger").value,
      trigger_value: $("fTrigVal").value.trim(),
      is_active: $("fActive").checked,
    });
    await postJson("/api/flows/" + FLOW_ID + "/graph", {
      nodes: NODES.map(function (n) { return { ref: n.ref, type: n.type, config: n.config, x: n.x, y: n.y }; }),
      edges: EDGES,
    });
    DIRTY = false;
    toast("Flow saqlandi");
    await load(); // server ID'lari bilan qayta sinxron
  } catch (e) { toast("Xatolik: " + e.message, false); }
  if (btn) btn.disabled = false;
}
async function testFlow() {
  try {
    if (DIRTY) await saveAll(null);
    const r = await api("/api/flows/" + FLOW_ID + "/simulate");
    const icons = {
      message: TYPE_META.message.icon, buttons: TYPE_META.buttons.icon, condition: TYPE_META.condition.icon,
      action: TYPE_META.action.icon, delay: TYPE_META.delay.icon, info: SVG_NEXT_SM, done: SVG_FLAG_SM, error: SVG_ALERT_SM,
    };
    openModal("Simulyatsiya", '<div style="display:grid;gap:8px;max-height:60vh;overflow-y:auto">' +
      (r.steps || []).map(function (s) {
        return '<div style="background:var(--panel2);border-radius:10px;padding:9px 12px;display:flex;align-items:center;gap:6px" class="small">' +
          (icons[s.type] || "") + "<span>" + esc(s.text) + "</span>" +
          (s.buttons && s.buttons.length ? '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">' + s.buttons.map(function (b) { return '<span class="pill pill-plain">' + esc(b) + "</span>"; }).join("") + "</div>" : "") +
        "</div>";
      }).join("") + "</div>");
  } catch (e) { toast("Xatolik: " + e.message, false); }
}
window.addEventListener("beforeunload", function (e) {
  if (DIRTY) { e.preventDefault(); e.returnValue = ""; }
});
load();`;
}
