/**
 * Registry-agnostic drawer host for the current URL drawer (this page or `?open=` foreign).
 * `GlobalDrawerHost` (tenant) and `CentralDrawerHost` supply the drawer registry
 * and the access gate; feature ids resolve through the enclosing `GlobalDrawerProvider`.
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
 *
 * @typedef {{
 *   ready: boolean,
 *   check: (
 *     feature: import("@/features/registry").FeatureEntry,
 *     mode: import("@/lib/drawer/drawerAccess").DrawerAccessMode,
 *   ) => { ok: true } | { ok: false, reason: import("@/lib/drawer/drawerAccess").DrawerAccessDenyReason },
 * }} DrawerHostAccess
 */

import { DrawerHostPresenceProvider } from "@/lib/drawer/DrawerHostPresence";
import {
  lookupDrawerRegistration,
  renderDrawerFromRegistry,
} from "@/lib/drawer/drawerRegistration";
import { useDrawerFeatureRegistry, useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
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
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * @param {{
 *   drawerRegistry: Readonly<Record<string, import("@/lib/drawer/drawerRegistration").DrawerRegistration>>,
 *   access: DrawerHostAccess,
 * }} props
 */
export default function DrawerHost({ drawerRegistry, access }) {
  const t = useTranslations("Shell");
  const { message } = App.useApp();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const featureRegistry = useDrawerFeatureRegistry();
  const { session, closeDrawer, resetForeignDrawer, dropRedundantOpenParam, openDrawer } =
    useGlobalDrawer();

  const { ready: gateReady, check: checkAccess } = access;

  const rawOpen = searchParams.get(DRAWER_OPEN_PARAM);
  const rawDrawer = searchParams.get(DRAWER_ID_PARAM);
  const rawMode = searchParams.get(DRAWER_MODE_PARAM);
  const currentFeatureId = featureIdForPath(pathname, featureRegistry.featureForPath);
  const targetFeatureId =
    rawOpen && rawOpen !== currentFeatureId ? rawOpen : currentFeatureId;

  const warnedKeyRef = useRef(/** @type {string | null} */ (null));
  const liveDrawerRef = useRef(false);
  const [hold, setHold] = useState(/** @type {HostDrawerState | null} */ (null));
  const [exiting, setExiting] = useState(false);

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
    const feature = featureRegistry.featureById(featureId);
    const registration = lookupDrawerRegistration(drawerRegistry, featureId);
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

    const result = checkAccess(feature, mode);

    if (!result.ok) {
      if (warnedKeyRef.current !== warnKey) {
        warnedKeyRef.current = warnKey;
        if (typeof message?.warning === "function") {
          message.warning(
            result.reason === "module" ? t("moduleNotEntitled") : t("permissionDenied"),
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
    checkAccess,
    featureRegistry,
    drawerRegistry,
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
        keepInstance: true,
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

    const feature = featureRegistry.featureById(targetFeatureId);
    const registration = lookupDrawerRegistration(drawerRegistry, targetFeatureId);
    if (!feature || !registration) return null;
    if (parsed.mode === "create" && registration.allowCreate === false) return null;

    if (!checkAccess(feature, parsed.mode).ok) return null;

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
    if (targetFeatureId === "salesInvoices" || targetFeatureId === "purchaseInvoices") {
      extras.onPostAndNew = handleSaveAndNew;
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
    checkAccess,
    featureRegistry,
    drawerRegistry,
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

  const rendered = renderDrawerFromRegistry(drawerRegistry, renderState.featureId, {
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
      {/* Record id is not in the key so Save (keep) can change ?drawer=new → ?drawer=:id without remounting. */}
      <Component
        key={`${renderState.featureId}:${renderState.remountKey}`}
        {...props}
      />
    </DrawerHostPresenceProvider>
  );
}
