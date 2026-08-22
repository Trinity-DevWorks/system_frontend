/**
 * Bundle and recipe line editors — validation, serialization, save eligibility.
 *
 * Used by:
 * - drawer/utils/itemDrawerUtils.js (barrel)
 * - drawer/panels/bundle/useBundleLineEditor.js
 * - drawer/panels/recipe/useRecipeLineEditor.js
 */

/**
 * @param {Array<{ child_item_id?: string; quantity?: number }>} lines
 */
export function getValidBundleLines(lines) {
  return lines
    .filter((l) => l.child_item_id != null && l.child_item_id !== "" && l.quantity != null && Number(l.quantity) > 0)
    .map((l) => ({
      child_item_id: String(l.child_item_id),
      quantity: Number(l.quantity),
    }));
}

/**
 * @param {Array<{ child_item_id?: string; quantity?: number }>} lines
 */
function serializeBundleLines(lines) {
  return JSON.stringify(
    getValidBundleLines(lines).sort((a, b) => a.child_item_id.localeCompare(b.child_item_id)),
  );
}

/**
 * @param {Array<{ child_item_id?: string; quantity?: number }>} current
 * @param {Array<{ child_item_id?: string; quantity?: number }>} initial
 */
export function canSaveBundleLines(current, initial) {
  if (serializeBundleLines(current) === serializeBundleLines(initial)) return false;
  return getValidBundleLines(current).length > 0;
}

/**
 * @param {{ child_item_id?: string; quantity?: number }} line
 */
export function isBundleLineComplete(line) {
  return line.child_item_id != null && line.child_item_id !== "" && line.quantity != null && Number(line.quantity) > 0;
}

/**
 * @param {Array<{ child_item_id?: string; quantity?: number }>} lines
 */
export function canAddBundleLine(lines) {
  return lines.length > 0 && lines.every(isBundleLineComplete);
}

/**
 * @param {Array<{ item_id?: string; quantity?: number; uom_id?: number }>} lines
 */
export function getValidRecipeLines(lines) {
  return lines
    .filter((l) => l.item_id != null && l.item_id !== "" && l.quantity != null && Number(l.quantity) > 0 && l.uom_id != null)
    .map((l) => ({
      item_id: String(l.item_id),
      quantity: Number(l.quantity),
      uom_id: Number(l.uom_id),
    }));
}

/**
 * @param {{ item_id?: string; quantity?: number; uom_id?: number }} line
 */
export function isRecipeLineComplete(line) {
  return (
    line.item_id != null &&
    line.item_id !== "" &&
    line.quantity != null &&
    Number(line.quantity) > 0 &&
    line.uom_id != null
  );
}

/**
 * Allow "+ Add" only when every ingredient row is fully filled.
 * @param {Array<{ item_id?: string; quantity?: number; uom_id?: number }>} lines
 */
export function canAddRecipeLine(lines) {
  return lines.length > 0 && lines.every(isRecipeLineComplete);
}

/**
 * @param {Array<{ item_id?: string; quantity?: number; uom_id?: number }>} lines
 */
function serializeRecipeLines(lines) {
  return JSON.stringify(
    getValidRecipeLines(lines).sort(
      (a, b) => a.item_id.localeCompare(b.item_id) || a.uom_id - b.uom_id,
    ),
  );
}

/**
 * @param {{ yield_quantity?: number; uom_id?: number }} header
 * @param {{ yield_quantity?: number; uom_id?: number }} initialHeader
 */
export function isRecipeHeaderDirty(header, initialHeader) {
  return (
    Number(header?.yield_quantity) !== Number(initialHeader?.yield_quantity) ||
    Number(header?.uom_id) !== Number(initialHeader?.uom_id)
  );
}

/**
 * @param {Array<{ item_id?: string; quantity?: number; uom_id?: number }>} current
 * @param {Array<{ item_id?: string; quantity?: number; uom_id?: number }>} initial
 * @param {{ yield_quantity?: number; uom_id?: number }} header
 * @param {{ yield_quantity?: number; uom_id?: number }} initialHeader
 */
export function canSaveRecipePanel(current, initial, header, initialHeader) {
  const headerDirty = isRecipeHeaderDirty(header, initialHeader);
  const linesDirty = serializeRecipeLines(current) !== serializeRecipeLines(initial);
  if (!headerDirty && !linesDirty) return false;
  if (headerDirty) return true;
  return getValidRecipeLines(current).length > 0;
}
