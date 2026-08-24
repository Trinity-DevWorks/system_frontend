/**
 * Sidebar bookmark persistence helpers.
 * Used by the shell UI to store and manage bookmarked menu links in localStorage.
 */

import { getLocalPreferenceUserId } from "@/lib/local-preference-scope";

const STORAGE_PREFIX = "shell.sidebar.bookmarks";
const LEGACY_STORAGE_KEY = "shell.sidebar.bookmarks";

/**
 * @typedef {{ path: string, label: string }} SidebarBookmark
 */

function storageKey() {
  return `${STORAGE_PREFIX}:${getLocalPreferenceUserId()}`;
}

/**
 * @param {unknown} parsed
 * @returns {SidebarBookmark[]}
 */
function normalizeBookmarks(parsed) {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (b) =>
      b &&
      typeof b.path === "string" &&
      typeof b.label === "string" &&
      b.path.startsWith("/"),
  );
}

/** @returns {SidebarBookmark[]} */
export function loadSidebarBookmarks() {
  if (typeof window === "undefined") return [];
  try {
    const scopedRaw = localStorage.getItem(storageKey());
    if (scopedRaw) {
      return normalizeBookmarks(JSON.parse(scopedRaw));
    }
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return [];
    const legacy = normalizeBookmarks(JSON.parse(legacyRaw));
    if (getLocalPreferenceUserId() !== "anon" && legacy.length > 0) {
      saveSidebarBookmarks(legacy);
    }
    return legacy;
  } catch {
    return [];
  }
}

/** @param {SidebarBookmark[]} bookmarks */
export function saveSidebarBookmarks(bookmarks) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(bookmarks));
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

/** @returns {SidebarBookmark[]} */
export function clearAllSidebarBookmarks() {
  saveSidebarBookmarks([]);
  return [];
}
