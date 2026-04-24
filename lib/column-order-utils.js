/** @param {import("antd/es/table").ColumnType<any> | undefined} col */
export function getColumnStableId(col) {
  if (!col) return null;
  if (col.key != null && col.key !== "") return String(col.key);
  const di = col.dataIndex;
  if (di == null || di === "") return null;
  return String(Array.isArray(di) ? di.join(".") : di);
}

/**
 * @param {import("antd/es/table").ColumnsType<any>} columns
 * @param {Set<string>} skipIds
 */
function partitionDraggable(columns, skipIds) {
  const list = columns ?? [];
  /** @type {typeof list} */
  const draggable = [];
  /** @type {typeof list} */
  const fixed = [];
  for (const c of list) {
    const id = getColumnStableId(c);
    if (id && !skipIds.has(id)) draggable.push(c);
    else fixed.push(c);
  }
  return { draggable, fixed };
}

/**
 * Merge saved order with current column definitions (new columns append at end).
 * @param {string[] | null | undefined} savedOrder
 * @param {import("antd/es/table").ColumnsType<any>} columns
 * @param {Set<string>} skipIds
 * @returns {string[]}
 */
export function mergeSavedColumnOrder(savedOrder, columns, skipIds) {
  const { draggable } = partitionDraggable(columns, skipIds);
  const ids = draggable.map((c) => getColumnStableId(c)).filter(Boolean);
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const k of savedOrder ?? []) {
    if (typeof k === "string" && ids.includes(k) && !seen.has(k)) {
      out.push(k);
      seen.add(k);
    }
  }
  for (const id of ids) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

/**
 * @param {import("antd/es/table").ColumnsType<any>} columns
 * @param {string[]} order draggable ids only (fixed columns excluded)
 * @param {Set<string>} skipIds
 * @returns {import("antd/es/table").ColumnsType<any>}
 */
export function applyColumnOrder(columns, order, skipIds) {
  const { draggable, fixed } = partitionDraggable(columns, skipIds);
  const byId = new Map(draggable.map((c) => [getColumnStableId(c), c]));
  /** @type {import("antd/es/table").ColumnsType<any>} */
  const ordered = [];
  for (const id of order) {
    const c = byId.get(id);
    if (c) ordered.push(c);
  }
  const placed = new Set(ordered.map((c) => getColumnStableId(c)));
  for (const c of draggable) {
    const id = getColumnStableId(c);
    if (id && !placed.has(id)) {
      ordered.push(c);
      placed.add(id);
    }
  }
  return [...ordered, ...fixed];
}

/**
 * Reorder visible keys after a drag; preserves hidden keys' slots in `fullOrder`.
 * @param {string[]} fullOrder
 * @param {Set<string>} hiddenKeys
 * @param {string | number} activeId
 * @param {string | number} overId
 */
export function reorderFullOrderByVisibleDrag(fullOrder, hiddenKeys, activeId, overId) {
  const a = String(activeId);
  const o = String(overId);
  const visible = fullOrder.filter((k) => !hiddenKeys.has(k));
  const oldIndex = visible.indexOf(a);
  const newIndex = visible.indexOf(o);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return fullOrder;
  const nextVisible = [...visible];
  const [removed] = nextVisible.splice(oldIndex, 1);
  nextVisible.splice(newIndex, 0, removed);
  let vi = 0;
  return fullOrder.map((k) => (hiddenKeys.has(k) ? k : nextVisible[vi++]));
}
