/**
 * Nested warehouse and item create drawers for stock adjustment lookups.
 *
 * Used by:
 * - app/[locale]/main/stock/adjustment/StockAdjustmentDrawer.js
 */

import ItemDrawer from "@/features/items/components/ItemDrawer/ItemDrawer";
import WarehouseDrawer from "@/features/warehouses/components/WarehouseDrawer/WarehouseDrawer";

/**
 * @param {{
 *   nestedWarehouseDrawerOpen: boolean;
 *   nestedItemDrawerOpen: boolean;
 *   closeNestedCreate: () => void;
 *   onNestedWarehouseCreated: (record: Record<string, unknown>) => void;
 *   onNestedItemCreated: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function StockAdjustmentNestedDrawers({
  nestedWarehouseDrawerOpen,
  nestedItemDrawerOpen,
  closeNestedCreate,
  onNestedWarehouseCreated,
  onNestedItemCreated,
}) {
  return (
    <>
      <WarehouseDrawer
        open={nestedWarehouseDrawerOpen}
        mode="create"
        warehouseId={null}
        onClose={closeNestedCreate}
        onCreateSuccess={onNestedWarehouseCreated}
      />
      <ItemDrawer
        open={nestedItemDrawerOpen}
        mode="create"
        itemId={null}
        onClose={closeNestedCreate}
        onCreateSuccess={onNestedItemCreated}
      />
    </>
  );
}
