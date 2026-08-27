"use client";

import { dayjsDatePattern } from "@/lib/tenant-format";
import { Col, DatePicker, Form, Input, Row, Select } from "antd";
import dayjs from "dayjs";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   createMode: boolean;
 *   hasPurchaseOrder: boolean;
 *   t: (key: string) => string;
 *   purchaseOrderOptions: { value: unknown; label: string }[];
 *   purchaseOrdersPending: boolean;
 *   warehouseOptions: { value: unknown; label: string }[];
 *   warehousesPending: boolean;
 *   supplierOptions: { value: unknown; label: string }[];
 *   suppliersPending: boolean;
 *   grnNumber?: string | null;
 *   warehouseName?: string | null;
 *   supplierName?: string | null;
 *   purchaseOrderNumber?: string | null;
 *   onPurchaseOrderChange?: (value: unknown) => void;
 * }} props
 */
export default function GoodsReceiptDrawerForm({
  form,
  readOnly,
  createMode,
  hasPurchaseOrder,
  t,
  purchaseOrderOptions,
  purchaseOrdersPending,
  warehouseOptions,
  warehousesPending,
  supplierOptions,
  suppliersPending,
  grnNumber,
  warehouseName,
  supplierName,
  purchaseOrderNumber,
  onPurchaseOrderChange,
}) {
  const showPoSelect = createMode;
  const showPartySelects = !readOnly && !hasPurchaseOrder;
  const showPartyNames = Boolean(warehouseName || supplierName) && (readOnly || hasPurchaseOrder);

  return (
    <Form form={form} layout="vertical" disabled={readOnly}>
      {!createMode && grnNumber ? (
        <Form.Item label={t("grnFieldNumber")}>
          <Input value={grnNumber} disabled />
        </Form.Item>
      ) : null}

      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          {showPoSelect ? (
            <Form.Item name="purchase_order_id" label={t("grnFieldPurchaseOrder")}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={purchaseOrderOptions}
                loading={purchaseOrdersPending}
                placeholder={t("grnPurchaseOrderPlaceholder")}
                onChange={onPurchaseOrderChange}
              />
            </Form.Item>
          ) : (
            <Form.Item label={t("grnFieldPurchaseOrder")}>
              <Input value={purchaseOrderNumber || "\u2014"} disabled />
            </Form.Item>
          )}
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="received_date"
            label={t("grnFieldReceivedDate")}
            getValueProps={(value) => ({
              value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
            })}
          >
            <DatePicker className="w-full" format={dayjsDatePattern()} />
          </Form.Item>
        </Col>
        {showPartyNames && warehouseName ? (
          <Col xs={24} md={12}>
            <Form.Item label={t("colWarehouse")}>
              <Input value={warehouseName} disabled />
            </Form.Item>
          </Col>
        ) : null}
        {showPartyNames && supplierName ? (
          <Col xs={24} md={12}>
            <Form.Item label={t("colSupplier")}>
              <Input value={supplierName} disabled />
            </Form.Item>
          </Col>
        ) : null}
        {showPartySelects ? (
          <>
            <Col xs={24} md={12}>
              <Form.Item
                name="warehouse_id"
                label={t("grnFieldWarehouse")}
                rules={[{ required: true, message: t("grnWarehouseRequired") }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={warehouseOptions}
                  loading={warehousesPending}
                  placeholder={t("grnWarehousePlaceholder")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="supplier_id" label={t("grnFieldSupplier")}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={supplierOptions}
                  loading={suppliersPending}
                  placeholder={t("grnSupplierPlaceholder")}
                />
              </Form.Item>
            </Col>
          </>
        ) : null}
      </Row>

      <Form.Item name="notes" label={t("grnFieldNotes")}>
        <Input.TextArea rows={2} maxLength={2000} showCount />
      </Form.Item>
    </Form>
  );
}
