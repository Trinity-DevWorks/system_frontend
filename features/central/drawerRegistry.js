/**
 * Central feature id → list-page drawer, mounted by `shell/CentralDrawerHost`.
 * Same registration helpers as the tenant `lib/drawer/drawerRegistry.js`.
 */

"use client";

import { crud } from "@/lib/drawer/drawerRegistration";
import CentralAuditLogDetailDrawer from "./audit-log/components/CentralAuditLogDetailDrawer/CentralAuditLogDetailDrawer";
import CentralRoleDrawer from "./roles/components/CentralRoleDrawer/CentralRoleDrawer";
import TenantDrawer from "./tenants/components/TenantDrawer/TenantDrawer";
import CentralUserDrawer from "./users/components/CentralUserDrawer/CentralUserDrawer";

/** @type {Readonly<Record<string, import("@/lib/drawer/drawerRegistration").DrawerRegistration>>} */
export const CENTRAL_DRAWER_REGISTRY = {
  centralTenants: crud(TenantDrawer, "tenantId"),
  centralUsers: crud(CentralUserDrawer, "userId", { seedKey: "editSeedRecord" }),
  centralRoles: crud(CentralRoleDrawer, "roleId", { numeric: true, seedKey: "editSeedRecord" }),
  centralAuditLog: {
    allowCreate: false,
    Component: CentralAuditLogDetailDrawer,
    mapProps: (p) => ({
      open: p.open,
      record: p.tableSeed,
      auditId: p.recordId,
      onClose: p.onClose,
    }),
  },
};
