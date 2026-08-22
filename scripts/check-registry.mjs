/**
 * Regression guard for `features/registry.js`.
 *
 * The snapshots below are the module rules, permission rules and sidebar tree
 * exactly as they were hand-maintained across `lib/tenant-modules.js`,
 * `lib/permissions.js` and `shell/sidebar/main-nav.js` before the registry
 * replaced them. Resolving every interesting path both ways keeps an edit to the
 * registry from silently changing who can reach which route.
 *
 * When you intentionally change navigation or gating, update the snapshot in the
 * same commit — the diff is the review record for a permissions change.
 *
 * Settings leaves now carry their RBAC resource on the sidebar as well as the
 * route guard. `/main/settings` itself is only a landing hop (core module, no
 * resource). Preferences is ungated like the notification inbox: it is the
 * current user's own channel matrix, not a company-profile admin screen.
 *
 * Run with `npm run check:registry`.
 */

import {
  FEATURES,
  moduleForPath,
  NAV_SECTIONS,
  permissionResourceForPath,
  ROUTES,
} from "../features/registry.js";

const CORE_MODULE = "core";

const OLD_MODULE_RULES = [
  { prefix: "/main/overview", module: CORE_MODULE },
  { prefix: "/main/profile", module: CORE_MODULE },
  { prefix: "/main/settings", module: CORE_MODULE },
  { prefix: "/main/branches", module: CORE_MODULE },
  { prefix: "/main/users", module: CORE_MODULE },
  { prefix: "/main/roles", module: CORE_MODULE },
  { prefix: "/main/permissions", module: CORE_MODULE },
  { prefix: "/main/audit-log", module: CORE_MODULE },
  { prefix: "/main/brands", module: "master_data" },
  { prefix: "/main/categories", module: "master_data" },
  { prefix: "/main/vat-groups", module: "master_data" },
  { prefix: "/main/currencies", module: "master_data" },
  { prefix: "/main/payment-methods", module: "master_data" },
  { prefix: "/main/payment-terms", module: "master_data" },
  { prefix: "/main/unit-groups", module: "inventory" },
  { prefix: "/main/unit-of-measurements", module: "inventory" },
  { prefix: "/main/warehouses", module: "inventory" },
  { prefix: "/main/items", module: "inventory" },
  { prefix: "/main/stock", module: "inventory" },
  { prefix: "/main/salesmen", module: "sales" },
  { prefix: "/main/customer-groups", module: "sales" },
  { prefix: "/main/customers", module: "sales" },
  { prefix: "/main/supplier-groups", module: "purchasing" },
  { prefix: "/main/suppliers", module: "purchasing" },
];

const OLD_PERMISSION_RULES = [
  { prefix: "/main/settings/company-settings", resource: "tenant_settings" },
  { prefix: "/main/settings/company-profile", resource: "company_profile" },
  { prefix: "/main/branches", resource: "branches" },
  { prefix: "/main/users", resource: "users" },
  { prefix: "/main/roles", resource: "roles" },
  { prefix: "/main/permissions", resource: "permissions" },
  { prefix: "/main/audit-log", resource: "audits" },
  { prefix: "/main/brands", resource: "brands" },
  { prefix: "/main/categories", resource: "categories" },
  { prefix: "/main/vat-groups", resource: "vat_groups" },
  { prefix: "/main/currencies", resource: "currencies" },
  { prefix: "/main/payment-methods", resource: "payment_methods" },
  { prefix: "/main/payment-terms", resource: "payment_terms" },
  { prefix: "/main/unit-groups", resource: "unit_groups" },
  { prefix: "/main/unit-of-measurements", resource: "unit_of_measurements" },
  { prefix: "/main/warehouses", resource: "warehouses" },
  { prefix: "/main/items", resource: "items" },
  { prefix: "/main/stock", resource: "stock" },
  { prefix: "/main/salesmen", resource: "salesmen" },
  { prefix: "/main/customer-groups", resource: "customer_groups" },
  { prefix: "/main/customers", resource: "customers" },
  { prefix: "/main/supplier-groups", resource: "supplier_groups" },
  { prefix: "/main/suppliers", resource: "suppliers" },
];

