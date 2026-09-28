/**
 * Central (platform admin) counterpart of `features/registry.js`.
 *
 * Kept separate so tenant module gating and the `check:registry` snapshots stay
 * untouched. Central pages have no tenant modules; `permission` is a resource key
 * from the backend `config/central_rbac.php`.
 *
 * Adding a central feature:
 *   1. Create `features/central/<feature>/` and the `app/[locale]/central/<path>/page.js` stub.
 *   2. Add one entry below.
 *
 * Plain data only (no JSX / React / `lib/` imports), same as the tenant registry.
 */

import {
  AppstoreOutlined,
  DashboardOutlined,
  HistoryOutlined,
  KeyOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TeamOutlined,
} from "@ant-design/icons";

/**
 * @type {ReadonlyArray<import("@/features/registry").NavSection>}
 */
export const CENTRAL_NAV_SECTIONS = [
  { id: "overview", labelKey: "navOverview", icon: DashboardOutlined, leaf: true },
  { id: "platform", labelKey: "navPlatform", icon: ShopOutlined },
  { id: "administration", labelKey: "navAdministration", icon: SafetyCertificateOutlined },
];

/**
 * @type {ReadonlyArray<import("@/features/registry").FeatureEntry>}
 */
export const CENTRAL_FEATURES = [
  { id: "centralOverview", path: "/central/overview", section: "overview", labelKey: "navOverview", icon: DashboardOutlined, permission: "overview" },

  { id: "centralTenants", path: "/central/tenants", section: "platform", labelKey: "navTenants", icon: ShopOutlined, permission: "tenants" },
  { id: "centralModules", path: "/central/modules", section: "platform", labelKey: "navModules", icon: AppstoreOutlined, permission: "modules" },

  { id: "centralUsers", path: "/central/users", section: "administration", labelKey: "navUsers", icon: TeamOutlined, permission: "users" },
  { id: "centralRoles", path: "/central/roles", section: "administration", labelKey: "navRoles", icon: KeyOutlined, permission: "roles" },
  { id: "centralPermissions", path: "/central/permissions", section: "administration", labelKey: "navPermissions", icon: LockOutlined, permission: "permissions" },
  { id: "centralAuditLog", path: "/central/audit-log", section: "administration", labelKey: "navAuditLog", icon: HistoryOutlined, permission: "audits" },

  // Reached from the header avatar menu; every signed-in central user may edit their own profile.
  { id: "centralProfile", path: "/central/profile", section: "administration", nav: false },
];

/** `CENTRAL_ROUTES.centralTenants === "/central/tenants"`. */
export const CENTRAL_ROUTES = Object.freeze(
  Object.fromEntries(CENTRAL_FEATURES.map((f) => [f.id, f.path])),
);

export const CENTRAL_HOME_PATH = CENTRAL_ROUTES.centralOverview;

/**
 * Longest matching path wins.
 *
 * @param {string} pathname Locale-stripped path
 * @returns {import("@/features/registry").FeatureEntry | null}
 */
export function centralFeatureForPath(pathname) {
  if (!pathname || typeof pathname !== "string") return null;

  let best = /** @type {import("@/features/registry").FeatureEntry | null} */ (null);
  let bestLength = -1;
  for (const feature of CENTRAL_FEATURES) {
    if (pathname !== feature.path && !pathname.startsWith(`${feature.path}/`)) continue;
    if (feature.path.length > bestLength) {
      bestLength = feature.path.length;
      best = feature;
    }
  }
  return best;
}

/**
 * @param {string | null | undefined} id CENTRAL_FEATURES id
 * @returns {import("@/features/registry").FeatureEntry | null}
 */
export function centralFeatureById(id) {
  if (!id || typeof id !== "string") return null;
  return CENTRAL_FEATURES.find((f) => f.id === id) ?? null;
}

/**
 * @param {string} pathname Locale-stripped path
 * @returns {string | null} central resource_key, or null if ungated
 */
export function centralPermissionResourceForPath(pathname) {
  return centralFeatureForPath(pathname)?.permission ?? null;
}
