// ============================================================
//  SERVICES/FLOW-ENGINE.JS — 8.2: flow motori
//  Trigger tekshirish → node bajarish → edge bo'yicha o'tish.
//  Har node try/catch bilan: xato bo'lsa flow to'xtaydi va bot
//  AI rejimiga qaytadi (mijoz javobsiz qolmasin).
//  Node turlari: message / buttons / condition / action / delay
// ============================================================
import { state, ACCOUNTS_MAP } from "../state.js";
import { IG_TOKEN } from "../config.js";
import { sendPrivateReply } from "../instagram.js";
import { senderFor } from "./channels.js";
import {
  saveMessage,
  setBotPaused,
  setNeedsHuman,
  addContactTags,
  removeContactTag,
  getContact,
  setContactStage,
  insertPromoCode,
  getFlowNode,
  getOutgoingEdges,
  getStartNode,
  findTriggerFlow,
  getActiveFlowState,
  createFlowState,
  updateFlowState,
  claimDueFlowStates,
} from "../db.js";

const MAX_STEPS = 25; // cheksiz tsikldan himoya (bitta faollashuvda)

// {ism} / {akkaunt} o'zgaruvchilari
function applyVars(text, ctx) {
  return String(text || "")
    .replaceAll("{ism}", (ctx.name || "").trim() || "do'st")
    .replaceAll("{akkaunt}", ctx.projectName || "");
}

// Platforma adapteri (9.1): IG yoki Telegram — bir xil interfeys
function sendOf(ctx) {
  return senderFor(ctx.platform || "instagram", ctx.token);
}

// Birinchi xabar komment orqali kelgan bo'lsa — private reply (comment_id),
// keyingilari oddiy DM. ctx.commentId bir marta ishlatiladi (faqat IG).
async function sendText(ctx, text) {
  if (ctx.commentId) {
    const cid = ctx.commentId;
    ctx.commentId = null;
    await sendPrivateReply(cid, text, ctx.token);
    return { ok: true };
  }
  return sendOf(ctx).text(ctx.igUserId, text);
}

async function saveBotMessage(ctx, text) {
  try {
    await saveMessage(ctx.contactId, "assistant", text, false, "flow");
  } catch (err) {
    console.error("⚠️ Flow xabarini saqlashda xatolik:", err.message);
  }
}

