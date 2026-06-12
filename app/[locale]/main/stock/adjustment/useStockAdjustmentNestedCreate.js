/**
 * Nested warehouse/item create drawers from stock adjustment lookups.
 *
 * Used by:
 * - app/[locale]/main/stock/adjustment/StockAdjustmentDrawer.js
 */

import { normalizeEntityId } from "@/lib/entityId";
import { useCallback, useMemo, useState } from "react";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   queryClient: import("@tanstack/react-query").QueryClient;
 *   open: boolean;
 * }} args
 */
export function useStockAdjustmentNestedCreate({ form, queryClient, open }) {
  const [nestedCreate, setNestedCreate] = useState(
    /** @type {"warehouse" | "item" | null} */ (null),
  );

  const closeNestedCreate = useCallback(() => setNestedCreate(null), []);

  const makeNestedCreatedHandler = useCallback(
    /**
     * @param {string} fieldName
     * @param {readonly string[]} queryKey
     * @param {{ valueType?: "number" | "string" }} [options]
     */
    (fieldName, queryKey, options = {}) =>
      /** @param {Record<string, unknown>} record */ (record) => {
        const rawId = record?.id;
        if (rawId == null) return;
        const value =
          options.valueType === "string"
            ? normalizeEntityId(rawId)
            : Number(rawId);
        if (value == null || (options.valueType !== "string" && !Number.isFinite(value))) return;
        form.setFieldValue(fieldName, value);
        queryClient.invalidateQueries({ queryKey });
        closeNestedCreate();
      },
    [form, queryClient, closeNestedCreate],
  );

  const onNestedWarehouseCreated = useMemo(
    () => makeNestedCreatedHandler("warehouse_id", ["tenant", "warehouses"]),
    [makeNestedCreatedHandler],
  );

  const onNestedItemCreated = useMemo(
    () => makeNestedCreatedHandler("item_id", ["tenant", "items"], { valueType: "string" }),
    [makeNestedCreatedHandler],
  );

  return {
    nestedWarehouseDrawerOpen: open && nestedCreate === "warehouse",
    nestedItemDrawerOpen: open && nestedCreate === "item",
    openNestedWarehouseDrawer: () => setNestedCreate("warehouse"),
    openNestedItemDrawer: () => setNestedCreate("item"),
    closeNestedCreate,
    onNestedWarehouseCreated,
    onNestedItemCreated,
  };
}
