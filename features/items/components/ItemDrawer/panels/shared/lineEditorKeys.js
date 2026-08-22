/**
 * React `key` builders for bundle/recipe line editors — remount when server seed changes (avoids syncing props into state).
 *
 * Used by:
 * - drawer/panels/bundle/ItemBundlePanel.js
 * - drawer/panels/recipe/ItemRecipePanel.js
 */

/**
 * @param {number} itemId
 * @param {unknown} lines
 */
export function buildBundleLineEditorKey(itemId, lines) {
  return `bundle-${itemId}-${JSON.stringify(lines)}`;
}

/**
 * @param {number} itemId
 * @param {unknown} header
 * @param {unknown} lines
 */
export function buildRecipeLineEditorKey(itemId, header, lines) {
  return `recipe-${itemId}-${JSON.stringify({ header, lines })}`;
}
