"use client";

/**
 * Items CRUD drawer shell — wires form, tabs, mutations, footer, and nested lookup drawers.
 *
 * Used by:
 * - app/[locale]/main/items/page.js
 */

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import { useCreateDiscardBaseline } from "@/components/resource-drawer/useCreateDiscardBaseline";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { useQueryClient } from "@tanstack/react-query";
import ResourceDrawerTabs from "@/components/resource-drawer/ResourceDrawerTabs";
import { useResourceDrawerHeaderFields } from "@/components/resource-drawer/useResourceDrawerHeaderFields";
import { Alert, App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import {
  isCreateDirtyVsDefaults,
  ITEM_CREATE_SAVE_INTENT_EVENT,
  ITEM_CREATE_SAVE_INTENT_KEY,
  mapItemRecordToFormValues,
  toItemCacheRow,
} from "./utils/itemDrawerUtils";
import {
  getAllowedTabKeys,
  getItemDrawerDefaults,
  getItemDrawerTitle,
  resolveActiveTab,
} from "./utils/itemDrawerViewState";
import { useItemDrawerNestedCreate } from "./hooks/useItemDrawerNestedCreate";
import { useItemDrawerMutations } from "./hooks/useItemDrawerMutations";
import { useItemDrawerController } from "./hooks/useItemDrawerController";
import ItemDrawerFooter from "./components/ItemDrawerFooter";
import ItemDrawerNestedDrawers from "./components/ItemDrawerNestedDrawers";
import { useItemDrawerActions } from "./hooks/useItemDrawerActions";
import { useItemDrawerEditBaseline } from "./hooks/useItemDrawerEditBaseline";
import { useItemDrawerData } from "./hooks/useItemDrawerData";
import { normalizeEntityId } from "@/lib/entityId";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   itemId: string | null;
 *   editSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 *   onSaveAndNew?: () => void;
 * }} props
 */
