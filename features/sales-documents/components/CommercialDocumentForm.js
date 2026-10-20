"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import LookupSelectWithCreate from "@/shared/components/resource-drawer/LookupSelectWithCreate";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { salesInvoiceSelectFilter } from "@/features/sales-invoices/utils/salesInvoiceDrawerUtils";
import {
  SALES_INVOICE_CUSTOMER_RECENT_KIND,
  SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  fetchSalesInvoiceCustomerSelectorPage,
} from "@/features/sales-invoices/api/salesInvoiceSelectors.api";
import { CUSTOMERS_LIST_QUERY_KEY } from "@/features/customers";
import { Col, DatePicker, Form, Input, Row, Select } from "antd";
import dayjs from "dayjs";

/**
 * Customer-scoped header value, same as the sales invoice drawer.
 * @param {{
 *   name: string;
 *   label: import("react").ReactNode;
 *   options: { value: unknown; label: string }[];
 *   placeholder: string;
 *   enabled: boolean;
 *   loading?: boolean;
 * }} props
 */
function CustomerBoundValue({ name, label, options, placeholder, enabled, loading = false }) {
  const value = Form.useWatch(name);
  const text = options.find((row) => String(row.value) === String(value ?? ""))?.label ?? "";

  return (
    <Form.Item label={label}>
      <Form.Item name={name} hidden noStyle>
        <Input tabIndex={-1} />
      </Form.Item>
      <Input
        readOnly
        disabled={!enabled}
        value={enabled && !loading ? text || "\u2014" : ""}
        placeholder={placeholder}
      />
    </Form.Item>
  );
}

/**
 * @param {unknown} value
 */
function dateValueProps(value) {
  return { value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined };
}

/**
 * @param {{
 *   t: (key: string) => string;
 *   readOnly: boolean;
 *   dateField: string;
 *   extraDateField: string | null;
 *   includeWarehouse: boolean;
 *   currencyLocked: boolean;
 *   customerReady: boolean;
 *   customerSeedOptions: Record<string, unknown>[];
 *   currencyOptions: { value: unknown; label: string }[];
 *   warehouseOptions: { value: unknown; label: string }[];
 *   salesmanOptions: { value: unknown; label: string }[];
 *   paymentTermOptions: { value: unknown; label: string }[];
 *   warehousesPending?: boolean;
 *   currenciesPending?: boolean;
 *   salesmenPending?: boolean;
 *   paymentTermsPending?: boolean;
 *   form: import("antd").FormInstance;
 * }} props
 */
export default function CommercialDocumentForm({
  t,
  form,
  readOnly,
  dateField,
  extraDateField,
  includeWarehouse,
  currencyLocked,
  customerReady,
  customerSeedOptions,
  currencyOptions,
  warehouseOptions,
  salesmanOptions,
  paymentTermOptions,
  warehousesPending = false,
  currenciesPending = false,
  salesmenPending = false,
  paymentTermsPending = false,
}) {
  return (
    <div className="sales-invoice-header">
      <div className="sales-invoice-header-pane">
        <Row gutter={[12, 8]}>
          <Col xs={24} sm={12} md={8}>
            <LookupSelectWithCreate
              form={form}
              name="customer_id"
              label={<ResourceDrawerFieldLabel text={t("fieldCustomer")} required />}
              rules={[{ required: true, message: t("fieldCustomerRequired") }]}
              readOnly={readOnly}
              fetchPage={fetchSalesInvoiceCustomerSelectorPage}
              queryKey={CUSTOMERS_LIST_QUERY_KEY}
              queryParams={SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS}
              recentKind={SALES_INVOICE_CUSTOMER_RECENT_KIND}
              seedOptions={customerSeedOptions}
              addNewSentinel={null}
              recentLabel={t("selectorRecent")}
              clearRecentLabel={t("selectorClearRecent")}
              resultsLabel={t("selectorResults")}
              loadMoreLabel={t("selectorLoadMore")}
              emptyLabel={t("selectorEmpty")}
              typeToSearchLabel={t("selectorTypeToSearch")}
              placeholder={t("customerPlaceholder")}
              getPopupContainer={drawerSelectGetPopup}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name={dateField}
              label={<ResourceDrawerFieldLabel text={t("fieldDate")} required />}
              rules={[{ required: true }]}
              getValueProps={dateValueProps}
            >
              <DatePicker className="w-full" format={dayjsDatePattern()} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <CustomerBoundValue
              name="salesman_id"
              label={<ResourceDrawerFieldLabel text={t("fieldSalesman")} optional />}
              options={salesmanOptions}
              placeholder={t("salesmanPlaceholder")}
              enabled={customerReady}
              loading={salesmenPending}
            />
          </Col>
        </Row>

        <Row gutter={[12, 8]} className="mt-2">
          <Col xs={24} sm={12} md={8}>
            <CustomerBoundValue
              name="payment_terms_id"
              label={<ResourceDrawerFieldLabel text={t("fieldPaymentTerm")} optional />}
              options={paymentTermOptions}
              placeholder={t("paymentTermsPlaceholder")}
              enabled={customerReady}
              loading={paymentTermsPending}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            {extraDateField ? (
              <Form.Item
                name={extraDateField}
                label={<ResourceDrawerFieldLabel text={t("fieldExtraDate")} optional />}
                getValueProps={dateValueProps}
              >
                <DatePicker className="w-full" format={dayjsDatePattern()} allowClear />
              </Form.Item>
            ) : null}
          </Col>
          {includeWarehouse ? (
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="warehouse_id"
                label={<ResourceDrawerFieldLabel text={t("fieldWarehouse")} required />}
                rules={[{ required: true, message: t("fieldWarehouseRequired") }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  filterOption={salesInvoiceSelectFilter}
                  className="w-full"
                  placeholder={t("warehousePlaceholder")}
                  options={warehouseOptions}
                  loading={warehousesPending}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </Form.Item>
            </Col>
          ) : null}
        </Row>
      </div>

      <div className="sales-invoice-header-pane">
        <div className="payment-document-side-fields credit-document-header-fields">
          <Form.Item name="currency_id" label={<ResourceDrawerFieldLabel text={t("fieldCurrency")} />}>
            <Select
              showSearch
              filterOption={salesInvoiceSelectFilter}
              className="w-full"
              placeholder={t("currencyPlaceholder")}
              options={currencyOptions}
              loading={currenciesPending}
              getPopupContainer={drawerSelectGetPopup}
            />
          </Form.Item>
          <Form.Item
            name="notes"
            className="payment-document-notes-span"
            label={<ResourceDrawerFieldLabel text={t("fieldNotes")} />}
          >
            <Input.TextArea maxLength={2000} />
          </Form.Item>
          <Form.Item
            name="exchange_rate"
            label={<ResourceDrawerFieldLabel text={t("fieldExchangeRate")} required />}
            rules={[{ required: true }]}
          >
            <TenantNumberInput
              kind="rate"
              className="w-full"
              style={{ width: "100%" }}
              min={0.000000000001}
              readOnly={currencyLocked}
              aria-label={t("fieldExchangeRate")}
            />
          </Form.Item>
        </div>
      </div>
    </div>
  );
}
