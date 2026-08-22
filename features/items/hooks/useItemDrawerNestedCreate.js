/**
 * State and handlers for nested category/brand/unit-group/VAT create drawers on the general tab.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import { useCallback, useMemo, useState } from "react";
import { CATEGORIES_LIST_QUERY_KEY } from "@/features/categories";
import { BRANDS_LIST_QUERY_KEY } from "@/features/brands";
import { UNIT_GROUPS_LIST_QUERY_KEY } from "@/features/unit-groups";
import { VAT_GROUPS_LIST_QUERY_KEY } from "@/features/vat-groups";

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
    () => makeNestedCreatedHandler("category_id", CATEGORIES_LIST_QUERY_KEY),
    [makeNestedCreatedHandler],
  );
  const onNestedBrandCreated = useMemo(
    () => makeNestedCreatedHandler("brand_id", BRANDS_LIST_QUERY_KEY),
    [makeNestedCreatedHandler],
  );
  const onNestedUnitGroupCreated = useMemo(
    () => makeNestedCreatedHandler("unit_group_id", UNIT_GROUPS_LIST_QUERY_KEY),
    [makeNestedCreatedHandler],
  );
  const onNestedVatGroupCreated = useMemo(
    () => makeNestedCreatedHandler("vat_group_id", VAT_GROUPS_LIST_QUERY_KEY),
    [makeNestedCreatedHandler],
  );

  return {
    nestedCategoryDrawerOpen: open && nestedCreate === "category",
    nestedBrandDrawerOpen: open && nestedCreate === "brand",
    nestedUnitGroupDrawerOpen: open && nestedCreate === "unit-group",
    nestedVatGroupDrawerOpen: open && nestedCreate === "vat-group",
    openNestedCategoryDrawer: () => setNestedCreate("category"),
    openNestedBrandDrawer: () => setNestedCreate("brand"),
    openNestedUnitGroupDrawer: () => setNestedCreate("unit-group"),
    openNestedVatGroupDrawer: () => setNestedCreate("vat-group"),
    clearNestedCreate: () => setNestedCreate(null),
    closeNestedCreate,
    onNestedCategoryCreated,
    onNestedBrandCreated,
    onNestedUnitGroupCreated,
    onNestedVatGroupCreated,
  };
}
