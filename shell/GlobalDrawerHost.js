/**
 * Shell host for the current URL drawer (this page or `?open=` foreign).
 */

"use client";

/**
 * @typedef {{
 *   featureId: string,
 *   mode: "create" | "edit" | "view",
 *   recordId: string | number | null,
 *   tableSeed: Record<string, unknown> | null,
 *   createSeed: unknown,
 *   remountKey: number,
 *   extras: Record<string, unknown> | null,
 *   onCreated: (record: Record<string, unknown>) => void,
 * }} HostDrawerState
 */

import { featureById } from "@/features/registry";
import { canOpenFeatureDrawer } from "@/lib/drawer/drawerAccess";
import { DrawerHostPresenceProvider } from "@/lib/drawer/DrawerHostPresence";
import { getDrawerRegistration, renderRegisteredDrawer } from "@/lib/drawer/drawerRegistry";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import {
  DRAWER_FROM_PO_PARAM,
  DRAWER_ID_PARAM,
  DRAWER_MODE_PARAM,
  DRAWER_OPEN_PARAM,
  RESOURCE_DRAWER_CREATE_TOKEN,
  featureIdForPath,
  parseDrawerMode,
} from "@/lib/drawer/drawerUrl";
import { normalizeEntityId } from "@/lib/entityId";
import { usePathname } from "@/i18n/navigation";
import { usePermissions } from "@/lib/permissions";
import { useTenantModules } from "@/lib/tenant-modules";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function GlobalDrawerHost() {
  const t = useTranslations("Shell");
  const { message } = App.useApp();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, closeDrawer, resetForeignDrawer, dropRedundantOpenParam, openDrawer } =
    useGlobalDrawer();

  const { moduleSet, isLoading: modulesLoading, isError: modulesError } = useTenantModules();
  const {
    matrix,
    isLoading: permissionsLoading,
    isError: permissionsError,
  } = usePermissions();

  const rawOpen = searchParams.get(DRAWER_OPEN_PARAM);
  const rawDrawer = searchParams.get(DRAWER_ID_PARAM);
  const rawMode = searchParams.get(DRAWER_MODE_PARAM);
  const currentFeatureId = featureIdForPath(pathname);
  const targetFeatureId =
    rawOpen && rawOpen !== currentFeatureId ? rawOpen : currentFeatureId;

  const warnedKeyRef = useRef(/** @type {string | null} */ (null));
  const liveDrawerRef = useRef(false);
  const [hold, setHold] = useState(/** @type {HostDrawerState | null} */ (null));
  const [exiting, setExiting] = useState(false);
  const gateReady = !modulesLoading && !permissionsLoading;

  const parsed = useMemo(() => {
    if (!rawDrawer) return null;
    if (rawDrawer === RESOURCE_DRAWER_CREATE_TOKEN) {
      return { mode: /** @type {const} */ ("create"), recordId: /** @type {null} */ (null) };
    }
    let mode = parseDrawerMode(rawMode, "view");
    if (mode === "create") mode = "edit";
    return { mode, recordId: rawDrawer };
  }, [rawDrawer, rawMode]);

  useEffect(() => {
    if (!rawDrawer) {
      warnedKeyRef.current = null;
      return;
    }
    if (!gateReady) return;

    if (rawOpen && rawOpen === currentFeatureId) {
      dropRedundantOpenParam();
      return;
    }

    const featureId = targetFeatureId;
    const feature = featureById(featureId);
    const registration = getDrawerRegistration(featureId);
    const warnKey = `${featureId}|${rawDrawer}|${rawMode}`;
    const mode = parsed?.mode ?? "view";

    if (!feature || !registration) {
      resetForeignDrawer();
      return;
    }

    if (mode === "create" && registration.allowCreate === false) {
      resetForeignDrawer();
      return;
    }

    const access = canOpenFeatureDrawer(feature, mode, {
      moduleSet,
      modulesError,
      matrix,
      permissionsError,
    });

    if (!access.ok) {
      if (warnedKeyRef.current !== warnKey) {
        warnedKeyRef.current = warnKey;
        if (typeof message?.warning === "function") {
          message.warning(
            access.reason === "module" ? t("moduleNotEntitled") : t("permissionDenied"),
          );
        }
      }
      resetForeignDrawer();
    }
  }, [
    rawDrawer,
    rawOpen,
    rawMode,
    currentFeatureId,
    targetFeatureId,
    parsed,
    gateReady,
    moduleSet,
    modulesError,
    matrix,
    permissionsError,
    dropRedundantOpenParam,
    resetForeignDrawer,
    message,
    t,
  ]);

  const handleCreated = useCallback(
    (record) => {
      if (session?.onCreated) {
        session.onCreated(record);
        return;
      }
      const id = normalizeEntityId(record?.id);
      if (id == null || !targetFeatureId) return;
      openDrawer({
        featureId: targetFeatureId,
        id,
        mode: "edit",
        seed: record && typeof record === "object" ? record : null,
      });
    },
    [openDrawer, session, targetFeatureId],
  );

  const handleSaveAndNew = useCallback(() => {
    if (!targetFeatureId) return;
    openDrawer({ featureId: targetFeatureId, mode: "create" });
  }, [openDrawer, targetFeatureId]);

  const hostState = useMemo(() => {
    if (!parsed || !targetFeatureId) return null;
    if (!gateReady) return null;

    const feature = featureById(targetFeatureId);
    const registration = getDrawerRegistration(targetFeatureId);
    if (!feature || !registration) return null;
    if (parsed.mode === "create" && registration.allowCreate === false) return null;

    const access = canOpenFeatureDrawer(feature, parsed.mode, {
      moduleSet,
      modulesError,
      matrix,
      permissionsError,
    });
    if (!access.ok) return null;

    const sessionMatches = session?.featureId === targetFeatureId;
    /** @type {Record<string, unknown> | null} */
    const extras = {
      ...(sessionMatches && session.extras ? session.extras : {}),
    };
    if (targetFeatureId === "stockGoodsReceipts" && parsed.mode === "create") {
      extras.fromPurchaseOrderId =
        searchParams.get(DRAWER_FROM_PO_PARAM) || extras.fromPurchaseOrderId || null;
    }
    if (targetFeatureId === "items") {
      extras.onSaveAndNew = handleSaveAndNew;
    }

    const tableSeed =
      sessionMatches && parsed.mode !== "create" && session.seed && typeof session.seed === "object"
        ? /** @type {Record<string, unknown>} */ (session.seed)
        : null;

    return {
      featureId: targetFeatureId,
      mode: parsed.mode,
      recordId: parsed.recordId,
      tableSeed,
      createSeed: sessionMatches && parsed.mode === "create" ? session.seed : null,
      remountKey: sessionMatches ? session.remountKey : (hold?.remountKey ?? 0),
      extras,
      onCreated: handleCreated,
    };
  }, [
    parsed,
    targetFeatureId,
    gateReady,
    moduleSet,
    modulesError,
    matrix,
    permissionsError,
    session,
    searchParams,
    handleCreated,
    handleSaveAndNew,
    hold?.remountKey,
  ]);

  useEffect(() => {
    liveDrawerRef.current = hostState != null;
  }, [hostState]);

  useEffect(() => {
    if (!exiting) return undefined;
    const timer = window.setTimeout(() => {
      setHold(null);
      setExiting(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  const handleAfterOpenChange = useCallback((visible) => {
    if (visible) return;
    if (liveDrawerRef.current) return;
    setHold(null);
    setExiting(false);
  }, []);

  if (hostState) {
    if (
      !hold ||
      hold.featureId !== hostState.featureId ||
      hold.recordId !== hostState.recordId ||
      hold.mode !== hostState.mode ||
      hold.remountKey !== hostState.remountKey
    ) {
      setHold(hostState);
    }
    if (exiting) setExiting(false);
  } else if (hold && !exiting) {
    setExiting(true);
  }

  const renderState = hostState ?? (exiting ? hold : null);
  if (!renderState) return null;

  const rendered = renderRegisteredDrawer(renderState.featureId, {
    open: hostState != null,
    mode: renderState.mode,
    recordId: renderState.recordId,
    tableSeed: renderState.tableSeed,
    createSeed: renderState.createSeed,
    onClose: closeDrawer,
    onCreated: renderState.onCreated,
    extras: renderState.extras,
  });

  if (!rendered) return null;

  const { Component, props } = rendered;
  return (
    <DrawerHostPresenceProvider afterOpenChange={handleAfterOpenChange}>
      <Component
        key={`${renderState.featureId}:${renderState.recordId ?? "new"}:${renderState.remountKey}`}
        {...props}
      />
    </DrawerHostPresenceProvider>
  );
}
