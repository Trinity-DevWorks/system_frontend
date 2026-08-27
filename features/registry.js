/**
 * The one place a feature announces itself to the application shell.
 *
 * Before this file the same four facts — path, tenant module, RBAC resource and
 * sidebar placement — were written out separately in `shell/sidebar/main-nav.js`,
 * `lib/permissions.js`, `lib/tenant-modules.js` and `HeaderQuickCreate.js`, so a
 * new feature meant four edits that could silently drift apart. Everything those
 * files need is now derived from `NAV_SECTIONS` + `FEATURES`.
 *
 * Adding a feature:
 *   1. Create `features/<id>/` and the `app/[locale]/main/<path>/page.js` stub.
 *   2. Add one entry below.
 *
 * This module is deliberately plain data: no JSX, no React, no `lib/` imports, so
 * it can be loaded by tooling as well as by the shell. Icons are stored as
 * component references and rendered by the consumer.
 */

import {
  AlertOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BankOutlined,
  BellOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  ClusterOutlined,
  ControlOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  DollarOutlined,
  DropboxOutlined,
  ExperimentOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  FlagOutlined,
  FormOutlined,
  GiftOutlined,
  HistoryOutlined,
  IdcardOutlined,
  InboxOutlined,
  KeyOutlined,
  LockOutlined,
  PercentageOutlined,
  RetweetOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SolutionOutlined,
  SwapOutlined,
  TagsOutlined,
  TeamOutlined,
  TrademarkOutlined,
  UsergroupAddOutlined,
  UserOutlined,
} from "@ant-design/icons";

/** Always available; never gated away by entitlements. */
export const CORE_MODULE = "core";

/**
 * Rail entries, in the order they appear in the sidebar.
 *
 * `leaf: true` marks a section that navigates directly instead of opening a page
 * panel. `matchPath` is a path the section owns but which is not a leaf of its
 * own (both `/main/stock` and `/main/settings` only redirect); `routeKey` names
 * it in `ROUTES`.
 *
 * @typedef {{
 *   id: string;
 *   labelKey: string;
 *   icon: import("react").ComponentType;
 *   leaf?: boolean;
 *   placement?: "footer";
 *   matchPath?: string;
 *   routeKey?: string;
 *   module?: string;
 *   permission?: string;
 * }} NavSection
 * @type {ReadonlyArray<NavSection>}
 */
export const NAV_SECTIONS = [
  { id: "overview", labelKey: "navOverview", icon: DashboardOutlined, leaf: true },
  { id: "master-data", labelKey: "navMasterData", icon: DatabaseOutlined },
  {
    id: "inventory",
    labelKey: "navInventory",
    icon: DropboxOutlined,
    matchPath: "/main/stock",
    routeKey: "stock",
    module: "inventory",
    permission: "stock",
  },
  { id: "sales", labelKey: "navSales", icon: ShoppingCartOutlined },
  { id: "purchasing", labelKey: "navPurchasing", icon: ShoppingOutlined },
  { id: "administration", labelKey: "navAdministration", icon: SafetyCertificateOutlined },
  {
    id: "settings",
    labelKey: "navSettings",
    icon: SettingOutlined,
    placement: "footer",
    matchPath: "/main/settings",
    module: CORE_MODULE,
  },
];

/**
 * Every navigable feature page, in sidebar order within its section.
 *
 * @typedef {{
 *   id: string;                 key in `ROUTES`
 *   path: string;               router.push target, and the prefix route gating matches on
 *   section: string;            NAV_SECTIONS id
 *   labelKey?: string;          Shell translation key; omit for pages outside the sidebar
 *   icon?: import("react").ComponentType;
 *   groupKey?: string;          sub-heading inside the section panel
 *   module?: string;            tenant entitlement code (config/modules.php)
 *   permission?: string;        RBAC resource_key (config/rbac.php)
 *   gateNav?: boolean;          false = route guard enforces `permission`, sidebar does not
 *   nav?: boolean;              false = routable but never listed in the sidebar
 *   quickCreate?: boolean;      offer in the header "+" menu
 * }} FeatureEntry
 * @type {ReadonlyArray<FeatureEntry>}
 */
