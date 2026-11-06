"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { Col, DatePicker, Form, Input, Row, Select } from "antd";
import dayjs from "dayjs";

/**
 * Header of a landed cost: date, reference, the shipment's receipts, notes.
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   receiptValues: string[];
 *   receiptOptions: Array<{ value: string; label: string; row: Record<string, any> }>;
 *   receiptsPending: boolean;
 *   onReceiptsChange: (values: string[], options: unknown) => void;
 * }} props
 */
export default function LandedCostDrawerForm({
  form,
  readOnly,
  t,
  receiptValues,
  receiptOptions,
  receiptsPending,
  onReceiptsChange,
}) {
  return (
    <Form form={form} layout="vertical" disabled={readOnly} requiredMark={false}>
      <Row gutter={[24, 0]}>
        <Col xs={24} md={6}>
          <Form.Item
            name="cost_date"
            label={<ResourceDrawerFieldLabel text={t("fieldDate")} required />}
            rules={[{ required: true, message: t("fieldDateRequired") }]}
            getValueProps={(value) => ({ value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined })}
          >
            <DatePicker className="w-full" format={dayjsDatePattern()} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item name="reference" label={<ResourceDrawerFieldLabel text={t("fieldReference")} />}>
            <Input maxLength={128} placeholder={t("fieldReferencePlaceholder")} allowClear />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label={<ResourceDrawerFieldLabel text={t("sectionReceipts")} required />}>
            <Select
              mode="multiple"
              className="w-full"
              placeholder={t("receiptsPlaceholder")}
              loading={receiptsPending}
              optionFilterProp="label"
              value={receiptValues}
              onChange={onReceiptsChange}
              options={receiptOptions}
              getPopupContainer={drawerSelectGetPopup}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("fieldNotes")} />}>
        <Input.TextArea rows={2} maxLength={2000} showCount={!readOnly} />
      </Form.Item>
    </Form>
  );
}
