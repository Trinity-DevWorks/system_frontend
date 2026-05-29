/**
 * Create/edit dirty checks for the item general form.
 *
 * Used by:
 * - drawer/utils/itemDrawerUtils.js (barrel)
 * - drawer/ItemDrawer.js
 * - drawer/hooks/useItemDrawerActions.js
 */

import { itemFormValuesToPayload, mapItemRecordToFormValues } from "./itemFormMappers";

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const payload = itemFormValuesToPayload(v);
  const base = itemFormValuesToPayload(defaults);
  return JSON.stringify(payload) !== JSON.stringify(base);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const payload = itemFormValuesToPayload(v);
  const base = itemFormValuesToPayload(mapItemRecordToFormValues(row));
  return JSON.stringify(payload) !== JSON.stringify(base);
}
