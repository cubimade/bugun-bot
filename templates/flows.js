// templates/flows.js — 8.3: Flow builder sahifalari
// Ro'yxat (/dashboard/flows) va vizual muharrir (/dashboard/flows/:id)
// Muharrir: sof SVG (edge'lar) + HTML node kartalar + vanilla JS
// (pan/zoom/drag/ulash — pointer events, mobil'da ham ishlaydi)
// 13-audit: 633 qatorli fayl bo'lindi — ro'yxat flows-list.js'da,
// muharrir klient JS flows-editor-script.js'da.
import { renderLayout } from "./layout.js";
import { flowEditorScript } from "./flows-editor-script.js";

export { renderFlowsPage } from "./flows-list.js";

// ============================================================
//  MUHARRIR — /dashboard/flows/:id
// ============================================================
export function renderFlowEditorPage(flowId) {
  const content = `
  <div class="card" style="padding:10px 12px;margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center" id="metaBar">
    <a class="btn btn-sm" href="/dashboard/flows">←</a>
    <input class="input" id="fName" maxlength="120" style="max-width:200px" placeholder="Flow nomi">
    <select class="input" id="fTrigger" style="max-width:150px" onchange="onTriggerChange()">
      <option value="keyword">🔑 Kalit so'z</option>
      <option value="story">📸 Story javobi</option>
      <option value="comment">💬 Komment</option>
      <option value="new_contact">✨ Yangi mijoz</option>
      <option value="manual">🖐 Qo'lda</option>
    </select>
    <input class="input" id="fTrigVal" maxlength="300" style="max-width:200px" placeholder="Kalit so'zlar (vergul bilan)">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer" class="small">
      <input type="checkbox" id="fActive"> Faol
    </label>
    <span style="flex:1"></span>
    <button class="btn btn-sm" onclick="testFlow()">🧪 Sinab ko'rish</button>
    <button class="btn btn-sm btn-primary" onclick="saveAll(this)">💾 Saqlash</button>
  </div>

  <div class="fb-wrap">
    <div class="fb-palette card">
      <div class="small muted" style="margin-bottom:8px">Qadam qo'shish:</div>
      <button class="btn btn-sm" onclick="addNode('message')">💬 Xabar</button>
      <button class="btn btn-sm" onclick="addNode('buttons')">🔘 Tugmalar</button>
      <button class="btn btn-sm" onclick="addNode('condition')">❓ Shart</button>
      <button class="btn btn-sm" onclick="addNode('action')">⚡ Amal</button>
      <button class="btn btn-sm" onclick="addNode('delay')">⏱ Kutish</button>
      <div style="border-top:1px solid var(--border);margin:8px 0"></div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-sm" onclick="zoomBy(-0.15)">−</button>
        <span class="small muted" id="zoomLbl" style="min-width:40px;text-align:center">100%</span>
        <button class="btn btn-sm" onclick="zoomBy(0.15)">+</button>
      </div>
      <div class="small muted" style="margin-top:8px;line-height:1.5">Ulash: node o'ng chetidagi ⚪ dan boshqa nodega torting. Chiziqni o'chirish: ustiga bosing.</div>
    </div>

    <div class="fb-canvas card" id="fbCanvas">
      <div class="fb-world" id="fbWorld">
        <svg id="fbSvg" style="position:absolute;left:0;top:0;width:10px;height:10px;overflow:visible"></svg>
        <div id="fbNodes"></div>
      </div>
    </div>

    <div class="fb-panel card" id="fbPanel" style="display:none">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <strong id="fbPanelTitle" style="flex:1"></strong>
        <button class="modal-x" onclick="closePanel()">✕</button>
      </div>
      <div id="fbPanelBody"></div>
    </div>
  </div>

  <style>
    .fb-wrap { display:flex; gap:10px; align-items:stretch; height: calc(100vh - 210px); min-height:420px; }
    .fb-palette { width:150px; flex-shrink:0; display:flex; flex-direction:column; gap:6px; padding:12px; overflow-y:auto; }
    .fb-palette .btn { justify-content:flex-start; }
    .fb-canvas { flex:1; position:relative; overflow:hidden; padding:0 !important; touch-action:none; cursor:grab;
      background-image: radial-gradient(circle, var(--border) 1px, transparent 1px); background-size:24px 24px; }
    .fb-canvas.panning { cursor:grabbing; }
    .fb-world { position:absolute; left:0; top:0; transform-origin:0 0; }
    #fbNodes { position:absolute; left:0; top:0; }
    .fnode { position:absolute; width:210px; background:var(--panel); border:1.5px solid var(--border);
      border-radius:12px; box-shadow:0 4px 14px rgba(0,0,0,.18); user-select:none; cursor:move; }
    .fnode.sel { border-color:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent); }
    .fnode-head { display:flex; align-items:center; gap:6px; padding:8px 10px; font-weight:600; font-size:13px;
      border-bottom:1px solid var(--border); }
    .fnode-head .fx { margin-left:auto; cursor:pointer; opacity:.5; font-size:12px; padding:2px 4px; }
    .fnode-head .fx:hover { opacity:1; color:var(--danger); }
    .fnode-body { padding:6px 10px 8px; font-size:12px; color:var(--muted); }
    .fnode-sum { line-height:1.45; margin-bottom:4px; word-break:break-word; max-height:54px; overflow:hidden; }
    .fport-row { display:flex; align-items:center; justify-content:flex-end; gap:6px; position:relative;
      height:24px; font-size:11.5px; color:var(--text); }
    .fport-row .fdot { position:absolute; right:-17px; width:13px; height:13px; border-radius:50%;
      background:var(--accent); border:2px solid var(--panel); cursor:crosshair; }
    .fdot-in { position:absolute; left:-7px; top:16px; width:13px; height:13px; border-radius:50%;
      background:var(--muted); border:2px solid var(--panel); }
    .fedge { stroke:var(--accent); stroke-width:2.2; fill:none; opacity:.85; }
    .fedge-hit { stroke:transparent; stroke-width:16; fill:none; cursor:pointer; }
    .fedge-lbl { font-size:11px; fill:var(--muted); }
    .fb-panel { width:270px; flex-shrink:0; padding:14px; overflow-y:auto; }
    @media (max-width: 900px) {
      .fb-wrap { flex-direction:column; height:auto; }
      .fb-palette { width:100%; flex-direction:row; flex-wrap:wrap; }
      .fb-canvas { height:55vh; min-height:340px; }
      .fb-panel { width:100%; }
    }
  </style>`;

  return renderLayout({
    title: "Flow muharriri",
    active: "flows",
    headerAction: "",
    content,
    script: flowEditorScript(flowId),
  });
}
