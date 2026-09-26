"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import WarehouseFromToFields from "../WarehouseFromToFields";
import { Form, Input } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   warehouseOptions: { value: number; label: string }[];
 *   warehousesPending: boolean;
 * }} props
 */
export default function StockTransferDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  warehousesPending,
}) {
  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      className="item-general-form"
      disabled={readOnly}
    >
      <WarehouseFromToFields
        form={form}
        disabled={readOnly}
        warehouseOptions={warehouseOptions}
        warehousesPending={warehousesPending}
        fromLabel={t("transferFieldFromWarehouse")}
        toLabel={t("transferFieldToWarehouse")}
        fromPlaceholder={t("transferFromPlaceholder")}
        toPlaceholder={t("transferToPlaceholder")}
        fromRequiredMessage={t("transferFromRequired")}
        toRequiredMessage={t("transferToRequired")}
        sameWarehouseMessage={t("transferSameWarehouse")}
        swapLabel={t("transferSwapWarehouses")}
      />

      <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("transferFieldNotes")} />}>
        <Input.TextArea rows={2} maxLength={2000} showCount={!readOnly} />
      </Form.Item>
    </Form>
  );
}