/** The resolver both old files shared. */
function oldResolve(rules, key, pathname) {
  let best = null;
  let bestLen = -1;
  for (const rule of rules) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      if (rule.prefix.length > bestLen) {
        bestLen = rule.prefix.length;
        best = rule[key];
      }
    }
  }
  return best;
}

const OLD_ROUTES = {
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

const failures = [];

// ------------------------------------------------------------------- ROUTES
for (const [key, path] of Object.entries(OLD_ROUTES)) {
  if (ROUTES[key] !== path) failures.push(`ROUTES.${key}: expected ${path}, got ${ROUTES[key]}`);
}
for (const key of Object.keys(ROUTES)) {
  if (!(key in OLD_ROUTES)) failures.push(`ROUTES.${key}: unexpected extra key`);
}

// ------------------------------------------------------------------ gating
const probes = [
  ...Object.values(OLD_ROUTES),
  // nested / deep-linked variants the guard also sees
  "/main/items/42",
  "/main/stock/balances/7",
  "/main/settings/preferences",
  "/main/settings/company-profile/logo",
  "/main/customers/1/edit",
  "/main/audit-log/9",
  // unknown paths must stay ungated
  "/main/does-not-exist",
  "/main",
  "",
];

for (const path of probes) {
  const oldModule = oldResolve(OLD_MODULE_RULES, "module", path);
  const newModule = moduleForPath(path);
  if (oldModule !== newModule) {
    failures.push(`moduleForPath("${path}"): expected ${oldModule}, got ${newModule}`);
  }

  const oldPermission = oldResolve(OLD_PERMISSION_RULES, "resource", path);
  const newPermission = permissionResourceForPath(path);
  if (oldPermission !== newPermission) {
    failures.push(`permissionResourceForPath("${path}"): expected ${oldPermission}, got ${newPermission}`);
  }
}

// -------------------------------------------------------------- nav structure
/**
 * The sidebar tree exactly as `buildMainNavItems` produced it before the
 * registry, with `t` as the identity function so labels are translation keys.
 * Icons are omitted: they are compared separately by uniqueness below.
 */
const OLD_NAV = [
  { key: "/main/overview", label: "navOverview", module: "core" },
  {
    key: "master-data",
    label: "navMasterData",
    children: [
      { key: "/main/brands", label: "navBrands", module: "master_data", permission: "brands" },
      { key: "/main/categories", label: "navCategories", module: "master_data", permission: "categories" },
      { key: "/main/vat-groups", label: "navVatGroups", module: "master_data", permission: "vat_groups" },
      { key: "/main/unit-groups", label: "navUnitGroups", module: "inventory", permission: "unit_groups" },
      { key: "/main/unit-of-measurements", label: "navUnitOfMeasurements", module: "inventory", permission: "unit_of_measurements" },
      { key: "/main/warehouses", label: "navWarehouses", module: "inventory", permission: "warehouses" },
      { key: "/main/currencies", label: "navCurrencies", module: "master_data", permission: "currencies" },
      { key: "/main/payment-methods", label: "navPaymentMethods", module: "master_data", permission: "payment_methods" },
      { key: "/main/payment-terms", label: "navPaymentTerms", module: "master_data", permission: "payment_terms" },
      { key: "/main/salesmen", label: "navSalesmen", module: "sales", permission: "salesmen" },
    ],
  },
  {
    key: "inventory",
    label: "navInventory",
    matchPath: "/main/stock",
    children: [
      { key: "/main/items", label: "navItems", group: "navGroupCatalog", module: "inventory", permission: "items" },
      { key: "/main/stock/balances", label: "navStockBalances", group: "navGroupStockLevels", module: "inventory", permission: "stock" },
      { key: "/main/stock/purchasing-alerts", label: "navPurchasingAlerts", group: "navGroupStockLevels", module: "inventory", permission: "stock" },
      { key: "/main/stock/movements", label: "navStockMovements", group: "navGroupStockLevels", module: "inventory", permission: "stock" },
      { key: "/main/stock/purchase-orders", label: "navPurchaseOrders", group: "navGroupDocuments", module: "inventory", permission: "stock" },
      { key: "/main/stock/transfers", label: "navStockTransfers", group: "navGroupDocuments", module: "inventory", permission: "stock" },
    ],
  },
  {
    key: "sales",
    label: "navSales",
    children: [
      { key: "/main/customer-groups", label: "navCustomerGroups", module: "sales", permission: "customer_groups" },
      { key: "/main/customers", label: "navCustomers", module: "sales", permission: "customers" },
    ],
  },
  {
    key: "purchasing",
    label: "navPurchasing",
    children: [
      { key: "/main/supplier-groups", label: "navSupplierGroups", module: "purchasing", permission: "supplier_groups" },
      { key: "/main/suppliers", label: "navSuppliers", module: "purchasing", permission: "suppliers" },
    ],
  },
  {
    key: "administration",
    label: "navAdministration",
    children: [
      { key: "/main/branches", label: "navBranches", module: "core", permission: "branches" },
      { key: "/main/users", label: "navUsers", module: "core", permission: "users" },
      { key: "/main/roles", label: "navRoles", module: "core", permission: "roles" },
      { key: "/main/permissions", label: "navPermissions", module: "core", permission: "permissions" },
      { key: "/main/audit-log", label: "navAuditLog", module: "core", permission: "audits" },
    ],
  },
  {
    key: "settings",
    label: "navSettings",
    placement: "footer",
    matchPath: "/main/settings",
    children: [
      { key: "/main/settings/company-profile", label: "navCompanyProfile", group: "settingsCompanyGroup", module: "core", permission: "company_profile" },
      { key: "/main/settings/company-settings", label: "navCompanySettings", group: "settingsCompanyGroup", module: "core", permission: "tenant_settings" },
      { key: "/main/settings/preferences", label: "navPreferences", group: "settingsUserGroup", module: "core" },
    ],
  },
];

/** Mirrors `toNavLeaf` / `buildMainNavItems` in shell/sidebar/main-nav.js, minus icons. */
function derivedNav() {
  const t = (k) => k;
  const leaf = (f) => ({
    key: f.path,
    label: t(f.labelKey),
    ...(f.groupKey ? { group: t(f.groupKey) } : {}),
    ...(f.module ? { module: f.module } : {}),
    ...(f.permission && f.gateNav !== false ? { permission: f.permission } : {}),
  });

  const items = [];
  for (const section of NAV_SECTIONS) {
    const pages = FEATURES.filter((f) => f.section === section.id && f.nav !== false);
    if (!pages.length) continue;
    if (section.leaf) {
      items.push(leaf(pages[0]));
      continue;
    }
    items.push({
      key: section.id,
      label: t(section.labelKey),
      ...(section.placement ? { placement: section.placement } : {}),
      ...(section.matchPath ? { matchPath: section.matchPath } : {}),
      children: pages.map(leaf),
    });
  }
  return items;
}

const canonical = (v) =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  );

