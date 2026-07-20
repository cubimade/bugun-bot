// ============================================================
//  LOGGER.JS — oddiy markazlashtirilgan log va xatolar buferi
//  Railway barcha stdout/stderr'ni saqlaydi (asosiy log manbai).
//  Bu yerda esa oxirgi xatolar xotirada saqlanadi — dashboard/API orqali
//  tez ko'rib, muammolarni topish uchun (/api/errors).
// ============================================================

const MAX = 50; // oxirgi nechta xatoni saqlash
const recentErrors = [];

// Xatoni yozib olish (konsolga + xotira buferiga)
export function recordError(source, err) {
  const message = err?.message || String(err);
  const entry = { time: new Date().toISOString(), source, message };
  recentErrors.unshift(entry);
  if (recentErrors.length > MAX) recentErrors.pop();
  console.error(`⚠️ [${source}] ${message}`);
  if (err?.stack) console.error(err.stack);
}

// Oxirgi xatolar ro'yxati (yangi birinchi)
export function getRecentErrors() {
  return recentErrors;
}
