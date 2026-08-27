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
 *   osNumber?: string | null;
 * }} props
 */
export default function OpeningStockDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  warehousesPending,
  osNumber,
}) {
  return (
    <Form form={form} layout="vertical" disabled={readOnly}>
      {osNumber ? (
        <Form.Item label={t("osFieldNumber")}>
          <Input value={osNumber} disabled />
        </Form.Item>
      ) : null}

      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="warehouse_id"
            label={t("osFieldWarehouse")}
            rules={[{ required: true, message: t("osWarehouseRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={warehouseOptions}
              loading={warehousesPending}
              placeholder={t("osWarehousePlaceholder")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="opening_date"
            label={t("osFieldOpeningDate")}
            getValueProps={(value) => ({
              value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
            })}
          >
            <DatePicker className="w-full" format={dayjsDatePattern()} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="notes" label={t("osFieldNotes")}>
        <Input.TextArea rows={2} maxLength={2000} showCount />
      </Form.Item>
    </Form>
  );
}
