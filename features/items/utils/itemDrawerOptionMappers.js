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

/**
 * System types are stored with raw names ("inventory"), so they are labelled from i18n by code.
 * @param {unknown[]} rows
 * @param {((key: string) => string) & { has?: (key: string) => boolean }} [t] Items translator
 */
export function mapItemTypeOptions(rows, t) {
  return rows.map((row) => {
    const key = `itemType_${String(row.code ?? "").toUpperCase()}`;
    const translated = row.is_system !== false && t?.has?.(key) ? t(key) : null;
    return {
      value: row.id,
      label: translated ?? row.name ?? row.code,
      code: row.code,
    };
  });
}

/** @param {unknown[]} rows */
export function mapBrandOptions(rows) {
  return rows.map((b) => ({ value: b.id, label: b.name ?? b.code }));
}

/** @param {unknown[]} rows */
export function mapUnitGroupOptions(rows) {
  return rows.map((g) => ({
    value: g.id,
    label: typeof g.code === "string" && g.code.trim() ? `${g.code} — ${g.name ?? g.id}` : String(g.name ?? g.id),
  }));
}

/** @param {unknown[] | undefined} rows */
export function mapVatGroupOptions(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    value: row.id,
    label: `${row.abrv ?? row.id} — ${row.name ?? ""}${row.percentage != null ? ` (${row.percentage}%)` : ""}`,
  }));
}
