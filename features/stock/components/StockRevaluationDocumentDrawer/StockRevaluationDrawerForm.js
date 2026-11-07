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
 * }} props
 */
export default function StockRevaluationDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  warehousesPending,
}) {
  return (
    <Form form={form} layout="vertical" disabled={readOnly}>
      <Row gutter={[24, 0]}>
        <Col xs={24} md={8}>
          <Form.Item
            name="warehouse_id"
            label={t("srvFieldWarehouse")}
            rules={[{ required: true, message: t("srvWarehouseRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={warehouseOptions}
              loading={warehousesPending}
              placeholder={t("srvWarehousePlaceholder")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="revaluation_date"
            label={t("srvFieldDate")}
            getValueProps={(value) => ({
              value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
            })}
          >
            <DatePicker className="w-full" format={dayjsDatePattern()} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="notes" label={t("srvFieldNotes")}>
        <Input.TextArea rows={2} maxLength={2000} showCount />
      </Form.Item>
    </Form>
  );
}
