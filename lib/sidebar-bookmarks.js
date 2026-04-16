/**
 * Sidebar bookmark persistence helpers.
 * Used by the shell UI to store and manage bookmarked menu links in localStorage.
 */
const STORAGE_KEY = "shell.sidebar.bookmarks";

/**
 * @typedef {{ path: string, label: string }} SidebarBookmark
 */

/** @returns {SidebarBookmark[]} */
export function loadSidebarBookmarks() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b) =>
        b &&
        typeof b.path === "string" &&
        typeof b.label === "string" &&
        b.path.startsWith("/"),
    );
  } catch {
    return [];
  }
}

/** @param {SidebarBookmark[]} bookmarks */
export function saveSidebarBookmarks(bookmarks) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {string} path
 * @param {string} label
 * @returns {SidebarBookmark[]}
 */
export function addSidebarBookmark(path, label) {
  const existing = loadSidebarBookmarks();
  if (existing.some((b) => b.path === path)) {
    return existing;
  }
  const next = [...existing, { path, label }];
  saveSidebarBookmarks(next);
  return next;
}

/**
 * @param {string} path
 * @returns {SidebarBookmark[]}
 */
export function removeSidebarBookmark(path) {
  const next = loadSidebarBookmarks().filter((b) => b.path !== path);
  saveSidebarBookmarks(next);
  return next;
}
