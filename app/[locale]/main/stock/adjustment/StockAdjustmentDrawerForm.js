"use client";

/**
 * Stock adjustment form — warehouse, item, UOM, quantity, notes.
 *
 * Used by:
 * - app/[locale]/main/stock/adjustment/StockAdjustmentDrawer.js
 */

import LookupSelectWithCreate from "@/components/resource-drawer/LookupSelectWithCreate";
import { Form, Input, InputNumber, Select } from "antd";
import {
  STOCK_LOOKUP_ADD_ITEM,
  STOCK_LOOKUP_ADD_WAREHOUSE,
} from "./stockAdjustmentDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   warehouseOptions: { value: unknown; label: string }[];
 *   itemOptions: { value: unknown; label: string }[];
 *   itemUomOptions: { value: unknown; label: string }[];
 *   warehousesPending: boolean;
 *   itemsPending: boolean;
 *   itemUomsPending: boolean;
 *   itemId?: number;
 *   onOpenWarehouseDrawer: () => void;
 *   onOpenItemDrawer: () => void;
 * }} props
 */
export default function StockAdjustmentDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  itemOptions,
  itemUomOptions,
  warehousesPending,
  itemsPending,
  itemUomsPending,
  itemId,
  onOpenWarehouseDrawer,
  onOpenItemDrawer,
}) {
  return (
    <Form form={form} layout="vertical" disabled={readOnly}>
      <LookupSelectWithCreate
        form={form}
        name="warehouse_id"
        label={t("adjustmentFieldWarehouse")}
        readOnly={readOnly}
        addNewSentinel={STOCK_LOOKUP_ADD_WAREHOUSE}
        addNewLabel={t("adjustmentWarehouseAddNew")}
        onAddNew={onOpenWarehouseDrawer}
        addNewAsLink
        rules={[{ required: true, message: t("adjustmentWarehouseRequired") }]}
        options={warehouseOptions}
        loading={warehousesPending}
        placeholder={t("adjustmentWarehousePlaceholder")}
        allowClear={false}
      />

      <LookupSelectWithCreate
        form={form}
        name="item_id"
        label={t("adjustmentFieldItem")}
        readOnly={readOnly}
        addNewSentinel={STOCK_LOOKUP_ADD_ITEM}
        addNewLabel={t("adjustmentItemAddNew")}
        onAddNew={onOpenItemDrawer}
        addNewAsLink
        rules={[{ required: true, message: t("adjustmentItemRequired") }]}
        options={itemOptions}
        loading={itemsPending}
        placeholder={t("adjustmentItemPlaceholder")}
        allowClear={false}
      />

      <Form.Item name="item_uom_id" label={t("adjustmentFieldUom")}>
        <Select
          allowClear
          options={itemUomOptions}
          loading={itemUomsPending}
          disabled={!itemId}
          placeholder={t("adjustmentUomPlaceholder")}
        />
      </Form.Item>

      <Form.Item
        name="quantity_delta"
        label={t("adjustmentFieldQuantity")}
        extra={t("adjustmentQuantityHint")}
        rules={[{ required: true, message: t("adjustmentQuantityRequired") }]}
      >
        <InputNumber className="w-full" step={0.000001} placeholder="0" />
      </Form.Item>

      <Form.Item name="notes" label={t("adjustmentFieldNotes")}>
        <Input.TextArea rows={3} maxLength={1000} showCount />
      </Form.Item>
    </Form>
  );
}
