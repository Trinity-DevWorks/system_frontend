/**
 * In-memory session for the global (foreign) drawer host, plus the stacked-drawer list.
 * Seed / onCreated / onClose stay here — never in the URL.
 *
 * Stacking: any file can call `openStackedDrawer({ featureId, id, mode, onCreated })` to open
 * a registered drawer on top of whatever is open (rendered by shell/StackedDrawerHost).
 */

"use client";

import { featureById } from "@/features/registry";
import {
  DRAWER_FROM_INVOICE_PARAM,
  DRAWER_FROM_PO_PARAM,
  DRAWER_OPEN_PARAM,
  applyDrawerSearchParams,
  featureIdForPath,
  stripDrawerSearchParams,
} from "@/lib/drawer/drawerUrl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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
  } & DrawerStackApi | null} */ (null),
);

/** Most drawers that can sit on top of the base (URL) drawer at once. */
export const MAX_STACKED_DRAWERS = 3;

/** Matches the Ant Design drawer close animation. */
const STACK_EXIT_MS = 450;

/**
 * @typedef {{
 *   key: number,
 *   featureId: string,
 *   mode: "create" | "edit" | "view",
 *   id: string | number | null,
 *   seed: unknown,
 *   extras: Record<string, unknown> | null,
 *   onCreated: ((record: Record<string, unknown>) => void) | null,
 *   onClose: (() => void) | null,
 *   open: boolean,
 * }} StackedDrawerEntry
 */

/**
 * @typedef {{
 *   stack: StackedDrawerEntry[],
 *   limitHits: number,
 *   openStackedDrawer: (args: {
 *     featureId: string,
 *     id?: string | number | null,
 *     mode?: "create" | "edit" | "view",
 *     seed?: unknown,
 *     extras?: Record<string, unknown> | null,
 *     onCreated?: ((record: Record<string, unknown>) => void) | null,
 *     onClose?: (() => void) | null,
 *   }) => boolean,
 *   closeStackedDrawer: (key: number) => void,
 *   updateStackedDrawer: (key: number, patch: Partial<StackedDrawerEntry>) => void,
 *   clearStackedDrawers: () => void,
 * }} DrawerStackApi
 */

/**
 * Stacked drawers: opened on top of whatever is open, kept in memory (not in the URL).
 * @param {string} pathname
 * @returns {DrawerStackApi}
 */
function useDrawerStackState(pathname) {
  const [stack, setStack] = useState(/** @type {StackedDrawerEntry[]} */ ([]));
  const [limitHits, setLimitHits] = useState(0);
  const stackRef = useRef(/** @type {StackedDrawerEntry[]} */ ([]));
  const keyRef = useRef(0);

  const commit = useCallback((/** @type {(prev: StackedDrawerEntry[]) => StackedDrawerEntry[]} */ update) => {
    const next = update(stackRef.current);
    stackRef.current = next;
    setStack(next);
  }, []);

  // Closed entries stay mounted for the close animation, then are dropped.
  const scheduleCleanup = useCallback(() => {
    window.setTimeout(() => commit((prev) => prev.filter((e) => e.open)), STACK_EXIT_MS);
  }, [commit]);

  /** @param {(entry: StackedDrawerEntry, index: number) => boolean} shouldClose */
  const closeWhere = useCallback(
    (shouldClose) => {
      /** @type {Array<() => void>} */
      const callbacks = [];
      commit((prev) =>
        prev.map((entry, index) => {
          if (!entry.open || !shouldClose(entry, index)) return entry;
          if (entry.onClose) callbacks.push(entry.onClose);
          return { ...entry, open: false };
        }),
      );
      if (callbacks.length === 0) return;
      scheduleCleanup();
      callbacks.reverse().forEach((cb) => cb());
    },
    [commit, scheduleCleanup],
  );

  const openStackedDrawer = useCallback(
    /** @type {DrawerStackApi["openStackedDrawer"]} */
    (args) => {
      if (!featureById(args.featureId)) return false;
      if (stackRef.current.filter((e) => e.open).length >= MAX_STACKED_DRAWERS) {
        setLimitHits((n) => n + 1);
        return false;
      }
      keyRef.current += 1;
      const entry = {
        key: keyRef.current,
        featureId: args.featureId,
        mode: args.mode ?? (args.id == null ? "create" : "view"),
        id: args.id ?? null,
        seed: args.seed ?? null,
        extras: args.extras ?? null,
        onCreated: args.onCreated ?? null,
        onClose: args.onClose ?? null,
        open: true,
      };
      commit((prev) => [...prev, entry]);
      return true;
    },
    [commit],
  );

  // Closing one level also closes everything stacked above it.
  const closeStackedDrawer = useCallback(
    (/** @type {number} */ key) => {
      const index = stackRef.current.findIndex((e) => e.key === key);
      if (index < 0) return;
      closeWhere((_, i) => i >= index);
    },
    [closeWhere],
  );

  const clearStackedDrawers = useCallback(() => closeWhere(() => true), [closeWhere]);

  const updateStackedDrawer = useCallback(
    (/** @type {number} */ key, /** @type {Partial<StackedDrawerEntry>} */ patch) => {
      commit((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch, key: e.key } : e)));
    },
    [commit],
  );

  const lastPathRef = useRef(pathname);
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    clearStackedDrawers();
  }, [pathname, clearStackedDrawers]);

  return useMemo(
    () => ({ stack, limitHits, openStackedDrawer, closeStackedDrawer, updateStackedDrawer, clearStackedDrawers }),
    [stack, limitHits, openStackedDrawer, closeStackedDrawer, updateStackedDrawer, clearStackedDrawers],
  );
}

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export function GlobalDrawerProvider({ children }) {
  const [session, setSession] = useState(/** @type {GlobalDrawerSession | null} */ (null));
  const stackApi = useDrawerStackState(usePathname());
  const value = useMemo(() => ({ session, setSession, ...stackApi }), [session, stackApi]);
  return <GlobalDrawerContext.Provider value={value}>{children}</GlobalDrawerContext.Provider>;
}

export function useGlobalDrawer() {
  const ctx = useContext(GlobalDrawerContext);
  if (!ctx) {
    throw new Error("useGlobalDrawer must be used within GlobalDrawerProvider");
  }

  const {
    session,
    setSession,
    stack,
    limitHits,
    openStackedDrawer,
    closeStackedDrawer,
    updateStackedDrawer,
    clearStackedDrawers,
  } = ctx;

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
        // keepInstance (e.g. create → edit after "Save") must keep the mounted drawer.
        // A drawer opened straight from the URL has no session yet and renders with key 0,
        // so keep 0 then instead of bumping (bumping remounts = close + reopen).
        const remountKey = args.keepInstance
          ? (sameFeature ? (prev?.remountKey ?? 0) : 0)
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
        const fromInvoice = args.extras?.fromInvoiceId;
        if (fromInvoice != null && fromInvoice !== "") {
          params.set(DRAWER_FROM_INVOICE_PARAM, String(fromInvoice));
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
    stack,
    limitHits,
    openStackedDrawer,
    closeStackedDrawer,
    updateStackedDrawer,
    clearStackedDrawers,
  };
}
