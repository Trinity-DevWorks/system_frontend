/**
 * Page-side API for the global drawer host: write URL, do not mount a drawer.
 */

"use client";

import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import {
  DRAWER_ID_PARAM,
  DRAWER_MODE_PARAM,
  DRAWER_OPEN_PARAM,
  RESOURCE_DRAWER_CREATE_TOKEN,
  isForeignDrawerOpen,
  parseDrawerMode,
} from "@/lib/drawer/drawerUrl";
import { normalizeEntityId } from "@/lib/entityId";
import { usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * @param {string} featureId FEATURES id for this list page
 */
export function usePageDrawer(featureId) {
  const { openDrawer, closeDrawer, session } = useGlobalDrawer();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawOpen = searchParams.get(DRAWER_OPEN_PARAM);
  const rawDrawer = searchParams.get(DRAWER_ID_PARAM);
  const rawMode = searchParams.get(DRAWER_MODE_PARAM);
  const foreignOpen = isForeignDrawerOpen(pathname, rawOpen);

  const derived = useMemo(() => {
    if (foreignOpen || rawDrawer == null || rawDrawer === "") {
      return {
        open: false,
        mode: /** @type {"create" | "edit" | "view"} */ ("view"),
        recordId: /** @type {string | number | null} */ (null),
      };
    }
    if (rawDrawer === RESOURCE_DRAWER_CREATE_TOKEN) {
      return { open: true, mode: /** @type {"create" | "edit" | "view"} */ ("create"), recordId: null };
    }
    let mode = parseDrawerMode(rawMode, "view");
    if (mode === "create") mode = "edit";
    return { open: true, mode, recordId: rawDrawer };
  }, [foreignOpen, rawDrawer, rawMode]);

  const openCreateDrawer = useCallback(() => {
    openDrawer({ featureId, mode: "create" });
  }, [featureId, openDrawer]);

  const openEditDrawer = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      openDrawer({
        featureId,
        id,
        mode: "edit",
        seed: record && typeof record === "object" ? { ...record } : null,
      });
    },
    [featureId, openDrawer],
  );

  const openViewDrawer = useCallback(
    (record, extras) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      openDrawer({
        featureId,
        id,
        mode: "view",
        seed: record && typeof record === "object" ? { ...record } : null,
        extras: extras ?? null,
      });
    },
    [featureId, openDrawer],
  );

  const promoteCreated = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      openDrawer({
        featureId,
        id,
        mode: "edit",
        seed: record && typeof record === "object" ? { ...record } : null,
        keepInstance: true,
      });
    },
    [featureId, openDrawer],
  );

  const getOpenRecordId = useCallback(() => derived.recordId, [derived.recordId]);

  const tableSeed = useMemo(() => {
    if (!derived.open || derived.recordId == null || !session?.seed) return null;
    if (session.featureId !== featureId) return null;
    const seed = session.seed;
    if (!seed || typeof seed !== "object") return null;
    const seedId = normalizeEntityId(/** @type {Record<string, unknown>} */ (seed).id);
    return seedId === String(derived.recordId) ? /** @type {Record<string, unknown>} */ (seed) : null;
  }, [derived.open, derived.recordId, featureId, session]);

  return {
    open: derived.open,
    mode: derived.mode,
    recordId: derived.recordId,
    tableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated,
    handleCreated: promoteCreated,
    getOpenRecordId,
    isViewingRecord: (id) => {
      if (!derived.open || derived.recordId == null) return false;
      return String(derived.recordId) === String(normalizeEntityId(id) ?? id);
    },
  };
}
