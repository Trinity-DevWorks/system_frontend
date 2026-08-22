import { FEATURES, NAV_SECTIONS } from "@/features/registry";

/**
 * Turns the feature registry into the Ant Design menu tree the sidebar renders.
 *
 * Shape: top-level entries are the modules shown in the icon rail; their `children`
 * are the pages listed in the panel beside it. Each icon must be unique — in a 56px
 * rail and a flat page list the icon is the only thing distinguishing two rows.
 *
 * To add a page, add one entry to `FEATURES` in `features/registry.js`; the nav,
 * the route guard, and the quick-create menu all derive from it. Nothing in this
 * file needs to change.
 */

/**
 * @param {import("antd").MenuProps["items"]} items
 * @param {Set<string> | null | undefined} moduleSet null/undefined = show all (still loading)
 * @returns {import("antd").MenuProps["items"]}
 */
function filterNavByModules(items, moduleSet) {
  if (!moduleSet) {
    return items;
  }

  const out = [];
  for (const item of items ?? []) {
    if (!item) continue;

    if (item.children?.length) {
      const children = filterNavByModules(item.children, moduleSet);
      if (!children?.length) continue;
      out.push({ ...item, children });
      continue;
    }

    const code = item.module;
    if (code && code !== "core" && !moduleSet.has(code)) {
      continue;
    }
    out.push(item);
  }
  return out;
}

/**
 * Hide leaves the user cannot view. Groups with no remaining children are dropped.
 * Items without `permission` stay (e.g. overview).
 *
 * @param {import("antd").MenuProps["items"]} items
 * @param {(resource: string, action: string) => boolean} [can]
 * @returns {import("antd").MenuProps["items"]}
 */
function filterNavByPermissions(items, can) {
  if (typeof can !== "function") {
    return items;
  }

  const out = [];
  for (const item of items ?? []) {
    if (!item) continue;

    if (item.children?.length) {
      const children = filterNavByPermissions(item.children, can);
      if (!children?.length) continue;
      out.push({ ...item, children });
      continue;
    }

    const resource = item.permission;
    if (typeof resource === "string" && resource && !can(resource, "view")) {
      continue;
    }
    out.push(item);
  }
  return out;
}

/**
 * One registry entry -> one Ant Design leaf.
 *
 * `gateNav: false` keeps a page visible in the sidebar while the route guard
 * still enforces its resource, which is how the settings pages have always
 * behaved.
 *
 * @param {(key: string) => string} t
 * @param {import("@/features/registry").FeatureEntry} feature
 */
function toNavLeaf(t, feature) {
  const Icon = feature.icon;
  return {
    key: feature.path,
    icon: Icon ? <Icon /> : undefined,
    label: t(feature.labelKey),
    ...(feature.groupKey ? { group: t(feature.groupKey) } : {}),
    ...(feature.module ? { module: feature.module } : {}),
    ...(feature.permission && feature.gateNav !== false
      ? { permission: feature.permission }
      : {}),
  };
}

/**
 * @param {(key: string) => string} t Shell translations
 * @param {{
 *   moduleSet?: Set<string> | null,
 *   can?: (resource: string, action: string) => boolean,
 * }} [options]
 * @returns {import("antd").MenuProps["items"]}
 */
export function buildMainNavItems(t, options = {}) {
  /** @type {import("antd").MenuProps["items"]} */
  const items = [];

  for (const section of NAV_SECTIONS) {
    const pages = FEATURES.filter((f) => f.section === section.id && f.nav !== false);
    if (!pages.length) continue;

    if (section.leaf) {
      items.push(toNavLeaf(t, pages[0]));
      continue;
    }

    const SectionIcon = section.icon;
    items.push({
      key: section.id,
      icon: <SectionIcon />,
      label: t(section.labelKey),
      ...(section.placement ? { placement: section.placement } : {}),
      ...(section.matchPath ? { matchPath: section.matchPath } : {}),
      children: pages.map((page) => toNavLeaf(t, page)),
    });
  }

  const byModule = filterNavByModules(items, options.moduleSet);
  return filterNavByPermissions(byModule, options.can);
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
 * Which top-level module (rail entry) owns `pathname`.
 * Longest path-prefix match across each module's subtree, so `/main/stock/movements`
 * resolves to Inventory without listing every sub-route in the rail.
 *
 * @param {string} pathname
 * @param {import("antd").MenuProps["items"]} items
 * @returns {string | null} Module `key`, or null when nothing matches.
 */
export function findModuleKeyForPath(pathname, items) {
  let bestModuleKey = null;
  let bestLength = -1;

  for (const item of items ?? []) {
    if (!item) continue;
    const candidates = collectNavPathKeys([item]);
    if (typeof item.matchPath === "string") {
      candidates.push(item.matchPath);
    }
    for (const key of candidates) {
      if (pathname !== key && !pathname.startsWith(`${key}/`)) continue;
      if (key.length > bestLength) {
        bestLength = key.length;
        bestModuleKey = item.key;
      }
    }
  }

  return bestModuleKey;
}

/**
 * Landing page for a module — the first navigable path in its subtree.
 * Used when the rail icon is clicked.
 *
 * @param {import("antd").MenuProps["items"][number]} item
 * @returns {string | null}
 */
export function firstNavPathIn(item) {
  const [first] = collectNavPathKeys([item]);
  return first ?? null;
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
