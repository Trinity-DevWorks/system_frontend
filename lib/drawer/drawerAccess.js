/**
 * Fail-closed gate for opening a resource drawer (module entitlement + RBAC).
 * Backend still enforces mutations; this only stops the UI from mounting.
 */

import { CORE_MODULE } from "@/features/registry";
import { matrixAllows } from "@/lib/permissions";

/**
 * @typedef {"create" | "edit" | "view"} DrawerAccessMode
 * @typedef {"unknown" | "module" | "permission"} DrawerAccessDenyReason
 */

/**
 * @param {DrawerAccessMode} mode
 * @returns {import("@/lib/permissions").PermissionAction}
 */
export function permissionActionForDrawerMode(mode) {
  if (mode === "create") return "add";
  if (mode === "edit") return "edit";
  return "view";
}

/**
 * @param {import("@/features/registry").FeatureEntry | null | undefined} feature
 * @param {DrawerAccessMode} mode
 * @param {{
 *   moduleSet: Set<string> | null | undefined,
 *   modulesError?: boolean,
 *   matrix: Record<string, Record<string, boolean>> | null | undefined,
 *   permissionsError?: boolean,
 * }} ctx
 * @returns {{ ok: true } | { ok: false, reason: DrawerAccessDenyReason }}
 */
export function canOpenFeatureDrawer(feature, mode, ctx) {
  if (!feature) {
    return { ok: false, reason: "unknown" };
  }

  const requiredModule = feature.module;
  if (requiredModule && requiredModule !== CORE_MODULE) {
    if (ctx.modulesError) {
      return { ok: false, reason: "module" };
    }
    if (ctx.moduleSet != null && !ctx.moduleSet.has(requiredModule)) {
      return { ok: false, reason: "module" };
    }
  }

  const requiredPermission = feature.permission;
  if (mode === "create" || mode === "edit") {
    if (!requiredPermission) {
      return { ok: false, reason: "permission" };
    }
  }

  if (requiredPermission) {
    if (ctx.permissionsError) {
      return { ok: false, reason: "permission" };
    }
    const action = permissionActionForDrawerMode(mode);
    if (!matrixAllows(ctx.matrix ?? {}, requiredPermission, action)) {
      return { ok: false, reason: "permission" };
    }
  }

  return { ok: true };
}
