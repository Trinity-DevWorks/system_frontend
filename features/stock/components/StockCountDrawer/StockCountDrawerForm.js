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
 *   cntNumber?: string | null;
 * }} props
 */
export default function StockCountDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  warehousesPending,
  cntNumber,
}) {
  return (
    <Form form={form} layout="vertical" disabled={readOnly}>
      {cntNumber ? (
        <Form.Item label={t("cntFieldNumber")}>
          <Input value={cntNumber} disabled />
        </Form.Item>
      ) : null}

      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="warehouse_id"
            label={t("cntFieldWarehouse")}
            rules={[{ required: true, message: t("cntWarehouseRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={warehouseOptions}
              loading={warehousesPending}
              placeholder={t("cntWarehousePlaceholder")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="count_date"
            label={t("cntFieldCountDate")}
            getValueProps={(value) => ({
              value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
            })}
          >
            <DatePicker className="w-full" format={dayjsDatePattern()} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="notes" label={t("cntFieldNotes")}>
        <Input.TextArea rows={2} maxLength={2000} showCount />
      </Form.Item>
    </Form>
  );
}
