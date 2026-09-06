"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import LookupSelectWithCreate from "@/shared/components/resource-drawer/LookupSelectWithCreate";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { dayjsDatePattern } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { SI_LOOKUP_ADD_CUSTOMER, salesInvoiceSelectFilter } from "../../utils/salesInvoiceDrawerUtils";
import { DownOutlined } from "@ant-design/icons";
import { AutoComplete, Button, Col, ConfigProvider, DatePicker, Form, Input, Popover, Row, Select } from "antd";
import dayjs from "dayjs";

/**
 * @param {HTMLElement | null | undefined} trigger
 */
function addressPopoverGetPopup(trigger) {
  return trigger?.closest?.(".ant-popover") ?? drawerSelectGetPopup(trigger);
}

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   t: (key: string) => string;
 *   title: string;
 *   addressIdName: "billing_address_id" | "shipping_address_id";
 *   addressPrefix: "billing_address" | "shipping_address";
 *   addressLabel: string;
 *   phoneLabel: string;
 *   addressPlaceholder: string;
 *   phonePlaceholder: string;
 *   options: { value: number; label: string; phone?: string; address?: Record<string, unknown> }[];
 *   disabled?: boolean;
 * }} props
 */
function InvoiceAddressInfoPopover({
  form,
  t,
  title,
  addressIdName,
  addressPrefix,
  addressLabel,
  phoneLabel,
  addressPlaceholder,
  phonePlaceholder,
  options,
  disabled = false,
}) {
  const autoCompleteOptions = options.map((row) => ({
    value: row.label,
    label: row.label,
    id: row.value,
    phone: row.phone ?? "",
    address: row.address ?? {},
  }));
  // Address fields live inside the popover and are unregistered until opened;
  // preserve so the trigger summary updates when the customer hydrates addresses.
  const line = Form.useWatch([addressPrefix, "address_line_1"], { form, preserve: true });
  const phone = Form.useWatch([addressPrefix, "phone"], { form, preserve: true });
  const summary = String(line ?? "").trim() || String(phone ?? "").trim();

  return (
    <Form.Item label={<ResourceDrawerFieldLabel text={title} optional />}>
      <Form.Item name={addressIdName} hidden>
        <Input />
      </Form.Item>
      <ConfigProvider componentDisabled={false}>
        <Popover
          trigger={disabled ? [] : "click"}
          placement="bottomLeft"
          arrow={false}
          content={
            <div className="w-[min(100vw-48px,360px)]">
              <Form.Item
                name={[addressPrefix, "address_line_1"]}
                label={<ResourceDrawerFieldLabel text={addressLabel} optional />}
                className="mb-3"
              >
                <AutoComplete
                  allowClear
                  className="w-full"
                  options={autoCompleteOptions}
                  placeholder={addressPlaceholder}
                  filterOption={(input, option) =>
                    String(option?.label ?? "")
                      .toLowerCase()
                      .includes(String(input ?? "").toLowerCase())
                  }
                  getPopupContainer={addressPopoverGetPopup}
                  onSelect={(_value, option) => {
                    const selected = /** @type {{ id?: number; address?: Record<string, unknown> }} */ (option);
                    form.setFieldsValue({
                      [addressIdName]: selected.id,
                      [addressPrefix]: selected.address ?? {},
                    });
                  }}
                  onChange={(text) => {
                    const match = options.find((row) => row.label === String(text ?? "").trim());
                    if (match) return;
                    if (form.getFieldValue(addressIdName) != null) {
                      form.setFieldValue(addressIdName, undefined);
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name={[addressPrefix, "phone"]}
                label={<ResourceDrawerFieldLabel text={phoneLabel} optional />}
                rules={[{ max: 32, message: t("phoneMax") }]}
                className="mb-0"
              >
                <Input allowClear maxLength={32} placeholder={phonePlaceholder} />
              </Form.Item>
            </div>
          }
        >
          <Button
            disabled={disabled}
            className="flex h-auto min-h-8 w-full items-center justify-between py-1 text-start"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-normal">
              {summary || t("addressInfoEmpty")}
            </span>
            <DownOutlined className="ms-2 text-[10px] text-neutral-400" />
          </Button>
        </Popover>
      </ConfigProvider>
    </Form.Item>
  );
}

/**
 * Customer-scoped header value (one assigned record, not a catalog select).
 * @param {{
 *   name: string;
 *   label: import("react").ReactNode;
 *   options: { value: unknown; label: string }[];
 *   placeholder: string;
 *   empty: string;
 *   enabled: boolean;
 *   loading?: boolean;
 * }} props
 */
function InvoiceCustomerBoundValue({ name, label, options, placeholder, empty, enabled, loading = false }) {
  const value = Form.useWatch(name);
  const text = options.find((row) => String(row.value) === String(value ?? ""))?.label ?? "";

  return (
    <Form.Item label={label}>
      <Form.Item name={name} hidden noStyle>
        <Input />
      </Form.Item>
      <Input
        readOnly
        disabled={!enabled}
        value={enabled && !loading ? (text || empty) : ""}
        placeholder={placeholder}
      />
    </Form.Item>
  );
}

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   customerOptions: { value: string; label: string }[];
 *   warehouseOptions: { value: number; label: string }[];
 *   currencyOptions: { value: number; label: string }[];
 *   salesmanOptions: { value: string; label: string }[];
 *   paymentMethodOptions: { value: number; label: string }[];
 *   paymentTermOptions: { value: number; label: string }[];
 *   customersPending: boolean;
 *   warehousesPending: boolean;
 *   currenciesPending: boolean;
 *   salesmenPending: boolean;
 *   paymentMethodsPending: boolean;
 *   paymentTermsPending: boolean;
 *   exchangeRateLocked: boolean;
 *   billingAddressOptions: { value: number; label: string; phone?: string; address?: Record<string, unknown> }[];
 *   shippingAddressOptions: { value: number; label: string; phone?: string; address?: Record<string, unknown> }[];
 *   onOpenCustomerDrawer?: () => void;
 *   onValuesChange?: (changed: Record<string, unknown>, all: Record<string, unknown>) => void;
 *   children?: import("react").ReactNode;
 * }} props
 */
export default function SalesInvoiceDrawerForm({
  form,
  readOnly,
  t,
  customerOptions,
  warehouseOptions,
  currencyOptions,
  salesmanOptions,
  paymentMethodOptions,
  paymentTermOptions,
  customersPending,
  warehousesPending,
  currenciesPending,
  salesmenPending,
  paymentMethodsPending,
  paymentTermsPending,
  exchangeRateLocked,
  billingAddressOptions = [],
  shippingAddressOptions = [],
  onOpenCustomerDrawer,
  onValuesChange,
  children,
}) {
  const customerId = Form.useWatch("customer_id", form);
  const customerReady = customerId != null && customerId !== "";

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      className="item-general-form sales-invoice-form"
      disabled={readOnly}
      onValuesChange={onValuesChange}
    >
      <div className="sales-invoice-header">
        <div className="sales-invoice-header-pane">
          <Row gutter={[12, 8]}>
            <Col xs={24} sm={12} md={8}>
              <LookupSelectWithCreate
                form={form}
                name="customer_id"
                label={<ResourceDrawerFieldLabel text={t("fieldCustomer")} required />}
                rules={[{ required: true, message: t("customerRequired") }]}
                readOnly={readOnly}
                addNewSentinel={SI_LOOKUP_ADD_CUSTOMER}
                addNewLabel={t("fieldCustomerAddNew")}
                onAddNew={onOpenCustomerDrawer}
                options={customerOptions}
                loading={customersPending}
                placeholder={t("customerPlaceholder")}
                getPopupContainer={drawerSelectGetPopup}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="invoice_date"
                label={<ResourceDrawerFieldLabel text={t("fieldInvoiceDate")} required />}
                rules={[{ required: true, message: t("invoiceDateRequired") }]}
                getValueProps={(value) => ({
                  value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
                })}
              >
                <DatePicker className="w-full" format={dayjsDatePattern()} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <InvoiceCustomerBoundValue
                name="salesman_id"
                label={<ResourceDrawerFieldLabel text={t("fieldSalesman")} optional />}
                options={salesmanOptions}
                placeholder={t("salesmanPlaceholder")}
                empty={"\u2014"}
                enabled={customerReady}
                loading={salesmenPending}
              />
            </Col>
          </Row>

          <Row gutter={[12, 8]}>
            <Col xs={24} sm={12} md={8}>
              <InvoiceAddressInfoPopover
                form={form}
                t={t}
                title={t("sectionBillingInfo")}
                addressIdName="billing_address_id"
                addressPrefix="billing_address"
                addressLabel={t("fieldBillingAddress")}
                phoneLabel={t("fieldBillingPhone")}
                addressPlaceholder={t("billingAddressPlaceholder")}
                phonePlaceholder={t("phonePlaceholder")}
                options={billingAddressOptions}
                disabled={!customerReady}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <InvoiceAddressInfoPopover
                form={form}
                t={t}
                title={t("sectionShippingInfo")}
                addressIdName="shipping_address_id"
                addressPrefix="shipping_address"
                addressLabel={t("fieldShippingAddress")}
                phoneLabel={t("fieldShippingPhone")}
                addressPlaceholder={t("shippingAddressPlaceholder")}
                phonePlaceholder={t("phonePlaceholder")}
                options={shippingAddressOptions}
                disabled={!customerReady}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="warehouse_id"
                label={<ResourceDrawerFieldLabel text={t("fieldWarehouse")} required />}
                rules={[{ required: true, message: t("warehouseRequired") }]}
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
          </Row>
        </div>

        <div className="sales-invoice-header-pane">
          <Row gutter={[12, 8]}>
            <Col xs={24} sm={12} md={8}>
              <InvoiceCustomerBoundValue
                name="payment_terms_id"
                label={<ResourceDrawerFieldLabel text={t("fieldPaymentTerms")} optional />}
                options={paymentTermOptions}
                placeholder={t("paymentTermsPlaceholder")}
                empty={"\u2014"}
                enabled={customerReady}
                loading={paymentTermsPending}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="due_on"
                label={<ResourceDrawerFieldLabel text={t("fieldDueOn")} />}
                getValueProps={(value) => ({
                  value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
                })}
              >
                <DatePicker className="w-full" format={dayjsDatePattern()} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="reference_2" label={<ResourceDrawerFieldLabel text={t("fieldReference2")} optional />}>
                <Input maxLength={128} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 8]}>
            <Col xs={24} sm={12} md={8}>
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
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                className="sales-invoice-exchange-rate"
                label={
                  <span className="invisible" aria-hidden="true">
                    <ResourceDrawerFieldLabel text={t("fieldExchangeRate")} required />
                  </span>
                }
              >
                <div className="sales-invoice-exchange-rate-inline">
                  <ResourceDrawerFieldLabel text={t("fieldExchangeRate")} required />
                  <Form.Item
                    name="exchange_rate"
                    noStyle
                    rules={[{ required: true, message: t("exchangeRateRequired") }]}
                  >
                    <TenantNumberInput
                      kind="rate"
                      className="w-full"
                      style={{ width: "100%" }}
                      min={0.000001}
                      readOnly={exchangeRateLocked}
                      aria-label={t("fieldExchangeRate")}
                    />
                  </Form.Item>
                </div>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <InvoiceCustomerBoundValue
                name="payment_method_id"
                label={<ResourceDrawerFieldLabel text={t("fieldPaymentMethod")} optional />}
                options={paymentMethodOptions}
                placeholder={t("paymentMethodPlaceholder")}
                empty={"\u2014"}
                enabled={customerReady}
                loading={paymentMethodsPending}
              />
            </Col>
          </Row>
        </div>
      </div>

      {children}
    </Form>
  );
}
