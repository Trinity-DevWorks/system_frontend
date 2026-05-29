/**
 * Tab keys, form defaults, drawer title, active tab resolution, and create save-menu items.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 * - drawer/hooks/useItemDrawerActions.js
 */

/**
 * @param {boolean} tabsEnabled
 * @param {boolean} showRecipeTab
 * @param {boolean} showBundleTab
 */
export function getAllowedTabKeys(tabsEnabled, showRecipeTab, showBundleTab) {
  const keys = ["general"];
  if (!tabsEnabled) return keys;
  keys.push("uoms");
  if (showRecipeTab) keys.push("recipe");
  if (showBundleTab) keys.push("bundle");
  keys.push("barcodes", "suppliers", "attachments");
  return keys;
}

/**
 * @param {string} activeTab
 * @param {readonly string[]} allowedTabKeys
 */
export function resolveActiveTab(activeTab, allowedTabKeys) {
  return allowedTabKeys.includes(activeTab) ? activeTab : "general";
}

/**
 * @param {"create" | "edit" | "view"} mode
 * @param {(key: string) => string} t
 */
export function getItemDrawerTitle(mode, t) {
  return mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");
}

/**
 * @param {"keep" | "new" | "close" | null | undefined} lastCreateIntent
 * @param {(intent: "keep" | "new" | "close") => string} createIntentLabel
 */
export function getCreateSaveMenuItems(lastCreateIntent, createIntentLabel) {
  const all = /** @type {const} */ (["keep", "new", "close"]);
  return all.filter((key) => key !== lastCreateIntent).map((key) => ({ key, label: createIntentLabel(key) }));
}

export function getItemDrawerDefaults() {
  return {
    name: "",
    sku: "",
    plu_code: undefined,
    item_type_id: undefined,
    category_id: undefined,
    brand_id: undefined,
    base_uom_id: undefined,
    vat_group_id: undefined,
    description: undefined,
    track_inventory: true,
    allow_sale: true,
    allow_purchase: true,
    is_active: true,
  };
}
