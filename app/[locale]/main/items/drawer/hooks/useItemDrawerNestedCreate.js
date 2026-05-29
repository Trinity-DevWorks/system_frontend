/**
 * State and handlers for nested category/brand/UOM/VAT create drawers on the general tab.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import { useCallback, useMemo, useState } from "react";

/**
 * @param {{ form: import("antd").FormInstance; queryClient: import("@tanstack/react-query").QueryClient; open: boolean }} args
 */
export function useItemDrawerNestedCreate({ form, queryClient, open }) {
  const [nestedCreate, setNestedCreate] = useState(
    /** @type {import("../utils/itemDrawerConstants").ItemNestedCreateKey | null} */ (null),
  );

  const closeNestedCreate = useCallback(() => setNestedCreate(null), []);

  const makeNestedCreatedHandler = useCallback(
    /**
     * @param {string} fieldName
     * @param {readonly string[]} queryKey
     */
    (fieldName, queryKey) =>
      /** @param {Record<string, unknown>} record */ (record) => {
        const id = record?.id;
        if (id == null || Number.isNaN(Number(id))) return;
        form.setFieldValue(fieldName, Number(id));
        queryClient.invalidateQueries({ queryKey });
      },
    [form, queryClient],
  );

  const onNestedCategoryCreated = useMemo(
    () => makeNestedCreatedHandler("category_id", ["tenant", "categories"]),
    [makeNestedCreatedHandler],
  );
  const onNestedBrandCreated = useMemo(
    () => makeNestedCreatedHandler("brand_id", ["tenant", "brands"]),
    [makeNestedCreatedHandler],
  );
  const onNestedBaseUomCreated = useMemo(
    () => makeNestedCreatedHandler("base_uom_id", ["tenant", "unit-of-measurements"]),
    [makeNestedCreatedHandler],
  );
  const onNestedVatGroupCreated = useMemo(
    () => makeNestedCreatedHandler("vat_group_id", ["tenant", "vat-groups"]),
    [makeNestedCreatedHandler],
  );

  return {
    nestedCategoryDrawerOpen: open && nestedCreate === "category",
    nestedBrandDrawerOpen: open && nestedCreate === "brand",
    nestedUomDrawerOpen: open && nestedCreate === "uom",
    nestedVatGroupDrawerOpen: open && nestedCreate === "vat-group",
    openNestedCategoryDrawer: () => setNestedCreate("category"),
    openNestedBrandDrawer: () => setNestedCreate("brand"),
    openNestedUomDrawer: () => setNestedCreate("uom"),
    openNestedVatGroupDrawer: () => setNestedCreate("vat-group"),
    clearNestedCreate: () => setNestedCreate(null),
    closeNestedCreate,
    onNestedCategoryCreated,
    onNestedBrandCreated,
    onNestedBaseUomCreated,
    onNestedVatGroupCreated,
  };
}
