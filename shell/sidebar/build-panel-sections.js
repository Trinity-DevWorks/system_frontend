import { filterMenuItemsByQuery } from "@/shell/sidebar/filter-nav-items";
import { findNavIconForPath } from "@/shell/sidebar/main-nav";

/**
 * Navigable leaves inside a nav item, depth-first.
 *
 * @param {import("antd").MenuProps["items"][number]} item
 * @returns {Array<object>}
 */
function collectLeaves(item) {
  if (!item) return [];
  if (item.children?.length) {
    return item.children.flatMap(collectLeaves);
  }
  return typeof item.key === "string" && item.key.startsWith("/") ? [item] : [];
}

/**
 * @param {object} leaf
 * @param {Set<string>} bookmarkedPaths
 */
function toRow(leaf, bookmarkedPaths) {
  return {
    path: leaf.key,
    label: leaf.label,
    icon: leaf.icon,
    bookmarked: bookmarkedPaths.has(leaf.key),
  };
}

/**
 * Split a module's leaves into sub-headed sections when leaves carry `group`
 * (Settings does; most modules do not and fall back to a single section).
 *
 * @param {Array<object>} leaves
 * @param {Set<string>} bookmarkedPaths
 * @param {string} defaultTitle
 */
function sectionsForLeaves(leaves, bookmarkedPaths, defaultTitle) {
  const sections = [];
  for (const leaf of leaves) {
    const title = typeof leaf.group === "string" && leaf.group ? leaf.group : defaultTitle;
    const last = sections[sections.length - 1];
    if (last && last.title === title) {
      last.items.push(toRow(leaf, bookmarkedPaths));
      continue;
    }
    sections.push({
      id: `group:${title}:${sections.length}`,
      title,
      items: [toRow(leaf, bookmarkedPaths)],
    });
  }
  return sections;
}

/**
 * Panel contents for the current module, or cross-module results while searching.
 *
 * @param {{
 *   navItems: import("antd").MenuProps["items"],
 *   panelModule: object | null,
 *   searchQuery: string,
 *   bookmarks: Array<{ path: string, label: string }>,
 *   bookmarkedPaths: Set<string>,
 *   onClearBookmarks: () => void,
 *   labels: { pinned: string, pages: string, clearAll: string, searchResults: string },
 * }} args
 * @returns {{ title: string, sections: Array<object> }}
 */
export function buildPanelSections({
  navItems,
  panelModule,
  searchQuery,
  bookmarks,
  bookmarkedPaths,
  onClearBookmarks,
  labels,
}) {
  const query = searchQuery.trim();

  if (query) {
    const matches = filterMenuItemsByQuery(navItems, query);
    const sections = [];
    for (const item of matches ?? []) {
      const leaves = collectLeaves(item);
      if (!leaves.length) continue;
      sections.push({
        id: `search:${item.key}`,
        title: item.label,
        items: leaves.map((leaf) => toRow(leaf, bookmarkedPaths)),
      });
    }
    return { title: labels.searchResults, sections };
  }

  const sections = [];

  /** Drop pins whose route the user can no longer see (roles/modules change). */
  const navigablePaths = new Set(
    (navItems ?? []).flatMap(collectLeaves).map((leaf) => leaf.key),
  );
  const visiblePins = bookmarks.filter((bookmark) =>
    navigablePaths.has(bookmark.path),
  );

  if (visiblePins.length) {
    sections.push({
      id: "pinned",
      title: labels.pinned,
      action: { label: labels.clearAll, onClick: onClearBookmarks },
      items: visiblePins.map((bookmark) => ({
        path: bookmark.path,
        label: bookmark.label,
        icon: findNavIconForPath(navItems, bookmark.path),
        bookmarked: true,
      })),
    });
  }

  sections.push(
    ...sectionsForLeaves(collectLeaves(panelModule), bookmarkedPaths, labels.pages),
  );

  return { title: panelModule?.label ?? "", sections };
}
