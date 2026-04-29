import {
  AppstoreOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  DropboxOutlined,
  FileSearchOutlined,
  GoldOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

const SECTION_DIVIDER_CLASS =
  "mt-2 pt-2 border-t border-black/10 dark:border-white/10";

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
  categories: "/main/categories",
  subCategories: "/main/sub-categories",
  vatGroups: "/main/vat-groups",
  unitGroups: "/main/unit-groups",
  unitOfMeasurements: "/main/unit-of-measurements",
  warehouses: "/main/warehouses",
  currencies: "/main/currencies",
  items: "/main/items",
  customerGroups: "/main/customer-groups",
  customers: "/main/customers",
  supplierGroups: "/main/supplier-groups",
  suppliers: "/main/suppliers",
  users: "/main/users",
  roles: "/main/roles",
  permissions: "/main/permissions",
  
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
    {
      key: "master-data",
      icon: <AppstoreOutlined />,
      label: t("navMasterData"),
      className: SECTION_DIVIDER_CLASS,
      children: [
        { key: ROUTES.categories, icon: <TagsOutlined />, label: t("navCategories") },
        {
          key: ROUTES.subCategories,
          icon: <TagsOutlined />,
          label: t("navSubCategories"),
        },
        { key: ROUTES.vatGroups, icon: <GoldOutlined />, label: t("navVatGroups") },
        { key: ROUTES.unitGroups, icon: <DeploymentUnitOutlined />, label: t("navUnitGroups") },
        {
          key: ROUTES.unitOfMeasurements,
          icon: <DeploymentUnitOutlined />,
          label: t("navUnitOfMeasurements"),
        },
        { key: ROUTES.warehouses, icon: <ShopOutlined />, label: t("navWarehouses") },
        { key: ROUTES.currencies, icon: <GoldOutlined />, label: t("navCurrencies") },
      ],
    },
    {
      key: "inventory",
      icon: <DropboxOutlined />,
      label: t("navInventory"),
      className: SECTION_DIVIDER_CLASS,
      children: [{ key: ROUTES.items, icon: <DropboxOutlined />, label: t("navItems") }],
    },
    {
      key: "sales",
      icon: <ShoppingCartOutlined />,
      label: t("navSales"),
      className: SECTION_DIVIDER_CLASS,
      children: [
        {
          key: ROUTES.customerGroups,
          icon: <TeamOutlined />,
          label: t("navCustomerGroups"),
        },
        { key: ROUTES.customers, icon: <UserOutlined />, label: t("navCustomers") },
      ],
    },
    {
      key: "purchasing",
      icon: <ShoppingOutlined />,
      label: t("navPurchasing"),
      className: SECTION_DIVIDER_CLASS,
      children: [
        {
          key: ROUTES.supplierGroups,
          icon: <TeamOutlined />,
          label: t("navSupplierGroups"),
        },
        { key: ROUTES.suppliers, icon: <UserOutlined />, label: t("navSuppliers") },
      ],
    },
    {
      key: "administration",
      icon: <SafetyCertificateOutlined />,
      label: t("navAdministration"),
      className: SECTION_DIVIDER_CLASS,
      children: [
        { key: ROUTES.users, icon: <UserOutlined />, label: t("navUsers") },
        { key: ROUTES.roles, icon: <SafetyCertificateOutlined />, label: t("navRoles") },
        { key: ROUTES.permissions, icon: <FileSearchOutlined />, label: t("navPermissions") },
      ],
    }
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