export const FEATURES = [
  { id: "overview", path: "/main/overview", section: "overview", labelKey: "navOverview", icon: DashboardOutlined, module: CORE_MODULE },

  { id: "brands", path: "/main/brands", section: "master-data", labelKey: "navBrands", icon: TrademarkOutlined, module: "master_data", permission: "brands", quickCreate: true },
  { id: "categories", path: "/main/categories", section: "master-data", labelKey: "navCategories", icon: TagsOutlined, module: "master_data", permission: "categories", quickCreate: true },
  { id: "vatGroups", path: "/main/vat-groups", section: "master-data", labelKey: "navVatGroups", icon: PercentageOutlined, module: "master_data", permission: "vat_groups" },
  { id: "unitGroups", path: "/main/unit-groups", section: "master-data", labelKey: "navUnitGroups", icon: DeploymentUnitOutlined, module: "inventory", permission: "unit_groups" },
  { id: "unitOfMeasurements", path: "/main/unit-of-measurements", section: "master-data", labelKey: "navUnitOfMeasurements", icon: CalculatorOutlined, module: "inventory", permission: "unit_of_measurements" },
  { id: "warehouses", path: "/main/warehouses", section: "master-data", labelKey: "navWarehouses", icon: ShopOutlined, module: "inventory", permission: "warehouses" },
  { id: "currencies", path: "/main/currencies", section: "master-data", labelKey: "navCurrencies", icon: DollarOutlined, module: "master_data", permission: "currencies" },
  { id: "paymentMethods", path: "/main/payment-methods", section: "master-data", labelKey: "navPaymentMethods", icon: CreditCardOutlined, module: "master_data", permission: "payment_methods" },
  { id: "paymentTerms", path: "/main/payment-terms", section: "master-data", labelKey: "navPaymentTerms", icon: FieldTimeOutlined, module: "master_data", permission: "payment_terms" },
  { id: "salesmen", path: "/main/salesmen", section: "master-data", labelKey: "navSalesmen", icon: IdcardOutlined, module: "sales", permission: "salesmen" },

  { id: "items", path: "/main/items", section: "inventory", labelKey: "navItems", icon: AppstoreOutlined, groupKey: "navGroupCatalog", module: "inventory", permission: "items", quickCreate: true },
  { id: "stockAdjustmentReasons", path: "/main/stock/adjustment-reasons", section: "inventory", labelKey: "navAdjustmentReasons", icon: FlagOutlined, groupKey: "navGroupCatalog", module: "inventory", permission: "stock" },
  { id: "stockBalances", path: "/main/stock/balances", section: "inventory", labelKey: "navStockBalances", icon: InboxOutlined, groupKey: "navGroupStockLevels", module: "inventory", permission: "stock" },
  { id: "stockPurchasingAlerts", path: "/main/stock/purchasing-alerts", section: "inventory", labelKey: "navPurchasingAlerts", icon: AlertOutlined, groupKey: "navGroupStockLevels", module: "inventory", permission: "stock" },
  { id: "stockMovements", path: "/main/stock/movements", section: "inventory", labelKey: "navStockMovements", icon: SwapOutlined, groupKey: "navGroupStockLevels", module: "inventory", permission: "stock" },
  { id: "stockLots", path: "/main/stock/lots", section: "inventory", labelKey: "navLots", icon: CalendarOutlined, groupKey: "navGroupStockLevels", module: "inventory", permission: "stock" },
  { id: "stockPurchaseOrders", path: "/main/stock/purchase-orders", section: "inventory", labelKey: "navPurchaseOrders", icon: FileTextOutlined, groupKey: "navGroupDocuments", module: "inventory", permission: "stock" },
  { id: "stockGoodsReceipts", path: "/main/stock/goods-receipts", section: "inventory", labelKey: "navGoodsReceipts", icon: DropboxOutlined, groupKey: "navGroupDocuments", module: "inventory", permission: "stock" },
  { id: "stockOpeningStocks", path: "/main/stock/opening-stocks", section: "inventory", labelKey: "navOpeningStock", icon: DatabaseOutlined, groupKey: "navGroupDocuments", module: "inventory", permission: "stock" },
  { id: "stockAdjustments", path: "/main/stock/adjustments", section: "inventory", labelKey: "navStockAdjustments", icon: FormOutlined, groupKey: "navGroupDocuments", module: "inventory", permission: "stock" },
  { id: "stockProductions", path: "/main/stock/productions", section: "inventory", labelKey: "navProductions", icon: ExperimentOutlined, groupKey: "navGroupDocuments", module: "inventory", permission: "stock" },
  { id: "stockBundleExplosions", path: "/main/stock/bundle-explosions", section: "inventory", labelKey: "navBundleExplosions", icon: GiftOutlined, groupKey: "navGroupDocuments", module: "inventory", permission: "stock" },
  { id: "stockStockCounts", path: "/main/stock/stock-counts", section: "inventory", labelKey: "navStockCounts", icon: CheckSquareOutlined, groupKey: "navGroupDocuments", module: "inventory", permission: "stock" },
  { id: "stockTransfers", path: "/main/stock/transfers", section: "inventory", labelKey: "navStockTransfers", icon: RetweetOutlined, groupKey: "navGroupDocuments", module: "inventory", permission: "stock" },

  { id: "customerGroups", path: "/main/customer-groups", section: "sales", labelKey: "navCustomerGroups", icon: UsergroupAddOutlined, module: "sales", permission: "customer_groups" },
  { id: "customers", path: "/main/customers", section: "sales", labelKey: "navCustomers", icon: UserOutlined, module: "sales", permission: "customers", quickCreate: true },

  { id: "supplierGroups", path: "/main/supplier-groups", section: "purchasing", labelKey: "navSupplierGroups", icon: ClusterOutlined, module: "purchasing", permission: "supplier_groups" },
  { id: "suppliers", path: "/main/suppliers", section: "purchasing", labelKey: "navSuppliers", icon: SolutionOutlined, module: "purchasing", permission: "suppliers", quickCreate: true },

  { id: "branches", path: "/main/branches", section: "administration", labelKey: "navBranches", icon: ApartmentOutlined, module: CORE_MODULE, permission: "branches" },
  { id: "users", path: "/main/users", section: "administration", labelKey: "navUsers", icon: TeamOutlined, module: CORE_MODULE, permission: "users" },
  { id: "roles", path: "/main/roles", section: "administration", labelKey: "navRoles", icon: KeyOutlined, module: CORE_MODULE, permission: "roles" },
  { id: "permissions", path: "/main/permissions", section: "administration", labelKey: "navPermissions", icon: LockOutlined, module: CORE_MODULE, permission: "permissions" },
  { id: "auditLog", path: "/main/audit-log", section: "administration", labelKey: "navAuditLog", icon: HistoryOutlined, module: CORE_MODULE, permission: "audits" },

  { id: "settingsCompanyProfile", path: "/main/settings/company-profile", section: "settings", labelKey: "navCompanyProfile", icon: BankOutlined, groupKey: "settingsCompanyGroup", module: CORE_MODULE, permission: "company_profile" },
  { id: "settingsCompanySettings", path: "/main/settings/company-settings", section: "settings", labelKey: "navCompanySettings", icon: ControlOutlined, groupKey: "settingsCompanyGroup", module: CORE_MODULE, permission: "tenant_settings" },
  { id: "settingsPreferences", path: "/main/settings/preferences", section: "settings", labelKey: "navPreferences", icon: BellOutlined, groupKey: "settingsUserGroup", module: CORE_MODULE },

  // Reached from the header (avatar menu, notification bell) rather than the rail.
  { id: "profile", path: "/main/profile", section: "administration", nav: false, module: CORE_MODULE },
  { id: "notifications", path: "/main/notifications", section: "administration", nav: false },
];

