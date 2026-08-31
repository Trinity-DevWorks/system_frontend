"use client";

import { dayjsDatePattern } from "@/lib/tenant-format";
import { Alert, Col, DatePicker, Form, Input, InputNumber, Row, Select } from "antd";
import dayjs from "dayjs";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   warehouseOptions: { value: unknown; label: string }[];
 *   warehousesPending: boolean;
 *   itemOptions: { value: string; label: string }[];
 *   itemsPending: boolean;
 *   bexNumber?: string | null;
 *   componentsPending: boolean;
 *   componentsEmpty: boolean;
 * }} props
 */
export default function BundleExplosionDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  warehousesPending,
  itemOptions,
  itemsPending,
  bexNumber,
  componentsPending,
  componentsEmpty,
}) {
  return (
    <Form form={form} layout="vertical" disabled={readOnly}>
      {bexNumber ? (
        <Form.Item label={t("bexFieldNumber")}>
          <Input value={bexNumber} disabled />
        </Form.Item>
      ) : null}

      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="warehouse_id"
            label={t("bexFieldWarehouse")}
            rules={[{ required: true, message: t("bexWarehouseRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={warehouseOptions}
              loading={warehousesPending}
              placeholder={t("bexWarehousePlaceholder")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="explosion_date"
            label={t("bexFieldExplosionDate")}
            getValueProps={(value) => ({
              value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
            })}
          >
            <DatePicker className="w-full" format={dayjsDatePattern()} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="item_id"
            label={t("bexFieldItem")}
            rules={[{ required: true, message: t("bexItemRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={itemOptions}
              loading={itemsPending}
              placeholder={t("bexItemPlaceholder")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="quantity"
            label={t("bexFieldQuantity")}
            rules={[{ required: true, message: t("bexQuantityRequired") }]}
          >
            <InputNumber className="w-full" min={0.000001} />
          </Form.Item>
        </Col>
      </Row>

      {componentsPending ? <Alert type="info" showIcon title={t("bexComponentsLoading")} className="mb-4" /> : null}
      {componentsEmpty ? <Alert type="warning" showIcon title={t("bexNoComponents")} className="mb-4" /> : null}

      <Form.Item name="notes" label={t("bexFieldNotes")}>
        <Input.TextArea rows={2} maxLength={2000} showCount />
      </Form.Item>
    </Form>
  );
}
