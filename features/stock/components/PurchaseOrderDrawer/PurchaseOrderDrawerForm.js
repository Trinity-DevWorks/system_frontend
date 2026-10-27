"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { dayjsDatePattern } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { Col, DatePicker, Form, Input, Row, Select, Tooltip } from "antd";

/**
 * Purchase order header, laid out like the sales order header:
 * document fields on the left pane, currency / notes / rate on the right pane.
 *
 * Rendered inside the drawer's `<Form>`.
 *
 * @param {{
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   supplierOptions: { value: string; label: string }[];
 *   warehouseOptions: { value: number; label: string }[];
 *   suppliersPending: boolean;
 *   warehousesPending: boolean;
 *   currencyOptions: { value: number; label: string }[];
 *   currenciesPending: boolean;
 *   exchangeRateLocked: boolean;
 *   exchangeRateHelp: string;
 * }} props
 */
export default function PurchaseOrderDrawerForm({
  readOnly,
  t,
  supplierOptions,
  warehouseOptions,
  suppliersPending,
  warehousesPending,
  currencyOptions,
  currenciesPending,
  exchangeRateLocked,
  exchangeRateHelp,
}) {
  return (
    <div className="sales-invoice-header">
      <div className="sales-invoice-header-pane">
        <Row gutter={[12, 8]}>
          <Col xs={24} sm={12} md={8}>
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
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="order_date"
              label={<ResourceDrawerFieldLabel text={t("poFieldOrderDate")} required />}
              rules={[{ required: true, message: t("poOrderDateRequired") }]}
            >
              <DatePicker className="w-full" format={dayjsDatePattern()} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
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

        <Row gutter={[12, 8]} className="mt-2">
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="expected_date"
              label={<ResourceDrawerFieldLabel text={t("poFieldExpectedDate")} optional />}
            >
              <DatePicker className="w-full" format={dayjsDatePattern()} allowClear />
            </Form.Item>
          </Col>
        </Row>
      </div>

      <div className="sales-invoice-header-pane">
        <div className="payment-document-side-fields credit-document-header-fields">
          <Form.Item name="currency_id" label={<ResourceDrawerFieldLabel text={t("poFieldCurrency")} />}>
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder={t("poCurrencyPlaceholder")}
              options={currencyOptions}
              loading={currenciesPending}
              getPopupContainer={drawerSelectGetPopup}
            />
          </Form.Item>
          <Form.Item
            name="notes"
            className="payment-document-notes-span"
            label={<ResourceDrawerFieldLabel text={t("poFieldNotes")} />}
          >
            <Input.TextArea maxLength={2000} showCount={!readOnly} />
          </Form.Item>
          <Tooltip title={exchangeRateHelp}>
            <Form.Item
              name="exchange_rate"
              label={<ResourceDrawerFieldLabel text={t("poFieldExchangeRate")} required />}
              rules={[{ required: true, message: t("poExchangeRateRequired") }]}
            >
              <TenantNumberInput
                kind="rate"
                className="w-full"
                style={{ width: "100%" }}
                min={0.000000000001}
                readOnly={exchangeRateLocked}
                aria-label={t("poFieldExchangeRate")}
              />
            </Form.Item>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
