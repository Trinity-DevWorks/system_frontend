"use client";

import { SwapOutlined } from "@ant-design/icons";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { transferWarehousesAreDistinct } from "../utils/stockTransferDrawerUtils";
import { Button, Col, Form, Row, Select } from "antd";
import { useCallback, useMemo } from "react";

/**
 * @param {import("antd").FormInstance} form
 * @param {string} fromName
 * @param {string} toName
 * @param {string} message
 */
function warehouseDistinctValidator(form, fromName, toName, message) {
  return {
    validator() {
      const fromId = form.getFieldValue(fromName);
      const toId = form.getFieldValue(toName);
      if (!transferWarehousesAreDistinct(fromId, toId)) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
  };
}

/**
 * From / to warehouse pair: each select can be cleared, and a swap control exchanges them.
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   disabled?: boolean;
 *   warehouseOptions: { value: number; label: string }[];
 *   warehousesPending?: boolean;
 *   fromName?: string;
 *   toName?: string;
 *   fromLabel: string;
 *   toLabel: string;
 *   fromPlaceholder: string;
 *   toPlaceholder: string;
 *   fromRequiredMessage: string;
 *   toRequiredMessage: string;
 *   sameWarehouseMessage: string;
 *   swapLabel: string;
 * }} props
 */
export default function WarehouseFromToFields({
  form,
  disabled = false,
  warehouseOptions,
  warehousesPending = false,
  fromName = "from_warehouse_id",
  toName = "to_warehouse_id",
  fromLabel,
  toLabel,
  fromPlaceholder,
  toPlaceholder,
  fromRequiredMessage,
  toRequiredMessage,
  sameWarehouseMessage,
  swapLabel,
}) {
  const fromId = Form.useWatch(fromName, form);
  const toId = Form.useWatch(toName, form);

  const fromWarehouseOptions = useMemo(
    () => warehouseOptions.filter((option) => option.value !== toId),
    [warehouseOptions, toId],
  );

  const toWarehouseOptions = useMemo(
    () => warehouseOptions.filter((option) => option.value !== fromId),
    [warehouseOptions, fromId],
  );

  const distinctRule = useMemo(
    () => warehouseDistinctValidator(form, fromName, toName, sameWarehouseMessage),
    [form, fromName, toName, sameWarehouseMessage],
  );

  const swapDisabled = disabled || (fromId == null && toId == null);

  const handleSwap = useCallback(() => {
    if (swapDisabled) return;
    form.setFieldsValue({
      [fromName]: toId,
      [toName]: fromId,
    });
    form.validateFields([fromName, toName]).catch(() => {});
  }, [form, fromId, fromName, swapDisabled, toId, toName]);

  return (
    <Row gutter={[16, 0]} align="bottom">
      <Col xs={24} sm={11}>
        <Form.Item
          name={fromName}
          label={<ResourceDrawerFieldLabel text={fromLabel} required />}
          dependencies={[toName]}
          rules={[{ required: true, message: fromRequiredMessage }, distinctRule]}
        >
          <Select
            showSearch
            allowClear
            optionFilterProp="label"
            className="w-full"
            placeholder={fromPlaceholder}
            options={fromWarehouseOptions}
            loading={warehousesPending}
            getPopupContainer={drawerSelectGetPopup}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={2}>
        <Form.Item label={<span aria-hidden="true">&nbsp;</span>}>
          <div className="flex justify-center">
            <Button
              htmlType="button"
              icon={<SwapOutlined />}
              onClick={handleSwap}
              disabled={swapDisabled}
              aria-label={swapLabel}
              title={swapLabel}
            />
          </div>
        </Form.Item>
      </Col>
      <Col xs={24} sm={11}>
        <Form.Item
          name={toName}
          label={<ResourceDrawerFieldLabel text={toLabel} required />}
          dependencies={[fromName]}
          rules={[{ required: true, message: toRequiredMessage }, distinctRule]}
        >
          <Select
            showSearch
            allowClear
            optionFilterProp="label"
            className="w-full"
            placeholder={toPlaceholder}
            options={toWarehouseOptions}
            loading={warehousesPending}
            getPopupContainer={drawerSelectGetPopup}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}
