// ============================================================
//  SERVICES/RULES.JS — kalit so'z (7.4) va avto-teg (7.8) qoidalari
//  keshi (60 soniya, loyiha bo'yicha) va qo'llash yordamchilari.
//  webhook.js dan ajratilgan (500-qator qoidasi).
// ============================================================
import { state } from "../state.js";
import {
  getActiveKeywordRules,
  getActiveTagRules,
  matchTagRules,
  addContactTags,
} from "../db.js";

const TTL_MS = 60 * 1000;
const KEYWORD_CACHE = new Map(); // projectId -> { at, rules }
const TAG_RULES_CACHE = new Map();

export async function keywordRulesFor(projectId) {
  if (!state.DB_READY) return [];
  const key = String(projectId ?? "null");
  const hit = KEYWORD_CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rules;
  try {
    const rules = await getActiveKeywordRules(projectId);
    KEYWORD_CACHE.set(key, { at: Date.now(), rules });
    return rules;
  } catch (err) {
    console.error("⚠️ Kalit so'z qoidalarini o'qishda xatolik:", err.message);
    return [];
  }
}

export async function tagRulesFor(projectId) {
  if (!state.DB_READY) return [];
  const key = String(projectId ?? "null");
  const hit = TAG_RULES_CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rules;
  try {
    const rules = await getActiveTagRules(projectId);
    TAG_RULES_CACHE.set(key, { at: Date.now(), rules });
    return rules;
  } catch (err) {
    return [];
  }
}

// Avto-teglash — fonda ishlaydi, javobni kechiktirmaydi
export function autoTag(contactId, projectId, text) {
  if (!contactId) return;
  (async () => {
    const tags = matchTagRules(await tagRulesFor(projectId), text);
    if (tags.length) {
      await addContactTags(contactId, tags);
      console.log(`🏷 Avto-teg (mijoz ${contactId}): ${tags.join(", ")}`);
    }
  })().catch((err) => console.error("⚠️ Avto-teg xatoligi:", err.message));
}