const derived = derivedNav();
if (canonical(derived) !== canonical(OLD_NAV)) {
  failures.push("nav tree differs from the pre-registry structure");
  for (let i = 0; i < Math.max(derived.length, OLD_NAV.length); i += 1) {
    if (canonical(derived[i]) !== canonical(OLD_NAV[i])) {
      failures.push(`  section ${i}:\n    old: ${canonical(OLD_NAV[i])}\n    new: ${canonical(derived[i])}`);
    }
  }
}

// Every rail row and page row is distinguished only by its icon, so duplicates
// are a real UX bug rather than a style nit.
const icons = [
  ...NAV_SECTIONS.map((s) => [s.id, s.icon]),
  ...FEATURES.filter((f) => f.nav !== false).map((f) => [f.id, f.icon]),
];
const seen = new Map();
for (const [id, icon] of icons) {
  const name = icon?.displayName ?? icon?.name ?? "(none)";
  // The overview section and the overview page intentionally share one icon.
  if (seen.has(name) && seen.get(name) !== "overview" && id !== "overview") {
    failures.push(`duplicate nav icon ${name}: ${seen.get(name)} and ${id}`);
  }
  seen.set(name, id);
}

if (failures.length) {
  console.error(`FAILED (${failures.length}):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(
  `registry OK: ${probes.length} gated paths, ${Object.keys(OLD_ROUTES).length} routes, ` +
    `nav tree identical (${derived.length} rail entries), icons unique`,
);