// ------------------------------------------------------------
//  ASOSIY MOTOR — nodeId'dan boshlab ketma-ket bajarish.
//  To'xtash nuqtalari: buttons (javob kutadi), delay (vaqt kutadi),
//  graf tugashi (completed) yoki xato (stopped).
// ------------------------------------------------------------
async function executeFrom(stateId, nodeId, ctx) {
  let current = nodeId;
  for (let step = 0; step < MAX_STEPS && current; step++) {
    let node;
    try {
      node = await getFlowNode(current);
    } catch (err) {
      console.error(`⚠️ Flow node o'qishda xatolik (#${current}):`, err.message);
      await updateFlowState(stateId, { status: "stopped" }).catch(() => {});
      return;
    }
    if (!node) {
      // Node topilmadi (graf o'zgargan) — flow yakunlanadi, AI qaytadi
      await updateFlowState(stateId, { status: "completed" }).catch(() => {});
      return;
    }

    try {
      const cfg = node.config || {};
      const edges = await getOutgoingEdges(node.id);

      if (node.type === "message") {
        const text = applyVars(cfg.text || "", ctx);
        if (cfg.media_url) await sendOf(ctx).image(ctx.igUserId, cfg.media_url);
        if (text) {
          const r = await sendText(ctx, text);
          if (!r.ok) throw new Error(r.error || "Xabar yuborilmadi");
          await saveBotMessage(ctx, text);
        }
        current = edges[0]?.to_node_id || null;
      } else if (node.type === "buttons") {
        const text = applyVars(cfg.text || "Tanlang:", ctx);
        const btns = edges
          .filter((e) => (e.condition_label || "").trim())
          .map((e) => ({ title: e.condition_label, payload: `fbtn:${e.id}` }));
        // 9.2: URL tugmalar (Telegram'da inline, IG'da matn havola)
        const urlBtns = Array.isArray(cfg.url_buttons) ? cfg.url_buttons : [];
        const r = await sendOf(ctx).buttons(ctx.igUserId, text, btns, urlBtns);
        if (!r.ok) throw new Error(r.error || "Tugmalar yuborilmadi");
        await saveBotMessage(ctx, text + " " + btns.map((b) => `[${b.title}]`).join(" "));
        // Javob kutamiz — holat shu node'da qoladi
        await updateFlowState(stateId, { currentNodeId: node.id, nextRunAt: null });
        return;
      } else if (node.type === "condition") {
        let result = false;
        if (cfg.kind === "has_tag") {
          const c = await getContact(ctx.contactId);
          result = (c?.tags || []).includes(String(cfg.value || "").trim());
        } else if (cfg.kind === "contains") {
          const last = String(ctx.lastText || "").toLowerCase();
          result = last.includes(String(cfg.value || "").trim().toLowerCase());
        } else if (cfg.kind === "subscribed") {
          // 9.2: Telegram kanalga obuna tekshirish (bot kanalda admin bo'lishi kerak)
          if (ctx.platform === "telegram") {
            const { isChannelMember } = await import("./telegram.js");
            const r = await isChannelMember(String(cfg.value || "").trim(), ctx.igUserId, ctx.token);
            result = Boolean(r.ok && r.member);
            if (!r.ok) console.warn(`⚠️ Obuna tekshirib bo'lmadi (${cfg.value}):`, r.error);
          } else {
            result = false; // Instagram'da obuna tekshirish yo'q
          }
        }
        const wanted = result ? "ha" : "yo'q";
        const edge =
          edges.find((e) => (e.condition_label || "").trim().toLowerCase() === wanted) ||
          (result ? edges[0] : edges[1]);
        current = edge?.to_node_id || null;
      } else if (node.type === "action") {
        const val = String(cfg.value || "").trim();
        if (cfg.action === "add_tag" && val) {
          await addContactTags(ctx.contactId, [val]);
        } else if (cfg.action === "remove_tag" && val) {
          await removeContactTag(ctx.contactId, val);
        } else if (cfg.action === "handoff") {
          await setNeedsHuman(ctx.contactId, true);
          console.log(`🙋 Flow: operatorga uzatildi (mijoz ${ctx.contactId})`);
        } else if (cfg.action === "pause_bot") {
          await setBotPaused(ctx.contactId, true, null);
          console.log(`🔕 Flow: bot pauza qilindi (mijoz ${ctx.contactId})`);
        } else if (cfg.action === "set_stage" && val) {
          // 8.5: voronka bosqichini o'zgartirish
          await setContactStage(ctx.contactId, val);
        } else if (cfg.action === "give_promo") {
          // 10.4: avtomatik chegirma kodi yaratib yuborish (value = %)
          const pct = Math.min(Math.max(parseInt(val, 10) || 10, 1), 90);
          const code = "FLOW" + Math.random().toString(36).slice(2, 7).toUpperCase();
          await insertPromoCode({ projectId: ctx.projectId, code, discountPercent: pct, maxUses: 1 });
          const promoText = `🎁 Sizga maxsus ${pct}% chegirma kodi: ${code}\nBuyurtma berishda shu kodni ayting!`;
          const pr = await sendText(ctx, promoText);
          if (pr.ok) await saveBotMessage(ctx, promoText);
        }
        current = edges[0]?.to_node_id || null;
      } else if (node.type === "delay") {
        const amount = Math.max(1, parseInt(cfg.amount, 10) || 1);
        const unit = cfg.unit === "soat" ? 3600 : 60;
        const ms = amount * unit * 1000;
        if (ms > 24 * 3600 * 1000) {
          console.warn(`⚠️ Flow delay 24 soatdan uzun (${amount} ${cfg.unit}) — Instagram yuborishga ruxsat bermasligi mumkin`);
        }
        const nextRunAt = new Date(Date.now() + ms);
        await updateFlowState(stateId, { currentNodeId: node.id, nextRunAt });
        console.log(`⏱ Flow kutish: mijoz ${ctx.contactId}, ${amount} ${cfg.unit || "daqiqa"}`);
        return;
      } else {
        current = edges[0]?.to_node_id || null;
      }
    } catch (err) {
      console.error(`⚠️ Flow node xatoligi (#${node.id}, ${node.type}):`, err.message);
      await updateFlowState(stateId, { status: "stopped" }).catch(() => {});
      return;
    }
  }
  // Graf tugadi — flow yakunlandi, AI qaytadan ishlaydi
  await updateFlowState(stateId, { status: "completed", nextRunAt: null }).catch(() => {});
  console.log(`✅ Flow yakunlandi (mijoz ${ctx.contactId})`);
}

