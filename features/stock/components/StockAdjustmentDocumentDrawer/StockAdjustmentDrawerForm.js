"use client";

import { dayjsDatePattern } from "@/lib/tenant-format";
import { Col, DatePicker, Form, Input, Row, Select } from "antd";
import dayjs from "dayjs";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   warehouseOptions: { value: unknown; label: string }[];
 *   warehousesPending: boolean;
 *   reasonOptions: { value: unknown; label: string; direction?: string }[];
 *   reasonsPending: boolean;
 * }} props
 */
export default function StockAdjustmentDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  warehousesPending,
  reasonOptions,
  reasonsPending,
}) {
  return (
    <Form form={form} layout="vertical" disabled={readOnly}>
      <Row gutter={[24, 0]}>
        <Col xs={24} md={8}>
          <Form.Item
            name="warehouse_id"
            label={t("adjFieldWarehouse")}
            rules={[{ required: true, message: t("adjWarehouseRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={warehouseOptions}
              loading={warehousesPending}
              placeholder={t("adjWarehousePlaceholder")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="stock_adjustment_reason_id"
            label={t("adjFieldReason")}
            rules={[{ required: true, message: t("adjReasonRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={reasonOptions}
              loading={reasonsPending}
              placeholder={t("adjReasonPlaceholder")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="adjustment_date"
            label={t("adjFieldAdjustmentDate")}
            getValueProps={(value) => ({
              value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
            })}
          >
            <DatePicker className="w-full" format={dayjsDatePattern()} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="notes" label={t("adjFieldNotes")}>
        <Input.TextArea rows={2} maxLength={2000} showCount />
      </Form.Item>
    </Form>
  );
}
