/**
 * Loads item detail, lookup queries, form watches, select options, and tab visibility flags.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { buildCategoryTreeData } from "@/lib/categories/categoryTree";
import { fetchBrands } from "@/services/brandsApi";
import { fetchCategories } from "@/services/categoriesApi";
import { fetchItem } from "@/services/itemsApi";
import { fetchItemTypes } from "@/services/itemTypesApi";
import { fetchItemUoms } from "@/services/itemUomsApi";
import { fetchUnitOfMeasurements } from "@/services/unitOfMeasurementsApi";
import { fetchVatGroups } from "@/services/vatGroupsApi";
import { useQuery } from "@tanstack/react-query";
import { Form } from "antd";
import { useCallback, useMemo } from "react";
import { itemUomsQueryKey } from "@/components/items/itemUomsQueryCache";
import { findItemTypeById, flagsForItemType, requiredGeneralFieldsValid } from "../utils/itemDrawerUtils";
import {
  mapBrandOptions,
  mapItemTypeOptions,
  mapUomOptions,
  mapVatGroupOptions,
  resolveItemTypeCode,
} from "../utils/itemDrawerOptionMappers";

const ITEM_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "items"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   persistedItemId: number | null;
 *   tabsEnabled: boolean;
 *   editSeedRecord: Record<string, unknown> | null;
 *   form: import("antd").FormInstance;
 *   defaults: Record<string, unknown>;
 *   mapSeedToCacheRow: (seed: Record<string, unknown>) => Record<string, unknown>;
 *   mapRecordToFormValues: (row: Record<string, unknown>) => Record<string, unknown>;
 * }} args
 */
export function useItemDrawerData({
  open,
  mode,
  persistedItemId,
  tabsEnabled,
  editSeedRecord,
  form,
  defaults,
  mapSeedToCacheRow,
  mapRecordToFormValues,
}) {
  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: persistedItemId,
    tableSeedRecord: editSeedRecord,
    form,
    defaults,
    queryKeyPrefix: ITEM_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchItem,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const itemTypesQuery = useQuery({
    queryKey: ["tenant", "item-types"],
    queryFn: fetchItemTypes,
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["tenant", "categories"],
    queryFn: fetchCategories,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const brandsQuery = useQuery({
    queryKey: ["tenant", "brands"],
    queryFn: () => fetchBrands(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const uomsQuery = useQuery({
    queryKey: ["tenant", "unit-of-measurements"],
    queryFn: fetchUnitOfMeasurements,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const vatGroupsQuery = useQuery({
    queryKey: ["tenant", "vat-groups"],
    queryFn: () => fetchVatGroups(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const itemUomsQuery = useQuery({
    queryKey: itemUomsQueryKey(/** @type {number} */ (persistedItemId)),
    queryFn: () => fetchItemUoms(/** @type {number} */ (persistedItemId)),
    enabled: open && tabsEnabled,
    staleTime: 60_000,
  });

  const itemTypeIdWatch = Form.useWatch("item_type_id", form);
  const skuWatch = Form.useWatch("sku", form);
  const nameWatch = Form.useWatch("name", form);
  const baseUomIdWatch = Form.useWatch("base_uom_id", form);
  const allowPurchaseWatch = Form.useWatch("allow_purchase", form);

  const detailRecord = detailQuery.data ?? (tableSeedMatches ? editSeedRecord : null);
  const typeCode = useMemo(
    () => resolveItemTypeCode(detailRecord, itemTypesQuery.data ?? [], itemTypeIdWatch),
    [detailRecord, itemTypesQuery.data, itemTypeIdWatch],
  );

  const showBundleTab = typeCode === "BUNDLE";
  const showRecipeTab = typeCode === "PRODUCE";

  const itemTypeOptions = useMemo(() => mapItemTypeOptions(itemTypesQuery.data ?? []), [itemTypesQuery.data]);
  const categoryTreeData = useMemo(
    () =>
      buildCategoryTreeData(categoriesQuery.data ?? [], {
        leafOnlySelectable: true,
        activeOnly: true,
      }),
    [categoriesQuery.data],
  );
  const brandOptions = useMemo(() => mapBrandOptions(brandsQuery.data ?? []), [brandsQuery.data]);
  const uomOptions = useMemo(() => mapUomOptions(uomsQuery.data ?? []), [uomsQuery.data]);
  const vatGroupOptions = useMemo(() => mapVatGroupOptions(vatGroupsQuery.data), [vatGroupsQuery.data]);

  const handleItemTypeChange = useCallback(
    (typeId) => {
      const type = findItemTypeById(itemTypesQuery.data ?? [], typeId);
      if (!type) return;
      const flags = flagsForItemType(type);
      form.setFieldsValue(flags);
    },
    [form, itemTypesQuery.data],
  );

  const canSubmitRequired = useMemo(
    () => requiredGeneralFieldsValid(String(skuWatch ?? ""), String(nameWatch ?? "")),
    [skuWatch, nameWatch],
  );

  return {
    detailEnabled,
    tableSeedMatches,
    fetchRemoteDetail,
    detailQuery,
    detailRecord,
    itemUomsQuery,
    showBundleTab,
    showRecipeTab,
    itemTypeOptions,
    categoryTreeData,
    brandOptions,
    uomOptions,
    vatGroupOptions,
    handleItemTypeChange,
    canSubmitRequired,
    baseUomIdWatch,
    allowPurchaseWatch,
    itemTypesPending: itemTypesQuery.isPending,
    categoriesPending: categoriesQuery.isPending,
    brandsPending: brandsQuery.isPending,
    uomsPending: uomsQuery.isPending,
    vatGroupsPending: vatGroupsQuery.isPending,
  };
}