// ------------------------------------------------------------
//  TRIGGER — mos flow bo'lsa boshlash. true = flow boshlandi.
//  triggerType: keyword | story | new_contact | comment
// ------------------------------------------------------------
export async function tryStartFlow(triggerType, ctx, text = "") {
  if (!state.DB_READY || !ctx.contactId) return false;
  try {
    const flow = await findTriggerFlow(ctx.projectId, triggerType, text);
    if (!flow) return false;
    const start = await getStartNode(flow.id);
    if (!start) {
      console.warn(`⚠️ Flow #${flow.id} bo'sh (node yo'q) — o'tkazamiz`);
      return false;
    }
    const stateId = await createFlowState(ctx.contactId, flow.id, start.id);
    console.log(`🔀 Flow boshlandi: "${flow.name}" (mijoz ${ctx.contactId}, trigger: ${triggerType})`);
    ctx.lastText = text;
    await executeFrom(stateId, start.id, ctx);
    return true;
  } catch (err) {
    console.error("⚠️ Flow boshlashda xatolik:", err.message);
    return false;
  }
}

// ------------------------------------------------------------
//  KIRUVCHI XABAR — faol flow bo'lsa, u boshqaradi. true = flow ushladi.
//  payload — tugma bosilganda "fbtn:<edgeId>".
// ------------------------------------------------------------
export async function handleFlowInput(ctx, text, payload = null) {
  if (!state.DB_READY || !ctx.contactId) return false;
  let fs;
  try {
    fs = await getActiveFlowState(ctx.contactId);
  } catch (err) {
    console.error("⚠️ Flow holatini o'qishda xatolik:", err.message);
    return false;
  }
  if (!fs) return false;

  try {
    const node = fs.current_node_id ? await getFlowNode(fs.current_node_id) : null;
    if (!node) {
      await updateFlowState(fs.id, { status: "completed" });
      return false;
    }
    ctx.lastText = text;

    // Kutish (delay) paytida mijoz yozdi — flow to'xtaydi, AI javob beradi
    // (mijoz faollashdi, endi jonli suhbat muhimroq)
    if (node.type === "delay" || fs.next_run_at) {
      await updateFlowState(fs.id, { status: "stopped", nextRunAt: null });
      console.log(`⏹ Flow to'xtatildi (mijoz ${ctx.contactId} kutish paytida yozdi) — AI davom etadi`);
      return false;
    }

    if (node.type === "buttons") {
      const edges = await getOutgoingEdges(node.id);
      let edge = null;
      if (payload && payload.startsWith("fbtn:")) {
        const eid = parseInt(payload.slice(5), 10);
        edge = edges.find((e) => e.id === eid);
      }
      if (!edge && text) {
        const t = text.trim().toLowerCase();
        edge = edges.find((e) => (e.condition_label || "").trim().toLowerCase() === t);
      }
      if (edge) {
        await executeFrom(fs.id, edge.to_node_id, ctx);
        return true;
      }
      // Tugmaga mos kelmadi: 1-marta qayta so'raymiz, 2-marta flow to'xtaydi
      const vars = fs.variables || {};
      const miss = (parseInt(vars.miss, 10) || 0) + 1;
      if (miss >= 2) {
        await updateFlowState(fs.id, { status: "stopped" });
        console.log(`⏹ Flow to'xtatildi (mijoz ${ctx.contactId} 2 marta tugma tanlamadi) — AI davom etadi`);
        return false;
      }
      await updateFlowState(fs.id, { variables: { ...vars, miss } });
      const btns = edges
        .filter((e) => (e.condition_label || "").trim())
        .map((e) => ({ title: e.condition_label, payload: `fbtn:${e.id}` }));
      const askText = "Iltimos, quyidagi tugmalardan birini tanlang 👇";
      await sendOf(ctx).buttons(ctx.igUserId, askText, btns);
      await saveBotMessage(ctx, askText);
      return true;
    }

    // Boshqa turdagi node'da "kutib qolgan" holat — g'ayritabiiy, to'xtatamiz
    await updateFlowState(fs.id, { status: "stopped" });
    return false;
  } catch (err) {
    console.error("⚠️ Flow kiruvchi xabar xatoligi:", err.message);
    await updateFlowState(fs.id, { status: "stopped" }).catch(() => {});
    return false;
  }
}

