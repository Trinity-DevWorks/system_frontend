/**
 * Items list page drawer state — URL-addressable open/close via useResourceDrawerUrl.
 *
 * Used by:
 * - app/[locale]/main/items/page.js
 */

import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { normalizeEntityId } from "@/lib/entityId";

export function useItemsPageDrawerState() {
  const drawer = useResourceDrawerUrl({
    parseId: normalizeEntityId,
  });

  return {
    drawerOpen: drawer.open,
    drawerMode: drawer.mode,
    drawerItemId:
      typeof drawer.recordId === "string" || typeof drawer.recordId === "number"
        ? String(drawer.recordId)
        : null,
    drawerEditSeed: drawer.tableSeed,
    openCreateDrawer: drawer.openCreateDrawer,
    openEditDrawer: drawer.openEditDrawer,
    openViewDrawer: drawer.openViewDrawer,
    closeDrawer: drawer.closeDrawer,
    handleItemCreated: drawer.promoteCreated,
    getOpenDrawerItemId: () => {
      const id = drawer.sessionRef.current.recordId;
      return id == null ? null : String(id);
    },
    isDrawerViewingItem: (id) => drawer.isViewingRecord(id),
  };
}
