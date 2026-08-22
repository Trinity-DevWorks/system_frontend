"use client";

/**
 * Manual stock adjustment (quantity delta in selected UOM or base UOM).
 *
 * Used by:
 * - app/[locale]/main/stock/balances/page.js
 * - app/[locale]/main/stock/movements/page.js
 */

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useQueryClient } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo } from "react";
import StockAdjustmentDrawerForm from "./StockAdjustmentDrawerForm";
import StockAdjustmentNestedDrawers from "./StockAdjustmentNestedDrawers";
import {
  getStockAdjustmentDefaults,
  isStockAdjustmentDirtyVsDefaults,
  stockAdjustmentRequiredFieldsValid,
  STOCK_ADJUSTMENT_BASE_UOM,
} from "../../utils/stockAdjustmentDrawerUtils";
import { useStockAdjustmentDrawerData } from "../../queries/useStockAdjustmentDrawerData";
import { useStockAdjustmentDrawerMutations } from "../../queries/useStockAdjustmentDrawerMutations";
import { useStockAdjustmentNestedCreate } from "../../hooks/useStockAdjustmentNestedCreate";

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   initialWarehouseId?: number | null;
 *   initialItemId?: string | null;
 * }} props
 */
export default function StockAdjustmentDrawer({
  open,
  onClose,
  initialWarehouseId = null,
  initialItemId = null,
}) {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const readOnly = false;
  const mode = "edit";

  const defaults = useMemo(
    () =>
      getStockAdjustmentDefaults({
        warehouse_id: initialWarehouseId,
        item_id: initialItemId,
      }),
    [initialWarehouseId, initialItemId],
  );

  const nestedCreate = useStockAdjustmentNestedCreate({ form, queryClient, open });

  const itemIdWatch = Form.useWatch("item_id", form);
  const warehouseIdWatch = Form.useWatch("warehouse_id", form);
  const quantityDeltaWatch = Form.useWatch("quantity_delta", form);

  const drawerData = useStockAdjustmentDrawerData({
    open,
    itemId: itemIdWatch,
    t,
  });

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(defaults);
  }, [open, defaults, form]);

  useEffect(() => {
    if (!open) return;
    form.setFieldValue("item_uom_id", STOCK_ADJUSTMENT_BASE_UOM);
  }, [itemIdWatch, open, form]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode: "create",
    form,
    defaults,
    isCreateDirtyVsBaseline: isStockAdjustmentDirtyVsDefaults,
  });

  const shouldConfirmDiscard = useCallback(() => isCreateDirty(), [isCreateDirty]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose,
    shouldConfirmDiscard,
  });

  const { applyPayload, postMutation, submitting } = useStockAdjustmentDrawerMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    onClose: forceClose,
  });

  const canSubmitRequired = useMemo(
    () =>
      stockAdjustmentRequiredFieldsValid({
        warehouse_id: warehouseIdWatch,
        item_id: itemIdWatch,
        quantity_delta: quantityDeltaWatch,
      }),
    [warehouseIdWatch, itemIdWatch, quantityDeltaWatch],
  );

  const handleSubmit = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        postMutation.mutate({ payload: applyPayload(values) });
      })
      .catch(() => {});
  }, [form, applyPayload, postMutation]);

  const selectedItem = drawerData.stockableItems.find((i) => i.id === itemIdWatch);
  const recordName =
    typeof selectedItem?.name === "string" ? selectedItem.name : null;

  return (
    <ResourceCrudDrawer
      open={open}
      requestClose={requestClose}
      title={t("adjustmentDrawerTitle")}
      recordName={recordName}
      submitting={submitting}
      showExpand={true}
      showDetailLoading={false}
      detailLoadFailed={false}
      detailError={null}
      tApiErrors={tApiErrors}
      size={480}
      footer={
        <ResourceDrawerFooter
          mode={mode}
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          createSaveDisabled={!canSubmitRequired || submitting}
          lastCreateIntent="close"
          runCreate={() => {}}
          createIntentLabel={() => t("drawerSaveUpdate")}
          createSaveMenuItems={[]}
          handleEditSubmit={handleSubmit}
          canSubmitRequired={canSubmitRequired}
          fetchRemoteDetail={false}
          detailEnabled={false}
          detailQueryError={false}
        />
      }
    >
      <StockAdjustmentDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        warehouseOptions={drawerData.warehouseOptions}
        itemOptions={drawerData.itemOptions}
        itemUomOptions={drawerData.itemUomOptions}
        warehousesPending={drawerData.warehousesPending}
        itemsPending={drawerData.itemsPending}
        itemUomsPending={drawerData.itemUomsPending}
        itemId={itemIdWatch}
        onOpenWarehouseDrawer={nestedCreate.openNestedWarehouseDrawer}
        onOpenItemDrawer={nestedCreate.openNestedItemDrawer}
      />
      <StockAdjustmentNestedDrawers
        nestedWarehouseDrawerOpen={nestedCreate.nestedWarehouseDrawerOpen}
        nestedItemDrawerOpen={nestedCreate.nestedItemDrawerOpen}
        closeNestedCreate={nestedCreate.closeNestedCreate}
        onNestedWarehouseCreated={nestedCreate.onNestedWarehouseCreated}
        onNestedItemCreated={nestedCreate.onNestedItemCreated}
      />
    </ResourceCrudDrawer>
  );
}
