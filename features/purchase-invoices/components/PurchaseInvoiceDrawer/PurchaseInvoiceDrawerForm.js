"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import LookupSelectWithCreate from "@/shared/components/resource-drawer/LookupSelectWithCreate";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { dayjsDatePattern } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ServerSearchSelect from "@/shared/components/selects/ServerSearchSelect";
import {
  PI_LOOKUP_ADD_SUPPLIER,
  purchaseInvoiceSelectFilter,
} from "../../utils/purchaseInvoiceDrawerUtils";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers/queries/suppliersQueryKeys";
import {
  fetchPurchaseInvoiceGrnSelectorPage,
  fetchPurchaseInvoicePoSelectorPage,
  fetchPurchaseInvoiceSupplierSelectorPage,
  PURCHASE_INVOICE_SUPPLIER_RECENT_KIND,
} from "../../api/purchaseInvoiceSelectors.api";
import { PiFocusStop } from "./purchaseInvoiceDrawerKeyboard";
import { Col, DatePicker, Form, Input, Row, Select } from "antd";
import dayjs from "dayjs";
import { useCallback, useMemo } from "react";

/**
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
function InvoiceSupplierBoundValue({ name, label, options, placeholder, empty, enabled, loading = false }) {
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
 *   supplierSeedOptions?: { value: unknown; label: string }[];
 *   grnSeedOptions?: { value: unknown; label: string }[];
 *   poSeedOptions?: { value: unknown; label: string }[];
 *   warehouseOptions: { value: number; label: string }[];
 *   currencyOptions: { value: number; label: string }[];
 *   paymentMethodOptions: { value: number; label: string }[];
 *   paymentTermOptions: { value: number; label: string }[];
 *   warehousesPending: boolean;
 *   currenciesPending: boolean;
 *   paymentMethodsPending: boolean;
 *   paymentTermsPending: boolean;
 *   exchangeRateLocked: boolean;
 *   supplierLocked?: boolean;
 *   warehouseLocked?: boolean;
 *   grnDisabled?: boolean;
 *   poDisabled?: boolean;
 *   invoiceId?: string | null;
 *   onOpenSupplierDrawer?: () => void;
 *   onValuesChange?: (changed: Record<string, unknown>, all: Record<string, unknown>) => void;
 *   keyboardRootRef?: import("react").Ref<HTMLDivElement>;
 *   children?: import("react").ReactNode;
 * }} props
 */
