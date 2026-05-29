/**
 * Items list page drawer state — open/close, mode, item id, edit seed, and session tracking.
 *
 * Used by:
 * - app/[locale]/main/items/page.js
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function useItemsPageDrawerState() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerItemId, setDrawerItemId] = useState(/** @type {number | null} */ (null));
  const [drawerEditSeed, setDrawerEditSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({ open: false, itemId: /** @type {number | null} */ (null) });

  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, itemId: drawerItemId };
  }, [drawerOpen, drawerItemId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerEditSeed(null);
    setDrawerMode("create");
    setDrawerItemId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerEditSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerItemId(Number(id));
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerEditSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerItemId(Number(id));
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerItemId(null);
    setDrawerEditSeed(null);
  }, []);

  const handleItemCreated = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerEditSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerItemId(Number(id));
  }, []);

  const getOpenDrawerItemId = useCallback(() => drawerSessionRef.current.itemId, []);
  const isDrawerViewingItem = useCallback(
    (id) => drawerSessionRef.current.open && drawerSessionRef.current.itemId === id,
    [],
  );

  return {
    drawerOpen,
    drawerMode,
    drawerItemId,
    drawerEditSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    handleItemCreated,
    getOpenDrawerItemId,
    isDrawerViewingItem,
  };
}
