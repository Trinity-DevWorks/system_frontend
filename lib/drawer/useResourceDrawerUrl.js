/**
 * Shared URL ↔ drawer open-state controller for resource list pages.
 *
 * What: Syncs create/edit/view drawer open state to `?drawer=&mode=` search params.
 * Used for: Purchase orders, stock transfers, users (and future list pages).
 * Solves: Makes drawers addressable for notifications, refresh, and shareable deep links
 * without rewriting ResourceCrudDrawer or each entity form.
 *
 * URL contract:
 * - Closed: no drawer/mode params
 * - Open existing: ?drawer=<id>&mode=view|edit
 * - Create: ?drawer=new&mode=create
 */

"use client";

import { normalizeEntityId } from "@/lib/entityId";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const RESOURCE_DRAWER_CREATE_TOKEN = "new";

/**
 * @param {string} pathname  App path without query (e.g. /main/stock/purchase-orders)
 * @param {string | number | null | undefined} id
 * @param {"view" | "edit" | "create"} [mode]
 * @returns {string}
 */
export function buildResourceDrawerHref(pathname, id, mode = "view") {
  const base = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (mode === "create" || id == null || id === "" || id === RESOURCE_DRAWER_CREATE_TOKEN) {
    return `${base}?drawer=${RESOURCE_DRAWER_CREATE_TOKEN}&mode=create`;
  }
  const normalized = normalizeEntityId(id);
  if (normalized == null) return base;
  return `${base}?drawer=${encodeURIComponent(normalized)}&mode=${mode}`;
}

/**
 * @typedef {"create" | "edit" | "view"} ResourceDrawerMode
 *
 * @typedef {{
 *   idParam?: string,
 *   modeParam?: string,
 *   parseId?: (raw: string) => string | number | null,
 *   allowCreateInUrl?: boolean,
 *   defaultMode?: Exclude<ResourceDrawerMode, "create">,
 * }} UseResourceDrawerUrlOptions
 */

/**
 * @param {UseResourceDrawerUrlOptions} [options]
 */
