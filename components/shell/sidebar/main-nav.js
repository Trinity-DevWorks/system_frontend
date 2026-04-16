import { DashboardOutlined } from "@ant-design/icons";

/**
 * Single place for main-app routes shown in the sidebar.
 *
 * Adding items:
 * - Add a route constant here (and matching `app/[locale]/...` page).
 * - Push an entry from `buildMainNavItems` (flat item), or use `children` for a collapsible submenu:
 *   { key: "group-key", icon: <Icon />, label: t("navX"), children: [{ key: "/main/foo", label: t("navFoo") }] }
 * - `key` for navigation must be the path you pass to `router.push` (e.g. "/main/overview").
 *   Selection uses longest prefix match on those path keys (see `selectedKeysForPath`).
 * - For permission-gated items, wrap the push in `if (canSee) { items.push(...) }` or filter in `buildMainNavItems`.
 */
export const ROUTES = {
  overview: "/main/overview",
};

/**
 * @param {(key: string) => string} t Shell translations
 * @returns {import("antd").MenuProps["items"]}
 */
export function buildMainNavItems(t) {
  /** @type {import("antd").MenuProps["items"]} */
  return [
    {
      key: ROUTES.overview,
      icon: <DashboardOutlined />,
      label: t("navOverview"),
    },
  ];
}

/**
 * Collect sidebar keys that are app paths (`router.push` targets).
 * Group rows may use non-path keys; those are skipped.
 *
 * @param {import("antd").MenuProps["items"]} items
 * @returns {string[]}
 */
function collectNavPathKeys(items) {
  const out = [];
  for (const item of items ?? []) {
    if (!item) continue;
    const k = item.key;
    if (typeof k === "string" && k.startsWith("/")) {
      out.push(k);
    }
    if (item.children?.length) {
      out.push(...collectNavPathKeys(item.children));
    }
  }
  return out;
}

/**
 * Which menu `key` should be selected for `pathname`.
 * Uses longest path-prefix match over keys from `items` (flat or nested),
 * so nested routes keep the parent section highlighted without per-route `if`s.
 *
 * @param {string} pathname
 * @param {import("antd").MenuProps["items"]} items From `buildMainNavItems` (full list, not search-filtered).
 * @returns {string[]}
 */
export function selectedKeysForPath(pathname, items) {
  const keys = collectNavPathKeys(items);
  let best = "";
  for (const key of keys) {
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      if (key.length > best.length) best = key;
    }
  }
  return best ? [best] : [pathname];
}

/**
 * Find display label for a path in menu items (for bookmarks).
 * @param {import("antd").MenuProps["items"]} items
 * @param {string} path
 * @returns {string | null}
 */
export function findNavLabelForPath(items, path) {
  for (const item of items ?? []) {
    if (!item) continue;
    if (item.key === path && typeof item.label === "string") {
      return item.label;
    }
    if (item.children?.length) {
      const nested = findNavLabelForPath(item.children, path);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

/**
 * Icon for a path in menu items (same node as the main sidebar uses for that route).
 * @param {import("antd").MenuProps["items"]} items
 * @param {string} path
 * @returns {import("react").ReactNode | null}
 */
export function findNavIconForPath(items, path) {
  for (const item of items ?? []) {
    if (!item) continue;
    if (item.key === path) {
      return item.icon ?? null;
    }
    if (item.children?.length) {
      const nested = findNavIconForPath(item.children, path);
      if (nested != null) {
        return nested;
      }
    }
  }
  return null;
}
