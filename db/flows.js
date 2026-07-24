// ============================================================
//  DB/FLOWS.JS — 8.2: flow builder so'rovlari
//  flows, flow_nodes, flow_edges, contact_flow_state
// ============================================================
import { pool } from "./pool.js";

// ------------------------------------------------------------
//  FLOWS — ro'yxat, CRUD
// ------------------------------------------------------------
export async function listFlows() {
  const { rows } = await pool.query(
    `SELECT f.id, f.project_id, f.name, f.trigger_type, f.trigger_value,
            f.is_active, f.created_at, p.name AS project_name,
            (SELECT COUNT(*)::int FROM contact_flow_state s WHERE s.flow_id = f.id) AS entered,
            (SELECT COUNT(*)::int FROM contact_flow_state s
              WHERE s.flow_id = f.id AND s.status = 'completed') AS completed,
            (SELECT COUNT(*)::int FROM flow_nodes n WHERE n.flow_id = f.id) AS node_count
       FROM flows f
       LEFT JOIN projects p ON p.id = f.project_id
      ORDER BY f.id DESC`
  );
  return rows;
}

export async function getFlow(id) {
  const { rows } = await pool.query(`SELECT * FROM flows WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function insertFlow({ projectId, name, triggerType, triggerValue }) {
  const { rows } = await pool.query(
    `INSERT INTO flows (project_id, name, trigger_type, trigger_value)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [projectId || null, name, triggerType || "manual", triggerValue || null]
  );
  return rows[0].id;
}

export async function updateFlow(id, { name, triggerType, triggerValue, isActive, projectId }) {
  await pool.query(
    `UPDATE flows
        SET name = COALESCE($2, name),
            trigger_type = COALESCE($3, trigger_type),
            trigger_value = COALESCE($4, trigger_value),
            is_active = COALESCE($5, is_active),
            project_id = COALESCE($6, project_id)
      WHERE id = $1`,
    [id, name ?? null, triggerType ?? null, triggerValue ?? null, isActive ?? null, projectId ?? null]
  );
}

export async function deleteFlow(id) {
  await pool.query(`DELETE FROM flows WHERE id = $1`, [id]);
}

// ------------------------------------------------------------
//  GRAF — node va edge'lar
// ------------------------------------------------------------
export async function getFlowGraph(flowId) {
  const [nodes, edges] = await Promise.all([
    pool.query(
      `SELECT id, type, config, position_x, position_y FROM flow_nodes
        WHERE flow_id = $1 ORDER BY id`,
      [flowId]
    ),
    pool.query(
      `SELECT id, from_node_id, to_node_id, condition_label FROM flow_edges
        WHERE flow_id = $1 ORDER BY id`,
      [flowId]
    ),
  ]);
  return { nodes: nodes.rows, edges: edges.rows };
}

// Grafni butunlay qayta saqlash (muharrir "Saqlash" bosganda).
// nodes: [{ ref, type, config, x, y }], edges: [{ from, to, label }] —
// ref klientdagi vaqtinchalik ID, from/to shu ref'larga ishora qiladi.
// Tranzaksiya: eski graf o'chadi, yangisi yoziladi.
export async function saveFlowGraph(flowId, nodes, edges) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM flow_edges WHERE flow_id = $1`, [flowId]);
    await client.query(`DELETE FROM flow_nodes WHERE flow_id = $1`, [flowId]);
    const refMap = new Map();
    for (const n of nodes) {
      const { rows } = await client.query(
        `INSERT INTO flow_nodes (flow_id, type, config, position_x, position_y)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [flowId, n.type, JSON.stringify(n.config || {}), Math.round(n.x || 0), Math.round(n.y || 0)]
      );
      refMap.set(String(n.ref), rows[0].id);
    }
    for (const e of edges) {
      const from = refMap.get(String(e.from));
      const to = refMap.get(String(e.to));
      if (!from || !to || from === to) continue; // buzuq edge — jim o'tkazamiz
      await client.query(
        `INSERT INTO flow_edges (flow_id, from_node_id, to_node_id, condition_label)
         VALUES ($1, $2, $3, $4)`,
        [flowId, from, to, e.label || null]
      );
    }
    // Graf o'zgardi — eski faol holatlar endi noto'g'ri node'ga ishora
    // qilishi mumkin; ularni to'xtatamiz (bot AI rejimiga qaytadi).
    await client.query(
      `UPDATE contact_flow_state SET status = 'stopped', updated_at = now()
        WHERE flow_id = $1 AND status = 'active'`,
      [flowId]
    );
    await client.query("COMMIT");
    return refMap;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Flow nusxalash (grafi bilan)
export async function duplicateFlow(flowId) {
  const flow = await getFlow(flowId);
  if (!flow) return null;
  const { nodes, edges } = await getFlowGraph(flowId);
  const newId = await insertFlow({
    projectId: flow.project_id,
    name: flow.name + " (nusxa)",
    triggerType: flow.trigger_type,
    triggerValue: flow.trigger_value,
  });
  await saveFlowGraph(
    newId,
    nodes.map((n) => ({ ref: n.id, type: n.type, config: n.config, x: n.position_x, y: n.position_y })),
    edges.map((e) => ({ from: e.from_node_id, to: e.to_node_id, label: e.condition_label }))
  );
  return newId;
}