export function useResourceDrawerUrl(options = {}) {
  const {
    idParam = "drawer",
    modeParam = "mode",
    parseId = normalizeEntityId,
    allowCreateInUrl = true,
    defaultMode = "view",
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tableSeed, setTableSeed] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );

  /** Last drawer id written by this controller (row click / promote); null = URL came from outside. */
  const lastLocalWriteIdRef = useRef(/** @type {string | null} */ (null));

  const rawDrawer = searchParams.get(idParam);
  const rawMode = searchParams.get(modeParam);

  const derived = useMemo(() => {
    if (rawDrawer == null || rawDrawer === "") {
      return {
        open: false,
        mode: /** @type {ResourceDrawerMode} */ ("create"),
        recordId: /** @type {string | number | null} */ (null),
      };
    }

    if (rawDrawer === RESOURCE_DRAWER_CREATE_TOKEN) {
      if (!allowCreateInUrl) {
        return { open: false, mode: /** @type {ResourceDrawerMode} */ ("create"), recordId: null };
      }
      return {
        open: true,
        mode: /** @type {ResourceDrawerMode} */ ("create"),
        recordId: null,
      };
    }

    const id = parseId(rawDrawer);
    if (id == null) {
      return {
        open: false,
        mode: /** @type {ResourceDrawerMode} */ ("create"),
        recordId: null,
        invalid: true,
      };
    }

    let mode = /** @type {ResourceDrawerMode} */ (defaultMode);
    if (rawMode === "edit" || rawMode === "view" || rawMode === "create") {
      mode = rawMode;
    }
    if (mode === "create") {
      mode = "edit";
    }

    return { open: true, mode, recordId: id };
  }, [allowCreateInUrl, defaultMode, parseId, rawDrawer, rawMode]);

  const writeUrl = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.clear) {
        params.delete(idParam);
        params.delete(modeParam);
        lastLocalWriteIdRef.current = null;
      } else {
        if (next.drawer === RESOURCE_DRAWER_CREATE_TOKEN) {
          params.set(idParam, RESOURCE_DRAWER_CREATE_TOKEN);
          params.set(modeParam, "create");
          lastLocalWriteIdRef.current = RESOURCE_DRAWER_CREATE_TOKEN;
        } else if (next.drawer != null && next.drawer !== "") {
          const serialized = String(next.drawer);
          params.set(idParam, serialized);
          params.set(modeParam, next.mode || defaultMode);
          lastLocalWriteIdRef.current = serialized;
        } else {
          params.delete(idParam);
          params.delete(modeParam);
          lastLocalWriteIdRef.current = null;
        }
      }

      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      const current = searchParams.toString();
      if (qs === current) return;
      router.replace(href, { scroll: false });
    },
    [defaultMode, idParam, modeParam, pathname, router, searchParams],
  );

  // Drop invalid ?drawer= values from the URL.
  useEffect(() => {
    if (derived.invalid && rawDrawer) {
      writeUrl({ clear: true });
    }
  }, [derived.invalid, rawDrawer, writeUrl]);

  // External navigation (notification / refresh with different id): drop stale table seed.
  useEffect(() => {
    if (!derived.open) {
      setTableSeed(null);
      return;
    }

    if (derived.recordId == null) {
      return;
    }

    const urlId = String(derived.recordId);
    const localId = lastLocalWriteIdRef.current;
    if (localId != null && localId === urlId) {
      return;
    }

    setTableSeed((prev) => {
      if (!prev) return null;
      if (normalizeEntityId(prev.id) === urlId) return prev;
      return null;
    });
  }, [derived.open, derived.recordId]);

  const sessionRef = useRef({
    open: false,
    recordId: /** @type {string | number | null} */ (null),
  });
  useEffect(() => {
    sessionRef.current = { open: derived.open, recordId: derived.recordId };
  }, [derived.open, derived.recordId]);

  const openCreateDrawer = useCallback(() => {
    if (!allowCreateInUrl) {
      setTableSeed(null);
      lastLocalWriteIdRef.current = RESOURCE_DRAWER_CREATE_TOKEN;
      writeUrl({ drawer: RESOURCE_DRAWER_CREATE_TOKEN, mode: "create" });
      return;
    }
    setTableSeed(null);
    writeUrl({ drawer: RESOURCE_DRAWER_CREATE_TOKEN, mode: "create" });
  }, [allowCreateInUrl, writeUrl]);

  const openEditDrawer = useCallback(
    (record) => {
      const id = parseId(record?.id);
      if (id == null) return;
      setTableSeed(record && typeof record === "object" ? { ...record } : null);
      writeUrl({ drawer: id, mode: "edit" });
    },
    [parseId, writeUrl],
  );

  const openViewDrawer = useCallback(
    (record) => {
      const id = parseId(record?.id);
      if (id == null) return;
      setTableSeed(record && typeof record === "object" ? { ...record } : null);
      writeUrl({ drawer: id, mode: "view" });
    },
    [parseId, writeUrl],
  );

  const closeDrawer = useCallback(() => {
    setTableSeed(null);
    writeUrl({ clear: true });
  }, [writeUrl]);

  const promoteCreated = useCallback(
    (record) => {
      const id = parseId(record?.id);
      if (id == null) return;
      setTableSeed(record && typeof record === "object" ? { ...record } : null);
      writeUrl({ drawer: id, mode: "edit" });
    },
    [parseId, writeUrl],
  );

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
    /** @deprecated Prefer promoteCreated — alias for page migrations */
    handleCreated: promoteCreated,
    sessionRef,
    getOpenRecordId: () => sessionRef.current.recordId,
    isViewingRecord: (id) => {
      const current = sessionRef.current;
      if (!current.open || current.recordId == null) return false;
      return String(current.recordId) === String(parseId(id) ?? id);
    },
  };
}
