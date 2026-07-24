// ============================================================
//  SERVICES/FLOW-TEMPLATES.JS — 8.4: tayyor flow shablonlari
//  Har shablon: meta + nodes (ref bilan) + edges. Bir bosishda yaratiladi.
// ============================================================
import { insertFlow, saveFlowGraph } from "../db.js";

// Shablonlar 8.4 da to'ldiriladi
export const FLOW_TEMPLATES = {};

export async function createFlowFromTemplate(key, projectId = null) {
  const t = FLOW_TEMPLATES[key];
  if (!t) throw new Error("Shablon topilmadi");
  const id = await insertFlow({
    projectId,
    name: t.name,
    triggerType: t.triggerType,
    triggerValue: t.triggerValue || null,
  });
  await saveFlowGraph(id, t.nodes, t.edges);
  return id;
}
