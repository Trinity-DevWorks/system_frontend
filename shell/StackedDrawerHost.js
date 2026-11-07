/**
 * Renders drawers opened with `openStackedDrawer` on top of the URL drawer (or the page).
 * Mounted right after GlobalDrawerHost, so stacked drawers paint above it.
 */

"use client";

import { featureById } from "@/features/registry";
import { canOpenFeatureDrawer } from "@/lib/drawer/drawerAccess";
import { DrawerStackDepthProvider } from "@/lib/drawer/DrawerStackDepth";
import { getDrawerRegistration, renderRegisteredDrawer } from "@/lib/drawer/drawerRegistry";
import { MAX_STACKED_DRAWERS, useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { normalizeEntityId } from "@/lib/entityId";
import { usePermissions } from "@/lib/permissions";
import { useTenantModules } from "@/lib/tenant-modules";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

/**
 * @param {{
 *   entry: import("@/lib/drawer/GlobalDrawerContext").StackedDrawerEntry,
 *   closeStackedDrawer: (key: number) => void,
 *   updateStackedDrawer: (key: number, patch: Record<string, unknown>) => void,
 * }} props
 */
function StackedDrawer({ entry, closeStackedDrawer, updateStackedDrawer }) {
  const { key, featureId, mode, id, seed, extras, onCreated, open } = entry;
  const isCreate = mode === "create";

  const rendered = renderRegisteredDrawer(featureId, {
    open,
    mode,
    recordId: isCreate ? null : id,
    tableSeed: !isCreate && seed && typeof seed === "object" ? /** @type {Record<string, unknown>} */ (seed) : null,
    createSeed: isCreate ? seed : null,
    onClose: () => closeStackedDrawer(key),
    // "Save" (keep open): continue editing the new record in the same stacked drawer.
    onCreated: (record) => {
      const newId = normalizeEntityId(record?.id);
      if (newId == null) return;
      updateStackedDrawer(key, { mode: "edit", id: newId, seed: record });
    },
    // Hand the new record back to whoever opened this drawer (e.g. fill a select).
    onCreateSuccess: (record) => onCreated?.(record),
    extras,
  });
  if (!rendered) return null;

  const { Component, props } = rendered;
  return <Component {...props} />;
}

export default function StackedDrawerHost() {
  const t = useTranslations("Shell");
  const { message } = App.useApp();
  const { stack, limitHits, closeStackedDrawer, updateStackedDrawer } = useGlobalDrawer();
  const { moduleSet, isLoading: modulesLoading, isError: modulesError } = useTenantModules();
  const { matrix, isLoading: permissionsLoading, isError: permissionsError } = usePermissions();
  const gateReady = !modulesLoading && !permissionsLoading;

  const lastLimitHitsRef = useRef(limitHits);
  useEffect(() => {
    if (limitHits === lastLimitHitsRef.current) return;
    lastLimitHitsRef.current = limitHits;
    message.warning(t("stackLimitReached", { max: MAX_STACKED_DRAWERS }));
  }, [limitHits, message, t]);

  /** @param {import("@/lib/drawer/GlobalDrawerContext").StackedDrawerEntry} entry */
  const checkAccess = (entry) => {
    const feature = featureById(entry.featureId);
    const registration = getDrawerRegistration(entry.featureId);
    if (!feature || !registration) return { ok: false, reason: null };
    if (entry.mode === "create" && registration.allowCreate === false) return { ok: false, reason: null };
    return canOpenFeatureDrawer(feature, entry.mode, { moduleSet, modulesError, matrix, permissionsError });
  };

  // Refuse entries the user may not open, with the same messages as the URL drawer.
  useEffect(() => {
    if (!gateReady) return;
    for (const entry of stack) {
      if (!entry.open) continue;
      const access = checkAccess(entry);
      if (access.ok) continue;
      if (access.reason) {
        message.warning(access.reason === "module" ? t("moduleNotEntitled") : t("permissionDenied"));
      }
      closeStackedDrawer(entry.key);
    }
    // checkAccess only reads values already listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack, gateReady, moduleSet, modulesError, matrix, permissionsError, closeStackedDrawer, message, t]);

  if (!gateReady || stack.length === 0) return null;

  return stack.map((entry, index) =>
    checkAccess(entry).ok ? (
      // Depth = open drawers stacked above this one (drives the "pushed back" look).
      <DrawerStackDepthProvider key={entry.key} depth={stack.slice(index + 1).filter((e) => e.open).length}>
        <StackedDrawer entry={entry} closeStackedDrawer={closeStackedDrawer} updateStackedDrawer={updateStackedDrawer} />
      </DrawerStackDepthProvider>
    ) : null,
  );
}
