/**
 * Item form mappers — type helpers, record ↔ form values, API payload, list sort.
 *
 * Used by:
 * - drawer/utils/itemDirtyChecks.js
 * - drawer/utils/itemDrawerUtils.js (barrel)
 * - drawer/ItemDrawer.js
 * - drawer/hooks/useItemDrawerData.js
 * - drawer/hooks/useItemDrawerEditBaseline.js
 * - drawer/hooks/useItemDrawerMutations.js
 * - drawer/utils/itemDrawerOptionMappers.js
 * - drawer/utils/itemDrawerMutationCache.js
 * - drawer/panels/bundle/ItemBundlePanel.js
 */

import { ITEM_TYPE_FLAG_DEFAULTS } from "./itemDrawerConstants";

function optionalRelationId(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} row
 */
export function getItemTypeCode(row) {
  if (!row || typeof row !== "object") return "";
  const type = /** @type {{ code?: string }} */ (row).item_type ?? row;
  if (type && typeof type === "object") {
    return String(/** @type {{ code?: string }} */ (type).code ?? "").toUpperCase();
  }
  return "";
}

/**
 * @param {unknown} record
 */
export function isBundleItem(record) {
  return getItemTypeCode(record) === "BUNDLE";
}

/**
 * @param {unknown} record
 */
export function isProduceItem(record) {
  return getItemTypeCode(record) === "PRODUCE";
}

/**
 * @param {unknown[]} types
 * @param {number | undefined} typeId
 */
export function findItemTypeById(types, typeId) {
  if (typeId == null) return null;
  return types.find((t) => /** @type {{ id?: number }} */ (t).id === typeId) ?? null;
}

/**
 * @param {unknown} typeRow
 */
export function flagsForItemType(typeRow) {
  const code = String(/** @type {{ code?: string }} */ (typeRow)?.code ?? "").toUpperCase();
  return ITEM_TYPE_FLAG_DEFAULTS[code] ?? ITEM_TYPE_FLAG_DEFAULTS.INVENTORY;
}

/**
 * @param {Record<string, unknown>} values
 */
export function itemFormValuesToPayload(values) {
  return {
    name: String(values.name ?? "").trim(),
    sku: String(values.sku ?? "").trim(),
    plu_code: values.plu_code ? String(values.plu_code).trim() : null,
    item_type_id: Number(values.item_type_id),
    category_id: Number(values.category_id),
    brand_id: values.brand_id != null && values.brand_id !== "" ? Number(values.brand_id) : null,
    base_uom_id: Number(values.base_uom_id),
    vat_group_id: optionalRelationId(values.vat_group_id),
    description: values.description ? String(values.description).trim() : null,
    track_inventory: values.track_inventory === true,
    allow_sale: values.allow_sale === true,
    allow_purchase: values.allow_purchase === true,
    is_active: values.is_active !== false,
  };
}

/** @param {Record<string, unknown>} row */
export function toItemCacheRow(row) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    plu_code: row.plu_code ?? null,
    item_type_id: row.item_type_id ?? row.item_type?.id ?? null,
    item_type: row.item_type ?? null,
    category_id: row.category_id ?? row.category?.id ?? null,
    category: row.category ?? null,
    brand_id: row.brand_id ?? row.brand?.id ?? null,
    brand: row.brand ?? null,
    base_uom_id: row.base_uom_id ?? row.base_uom?.id ?? null,
    base_uom: row.base_uom ?? null,
    vat_group_id: row.vat_group_id ?? row.vat_group?.id ?? null,
    vat_group: row.vat_group ?? null,
    description: row.description ?? null,
    track_inventory: row.track_inventory,
    allow_sale: row.allow_sale,
    allow_purchase: row.allow_purchase,
    is_active: row.is_active,
    primary_image: row.primary_image ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * @param {Record<string, unknown>} r
 */
export function mapItemRecordToFormValues(r) {
  return {
    name: r.name ?? "",
    sku: r.sku ?? "",
    plu_code: r.plu_code ?? undefined,
    item_type_id: r.item_type_id ?? r.item_type?.id ?? undefined,
    category_id: r.category_id ?? r.category?.id ?? undefined,
    brand_id: r.brand_id ?? r.brand?.id ?? undefined,
    base_uom_id: r.base_uom_id ?? r.base_uom?.id ?? undefined,
    vat_group_id: r.vat_group_id ?? r.vat_group?.id ?? undefined,
    description: r.description ?? undefined,
    track_inventory: Boolean(r.track_inventory),
    allow_sale: Boolean(r.allow_sale),
    allow_purchase: Boolean(r.allow_purchase),
    is_active: r.is_active !== false,
  };
}

/**
 * @param {string} sku
 * @param {string} name
 */
export function requiredGeneralFieldsValid(sku, name) {
  return String(sku ?? "").trim().length > 0 && String(name ?? "").trim().length > 0;
}

/** @param {unknown[]} list */
export function sortItemsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}
