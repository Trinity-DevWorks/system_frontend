import {
  ApartmentOutlined,
  AppstoreOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  DropboxOutlined,
  FieldTimeOutlined,
  FileSearchOutlined,
  GoldOutlined,
  HistoryOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TrademarkOutlined,
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
 * - Set `module` on leaves (and optionally groups) to gate by tenant entitlements.
 * - Set `permission` on leaves to gate by RBAC view (`resource_key` from config/rbac.php).
 *   Import/export (and any extra action) must also be listed for that resource in rbac.php.
 * - Filtering is applied in `buildMainNavItems` (modules then permissions).
 */
export const ROUTES = {
  overview: "/main/overview",
  brands: "/main/brands",
  categories: "/main/categories",
  vatGroups: "/main/vat-groups",
  unitGroups: "/main/unit-groups",
  unitOfMeasurements: "/main/unit-of-measurements",
  warehouses: "/main/warehouses",
  currencies: "/main/currencies",
  paymentMethods: "/main/payment-methods",
  paymentTerms: "/main/payment-terms",
  salesmen: "/main/salesmen",
  items: "/main/items",
  stock: "/main/stock",
  stockBalances: "/main/stock/balances",
  stockPurchasingAlerts: "/main/stock/purchasing-alerts",
  stockMovements: "/main/stock/movements",
  stockTransfers: "/main/stock/transfers",
  stockPurchaseOrders: "/main/stock/purchase-orders",
  customerGroups: "/main/customer-groups",
  customers: "/main/customers",
  supplierGroups: "/main/supplier-groups",
  suppliers: "/main/suppliers",
  settings: "/main/settings",
  settingsCompanyProfile: "/main/settings/company-profile",
  settingsCompanySettings: "/main/settings/company-settings",
  settingsPreferences: "/main/settings/preferences",
  profile: "/main/profile",
  notifications: "/main/notifications",
  branches: "/main/branches",
  users: "/main/users",
  roles: "/main/roles",
  permissions: "/main/permissions",
  auditLog: "/main/audit-log",
};

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
 * @param {(key: string) => string} t Shell translations
 * @param {{
 *   moduleSet?: Set<string> | null,
 *   can?: (resource: string, action: string) => boolean,
 * }} [options]
 * @returns {import("antd").MenuProps["items"]}
 */
export function buildMainNavItems(t, options = {}) {
  /** @type {import("antd").MenuProps["items"]} */
  const items = [
    {
      key: ROUTES.overview,
      icon: <DashboardOutlined />,
      label: t("navOverview"),
      module: "core",
    },
    {
      key: "master-data",
      icon: <AppstoreOutlined />,
      label: t("navMasterData"),
      className: SECTION_DIVIDER_CLASS,
      children: [
        {
          key: ROUTES.brands,
          icon: <TrademarkOutlined />,
          label: t("navBrands"),
          module: "master_data",
          permission: "brands",
        },
        {
          key: ROUTES.categories,
          icon: <TagsOutlined />,
          label: t("navCategories"),
          module: "master_data",
          permission: "categories",
        },
        {
          key: ROUTES.vatGroups,
          icon: <GoldOutlined />,
          label: t("navVatGroups"),
          module: "master_data",
          permission: "vat_groups",
        },
        {
          key: ROUTES.unitGroups,
          icon: <DeploymentUnitOutlined />,
          label: t("navUnitGroups"),
          module: "inventory",
          permission: "unit_groups",
        },
        {
          key: ROUTES.unitOfMeasurements,
          icon: <DeploymentUnitOutlined />,
          label: t("navUnitOfMeasurements"),
          module: "inventory",
          permission: "unit_of_measurements",
        },
        {
          key: ROUTES.warehouses,
          icon: <ShopOutlined />,
          label: t("navWarehouses"),
          module: "inventory",
          permission: "warehouses",
        },
        {
          key: ROUTES.currencies,
          icon: <GoldOutlined />,
          label: t("navCurrencies"),
          module: "master_data",
          permission: "currencies",
        },
        {
          key: ROUTES.paymentMethods,
          icon: <CreditCardOutlined />,
          label: t("navPaymentMethods"),
          module: "master_data",
          permission: "payment_methods",
        },
        {
          key: ROUTES.paymentTerms,
          icon: <FieldTimeOutlined />,
          label: t("navPaymentTerms"),
          module: "master_data",
          permission: "payment_terms",
        },
        {
          key: ROUTES.salesmen,
          icon: <IdcardOutlined />,
          label: t("navSalesmen"),
          module: "sales",
          permission: "salesmen",
        },
      ],
    },
    {
      key: "inventory",
      icon: <DropboxOutlined />,
      label: t("navInventory"),
      className: SECTION_DIVIDER_CLASS,
      children: [
        {
          key: ROUTES.items,
          icon: <DropboxOutlined />,
          label: t("navItems"),
          module: "inventory",
          permission: "items",
        },
        {
          key: ROUTES.stock,
          icon: <ShopOutlined />,
          label: t("navStock"),
          module: "inventory",
          permission: "stock",
        },
      ],
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
          module: "sales",
          permission: "customer_groups",
        },
        {
          key: ROUTES.customers,
          icon: <UserOutlined />,
          label: t("navCustomers"),
          module: "sales",
          permission: "customers",
        },
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
          module: "purchasing",
          permission: "supplier_groups",
        },
        {
          key: ROUTES.suppliers,
          icon: <UserOutlined />,
          label: t("navSuppliers"),
          module: "purchasing",
          permission: "suppliers",
        },
      ],
    },
    {
      key: "administration",
      icon: <SafetyCertificateOutlined />,
      label: t("navAdministration"),
      className: SECTION_DIVIDER_CLASS,
      children: [
        {
          key: ROUTES.branches,
          icon: <ApartmentOutlined />,
          label: t("navBranches"),
          module: "core",
          permission: "branches",
        },
        {
          key: ROUTES.users,
          icon: <UserOutlined />,
          label: t("navUsers"),
          module: "core",
          permission: "users",
        },
        {
          key: ROUTES.roles,
          icon: <SafetyCertificateOutlined />,
          label: t("navRoles"),
          module: "core",
          permission: "roles",
        },
        {
          key: ROUTES.permissions,
          icon: <FileSearchOutlined />,
          label: t("navPermissions"),
          module: "core",
          permission: "permissions",
        },
        {
          key: ROUTES.auditLog,
          icon: <HistoryOutlined />,
          label: t("navAuditLog"),
          module: "core",
          permission: "audits",
        },
      ],
    },
  ];

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