export async function getFlowNode(nodeId) {
  const { rows } = await pool.query(
    `SELECT id, flow_id, type, config FROM flow_nodes WHERE id = $1`,
    [nodeId]
  );
  return rows[0] || null;
}

// Node'dan chiquvchi edge'lar (tugma tartibida — id bo'yicha)
export async function getOutgoingEdges(nodeId) {
  const { rows } = await pool.query(
    `SELECT id, to_node_id, condition_label FROM flow_edges
      WHERE from_node_id = $1 ORDER BY id`,
    [nodeId]
  );
  return rows;
}

// Boshlang'ich node — hech qaysi edge unga kirmaydi (eng kichik id ustuvor)
export async function getStartNode(flowId) {
  const { rows } = await pool.query(
    `SELECT n.id, n.flow_id, n.type, n.config FROM flow_nodes n
      WHERE n.flow_id = $1
        AND NOT EXISTS (SELECT 1 FROM flow_edges e WHERE e.to_node_id = n.id)
      ORDER BY n.id LIMIT 1`,
    [flowId]
  );
  return rows[0] || null;
}

// ------------------------------------------------------------
//  TRIGGERLAR — mos flow topish
// ------------------------------------------------------------
// triggerType: keyword/story/comment/new_contact. Keyword/comment uchun
// trigger_value vergul bilan ajratilgan so'zlar ("narx, price").
// Story uchun trigger_value bo'sh = har qanday story javobi.
export async function findTriggerFlow(projectId, triggerType, text = "") {
  const { rows } = await pool.query(
    `SELECT id, name, trigger_type, trigger_value FROM flows
      WHERE is_active AND trigger_type = $1
        AND (project_id IS NULL OR project_id = $2)
      ORDER BY (project_id IS NOT NULL) DESC, id DESC`,
    [triggerType, projectId]
  );
  const t = String(text || "").toLowerCase();
  for (const f of rows) {
    const val = String(f.trigger_value || "").trim();
    if (triggerType === "new_contact" || (triggerType === "story" && !val)) return f;
    if (!val) {
      if (triggerType === "keyword" || triggerType === "comment") continue; // kalit so'zsiz keyword flow ishlamaydi
      return f;
    }
    const keywords = val.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (keywords.some((k) => t.includes(k))) return f;
  }
  return null;
}

// ------------------------------------------------------------
//  CONTACT FLOW STATE — kontaktning oqimdagi holati
// ------------------------------------------------------------
export async function getActiveFlowState(contactId) {
  const { rows } = await pool.query(
    `SELECT s.id, s.contact_id, s.flow_id, s.current_node_id, s.variables,
            s.next_run_at, s.status, f.name AS flow_name
       FROM contact_flow_state s
       JOIN flows f ON f.id = s.flow_id
      WHERE s.contact_id = $1 AND s.status = 'active'
      ORDER BY s.id DESC LIMIT 1`,
    [contactId]
  );
  return rows[0] || null;
}

export async function createFlowState(contactId, flowId, currentNodeId) {
  // Bitta kontaktда bitta faol flow — eskilarini to'xtatamiz
  await pool.query(
    `UPDATE contact_flow_state SET status = 'stopped', updated_at = now()
      WHERE contact_id = $1 AND status = 'active'`,
    [contactId]
  );
  const { rows } = await pool.query(
    `INSERT INTO contact_flow_state (contact_id, flow_id, current_node_id)
     VALUES ($1, $2, $3) RETURNING id`,
    [contactId, flowId, currentNodeId]
  );
  return rows[0].id;
}

export async function updateFlowState(stateId, { currentNodeId, variables, nextRunAt, status }) {
  await pool.query(
    `UPDATE contact_flow_state
        SET current_node_id = COALESCE($2, current_node_id),
            variables = COALESCE($3, variables),
            next_run_at = $4,
            status = COALESCE($5, status),
            updated_at = now()
      WHERE id = $1`,
    [stateId, currentNodeId ?? null, variables ? JSON.stringify(variables) : null, nextRunAt ?? null, status ?? null]
  );
}

// Scheduler: kutish vaqti kelgan faol holatlar (kontakt + token bilan).
// Atomik claim — next_run_at NULL qilinadi, ikki marta ishlamaydi.
export async function claimDueFlowStates(limit = 20) {
  const { rows } = await pool.query(
    `UPDATE contact_flow_state s
        SET next_run_at = NULL, updated_at = now()
       FROM contacts c, projects p
      WHERE s.id IN (
              SELECT id FROM contact_flow_state
               WHERE status = 'active' AND next_run_at IS NOT NULL AND next_run_at <= now()
               ORDER BY next_run_at LIMIT $1
            )
        AND c.id = s.contact_id AND p.id = c.project_id
      RETURNING s.id, s.contact_id, s.flow_id, s.current_node_id, s.variables,
                c.ig_user_id, c.name AS contact_name, c.project_id,
                p.ig_account_id, p.access_token`,
    [limit]
  );
  return rows;
}

// Kontakt bo'yicha flow'ni to'xtatish (masalan operator aralashganda)
export async function stopContactFlows(contactId) {
  await pool.query(
    `UPDATE contact_flow_state SET status = 'stopped', updated_at = now()
      WHERE contact_id = $1 AND status = 'active'`,
    [contactId]
  );
}
