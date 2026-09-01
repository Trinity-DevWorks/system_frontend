/**
 * In-memory session for the global (foreign) drawer host.
 * Seed / onCreated / onClose stay here — never in the URL.
 */

"use client";

import { featureById } from "@/features/registry";
import {
  DRAWER_FROM_GR_PARAM,
  DRAWER_FROM_PO_PARAM,
  DRAWER_OPEN_PARAM,
  applyDrawerSearchParams,
  featureIdForPath,
  stripDrawerSearchParams,
} from "@/lib/drawer/drawerUrl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * @typedef {{
 *   featureId: string,
 *   seed: unknown,
 *   remountKey: number,
 *   onCreated?: ((record: Record<string, unknown>) => void) | null,
 *   onClose?: (() => void) | null,
 *   extras?: Record<string, unknown> | null,
 * }} GlobalDrawerSession
 */

const GlobalDrawerContext = createContext(
  /** @type {{
    session: GlobalDrawerSession | null,
    setSession: import("react").Dispatch<import("react").SetStateAction<GlobalDrawerSession | null>>,
  } | null} */ (null),
);

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export function GlobalDrawerProvider({ children }) {
  const [session, setSession] = useState(/** @type {GlobalDrawerSession | null} */ (null));
  const value = useMemo(() => ({ session, setSession }), [session]);
  return <GlobalDrawerContext.Provider value={value}>{children}</GlobalDrawerContext.Provider>;
}

export function useGlobalDrawer() {
  const ctx = useContext(GlobalDrawerContext);
  if (!ctx) {
    throw new Error("useGlobalDrawer must be used within GlobalDrawerProvider");
  }

  const { session, setSession } = ctx;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const replaceSearch = useCallback(
    (/** @type {(params: URLSearchParams) => void} */ mutate) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (qs === searchParams.toString()) return;
      router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const resetForeignDrawer = useCallback(() => {
    setSession(null);
    replaceSearch(stripDrawerSearchParams);
  }, [replaceSearch, setSession]);

  const dropRedundantOpenParam = useCallback(() => {
    replaceSearch((params) => {
      params.delete(DRAWER_OPEN_PARAM);
    });
  }, [replaceSearch]);

  const closeDrawer = useCallback(() => {
    const onClose = session?.onClose;
    setSession(null);
    replaceSearch(stripDrawerSearchParams);
    onClose?.();
  }, [replaceSearch, session, setSession]);

  const bumpForeignSeed = useCallback((seed) => {
    setSession((prev) => {
      if (!prev) return prev;
      return { ...prev, seed, remountKey: prev.remountKey + 1 };
    });
  }, [setSession]);

  const openDrawer = useCallback(
    /**
     * @param {{
     *   featureId: string,
     *   id?: string | number | null,
     *   mode?: "create" | "edit" | "view",
     *   seed?: unknown,
     *   onCreated?: ((record: Record<string, unknown>) => void) | null,
     *   onClose?: (() => void) | null,
     *   extras?: Record<string, unknown> | null,
     *   keepInstance?: boolean,
     * }} args
     */
    (args) => {
      const featureId = args.featureId;
      if (!featureById(featureId)) return;

      const currentFeatureId = featureIdForPath(pathname);
      const mode = args.mode ?? "view";

      setSession((prev) => {
        const sameFeature = prev?.featureId === featureId;
        const remountKey =
          args.keepInstance && sameFeature
            ? (prev?.remountKey ?? 0)
            : (sameFeature ? (prev?.remountKey ?? 0) : 0) + 1;
        return {
          featureId,
          seed: args.seed ?? null,
          onCreated: args.onCreated ?? null,
          onClose: args.onClose ?? null,
          extras: args.extras ?? null,
          remountKey,
        };
      });

      replaceSearch((params) => {
        applyDrawerSearchParams(params, {
          featureId,
          currentFeatureId,
          id: args.id,
          mode,
        });
        const fromPo = args.extras?.fromPurchaseOrderId;
        if (fromPo != null && fromPo !== "") {
          params.set(DRAWER_FROM_PO_PARAM, String(fromPo));
        }
        const fromGr = args.extras?.fromGoodsReceiptId;
        if (fromGr != null && fromGr !== "") {
          params.set(DRAWER_FROM_GR_PARAM, String(fromGr));
        }
      });
    },
    [pathname, replaceSearch, setSession],
  );

  return {
    session,
    openDrawer,
    closeDrawer,
    resetForeignDrawer,
    dropRedundantOpenParam,
    bumpForeignSeed,
  };
}