// ------------------------------------------------------------
//  SCHEDULER — delay muddati kelganlarni davom ettirish (har daqiqa)
// ------------------------------------------------------------
export async function runFlowSchedulerPass() {
  if (!state.DB_READY) return;
  try {
    const due = await claimDueFlowStates(20);
    for (const s of due) {
      const token =
        s.access_token || ACCOUNTS_MAP.get(String(s.ig_account_id || ""))?.token || IG_TOKEN;
      if (!token) continue;
      const ctx = {
        contactId: s.contact_id,
        igUserId: s.ig_user_id,
        name: s.contact_name,
        projectId: s.project_id,
        platform: s.platform || "instagram",
        token,
      };
      try {
        // Delay node'dan keyingi node'ga o'tamiz
        const edges = await getOutgoingEdges(s.current_node_id);
        const next = edges[0]?.to_node_id;
        if (!next) {
          await updateFlowState(s.id, { status: "completed" });
          continue;
        }
        console.log(`⏱ Flow davom etmoqda (mijoz ${s.contact_id})`);
        await executeFrom(s.id, next, ctx);
      } catch (err) {
        console.error(`⚠️ Flow scheduler xatoligi (holat ${s.id}):`, err.message);
        await updateFlowState(s.id, { status: "stopped" }).catch(() => {});
      }
      await new Promise((ok) => setTimeout(ok, 300));
    }
  } catch (err) {
    console.error("⚠️ Flow scheduler xatoligi:", err.message);
  }
}

export function startFlowScheduler() {
  setTimeout(runFlowSchedulerPass, 90 * 1000);
  const t = setInterval(runFlowSchedulerPass, 60 * 1000);
  if (t.unref) t.unref();
}

// ------------------------------------------------------------
//  SIMULYATSIYA — "Sinab ko'rish": qaysi node'lar ketma-ket bajarilishini
//  ko'rsatadi (haqiqiy yuborilmaydi). Tugmalarda birinchi yo'l tanlanadi.
// ------------------------------------------------------------
export async function simulateFlow(flowId) {
  const steps = [];
  const start = await getStartNode(flowId);
  if (!start) return [{ type: "error", text: "Flow bo'sh — kamida bitta node qo'shing" }];
  let current = start.id;
  for (let i = 0; i < MAX_STEPS && current; i++) {
    const node = await getFlowNode(current);
    if (!node) break;
    const cfg = node.config || {};
    const edges = await getOutgoingEdges(node.id);
    if (node.type === "message") {
      steps.push({ type: "message", text: cfg.text || "(bo'sh xabar)" });
      current = edges[0]?.to_node_id || null;
    } else if (node.type === "buttons") {
      const titles = edges.map((e) => e.condition_label).filter(Boolean);
      steps.push({ type: "buttons", text: cfg.text || "Tanlang:", buttons: titles });
      steps.push({ type: "info", text: titles.length ? `→ Simulyatsiya: "${titles[0]}" tugmasi tanlandi` : "→ Tugma yo'q — flow shu yerda kutib qoladi" });
      current = edges[0]?.to_node_id || null;
    } else if (node.type === "condition") {
      const kindLabel = cfg.kind === "has_tag" ? "teg bor" : cfg.kind === "subscribed" ? "kanalga obuna (TG)" : "xabarda so'z bor";
      steps.push({ type: "condition", text: `Shart: ${kindLabel} — "${cfg.value || ""}" → simulyatsiyada HA yo'li` });
      const edge = edges.find((e) => (e.condition_label || "").toLowerCase() === "ha") || edges[0];
      current = edge?.to_node_id || null;
    } else if (node.type === "action") {
      const labels = { add_tag: "teg qo'shish", remove_tag: "tegni olib tashlash", handoff: "operatorga uzatish", pause_bot: "botni pauza qilish", set_stage: "voronka bosqichi" };
      steps.push({ type: "action", text: `Amal: ${labels[cfg.action] || cfg.action || "?"}${cfg.value ? ` (${cfg.value})` : ""}` });
      current = edges[0]?.to_node_id || null;
    } else if (node.type === "delay") {
      steps.push({ type: "delay", text: `Kutish: ${cfg.amount || 1} ${cfg.unit || "daqiqa"}` });
      current = edges[0]?.to_node_id || null;
    } else {
      current = edges[0]?.to_node_id || null;
    }
  }
  steps.push({ type: "done", text: "Flow yakunlandi" });
  return steps;
}
