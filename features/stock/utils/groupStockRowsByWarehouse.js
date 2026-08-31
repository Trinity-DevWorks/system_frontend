/**
 * Group stock list rows by warehouse for the expand/collapse table view.
 */

/**
 * @param {unknown} warehouse
 * @param {string} fallback
 * @returns {string}
 */
export function formatWarehouseGroupLabel(warehouse, fallback) {
  if (!warehouse || typeof warehouse !== "object") return fallback;
  const row = /** @type {Record<string, unknown>} */ (warehouse);
  const shortcut = typeof row.shortcut_name === "string" ? row.shortcut_name.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (shortcut && name) return `${shortcut} — ${name}`;
  return name || shortcut || fallback;
}

/**
 * @param {unknown} row
 * @returns {string}
 */
export function warehouseGroupIdFromRow(row) {
  const id = row && typeof row === "object" ? /** @type {{ warehouse_id?: unknown }} */ (row).warehouse_id : null;
  if (id == null || id === "") return "none";
  return String(id);
}

/**
 * @template {Record<string, unknown>} T
 * @param {T[]} rows
 * @param {string} unknownLabel
 * @returns {{ id: string, name: string, rows: T[] }[]}
 */
export function groupStockRowsByWarehouse(rows, unknownLabel) {
  /** @type {Map<string, { id: string, name: string, rows: T[] }>} */
  const groups = new Map();
  for (const row of rows) {
    const id = warehouseGroupIdFromRow(row);
    const existing = groups.get(id);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    groups.set(id, {
      id,
      name: formatWarehouseGroupLabel(row?.warehouse, unknownLabel),
      rows: [row],
    });
  }
  return [...groups.values()];
}

/**
 * Sort rows inside each warehouse group. Group headers stay first after flatten.
 *
 * @template {Record<string, unknown>} T
 * @param {{ id: string, name: string, rows: T[] }[]} groups
 * @param {((a: T, b: T) => number) | null | undefined} compare
 * @param {"ascend" | "descend" | null | undefined} order
 * @returns {{ id: string, name: string, rows: T[] }[]}
 */
export function sortRowsInWarehouseGroups(groups, compare, order) {
  if (typeof compare !== "function" || (order !== "ascend" && order !== "descend")) {
    return groups;
  }
  const direction = order === "descend" ? -1 : 1;
  return groups.map((group) => ({
    ...group,
    rows: [...group.rows].sort((a, b) => {
      const result = compare(a, b);
      return typeof result === "number" && Number.isFinite(result) ? result * direction : 0;
    }),
  }));
}

/**
 * Child rows stay in the table so expand/collapse can animate height.
 *
 * @template {Record<string, unknown>} T
 * @param {{ id: string, name: string, rows: T[] }[]} groups
 * @param {Set<string>} collapsedIds
 * @returns {Array<T | { __isWarehouseGroup: true, __groupKey: string, __groupName: string, __groupCount: number, __groupExpanded: boolean }>}
 */
export function flattenWarehouseGroups(groups, collapsedIds) {
  /** @type {Array<any>} */
  const out = [];
  for (const group of groups) {
    const expanded = !collapsedIds.has(group.id);
    out.push({
      __isWarehouseGroup: true,
      __groupId: group.id,
      __groupKey: `warehouse-group:${group.id}`,
      __groupName: group.name,
      __groupCount: group.rows.length,
      __groupExpanded: expanded,
    });
    for (const row of group.rows) {
      out.push({
        ...row,
        __isWarehouseGroupChild: true,
        __groupCollapsed: !expanded,
      });
    }
  }
  return out;
}

/**
 * @param {unknown} row
 * @returns {row is { __isWarehouseGroup: true, __groupKey: string, __groupName: string, __groupCount: number, __groupExpanded: boolean }}
 */
export function isWarehouseGroupRow(row) {
  return Boolean(row && typeof row === "object" && /** @type {{ __isWarehouseGroup?: unknown }} */ (row).__isWarehouseGroup);
}
