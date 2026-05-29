import { useMemo } from "react";
/**
 * Builds ResourceDrawerTabs config (general, UOMs, barcodes, suppliers, bundle/recipe, attachments).
 *
 * Used by:
 * - drawer/hooks/useItemDrawerController.js
 */

import ItemAttachmentsPanel from "../panels/ItemAttachmentsPanel";
import ItemDrawerGeneralForm from "../components/ItemDrawerGeneralForm";
import {
  ItemBarcodesPanel,
  ItemBundlePanel,
  ItemRecipePanel,
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
 *   uomOptions: { value: number; label: string }[];
 *   vatGroupOptions: { value: number; label: string }[];
 *   itemTypesPending: boolean;
 *   categoriesPending: boolean;
 *   brandsPending: boolean;
 *   uomsPending: boolean;
 *   vatGroupsPending: boolean;
 *   handleItemTypeChange: (typeId: number | undefined) => void;
 *   openNestedCategoryDrawer: () => void;
 *   openNestedBrandDrawer: () => void;
 *   openNestedUomDrawer: () => void;
 *   openNestedVatGroupDrawer: () => void;
 *   tabsEnabled: boolean;
 *   persistedItemId: number;
 *   tApiErrors: (key: string) => string;
 *   open: boolean;
 *   resolvedActiveTab: string;
 *   itemUomsData: unknown[];
 *   showBundleTab: boolean;
 *   showRecipeTab: boolean;
 *   baseUomIdWatch?: number;
 *   detailBaseUomId?: number;
 *   allowPurchaseWatch?: boolean;
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
  uomOptions,
  vatGroupOptions,
  itemTypesPending,
  categoriesPending,
  brandsPending,
  uomsPending,
  vatGroupsPending,
  handleItemTypeChange,
  openNestedCategoryDrawer,
  openNestedBrandDrawer,
  openNestedUomDrawer,
  openNestedVatGroupDrawer,
  tabsEnabled,
  persistedItemId,
  tApiErrors,
  open,
  resolvedActiveTab,
  itemUomsData,
  showBundleTab,
  showRecipeTab,
  baseUomIdWatch,
  detailBaseUomId,
  allowPurchaseWatch,
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
            uomOptions={uomOptions}
            vatGroupOptions={vatGroupOptions}
            itemTypesPending={itemTypesPending}
            categoriesPending={categoriesPending}
            brandsPending={brandsPending}
            uomsPending={uomsPending}
            vatGroupsPending={vatGroupsPending}
            onItemTypeChange={handleItemTypeChange}
            onOpenCategoryDrawer={readOnly ? undefined : openNestedCategoryDrawer}
            onOpenBrandDrawer={readOnly ? undefined : openNestedBrandDrawer}
            onOpenBaseUomDrawer={readOnly ? undefined : openNestedUomDrawer}
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
          baseUomId={baseUomIdWatch ?? detailBaseUomId}
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
            baseUomId={baseUomIdWatch != null ? Number(baseUomIdWatch) : undefined}
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

    items.push(
      {
        key: "barcodes",
        label: t("tabBarcodes"),
        hidePanelHeading: true,
        children: (
          <ItemBarcodesPanel
            itemId={persistedItemId}
            readOnly={readOnly}
            t={t}
            tApiErrors={tApiErrors}
            active={open && resolvedActiveTab === "barcodes"}
            itemUoms={itemUomsData}
          />
        ),
      },
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
    uomOptions,
    vatGroupOptions,
    itemTypesPending,
    categoriesPending,
    brandsPending,
    uomsPending,
    vatGroupsPending,
    handleItemTypeChange,
    openNestedCategoryDrawer,
    openNestedBrandDrawer,
    openNestedUomDrawer,
    openNestedVatGroupDrawer,
    tabsEnabled,
    persistedItemId,
    tApiErrors,
    open,
    resolvedActiveTab,
    itemUomsData,
    showBundleTab,
    showRecipeTab,
    baseUomIdWatch,
    detailBaseUomId,
    allowPurchaseWatch,
    detailRecord,
  ]);
}
