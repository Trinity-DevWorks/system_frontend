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

/** @type {Record<string, { track_inventory: boolean; allow_sale: boolean; allow_purchase: boolean }>} */
export const ITEM_TYPE_FLAG_DEFAULTS = {
  INVENTORY: { track_inventory: true, allow_sale: true, allow_purchase: true },
  SERVICE: { track_inventory: false, allow_sale: true, allow_purchase: false },
  INGREDIENT: { track_inventory: true, allow_sale: false, allow_purchase: true },
  PRODUCE: { track_inventory: true, allow_sale: true, allow_purchase: false },
  BUNDLE: { track_inventory: false, allow_sale: true, allow_purchase: false },
  NON_INVENTORY: { track_inventory: false, allow_sale: true, allow_purchase: true },
  PLU: { track_inventory: false, allow_sale: true, allow_purchase: false },
};

export const ITEM_CREATE_SAVE_INTENT_KEY = "itemDrawer:createSaveIntent";
export const ITEM_CREATE_SAVE_INTENT_EVENT = "itemDrawer:createSaveIntent:change";

export const ITEM_LOOKUP_ADD_CATEGORY = "__item_drawer_add_category__";
export const ITEM_LOOKUP_ADD_BRAND = "__item_drawer_add_brand__";
export const ITEM_LOOKUP_ADD_BASE_UOM = "__item_drawer_add_base_uom__";
export const ITEM_LOOKUP_ADD_VAT_GROUP = "__item_drawer_add_vat_group__";

/** @typedef {"category" | "brand" | "uom" | "vat-group"} ItemNestedCreateKey */