export default function PurchaseInvoiceDrawerForm({
  form,
  readOnly,
  t,
  supplierSeedOptions = [],
  grnSeedOptions = [],
  poSeedOptions = [],
  warehouseOptions,
  currencyOptions,
  paymentMethodOptions,
  paymentTermOptions,
  warehousesPending,
  currenciesPending,
  paymentMethodsPending,
  paymentTermsPending,
  exchangeRateLocked,
  supplierLocked = false,
  warehouseLocked = false,
  grnDisabled = false,
  poDisabled = false,
  invoiceId = null,
  onOpenSupplierDrawer,
  onValuesChange,
  keyboardRootRef,
  children,
}) {
  const supplierId = Form.useWatch("supplier_id", form);
  const supplierReady = supplierId != null && supplierId !== "";
  const goodsReceiptId = Form.useWatch("goods_receipt_id", form);
  const purchaseOrderId = Form.useWatch("purchase_order_id", form);

  const fetchGrnPage = useCallback(
    (args) =>
      fetchPurchaseInvoiceGrnSelectorPage({
        ...args,
        supplierId: supplierId != null ? String(supplierId) : null,
        invoiceId,
      }),
    [invoiceId, supplierId],
  );

  const grnQueryKey = useMemo(
    () => [...SUPPLIERS_LIST_QUERY_KEY, "purchase-invoice-grn", supplierId ?? "none", invoiceId ?? "new"],
    [invoiceId, supplierId],
  );

  const fetchPoPage = useCallback(
    (args) =>
      fetchPurchaseInvoicePoSelectorPage({
        ...args,
        supplierId: supplierId != null ? String(supplierId) : null,
        invoiceId,
      }),
    [invoiceId, supplierId],
  );

  const poQueryKey = useMemo(
    () => [...SUPPLIERS_LIST_QUERY_KEY, "purchase-invoice-po", supplierId ?? "none", invoiceId ?? "new"],
    [invoiceId, supplierId],
  );

  return (
    <div ref={keyboardRootRef} className="sales-invoice-keyboard-root">
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
                <PiFocusStop field="supplier">
                  <LookupSelectWithCreate
                    form={form}
                    name="supplier_id"
                    label={<ResourceDrawerFieldLabel text={t("fieldSupplier")} required />}
                    rules={[{ required: true, message: t("supplierRequired") }]}
                    readOnly={readOnly || supplierLocked}
                    addNewSentinel={PI_LOOKUP_ADD_SUPPLIER}
                    addNewLabel={t("fieldSupplierAddNew")}
                    onAddNew={onOpenSupplierDrawer}
                    fetchPage={fetchPurchaseInvoiceSupplierSelectorPage}
                    queryKey={SUPPLIERS_LIST_QUERY_KEY}
                    seedOptions={supplierSeedOptions}
                    recentKind={PURCHASE_INVOICE_SUPPLIER_RECENT_KIND}
                    recentLabel={t("selectorRecent")}
                    clearRecentLabel={t("selectorClearRecent")}
                    resultsLabel={t("selectorResults")}
                    loadMoreLabel={t("selectorLoadMore")}
                    emptyLabel={t("selectorEmpty")}
                    typeToSearchLabel={t("selectorTypeToSearch")}
                    placeholder={t("supplierPlaceholder")}
                    getPopupContainer={drawerSelectGetPopup}
                  />
                </PiFocusStop>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="invoice_date">
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
                </PiFocusStop>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="goods_receipt">
                  <Form.Item
                    label={<ResourceDrawerFieldLabel text={t("fieldGrn")} optional />}
                    tooltip={
                      !supplierReady
                        ? t("grnRequiresSupplier")
                        : purchaseOrderId
                          ? t("grnBlockedByPo")
                          : undefined
                    }
                  >
                    <ServerSearchSelect
                      allowClear
                      className="w-full"
                      placeholder={t("grnPlaceholder")}
                      value={
                        goodsReceiptId != null && goodsReceiptId !== ""
                          ? String(goodsReceiptId)
                          : undefined
                      }
                      disabled={readOnly || grnDisabled || !supplierReady || Boolean(purchaseOrderId)}
                      fetchPage={fetchGrnPage}
                      queryKey={grnQueryKey}
                      seedOptions={grnSeedOptions}
                      resultsLabel={t("selectorResults")}
                      loadMoreLabel={t("selectorLoadMore")}
                      emptyLabel={t("selectorEmpty")}
                      typeToSearchLabel={t("selectorTypeToSearch")}
                      getPopupContainer={drawerSelectGetPopup}
                      onChange={(value) => {
                        form.setFieldValue("goods_receipt_id", value ?? undefined);
                      }}
                    />
                    <Form.Item name="goods_receipt_id" hidden>
                      <Input tabIndex={-1} />
                    </Form.Item>
                  </Form.Item>
                </PiFocusStop>
              </Col>
            </Row>

            <Row gutter={[12, 8]}>
              
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="payment_terms">
                  <InvoiceSupplierBoundValue
                    name="payment_terms_id"
                    label={<ResourceDrawerFieldLabel text={t("fieldPaymentTerms")} optional />}
                    options={paymentTermOptions}
                    placeholder={t("paymentTermsPlaceholder")}
                    empty={"\u2014"}
                    enabled={supplierReady}
                    loading={paymentTermsPending}
                  />
                </PiFocusStop>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="due_on">
                  <Form.Item
                    name="due_on"
                    label={<ResourceDrawerFieldLabel text={t("fieldDueOn")} />}
                    getValueProps={(value) => ({
                      value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
                    })}
                  >
                    <DatePicker className="w-full" format={dayjsDatePattern()} allowClear />
                  </Form.Item>
                </PiFocusStop>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="purchase_order">
                  <Form.Item
                    label={<ResourceDrawerFieldLabel text={t("fieldPurchaseOrder")} optional />}
                    tooltip={
                      !supplierReady
                        ? t("poRequiresSupplier")
                        : goodsReceiptId
                          ? t("poBlockedByGrn")
                          : undefined
                    }
                  >
                    <ServerSearchSelect
                      allowClear
                      className="w-full"
                      placeholder={t("poPlaceholder")}
                      value={
                        purchaseOrderId != null && purchaseOrderId !== ""
                          ? String(purchaseOrderId)
                          : undefined
                      }
                      disabled={readOnly || poDisabled || !supplierReady || Boolean(goodsReceiptId)}
                      fetchPage={fetchPoPage}
                      queryKey={poQueryKey}
                      seedOptions={poSeedOptions}
                      resultsLabel={t("selectorResults")}
                      loadMoreLabel={t("selectorLoadMore")}
                      emptyLabel={t("selectorEmpty")}
                      typeToSearchLabel={t("selectorTypeToSearch")}
                      getPopupContainer={drawerSelectGetPopup}
                      onChange={(value) => {
                        form.setFieldValue("purchase_order_id", value ?? undefined);
                      }}
                    />
                    <Form.Item name="purchase_order_id" hidden>
                      <Input tabIndex={-1} />
                    </Form.Item>
                  </Form.Item>
                </PiFocusStop>
              </Col>
            </Row>
          </div>

          <div className="sales-invoice-header-pane">
            <Row gutter={[12, 8]}>
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="reference_2">
                  <Form.Item name="reference_2" label={<ResourceDrawerFieldLabel text={t("fieldReference2")} optional />}>
                    <Input maxLength={128} />
                  </Form.Item>
                </PiFocusStop>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="payment_method">
                  <InvoiceSupplierBoundValue
                    name="payment_method_id"
                    label={<ResourceDrawerFieldLabel text={t("fieldPaymentMethod")} optional />}
                    options={paymentMethodOptions}
                    placeholder={t("paymentMethodPlaceholder")}
                    empty={"\u2014"}
                    enabled={supplierReady}
                    loading={paymentMethodsPending}
                  />
                </PiFocusStop>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="warehouse">
                  <Form.Item
                    name="warehouse_id"
                    label={<ResourceDrawerFieldLabel text={t("fieldWarehouse")} required />}
                    rules={[{ required: true, message: t("warehouseRequired") }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      filterOption={purchaseInvoiceSelectFilter}
                      className="w-full"
                      placeholder={t("warehousePlaceholder")}
                      options={warehouseOptions}
                      loading={warehousesPending}
                      disabled={warehouseLocked}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                </PiFocusStop>
              </Col>
            </Row>

            <Row gutter={[12, 8]}>
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="currency">
                  <Form.Item name="currency_id" label={<ResourceDrawerFieldLabel text={t("fieldCurrency")} />}>
                    <Select
                      showSearch
                      filterOption={purchaseInvoiceSelectFilter}
                      className="w-full"
                      placeholder={t("currencyPlaceholder")}
                      options={currencyOptions}
                      loading={currenciesPending}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                </PiFocusStop>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="exchange_rate">
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
                </PiFocusStop>
              </Col>
            </Row>
          </div>
        </div>

        {children}
      </Form>
    </div>
  );
}
