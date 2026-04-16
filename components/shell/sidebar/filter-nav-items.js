/**
 * Client-side filter for Ant Design Menu `items` (flat or nested `children`).
 * Parent matches show full subtree; otherwise children are filtered recursively.
 * Leaf items also match on `key` when it is a path string.
 *
 * @param {import("antd").MenuProps["items"]} items
 * @param {string} query
 * @returns {import("antd").MenuProps["items"]}
 */
export function filterMenuItemsByQuery(items, query) {
  const q = query.trim().toLowerCase();
  if (!q || !items?.length) {
    return items ?? [];
  }

  const matchLabel = (label) =>
    typeof label === "string" && label.toLowerCase().includes(q);

  const matchKey = (key) =>
    typeof key === "string" && key.toLowerCase().includes(q);

  const filterRecursive = (list) => {
    const out = [];
    for (const item of list) {
      if (!item) continue;
      const hasChildren = item.children?.length > 0;
      if (hasChildren) {
        const childFiltered = filterRecursive(item.children);
        const parentMatches = matchLabel(item.label);
        if (parentMatches) {
          out.push({ ...item });
        } else if (childFiltered.length) {
          out.push({ ...item, children: childFiltered });
        }
      } else if (matchLabel(item.label) || matchKey(item.key)) {
        out.push(item);
      }
    }
    return out;
  };

  return filterRecursive(items);
}
