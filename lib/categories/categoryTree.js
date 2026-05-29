/**
 * Build Ant Design TreeSelect `treeData` from flat category rows.
 *
 * @param {unknown[]} categories
 * @param {{
 *   leafOnlySelectable?: boolean;
 *   excludeCategoryId?: number | null;
 *   activeOnly?: boolean;
 * }} [options]
 * @returns {import("antd").TreeSelectProps["treeData"]}
 */
export function buildCategoryTreeData(categories, options = {}) {
  const { leafOnlySelectable = false, excludeCategoryId = null, activeOnly = false } = options;
  if (!Array.isArray(categories) || categories.length === 0) return [];

  const rows = categories
    .map((row) => normalizeCategoryRow(row))
    .filter((row) => row != null)
    .filter((row) => {
      if (!activeOnly) return true;
      return row.is_active !== false;
    });

  const excludeIds = new Set();
  if (excludeCategoryId != null) {
    excludeIds.add(Number(excludeCategoryId));
    collectDescendantIds(rows, Number(excludeCategoryId), excludeIds);
  }

  const filtered = rows.filter((row) => !excludeIds.has(row.id));
  const byParent = new Map();
  for (const row of filtered) {
    const key = row.parent_id ?? "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(row);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }));
  }

  /**
   * @param {number | null} parentId
   * @returns {import("antd").TreeSelectProps["treeData"]}
   */
  function buildBranch(parentId) {
    const key = parentId ?? "root";
    const children = byParent.get(key) ?? [];

    return children.map((row) => {
      const hasChildren = (byParent.get(row.id)?.length ?? 0) > 0;
      const branch = buildBranch(row.id);
      const node = {
        value: row.id,
        title: row.path_label || row.name,
        disabled: leafOnlySelectable ? hasChildren : false,
        selectable: leafOnlySelectable ? !hasChildren : true,
      };
      if (branch.length > 0) {
        return { ...node, children: branch };
      }
      return node;
    });
  }

  return buildBranch(null);
}

/**
 * Flat select options for parent category (any node except excluded self/descendants).
 *
 * @param {unknown[]} categories
 * @param {number | null | undefined} excludeCategoryId
 * @returns {{ value: number; label: string }[]}
 */
export function buildParentCategoryOptions(categories, excludeCategoryId) {
  if (!Array.isArray(categories)) return [];

  const rows = categories
    .map((row) => normalizeCategoryRow(row))
    .filter((row) => row != null);

  const excludeIds = new Set();
  if (excludeCategoryId != null) {
    excludeIds.add(Number(excludeCategoryId));
    collectDescendantIds(rows, Number(excludeCategoryId), excludeIds);
  }

  return rows
    .filter((row) => !excludeIds.has(row.id))
    .map((row) => ({
      value: row.id,
      label: row.path_label || row.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

/**
 * @param {unknown} row
 */
function normalizeCategoryRow(row) {
  if (!row || typeof row !== "object") return null;
  const r = /** @type {Record<string, unknown>} */ (row);
  const id = r.id;
  if (id == null) return null;

  const parentRaw = r.parent_id;
  const parent_id =
    parentRaw === null || parentRaw === undefined || parentRaw === ""
      ? null
      : Number(parentRaw);

  return {
    id: Number(id),
    parent_id: Number.isFinite(parent_id) ? parent_id : null,
    name: String(r.name ?? r.code ?? id),
    path_label: typeof r.path_label === "string" ? r.path_label : null,
    is_active: r.is_active !== false,
    has_children: Boolean(r.has_children),
  };
}

/**
 * @param {{ id: number; parent_id: number | null }[]} rows
 * @param {number} rootId
 * @param {Set<number>} out
 */
function collectDescendantIds(rows, rootId, out) {
  const queue = [rootId];
  while (queue.length > 0) {
    const parentId = queue.shift();
    for (const row of rows) {
      if (row.parent_id === parentId && !out.has(row.id)) {
        out.add(row.id);
        queue.push(row.id);
      }
    }
  }
}
