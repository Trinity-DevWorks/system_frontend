/**
 * Items list page drawer open/close — URL owned by the global host.
 *
 * Used by:
 * - app/[locale]/main/items/page.js
 */

import { usePageDrawer } from "@/lib/drawer/usePageDrawer";

export function useItemsPageDrawerState() {
  const drawer = usePageDrawer("items");

  return {
    openCreateDrawer: drawer.openCreateDrawer,
    openEditDrawer: drawer.openEditDrawer,
    openViewDrawer: drawer.openViewDrawer,
    closeDrawer: drawer.closeDrawer,
    getOpenDrawerItemId: () => {
      const id = drawer.getOpenRecordId();
      return id == null ? null : String(id);
    },
    isDrawerViewingItem: (id) => drawer.isViewingRecord(id),
  };
}
