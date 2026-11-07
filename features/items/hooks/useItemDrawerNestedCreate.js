/**
 * "Add" actions for the category / brand / unit-group / VAT lookups on the general tab.
 * Each opens the lookup's create drawer stacked on top; the new record fills the field.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import { useMemo } from "react";
import { CATEGORIES_LIST_QUERY_KEY } from "@/features/categories";
import { BRANDS_LIST_QUERY_KEY } from "@/features/brands";
import { UNIT_GROUPS_LIST_QUERY_KEY } from "@/features/unit-groups";
import { VAT_GROUPS_LIST_QUERY_KEY } from "@/features/vat-groups";
import { useStackedLookupCreate } from "@/lib/drawer/useStackedLookupCreate";

/**
 * @param {{ form: import("antd").FormInstance }} args
 */
export function useItemDrawerNestedCreate({ form }) {
  const openLookupCreate = useStackedLookupCreate(form);

  return useMemo(
    () => ({
      openNestedCategoryDrawer: () => openLookupCreate("categories", "category_id", CATEGORIES_LIST_QUERY_KEY),
      openNestedBrandDrawer: () => openLookupCreate("brands", "brand_id", BRANDS_LIST_QUERY_KEY),
      openNestedUnitGroupDrawer: () => openLookupCreate("unitGroups", "unit_group_id", UNIT_GROUPS_LIST_QUERY_KEY),
      openNestedVatGroupDrawer: () => openLookupCreate("vatGroups", "vat_group_id", VAT_GROUPS_LIST_QUERY_KEY),
    }),
    [openLookupCreate],
  );
}
