/**
 * Item drawer constants — type flag defaults, save-intent keys, nested-create lookup tokens.
 *
 * Used by:
 * - drawer/utils/itemFormMappers.js
 * - drawer/utils/itemDrawerSaveIntent.js
 * - drawer/ItemDrawer.js
 * - drawer/components/ItemDrawerGeneralForm.js
 * - drawer/hooks/useItemDrawerNestedCreate.js (JSDoc type import)
 */

/** @type {Record<string, { track_inventory: boolean; allow_sale: boolean; allow_purchase: boolean; send_to_kitchen: boolean; qr_enabled: boolean }>} */
export const ITEM_TYPE_FLAG_DEFAULTS = {
  INVENTORY: { track_inventory: true, allow_sale: true, allow_purchase: true, send_to_kitchen: false, qr_enabled: false },
  SERVICE: { track_inventory: false, allow_sale: true, allow_purchase: false, send_to_kitchen: true, qr_enabled: false },
  INGREDIENT: { track_inventory: true, allow_sale: false, allow_purchase: true, send_to_kitchen: false, qr_enabled: false },
  PRODUCE: { track_inventory: true, allow_sale: true, allow_purchase: false, send_to_kitchen: true, qr_enabled: false },
  BUNDLE: { track_inventory: false, allow_sale: true, allow_purchase: false, send_to_kitchen: true, qr_enabled: false },
  NON_INVENTORY: { track_inventory: false, allow_sale: true, allow_purchase: true, send_to_kitchen: false, qr_enabled: false },
  PLU: { track_inventory: false, allow_sale: true, allow_purchase: false, send_to_kitchen: true, qr_enabled: false },
};

export const ITEM_CREATE_SAVE_INTENT_KEY = "itemDrawer:createSaveIntent";
export const ITEM_CREATE_SAVE_INTENT_EVENT = "itemDrawer:createSaveIntent:change";

export const ITEM_LOOKUP_ADD_CATEGORY = "__item_drawer_add_category__";
export const ITEM_LOOKUP_ADD_BRAND = "__item_drawer_add_brand__";
export const ITEM_LOOKUP_ADD_UNIT_GROUP = "__item_drawer_add_unit_group__";
export const ITEM_LOOKUP_ADD_VAT_GROUP = "__item_drawer_add_vat_group__";

/** @type {RegExp} */
export const ITEM_COLOR_PATTERN = /^#(?:[0-9A-F]{3}|[0-9A-F]{6})$/i;

/** @typedef {"category" | "brand" | "unit-group" | "vat-group"} ItemNestedCreateKey */
