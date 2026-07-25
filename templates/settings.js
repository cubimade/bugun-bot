// templates/settings.js — sahifa shabloni (ROADMAP-6 A1 da templates.js dan ajratilgan)
// 13-audit: 792 qatorli fayl bo'lindi — HTML settings-content.js'da,
// klient JS settings-script.js va settings-script-admin.js'da.
import { renderLayout } from "./layout.js";
import { settingsContent } from "./settings-content.js";
import { settingsScriptMain } from "./settings-script.js";
import { settingsScriptAdmin } from "./settings-script-admin.js";

// ============================================================
//  7. SOZLAMALAR — /dashboard/settings
//  Bot sozlamalari · AI sozlamalari · Tizim holati
// ============================================================
export function renderSettingsPage() {
  return renderLayout({
    title: "Sozlamalar",
    active: "settings",
    headerAction: "",
    content: settingsContent(),
    script: settingsScriptMain() + settingsScriptAdmin(),
  });
}
