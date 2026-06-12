import { useMemo } from "react";
/**
 * Builds ResourceDrawerTabs config (general, UOM variants, suppliers, bundle/recipe, attachments).
 *
 * Used by:
 * - drawer/hooks/useItemDrawerController.js
 */

import ItemAttachmentsPanel from "../panels/ItemAttachmentsPanel";
import ItemDrawerGeneralForm from "../components/ItemDrawerGeneralForm";
import {
  ItemBundlePanel,
  ItemRecipePanel,
  ItemReplenishmentPanel,
  ItemSuppliersPanel,
  ItemUomsPanel,
} from "../panels/ItemDrawerPanels";

/**
 * @param {{
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   itemTypeOptions: { value: number; label: string; code: string }[];
 *   categoryTreeData: import("antd").TreeSelectProps["treeData"];
 *   brandOptions: { value: number; label: string }[];
 *   unitGroupOptions: { value: number; label: string }[];
 *   vatGroupOptions: { value: number; label: string }[];
 *   itemTypesPending: boolean;
 *   categoriesPending: boolean;
 *   brandsPending: boolean;
 *   unitGroupsPending: boolean;
 *   vatGroupsPending: boolean;
 *   handleItemTypeChange: (typeId: number | undefined) => void;
 *   openNestedCategoryDrawer: () => void;
 *   openNestedBrandDrawer: () => void;
 *   openNestedUnitGroupDrawer: () => void;
 *   openNestedVatGroupDrawer: () => void;
 *   tabsEnabled: boolean;
 *   persistedItemId: number;
 *   tApiErrors: (key: string) => string;
 *   open: boolean;
 *   resolvedActiveTab: string;
 *   showBundleTab: boolean;
 *   showRecipeTab: boolean;
 *   unitGroupIdWatch?: number;
 *   detailUnitGroupId?: number;
 *   allowPurchaseWatch?: boolean;
 *   trackInventoryWatch?: boolean;
 *   showReplenishmentTab?: boolean;
 *   detailRecord: Record<string, unknown> | null;
 * }} args
 */