export default function ItemDrawer({
  open,
  mode,
  itemId,
  onClose,
  onCreated,
  onCreateSuccess,
  onSaveAndNew,
  editSeedRecord = null,
}) {
  const t = useTranslations("Items");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("general");
  const [savedEditBaseline, setSavedEditBaseline] = useState(
    /** @type {{ itemId: string; row: ReturnType<typeof toItemCacheRow> } | null} */ (null),
  );

  const nestedCreate = useItemDrawerNestedCreate({ form, queryClient, open });
  const lastCreateIntent = usePersistedSaveIntent(ITEM_CREATE_SAVE_INTENT_KEY, ITEM_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";
  const persistedItemId = normalizeEntityId(itemId);
  const tabsEnabled = persistedItemId != null;
  const defaults = useMemo(() => getItemDrawerDefaults(), []);

  const mapSeedToCacheRow = useCallback((seed) => toItemCacheRow(seed), []);
  const mapRecordToFormValues = useCallback((r) => mapItemRecordToFormValues(r), []);

  const data = useItemDrawerData({
    open,
    mode,
    persistedItemId,
    tabsEnabled,
    editSeedRecord,
    form,
    defaults,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const {
    detailEnabled,
    tableSeedMatches,
    fetchRemoteDetail,
    detailQuery,
    detailRecord,
    showBundleTab,
    showRecipeTab,
    canSubmitRequired,
    unitGroupIdWatch,
    allowPurchaseWatch,
    trackInventoryWatch,
    ...generalFormData
  } = data;

  const showReplenishmentTab = useMemo(() => {
    const trackInventory =
      trackInventoryWatch ??
      (detailRecord?.track_inventory !== undefined ? Boolean(detailRecord.track_inventory) : true);
    const allowPurchase =
      allowPurchaseWatch ??
      (detailRecord?.allow_purchase !== undefined ? Boolean(detailRecord.allow_purchase) : true);
    return trackInventory && allowPurchase;
  }, [trackInventoryWatch, allowPurchaseWatch, detailRecord]);

  const allowedTabKeys = useMemo(
    () => getAllowedTabKeys(tabsEnabled, showRecipeTab, showBundleTab, showReplenishmentTab),
    [tabsEnabled, showBundleTab, showRecipeTab, showReplenishmentTab],
  );
  const resolvedActiveTab = resolveActiveTab(activeTab, allowedTabKeys);

  const { syncBaselineFromFormFields, resetBaselineToDefaults, isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults,
    isCreateDirtyVsBaseline: isCreateDirtyVsDefaults,
  });

  const onSyncCreateDiscardBaseline = useCallback(
    (kind) => {
      if (kind === "fromForm") syncBaselineFromFormFields();
      else resetBaselineToDefaults();
    },
    [syncBaselineFromFormFields, resetBaselineToDefaults],
  );

  const onSyncEditDiscardBaseline = useCallback(
    (record) => {
      if (persistedItemId == null) return;
      setSavedEditBaseline({ itemId: persistedItemId, row: toItemCacheRow(record) });
    },
    [persistedItemId],
  );

  const { createMutation, updateMutation, applyPayload, submitting } = useItemDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
    onCreateSuccess,
    onSyncCreateDiscardBaseline,
    onSyncEditDiscardBaseline,
    onSaveAndNew,
    defaults,
  });

  const editBaselineForDirty = useItemDrawerEditBaseline({
    mode,
    persistedItemId,
    savedEditBaseline,
    detailRow: detailQuery.data,
    tableSeedMatches,
    editSeedRecord,
  });

  const actions = useItemDrawerActions({
    readOnly,
    mode,
    form,
    isCreateDirty,
    editBaselineForDirty,
    clearNestedCreate: nestedCreate.clearNestedCreate,
    setActiveTab,
    onClose,
    modal,
    t,
    createMutation,
    updateMutation,
    applyPayload,
    persistedItemId,
    canSubmitRequired,
    submitting,
    fetchRemoteDetail,
    detailEnabled,
    detailQueryError: detailQuery.isError,
    lastCreateIntent,
  });

  const itemDetailRow =
    detailQuery.data ?? (tableSeedMatches && editSeedRecord ? editSeedRecord : null);

  const { recordName: recordDisplayName, statusActive: headerStatusActive } = useResourceDrawerHeaderFields({
    mode,
    form,
    detailRow: itemDetailRow && typeof itemDetailRow === "object" ? itemDetailRow : null,
    seedRow: editSeedRecord,
  });

  const { tabItems, footerProps, nestedDrawersProps, showSaveGeneralFirstAlert } = useItemDrawerController({
    t,
    tApiErrors,
    form,
    mode,
    readOnly,
    open,
    resolvedActiveTab,
    tabsEnabled,
    persistedItemId,
    general: {
      itemTypeOptions: generalFormData.itemTypeOptions,
      categoryTreeData: generalFormData.categoryTreeData,
      brandOptions: generalFormData.brandOptions,
      unitGroupOptions: generalFormData.unitGroupOptions,
      vatGroupOptions: generalFormData.vatGroupOptions,
      itemTypesPending: generalFormData.itemTypesPending,
      categoriesPending: generalFormData.categoriesPending,
      brandsPending: generalFormData.brandsPending,
      unitGroupsPending: generalFormData.unitGroupsPending,
      vatGroupsPending: generalFormData.vatGroupsPending,
      handleItemTypeChange: generalFormData.handleItemTypeChange,
      openNestedCategoryDrawer: nestedCreate.openNestedCategoryDrawer,
      openNestedBrandDrawer: nestedCreate.openNestedBrandDrawer,
      openNestedUnitGroupDrawer: nestedCreate.openNestedUnitGroupDrawer,
      openNestedVatGroupDrawer: nestedCreate.openNestedVatGroupDrawer,
    },
    panels: {
      showBundleTab,
      showRecipeTab,
      unitGroupIdWatch,
      detailUnitGroupId: detailQuery.data?.unit_group_id,
      allowPurchaseWatch,
      trackInventoryWatch,
      showReplenishmentTab,
      detailRecord,
    },
    footer: {
      forceClose: actions.forceClose,
      requestClose: actions.requestClose,
      submitting,
      canSubmitRequired,
      fetchRemoteDetail,
      detailEnabled,
      detailQueryError: detailQuery.isError,
      lastCreateIntent,
      runCreate: actions.runCreate,
      createIntentLabel: actions.createIntentLabel,
      createSaveMenuItems: actions.createSaveMenuItems,
      handleEditSubmit: actions.handleEditSubmit,
      editSaveDisabled: actions.editSaveDisabled,
    },
    nestedDrawers: {
      nestedCategoryDrawerOpen: nestedCreate.nestedCategoryDrawerOpen,
      nestedBrandDrawerOpen: nestedCreate.nestedBrandDrawerOpen,
      nestedUnitGroupDrawerOpen: nestedCreate.nestedUnitGroupDrawerOpen,
      nestedVatGroupDrawerOpen: nestedCreate.nestedVatGroupDrawerOpen,
      closeNestedCreate: nestedCreate.closeNestedCreate,
      onNestedCategoryCreated: nestedCreate.onNestedCategoryCreated,
      onNestedBrandCreated: nestedCreate.onNestedBrandCreated,
      onNestedUnitGroupCreated: nestedCreate.onNestedUnitGroupCreated,
      onNestedVatGroupCreated: nestedCreate.onNestedVatGroupCreated,
    },
  });

  return (
    <ResourceCrudDrawer
      title={getItemDrawerTitle(mode, t)}
      recordName={mode === "create" ? null : recordDisplayName}
      statusActive={headerStatusActive}
      statusActiveLabel={t("statusActive")}
      statusInactiveLabel={t("statusInactive")}
      open={open}
      requestClose={actions.requestClose}
      submitting={submitting}
      size={1170}
      showDetailLoading={fetchRemoteDetail && detailQuery.isPending}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      skeletonParagraphRows={8}
      footer={<ItemDrawerFooter {...footerProps} />}
    >
      {showSaveGeneralFirstAlert ? (
        <Alert type="info" showIcon className="mb-4" title={t("saveGeneralFirst")} />
      ) : null}
      <ResourceDrawerTabs activeKey={resolvedActiveTab} onChange={setActiveTab} items={tabItems} />
      <ItemDrawerNestedDrawers {...nestedDrawersProps} />
    </ResourceCrudDrawer>
  );
}