/** `ROUTES.items === "/main/items"`. Section match paths are included. */
export const ROUTES = Object.freeze(
  Object.fromEntries([
    ...FEATURES.map((f) => [f.id, f.path]),
    ...NAV_SECTIONS.filter((s) => s.matchPath).map((s) => [s.routeKey ?? s.id, s.matchPath]),
  ]),
);

/** Every path that carries gating metadata, longest-prefix candidates included. */
function gatedPaths() {
  return [
    ...NAV_SECTIONS.filter((s) => s.matchPath).map((s) => ({
      prefix: /** @type {string} */ (s.matchPath),
      module: s.module,
      permission: s.permission,
    })),
    ...FEATURES.map((f) => ({ prefix: f.path, module: f.module, permission: f.permission })),
  ];
}

/**
 * Longest matching prefix wins, so `/main/stock/movements` resolves through its
 * own entry rather than the `/main/stock` section.
 *
 * @param {string} pathname Locale-stripped path
 * @param {"module" | "permission"} field
 * @returns {string | null}
 */
function resolveByPrefix(pathname, field) {
  if (!pathname || typeof pathname !== "string") return null;

  let best = null;
  let bestLength = -1;
  for (const rule of gatedPaths()) {
    const value = rule[field];
    if (!value) continue;
    if (pathname !== rule.prefix && !pathname.startsWith(`${rule.prefix}/`)) continue;
    if (rule.prefix.length > bestLength) {
      bestLength = rule.prefix.length;
      best = value;
    }
  }
  return best;
}

/**
 * @param {string} pathname Locale-stripped path (e.g. /main/items)
 * @returns {string | null} Module code, or null if ungated
 */
export function moduleForPath(pathname) {
  return resolveByPrefix(pathname, "module");
}

/**
 * @param {string} pathname Locale-stripped path
 * @returns {string | null} RBAC resource_key, or null if ungated
 */
export function permissionResourceForPath(pathname) {
  return resolveByPrefix(pathname, "permission");
}

/** Records created often enough to deserve a shortcut from anywhere in the app. */
export function quickCreateFeatures() {
  return FEATURES.filter((f) => f.quickCreate);
}