export function useItemDrawerTabItems({
  t,
  form,
  readOnly,
  itemTypeOptions,
  categoryTreeData,
  brandOptions,
  unitGroupOptions,
  vatGroupOptions,
  itemTypesPending,
  categoriesPending,
  brandsPending,
  unitGroupsPending,
  vatGroupsPending,
  handleItemTypeChange,
  openNestedCategoryDrawer,
  openNestedBrandDrawer,
  openNestedUnitGroupDrawer,
  openNestedVatGroupDrawer,
  tabsEnabled,
  persistedItemId,
  tApiErrors,
  open,
  resolvedActiveTab,
  showBundleTab,
  showRecipeTab,
  unitGroupIdWatch,
  detailUnitGroupId,
  allowPurchaseWatch,
  trackInventoryWatch,
  showReplenishmentTab = false,
  detailRecord,
}) {
  return useMemo(() => {
    const items = [
      {
        key: "general",
        label: t("tabGeneral"),
        hidePanelHeading: true,
        children: (
          <ItemDrawerGeneralForm
            form={form}
            readOnly={readOnly}
            t={t}
            itemTypeOptions={itemTypeOptions}
            categoryTreeData={categoryTreeData}
            brandOptions={brandOptions}
            unitGroupOptions={unitGroupOptions}
            vatGroupOptions={vatGroupOptions}
            itemTypesPending={itemTypesPending}
            categoriesPending={categoriesPending}
            brandsPending={brandsPending}
            unitGroupsPending={unitGroupsPending}
            vatGroupsPending={vatGroupsPending}
            onItemTypeChange={handleItemTypeChange}
            onOpenCategoryDrawer={readOnly ? undefined : openNestedCategoryDrawer}
            onOpenBrandDrawer={readOnly ? undefined : openNestedBrandDrawer}
            onOpenUnitGroupDrawer={readOnly ? undefined : openNestedUnitGroupDrawer}
            onOpenVatGroupDrawer={readOnly ? undefined : openNestedVatGroupDrawer}
          />
        ),
      },
    ];

    if (!tabsEnabled) return items;

    items.push({
      key: "uoms",
      label: t("tabUoms"),
      hidePanelHeading: true,
      children: (
        <ItemUomsPanel
          itemId={persistedItemId}
          unitGroupId={unitGroupIdWatch ?? detailUnitGroupId}
          readOnly={readOnly}
          t={t}
          tApiErrors={tApiErrors}
          active={open && resolvedActiveTab === "uoms"}
          queryEnabled={tabsEnabled}
        />
      ),
    });

    if (showRecipeTab) {
      items.push({
        key: "recipe",
        label: t("tabRecipe"),
        hidePanelHeading: true,
        children: (
          <ItemRecipePanel
            itemId={persistedItemId}
            readOnly={readOnly}
            t={t}
            tApiErrors={tApiErrors}
            active={open && resolvedActiveTab === "recipe"}
            baseUomId={detailRecord?.base_uom_id != null ? Number(detailRecord.base_uom_id) : undefined}
          />
        ),
      });
    }

    if (showBundleTab) {
      items.push({
        key: "bundle",
        label: t("tabBundle"),
        hidePanelHeading: true,
        children: (
          <ItemBundlePanel
            itemId={persistedItemId}
            readOnly={readOnly}
            t={t}
            tApiErrors={tApiErrors}
            active={open && resolvedActiveTab === "bundle"}
          />
        ),
      });
    }

    if (showReplenishmentTab) {
      items.push({
        key: "replenishment",
        label: t("tabReplenishment"),
        hidePanelHeading: true,
        children: (
          <ItemReplenishmentPanel
            itemId={persistedItemId}
            readOnly={readOnly}
            trackInventory={
              trackInventoryWatch ??
              (detailRecord?.track_inventory !== undefined ? Boolean(detailRecord.track_inventory) : true)
            }
            allowPurchase={
              allowPurchaseWatch ??
              (detailRecord?.allow_purchase !== undefined ? Boolean(detailRecord.allow_purchase) : true)
            }
            t={t}
            tApiErrors={tApiErrors}
            active={open && resolvedActiveTab === "replenishment"}
          />
        ),
      });
    }

    items.push(
      {
        key: "suppliers",
        label: t("tabSuppliers"),
        hidePanelHeading: true,
        children: (
          <ItemSuppliersPanel
            itemId={persistedItemId}
            readOnly={readOnly}
            allowPurchase={
              allowPurchaseWatch ??
              (detailRecord?.allow_purchase !== undefined ? Boolean(detailRecord.allow_purchase) : true)
            }
            t={t}
            tApiErrors={tApiErrors}
            active={open && resolvedActiveTab === "suppliers"}
          />
        ),
      },
      {
        key: "attachments",
        label: t("tabAttachments"),
        hidePanelHeading: true,
        children: (
          <ItemAttachmentsPanel
            open={open}
            itemId={persistedItemId}
            readOnly={readOnly}
            t={t}
            tApiErrors={tApiErrors}
            active={open && resolvedActiveTab === "attachments"}
          />
        ),
      },
    );

    return items;
  }, [
    t,
    form,
    readOnly,
    itemTypeOptions,
    categoryTreeData,
    brandOptions,
    unitGroupOptions,
    vatGroupOptions,
    itemTypesPending,
    categoriesPending,
    brandsPending,
    unitGroupsPending,
    vatGroupsPending,
    handleItemTypeChange,
    openNestedCategoryDrawer,
    openNestedBrandDrawer,
    openNestedUnitGroupDrawer,
    openNestedVatGroupDrawer,
    tabsEnabled,
    persistedItemId,
    tApiErrors,
    open,
    resolvedActiveTab,
    showBundleTab,
    showRecipeTab,
    unitGroupIdWatch,
    detailUnitGroupId,
    allowPurchaseWatch,
    trackInventoryWatch,
    showReplenishmentTab,
    detailRecord,
  ]);
}
