"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { getPurchaseOrderStatusLabel, isPurchaseOrderPrintable, purchaseOrderStatusTagColor } from "../../utils/purchaseOrderStatuses";
import { dayjsDatePattern, formatTenantDateTime } from "@/lib/tenant-format";
import { Col, DatePicker, Form, Input, Row, Select, Tag } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   supplierOptions: { value: string; label: string }[];
 *   warehouseOptions: { value: number; label: string }[];
 *   suppliersPending: boolean;
 *   warehousesPending: boolean;
 *   poNumber?: string | null;
 *   poStatus?: string | null;
 *   sentAt?: string | null;
 *   showMeta?: boolean;
 *   onValuesChange?: (changed: Record<string, unknown>) => void;
 * }} props
 */
export default function PurchaseOrderDrawerForm({
  form,
  readOnly,
  t,
  supplierOptions,
  warehouseOptions,
  suppliersPending,
  warehousesPending,
  poNumber = null,
  poStatus = null,
  sentAt = null,
  showMeta = false,
  onValuesChange,
}) {
  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      className="item-general-form"
      disabled={readOnly}
      onValuesChange={onValuesChange}
    >
      {showMeta ? (
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item label={<ResourceDrawerFieldLabel text={t("poFieldNumber")} />}>
              <Input value={poNumber ?? "\u2014"} readOnly disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label={<ResourceDrawerFieldLabel text={t("poFieldStatus")} />}>
              {poStatus ? (
                <Tag color={purchaseOrderStatusTagColor(poStatus)}>
                  {getPurchaseOrderStatusLabel(t, poStatus)}
                </Tag>
              ) : (
                "\u2014"
              )}
            </Form.Item>
          </Col>
        </Row>
      ) : null}

      {showMeta && isPurchaseOrderPrintable(poStatus) ? (
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item label={<ResourceDrawerFieldLabel text={t("poFieldSentAt")} />}>
              <Input value={formatTenantDateTime(sentAt) || t("poNotSentYet")} readOnly disabled />
            </Form.Item>
          </Col>
        </Row>
      ) : null}

      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="supplier_id"
            label={<ResourceDrawerFieldLabel text={t("poFieldSupplier")} required />}
            rules={[{ required: true, message: t("poSupplierRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder={t("poSupplierPlaceholder")}
              options={supplierOptions}
              loading={suppliersPending}
              getPopupContainer={drawerSelectGetPopup}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="warehouse_id"
            label={<ResourceDrawerFieldLabel text={t("poFieldWarehouse")} required />}
            rules={[{ required: true, message: t("poWarehouseRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder={t("poWarehousePlaceholder")}
              options={warehouseOptions}
              loading={warehousesPending}
              getPopupContainer={drawerSelectGetPopup}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="order_date"
            label={<ResourceDrawerFieldLabel text={t("poFieldOrderDate")} required />}
            rules={[{ required: true, message: t("poOrderDateRequired") }]}
          >
            <DatePicker className="w-full" format={dayjsDatePattern()} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="expected_date" label={<ResourceDrawerFieldLabel text={t("poFieldExpectedDate")} />}>
            <DatePicker className="w-full" format={dayjsDatePattern()} allowClear />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("poFieldNotes")} />}>
        <Input.TextArea rows={2} maxLength={2000} showCount={!readOnly} />
      </Form.Item>
    </Form>
  );
}
