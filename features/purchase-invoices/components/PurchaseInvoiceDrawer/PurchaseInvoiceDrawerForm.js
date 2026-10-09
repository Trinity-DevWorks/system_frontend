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
import { fetchLinkedPurchaseProof, importLinkedPurchaseProof } from "../../api/purchaseInvoices.api";
import { getPurchaseInvoiceProofStatusLabel } from "@/features/sales-invoices/utils/invoiceProofStatuses";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { PiFocusStop } from "./purchaseInvoiceDrawerKeyboard";
import { TamperBesideLabel } from "@/features/sales-invoices/components/InvoiceTamper/InvoiceTamperMark";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Col, DatePicker, Form, Input, Row, Select, Switch, Tooltip, Typography, Upload } from "antd";
import dayjs from "dayjs";
import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

const LINKED_PROOF_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} address
 */
function shortWallet(address) {
  const raw = String(address ?? "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return raw || "\u2014";
  return `${raw.slice(0, 6)}…${raw.slice(-4)}`;
}

/**
 * @param {{
 *   proofId: string;
 *   t: (key: string) => string;
 *   tSales: (key: string) => string;
 * }} props
 */
function LinkedProofPreview({ proofId, t, tSales }) {
  const tApiErrors = useTranslations("ApiErrors");
  const valid = LINKED_PROOF_ID_PATTERN.test(proofId.trim());
  const query = useQuery({
    queryKey: ["tenant", "purchase-invoices", "linked-proof", proofId.trim()],
    queryFn: () => fetchLinkedPurchaseProof(proofId.trim()),
    enabled: valid,
    retry: false,
    staleTime: 15_000,
  });

  if (!valid) return null;
  if (query.isPending) {
    return <Typography.Text type="secondary">{t("linkedProofChecking")}</Typography.Text>;
  }
  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title={getLocalizedApiErrorMessage(tApiErrors, query.error) || t("linkedProofInvalid")}
      />
    );
  }

  const preview = query.data && typeof query.data === "object" ? query.data : null;
  if (!preview) return null;
  const status = typeof preview.status === "string" ? preview.status : "";

  return (
    <div className="purchase-invoice-linked-proof-preview">
      <div className="purchase-invoice-linked-proof-facts">
        <div className="purchase-invoice-linked-proof-fact">
          <span className="purchase-invoice-linked-proof-fact-label">{t("linkedProofSupplier")}</span>
          <span className="purchase-invoice-linked-proof-fact-value" dir="ltr">
            {shortWallet(preview.supplier_wallet)}
          </span>
        </div>
        <div className="purchase-invoice-linked-proof-fact">
          <span className="purchase-invoice-linked-proof-fact-label">{t("linkedProofBuyer")}</span>
          <span className="purchase-invoice-linked-proof-fact-value" dir="ltr">
            {shortWallet(preview.buyer_wallet)}
          </span>
        </div>
        <div className="purchase-invoice-linked-proof-fact">
          <span className="purchase-invoice-linked-proof-fact-label">{t("linkedProofStatus")}</span>
          <span className="purchase-invoice-linked-proof-fact-value">
            {getPurchaseInvoiceProofStatusLabel(t, tSales, status)}
          </span>
        </div>
      </div>
      {preview.company_wallet_set === false ? (
        <Alert type="warning" showIcon title={t("linkedProofNoCompanyWallet")} />
      ) : null}
      {preview.buyer_matches_company === false && preview.company_wallet_set !== false ? (
        <Alert type="warning" showIcon title={t("linkedProofBuyerMismatch")} />
      ) : null}
    </div>
  );
}

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
        disabled={!enabled ? true : undefined}
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
 *   exchangeRateHelp?: string;
 *   supplierLocked?: boolean;
 *   warehouseLocked?: boolean;
 *   grnDisabled?: boolean;
 *   poDisabled?: boolean;
 *   invoiceId?: string | null;
 *   showLinkedProof?: boolean;
 *   tSales?: (key: string) => string;
 *   onLinkedProofImported?: (result: Record<string, unknown>, disclosure: Record<string, unknown>) => void;
 *   onLinkedProofCleared?: () => void;
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
  exchangeRateHelp,
  supplierLocked = false,
  warehouseLocked = false,
  grnDisabled = false,
  poDisabled = false,
  invoiceId = null,
  showLinkedProof = false,
  tSales = (key) => key,
  onLinkedProofImported,
  onLinkedProofCleared,
  onOpenSupplierDrawer,
  onValuesChange,
  keyboardRootRef,
  children,
}) {
  const supplierId = Form.useWatch("supplier_id", form);
  const supplierReady = supplierId != null && supplierId !== "";
  const goodsReceiptId = Form.useWatch("goods_receipt_id", form);
  const purchaseOrderId = Form.useWatch("purchase_order_id", form);
  const { message } = App.useApp();
  const tApiErrors = useTranslations("ApiErrors");
  const useLinkedProof = Form.useWatch("use_linked_proof", form);
  const linkedProofId = Form.useWatch("linked_proof_id", form);
  const sealLocked = Boolean(useLinkedProof && LINKED_PROOF_ID_PATTERN.test(String(linkedProofId ?? "").trim()));

  const importDisclosureFile = useCallback(
    async (file) => {
      try {
        const parsed = JSON.parse(await file.text());
        const result = await importLinkedPurchaseProof(parsed);
        if (!result || typeof result !== "object") throw new Error(t("linkedProofInvalid"));
        onLinkedProofImported?.(/** @type {Record<string, unknown>} */ (result), parsed);
      } catch (error) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, error) || t("linkedProofInvalid"));
      }
      return false;
    },
    [message, onLinkedProofImported, t, tApiErrors],
  );

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
                    label={
                      <TamperBesideLabel path="supplier">
                        <ResourceDrawerFieldLabel text={t("fieldSupplier")} required />
                      </TamperBesideLabel>
                    }
                    rules={[{ required: true, message: t("supplierRequired") }]}
                    readOnly={readOnly || supplierLocked || sealLocked}
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
                    label={
                      <TamperBesideLabel path="invoice_date">
                        <ResourceDrawerFieldLabel text={t("fieldInvoiceDate")} required />
                      </TamperBesideLabel>
                    }
                    rules={[{ required: true, message: t("invoiceDateRequired") }]}
                    getValueProps={(value) => ({
                      value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
                    })}
                  >
                    <DatePicker className="w-full" format={dayjsDatePattern()} disabled={readOnly || sealLocked} />
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
                      disabled={readOnly || sealLocked || grnDisabled || !supplierReady || Boolean(purchaseOrderId)}
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
                    label={
                      <TamperBesideLabel path="payment_terms">
                        <ResourceDrawerFieldLabel text={t("fieldPaymentTerms")} optional />
                      </TamperBesideLabel>
                    }
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
                    label={
                      <TamperBesideLabel path="due_on">
                        <ResourceDrawerFieldLabel text={t("fieldDueOn")} />
                      </TamperBesideLabel>
                    }
                    getValueProps={(value) => ({
                      value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
                    })}
                  >
                    <DatePicker className="w-full" format={dayjsDatePattern()} allowClear disabled={readOnly || sealLocked} />
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
                      disabled={readOnly || sealLocked || poDisabled || !supplierReady || Boolean(goodsReceiptId)}
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
                    label={
                      <TamperBesideLabel path="payment_method">
                        <ResourceDrawerFieldLabel text={t("fieldPaymentMethod")} optional />
                      </TamperBesideLabel>
                    }
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
                    label={
                      <TamperBesideLabel path="warehouse">
                        <ResourceDrawerFieldLabel text={t("fieldWarehouse")} required />
                      </TamperBesideLabel>
                    }
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
                      disabled={readOnly || warehouseLocked}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                </PiFocusStop>
              </Col>
            </Row>

            <Row gutter={[12, 8]}>
              <Col xs={24} sm={12} md={8}>
                <PiFocusStop field="currency">
                  <Form.Item
                    name="currency_id"
                    label={
                      <TamperBesideLabel path="currency_code">
                        <ResourceDrawerFieldLabel text={t("fieldCurrency")} />
                      </TamperBesideLabel>
                    }
                  >
                    <Select
                      showSearch
                      filterOption={purchaseInvoiceSelectFilter}
                      className="w-full"
                      placeholder={t("currencyPlaceholder")}
                      options={currencyOptions}
                      loading={currenciesPending}
                      disabled={readOnly || sealLocked}
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
                      <TamperBesideLabel path="exchange_rate">
                        <ResourceDrawerFieldLabel text={t("fieldExchangeRate")} required />
                      </TamperBesideLabel>
                      <Tooltip title={exchangeRateHelp}>
                        <div className="sales-invoice-exchange-rate-input">
                          <Form.Item
                            name="exchange_rate"
                            noStyle
                            rules={[{ required: true, message: t("exchangeRateRequired") }]}
                          >
                            <TenantNumberInput
                              kind="rate"
                              className="w-full"
                              style={{ width: "100%" }}
                              min={0.000000000001}
                              readOnly={exchangeRateLocked || sealLocked}
                              aria-label={t("fieldExchangeRate")}
                            />
                          </Form.Item>
                        </div>
                      </Tooltip>
                    </div>
                  </Form.Item>
                </PiFocusStop>
              </Col>
            </Row>
          </div>

          {showLinkedProof ? (
            <div className="purchase-invoice-linked-proof">
              <div className="purchase-invoice-linked-proof-head">
                <div className="min-w-0">
                  <div className="purchase-invoice-linked-proof-title">{t("linkedProofToggle")}</div>
                  <div className="purchase-invoice-linked-proof-hint">{t("linkedProofHint")}</div>
                </div>
                <Form.Item name="use_linked_proof" valuePropName="checked" noStyle>
                  <Switch
                    disabled={readOnly}
                    aria-label={t("linkedProofToggle")}
                    onChange={(checked) => {
                      if (!checked) {
                        form.setFieldValue("linked_proof_id", "");
                        onLinkedProofCleared?.();
                      }
                    }}
                  />
                </Form.Item>
              </div>
              {useLinkedProof ? (
                <div className="purchase-invoice-linked-proof-body">
                  <Form.Item name="linked_proof_id" hidden>
                    <Input />
                  </Form.Item>
                  {!readOnly && !sealLocked ? (
                    <Upload.Dragger
                      className="purchase-invoice-linked-proof-drop"
                      accept="application/json,.json"
                      maxCount={1}
                      showUploadList={false}
                      beforeUpload={importDisclosureFile}
                    >
                      <span className="purchase-invoice-linked-proof-drop-label">{t("linkedProofUpload")}</span>
                    </Upload.Dragger>
                  ) : null}
                  <LinkedProofPreview proofId={String(linkedProofId ?? "")} t={t} tSales={tSales} />
                  {sealLocked ? (
                    <div className="purchase-invoice-linked-proof-id-row">
                      <span className="purchase-invoice-linked-proof-id" dir="ltr" title={String(linkedProofId)}>
                        {String(linkedProofId)}
                      </span>
                      {!readOnly ? (
                        <Upload
                          accept="application/json,.json"
                          maxCount={1}
                          showUploadList={false}
                          beforeUpload={importDisclosureFile}
                        >
                          <Typography.Link>{t("linkedProofUpload")}</Typography.Link>
                        </Upload>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="purchase-invoice-linked-proof-lock">{t("linkedProofSealHint")}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {children}
      </Form>
    </div>
  );
}
