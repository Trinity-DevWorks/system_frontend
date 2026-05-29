/**
 * Maps lookup API rows to Ant Design select options (item type, brand, UOM, VAT).
 *
 * Used by:
 * - drawer/hooks/useItemDrawerData.js
 */

import { findItemTypeById } from "./itemFormMappers";

/**
 * @param {Record<string, unknown> | null} detailRecord
 * @param {unknown[]} itemTypes
 * @param {number | undefined} itemTypeId
 */
export function resolveItemTypeCode(detailRecord, itemTypes, itemTypeId) {
  if (detailRecord) {
    return String(detailRecord.item_type?.code ?? "").toUpperCase();
  }
  const type = findItemTypeById(itemTypes, itemTypeId);
  return String(type?.code ?? "").toUpperCase();
}

/** @param {unknown[]} rows */
export function mapItemTypeOptions(rows) {
  return rows.map((row) => ({
    value: row.id,
    label: row.name ?? row.code,
    code: row.code,
  }));
}

/** @param {unknown[]} rows */
export function mapBrandOptions(rows) {
  return rows.map((b) => ({ value: b.id, label: b.name ?? b.code }));
}

/** @param {unknown[]} rows */
export function mapUomOptions(rows) {
  return rows.map((u) => ({ value: u.id, label: `${u.name ?? u.code} (${u.code})` }));
}

/** @param {unknown[] | undefined} rows */
export function mapVatGroupOptions(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    value: row.id,
    label: `${row.abrv ?? row.id} — ${row.name ?? ""}${row.percentage != null ? ` (${row.percentage}%)` : ""}`,
  }));
}
