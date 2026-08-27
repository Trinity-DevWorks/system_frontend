/**
 * Loads item detail, lookup queries, form watches, select options, and tab visibility flags.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { fetchBrandNames } from "@/features/brands/index";
import { buildCategoryTreeData, fetchCategoryNames } from "@/features/categories";
import { fetchItem } from "../api/items.api";
import { fetchItemTypes } from "../api/itemTypes.api";
import { fetchItemUoms } from "../api/itemUoms.api";
import { fetchUnitGroupNames } from "@/features/unit-groups/index";
import { fetchVatGroupNames } from "@/features/vat-groups/index";
import { useQuery } from "@tanstack/react-query";
import { Form } from "antd";
import { useCallback, useMemo } from "react";
import { itemUomsQueryKey } from "../queries/itemUomsQueryCache";
import { findItemTypeById, flagsForItemType, requiredGeneralFieldsValid } from "../utils/itemDrawerUtils";
import {
  mapBrandOptions,
  mapItemTypeOptions,
  mapUnitGroupOptions,
  mapVatGroupOptions,
  resolveItemTypeCode,
} from "../utils/itemDrawerOptionMappers";
import { ITEMS_LIST_QUERY_KEY, ITEM_TYPES_QUERY_KEY } from "../queries/itemsQueryKeys";
import { CATEGORIES_LIST_QUERY_KEY } from "@/features/categories";
import { BRANDS_LIST_QUERY_KEY } from "@/features/brands";
import { UNIT_GROUPS_LIST_QUERY_KEY } from "@/features/unit-groups";
import { VAT_GROUPS_LIST_QUERY_KEY } from "@/features/vat-groups";

const ITEM_DETAIL_QUERY_PREFIX = /** @type {const} */ (ITEMS_LIST_QUERY_KEY);

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
    queryKey: ITEM_TYPES_QUERY_KEY,
    queryFn: fetchItemTypes,
    enabled: open,
    staleTime: QUERY_STALE_TIME.lookup,
  });

  const categoriesQuery = useQuery({
    queryKey: CATEGORIES_LIST_QUERY_KEY,
    queryFn: fetchCategoryNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const brandsQuery = useQuery({
    queryKey: BRANDS_LIST_QUERY_KEY,
    queryFn: () => fetchBrandNames(),
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const unitGroupsQuery = useQuery({
    queryKey: UNIT_GROUPS_LIST_QUERY_KEY,
    queryFn: fetchUnitGroupNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const vatGroupsQuery = useQuery({
    queryKey: VAT_GROUPS_LIST_QUERY_KEY,
    queryFn: () => fetchVatGroupNames(),
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const itemUomsQuery = useQuery({
    queryKey: itemUomsQueryKey(/** @type {number} */ (persistedItemId)),
    queryFn: () => fetchItemUoms(/** @type {number} */ (persistedItemId)),
    enabled: open && tabsEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const itemTypeIdWatch = Form.useWatch("item_type_id", form);
  const nameWatch = Form.useWatch("name", form);
  const unitGroupIdWatch = Form.useWatch("unit_group_id", form);
  const allowPurchaseWatch = Form.useWatch("allow_purchase", form);
  const trackInventoryWatch = Form.useWatch("track_inventory", form);

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
  const unitGroupOptions = useMemo(
    () => mapUnitGroupOptions(unitGroupsQuery.data ?? []),
    [unitGroupsQuery.data],
  );
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
    () => requiredGeneralFieldsValid(String(nameWatch ?? ""), unitGroupIdWatch),
    [nameWatch, unitGroupIdWatch],
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
    unitGroupOptions,
    vatGroupOptions,
    handleItemTypeChange,
    canSubmitRequired,
    unitGroupIdWatch,
    allowPurchaseWatch,
    trackInventoryWatch,
    itemTypesPending: itemTypesQuery.isPending,
    categoriesPending: categoriesQuery.isPending,
    brandsPending: brandsQuery.isPending,
    unitGroupsPending: unitGroupsQuery.isPending,
    vatGroupsPending: vatGroupsQuery.isPending,
  };
}
