import { useMemo } from "react";
import { useItemDrawerTabItems } from "./useItemDrawerTabItems";

/**
 * Assembles tab config, footer props, and nested-drawer props for the item drawer shell.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

/**
 * @param {{
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (key: string) => string;
 *   form: import("antd").FormInstance;
 *   mode: "create" | "edit" | "view";
 *   readOnly: boolean;
 *   open: boolean;
 *   resolvedActiveTab: string;
 *   tabsEnabled: boolean;
 *   persistedItemId: number | null;
 *   general: {
 *     itemTypeOptions: { value: number; label: string; code: string }[];
 *     categoryTreeData: import("antd").TreeSelectProps["treeData"];
 *     brandOptions: { value: number; label: string }[];
 *     uomOptions: { value: number; label: string }[];
 *     vatGroupOptions: { value: number; label: string }[];
 *     itemTypesPending: boolean;
 *     categoriesPending: boolean;
 *     brandsPending: boolean;
 *     uomsPending: boolean;
 *     vatGroupsPending: boolean;
 *     handleItemTypeChange: (typeId: number | undefined) => void;
 *     openNestedCategoryDrawer: () => void;
 *     openNestedBrandDrawer: () => void;
 *     openNestedUomDrawer: () => void;
 *     openNestedVatGroupDrawer: () => void;
 *   };
 *   panels: {
 *     itemUomsData: unknown[];
 *     showBundleTab: boolean;
 *     showRecipeTab: boolean;
 *     baseUomIdWatch?: number;
 *     detailBaseUomId?: number;
 *     allowPurchaseWatch?: boolean;
 *     detailRecord: Record<string, unknown> | null;
 *   };
 *   footer: {
 *     forceClose: () => void;
 *     requestClose: () => void;
 *     submitting: boolean;
 *     canSubmitRequired: boolean;
 *     fetchRemoteDetail: boolean;
 *     detailEnabled: boolean;
 *     detailQueryError: boolean;
 *     lastCreateIntent: "keep" | "new" | "close" | null;
 *     runCreate: (intent: "keep" | "new" | "close") => void;
 *     createIntentLabel: (intent: "keep" | "new" | "close") => string;
 *     createSaveMenuItems: { key: "keep" | "new" | "close"; label: string }[];
 *     runEdit: ((intent: "keep" | "new" | "close") => void) | undefined;
 *     editSaveDisabled: boolean;
 *   };
 *   nestedDrawers: {
 *     nestedCategoryDrawerOpen: boolean;
 *     nestedBrandDrawerOpen: boolean;
 *     nestedUomDrawerOpen: boolean;
 *     nestedVatGroupDrawerOpen: boolean;
 *     closeNestedCreate: () => void;
 *     onNestedCategoryCreated: (record: Record<string, unknown>) => void;
 *     onNestedBrandCreated: (record: Record<string, unknown>) => void;
 *     onNestedBaseUomCreated: (record: Record<string, unknown>) => void;
 *     onNestedVatGroupCreated: (record: Record<string, unknown>) => void;
 *   };
 * }} args
 */
export function useItemDrawerController({
  t,
  tApiErrors,
  form,
  mode,
  readOnly,
  open,
  resolvedActiveTab,
  tabsEnabled,
  persistedItemId,
  general,
  panels,
  footer,
  nestedDrawers,
}) {
  const tabItems = useItemDrawerTabItems({
    t,
    form,
    readOnly,
    tApiErrors,
    open,
    tabsEnabled,
    persistedItemId: /** @type {number} */ (persistedItemId),
    resolvedActiveTab,
    ...general,
    ...panels,
  });

  const footerProps = useMemo(
    () => ({
      isGeneralTab: resolvedActiveTab === "general",
      mode,
      readOnly,
      t,
      ...footer,
    }),
    [resolvedActiveTab, mode, readOnly, t, footer],
  );

  const nestedDrawersProps = useMemo(
    () => ({
      readOnly,
      ...nestedDrawers,
    }),
    [readOnly, nestedDrawers],
  );

  const showSaveGeneralFirstAlert = !tabsEnabled && mode === "create";

  return {
    tabItems,
    footerProps,
    nestedDrawersProps,
    showSaveGeneralFirstAlert,
  };
}
