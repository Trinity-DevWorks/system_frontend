"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { useResourceAccess } from "@/lib/permissions";
import { useCompanySettings } from "@/lib/company-settings";
import { formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import { mapSalesInvoiceCustomerOption } from "@/features/sales-invoices/utils/salesInvoiceDrawerUtils";
import { customerIsExemptOnDate, previewInvoiceTotals } from "@/features/sales-invoices/utils/salesInvoiceTax";
import { useSalesInvoiceDrawerData } from "@/features/sales-invoices/queries/useSalesInvoiceDrawerData";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Space, Tag } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommercialDocumentForm from "./CommercialDocumentForm";
import CommercialDocumentLineEditor from "./CommercialDocumentLineEditor";
import {
  commercialDefaults,
  commercialHeaderPayload,
  commercialLinesPayload,
  commercialStatusColor,
  emptyCommercialLine,
  mapCommercialHeader,
  mapCommercialLines,
} from "../utils/commercialDocumentUtils";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   recordId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   config: {
 *     kind: "quotation" | "order";
 *     translationNs: string;
 *     permission: string;
 *     listKey: readonly unknown[];
 *     detailPrefix: readonly unknown[];
 *     numberField: string;
 *     dateField: string;
 *     extraDateField: string | null;
 *     includeWarehouse: boolean;
 *     api: ReturnType<import("../api/commercialDocuments.api").createCommercialApi>;
 *   };
 * }} props
 */
export default function CommercialDocumentDrawer({ open, mode, recordId, onClose, onCreated, config }) {
  const t = useTranslations(config.translationNs);
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const { openDrawer } = useGlobalDrawer();
  const access = useResourceAccess(config.permission);
  const invoiceAccess = useResourceAccess("sales_invoices");
  const { settings } = useCompanySettings();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [lines, setLines] = useState(() => [emptyCommercialLine()]);
  const [status, setStatus] = useState("draft");
  const [number, setNumber] = useState(/** @type {string | null} */ (null));
  const [linkedOrder, setLinkedOrder] = useState(/** @type {{ id?: string; order_number?: string } | null} */ (null));
  const [sentBy, setSentBy] = useState(/** @type {unknown} */ (null));
  const [sentAt, setSentAt] = useState(/** @type {string | null} */ (null));
  const [acceptedBy, setAcceptedBy] = useState(/** @type {unknown} */ (null));
  const [acceptedAt, setAcceptedAt] = useState(/** @type {string | null} */ (null));
  const [rejectedBy, setRejectedBy] = useState(/** @type {unknown} */ (null));
  const [rejectedAt, setRejectedAt] = useState(/** @type {string | null} */ (null));
  const [confirmedBy, setConfirmedBy] = useState(/** @type {unknown} */ (null));
  const [confirmedAt, setConfirmedAt] = useState(/** @type {string | null} */ (null));
  const [cancelledBy, setCancelledBy] = useState(/** @type {unknown} */ (null));
  const [cancelledAt, setCancelledAt] = useState(/** @type {string | null} */ (null));
  const [savedTotals, setSavedTotals] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [baseline, setBaseline] = useState("");
  const createReadyRef = useRef(false);
  const rateTouchedRef = useRef(false);
  const boundCustomerRef = useRef(/** @type {unknown} */ (undefined));
  const rateFromPrimaryRef = useRef(/** @type {(id: number) => number | null} */ (() => null));
  const primaryCurrencyIdRef = useRef(/** @type {number | null | undefined} */ (null));

  const detailEnabled = open && mode !== "create" && recordId != null;
  const detailQuery = useQuery({
    queryKey: [...config.detailPrefix, recordId],
    queryFn: () => config.api.fetch(/** @type {string} */ (recordId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const customerId = Form.useWatch("customer_id", form);
  const currencyId = Form.useWatch("currency_id", form);
  const documentDate = Form.useWatch(config.dateField, form);
  const exchangeRate = Form.useWatch("exchange_rate", form);
  const drawerData = useSalesInvoiceDrawerData({
    open,
    t,
    customerId: customerId != null ? String(customerId) : null,
    invoiceLookups: detailQuery.data ?? null,
  });
  useEffect(() => {
    rateFromPrimaryRef.current = drawerData.rateFromPrimary;
    primaryCurrencyIdRef.current = drawerData.primaryCurrencyId;
  }, [drawerData.rateFromPrimary, drawerData.primaryCurrencyId]);

  const customerSeedOptions = useMemo(() => {
    const fromDocument = mapSalesInvoiceCustomerOption(
      detailQuery.data?.customer && typeof detailQuery.data.customer === "object" ? detailQuery.data.customer : null,
    );
    const listed = drawerData.customerSeedOptions ?? [];
    if (!fromDocument) return listed;
    if (listed.some((row) => String(row.value) === String(fromDocument.value))) return listed;
    return [fromDocument, ...listed];
  }, [detailQuery.data, drawerData.customerSeedOptions]);

  const applyRecord = useCallback(
    (record) => {
      const nextLines = mapCommercialLines(record.lines);
      const header = mapCommercialHeader(record, config.dateField, config.extraDateField);
      const filled = nextLines.length > 0 ? nextLines : [emptyCommercialLine()];
      setLines(filled);
      setStatus(typeof record.status === "string" ? record.status : "draft");
      setNumber(typeof record[config.numberField] === "string" ? record[config.numberField] : null);
      setLinkedOrder(record.sales_order && typeof record.sales_order === "object" ? record.sales_order : null);
      setSentBy(record.sent_by ?? null);
      setSentAt(typeof record.sent_at === "string" ? record.sent_at : null);
      setAcceptedBy(record.accepted_by ?? null);
      setAcceptedAt(typeof record.accepted_at === "string" ? record.accepted_at : null);
      setRejectedBy(record.rejected_by ?? null);
      setRejectedAt(typeof record.rejected_at === "string" ? record.rejected_at : null);
      setConfirmedBy(record.confirmed_by ?? null);
      setConfirmedAt(typeof record.confirmed_at === "string" ? record.confirmed_at : null);
      setCancelledBy(record.cancelled_by ?? null);
      setCancelledAt(typeof record.cancelled_at === "string" ? record.cancelled_at : null);
      setSavedTotals(record);
      boundCustomerRef.current = header.customer_id ?? null;
      form.setFieldsValue(header);
      setBaseline(JSON.stringify({ header, lines: filled }));
    },
    [config.dateField, config.extraDateField, config.numberField, form],
  );

  useEffect(() => {
    if (!open) {
      createReadyRef.current = false;
      rateTouchedRef.current = false;
      boundCustomerRef.current = undefined;
      return;
    }
    if (mode !== "create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load the fetched document into the drawer form
      if (detailQuery.data) applyRecord(detailQuery.data);
      return;
    }
    if (createReadyRef.current) return;
    if (drawerData.currenciesPending) return;
    if (config.includeWarehouse && drawerData.warehousesPending) return;
    createReadyRef.current = true;
    const header = commercialDefaults(
      config.dateField,
      config.extraDateField,
      drawerData.primaryCurrencyId,
      config.includeWarehouse ? drawerData.defaultWarehouseId : null,
    );
    const initial = [emptyCommercialLine()];
    boundCustomerRef.current = header.customer_id ?? null;
    form.setFieldsValue(header);
    setLines(initial);
    setStatus("draft");
    setNumber(null);
    setLinkedOrder(null);
    setSentBy(null);
    setSentAt(null);
    setAcceptedBy(null);
    setAcceptedAt(null);
    setRejectedBy(null);
    setRejectedAt(null);
    setConfirmedBy(null);
    setConfirmedAt(null);
    setCancelledBy(null);
    setCancelledAt(null);
    setSavedTotals(null);
    setBaseline(JSON.stringify({ header, lines: initial }));
  }, [
    applyRecord,
    config.dateField,
    config.extraDateField,
    config.includeWarehouse,
    detailQuery.data,
    drawerData.currenciesPending,
    drawerData.defaultWarehouseId,
    drawerData.primaryCurrencyId,
    drawerData.warehousesPending,
    form,
    mode,
    open,
  ]);

  useEffect(() => {
    if (!open) return;
    if (!rateTouchedRef.current) {
      rateTouchedRef.current = currencyId != null;
      return;
    }
    const id = currencyId != null ? Number(currencyId) : null;
    if (id == null) return;
    const primary = primaryCurrencyIdRef.current != null && id === Number(primaryCurrencyIdRef.current);
    const rate = primary ? 1 : rateFromPrimaryRef.current(id);
    if (rate != null) form.setFieldValue("exchange_rate", rate);
  }, [currencyId, form, open]);

  const editable = status === "draft" && mode !== "view" && (mode === "create" ? access.canAdd : access.canEdit);

  useEffect(() => {
    if (!open || !editable) return;
    if (boundCustomerRef.current === undefined) return;
    const current = customerId ?? null;
    if (boundCustomerRef.current === current) return;
    if (current == null || current === "") {
      boundCustomerRef.current = null;
      form.setFieldsValue({ salesman_id: undefined, payment_terms_id: undefined });
      return;
    }
    if (drawerData.customerDetailPending) return;
    const customer = drawerData.customerDetail;
    if (!customer || String(customer.id) !== String(current)) return;
    boundCustomerRef.current = current;
    form.setFieldsValue({
      salesman_id: customer.salesman_id ?? undefined,
      payment_terms_id: customer.payment_terms_id != null ? Number(customer.payment_terms_id) : undefined,
    });
  }, [customerId, drawerData.customerDetail, drawerData.customerDetailPending, editable, form, open]);

  const snapshot = JSON.stringify({ header: form.getFieldsValue(true), lines });
  const dirty = baseline !== "" && snapshot !== baseline;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: config.listKey });
    if (recordId) queryClient.invalidateQueries({ queryKey: [...config.detailPrefix, recordId] });
  }, [config.detailPrefix, config.listKey, queryClient, recordId]);

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const header = commercialHeaderPayload(values, config.dateField, config.extraDateField, config.includeWarehouse);
      const lineRows = commercialLinesPayload(lines);
      if (lineRows.length === 0) {
        throw new Error("lines");
      }
      if (mode === "create") {
        return config.api.create({ ...header, lines: lineRows });
      }
      const id = /** @type {string} */ (recordId);
      await config.api.update(id, header);
      await config.api.syncLines(id, { lines: lineRows });
      return config.api.fetch(id);
    },
    onSuccess: (saved) => {
      message.success(t("saveSuccess"));
      const id = saved && typeof saved === "object" && saved.id != null ? String(saved.id) : null;
      if (id && saved && typeof saved === "object") {
        queryClient.setQueryData([...config.detailPrefix, id], saved);
      }
      queryClient.invalidateQueries({ queryKey: config.listKey });
      if (mode === "create") {
        onCreated?.(saved);
        return;
      }
      if (saved && typeof saved === "object" && saved.id) applyRecord(saved);
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "lines") {
        notification.error({ title: t("saveError"), description: t("linesRequired") });
        return;
      }
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const actionMutation = useMutation({
    mutationFn: (/** @type {string} */ action) => config.api.action(/** @type {string} */ (recordId), action),
    onSuccess: (saved) => {
      message.success(t("actionSuccess"));
      invalidate();
      if (saved && typeof saved === "object") applyRecord(saved);
    },
    onError: (err) => {
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => config.api.remove(/** @type {string} */ (recordId)),
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      invalidate();
      onClose();
    },
    onError: (err) => {
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: () => config.api.action(/** @type {string} */ (recordId), "invoice"),
    onSuccess: (invoice) => {
      message.success(t("invoiceSuccess"));
      invalidate();
      const id = invoice && typeof invoice === "object" ? invoice.id : null;
      if (id != null) {
        openDrawer({ featureId: "salesInvoices", id: String(id), mode: "edit" });
      }
    },
    onError: (err) => {
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const submitting = saveMutation.isPending || actionMutation.isPending || deleteMutation.isPending || invoiceMutation.isPending;
  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly: !editable,
    modal,
    t,
    onClose,
    shouldConfirmDiscard: () => editable && dirty,
  });

  const runSave = useCallback(() => {
    form.validateFields().then((values) => saveMutation.mutate(values)).catch(() => {});
  }, [form, saveMutation]);

  useDrawerSubmitShortcut({ enabled: open && editable, submitting, onSave: runSave, saveDisabled: !dirty || submitting });

  const customerExempt = customerIsExemptOnDate(drawerData.customerDetail, documentDate);
  const totals = previewInvoiceTotals({
    lines,
    itemsById: new Map(),
    taxEnabled: settings.taxEnabled,
    pricesIncludeTax: settings.taxPriceMode === "inclusive",
    customerExempt,
    settings,
  });
  const symbol = drawerData.currencySymbol(currencyId != null ? Number(currencyId) : drawerData.primaryCurrencyId);
  const display = editable ? totals : savedTotals;
  const titleBase = mode === "create" ? t("drawerCreateTitle") : mode === "view" || !editable ? t("drawerViewTitle") : t("drawerEditTitle");
  const title = number ? `${titleBase} # ${number}` : titleBase;
  const currencyLocked =
    drawerData.primaryCurrencyId != null && currencyId != null && Number(currencyId) === Number(drawerData.primaryCurrencyId);

  const runAction = (action) => actionMutation.mutate(action);
  const confirmCancel = () => {
    modal.confirm({
      title: t("cancelConfirmTitle"),
      content: t("cancelConfirmContent"),
      okText: t("actionCancelOrder"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(actionMutation.mutateAsync("cancel")),
    });
  };
  const confirmDelete = () => {
    modal.confirm({
      title: t("deleteConfirmTitle"),
      content: t("deleteConfirmContent"),
      okText: t("actionDelete"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
    });
  };

  return (
    <ResourceCrudDrawer
      className="sales-invoice-crud-drawer"
      title={title}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showExpand={false}
      placement="top"
      size="100%"
      headerExtra={
        <div className="flex items-center gap-3">
          {linkedOrder?.id ? (
            <Button
              type="link"
              className="px-0"
              onClick={() => openDrawer({ featureId: "salesOrders", id: String(linkedOrder.id), mode: "view" })}
            >
              {t("convertedOrder")} {linkedOrder.order_number ?? ""}
            </Button>
          ) : null}
          <div className="sales-invoice-drawer-header-meta">
            <Tag className="m-0" color={commercialStatusColor(status)}>
              {t(`status_${status}`)}
            </Tag>
          </div>
        </div>
      }
      showDetailLoading={detailEnabled && detailQuery.isPending && baseline === ""}
      detailLoadFailed={detailEnabled && detailQuery.isError}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        <div className="flex w-full min-w-0 items-center gap-3">
          {config.kind === "quotation" ? (
            <div className="sales-invoice-drawer-footer-posted">
              <span className="sales-invoice-drawer-footer-posted-item">
                <span className="sales-invoice-drawer-footer-posted-label">{t("fieldSentBy")}</span>
                <span className="sales-invoice-drawer-footer-posted-value">{sentByName(sentBy) || "\u2014"}</span>
              </span>
              <span className="sales-invoice-drawer-footer-posted-item">
                <span className="sales-invoice-drawer-footer-posted-label">{t("fieldSentAt")}</span>
                <span className="sales-invoice-drawer-footer-posted-value">{formatTenantDateTime(sentAt) || "\u2014"}</span>
              </span>
              {acceptedAt ? (
                <>
                  <span className="sales-invoice-drawer-footer-posted-item">
                    <span className="sales-invoice-drawer-footer-posted-label">{t("fieldAcceptedBy")}</span>
                    <span className="sales-invoice-drawer-footer-posted-value">{sentByName(acceptedBy) || "\u2014"}</span>
                  </span>
                  <span className="sales-invoice-drawer-footer-posted-item">
                    <span className="sales-invoice-drawer-footer-posted-label">{t("fieldAcceptedAt")}</span>
                    <span className="sales-invoice-drawer-footer-posted-value">{formatTenantDateTime(acceptedAt) || "\u2014"}</span>
                  </span>
                </>
              ) : null}
              {rejectedAt ? (
                <>
                  <span className="sales-invoice-drawer-footer-posted-item">
                    <span className="sales-invoice-drawer-footer-posted-label">{t("fieldRejectedBy")}</span>
                    <span className="sales-invoice-drawer-footer-posted-value">{sentByName(rejectedBy) || "\u2014"}</span>
                  </span>
                  <span className="sales-invoice-drawer-footer-posted-item">
                    <span className="sales-invoice-drawer-footer-posted-label">{t("fieldRejectedOn")}</span>
                    <span className="sales-invoice-drawer-footer-posted-value">{formatTenantDateTime(rejectedAt) || "\u2014"}</span>
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
          {config.kind === "order" && (confirmedAt || cancelledAt) ? (
            <div className="sales-invoice-drawer-footer-posted">
              {confirmedAt ? (
                <>
                  <span className="sales-invoice-drawer-footer-posted-item">
                    <span className="sales-invoice-drawer-footer-posted-label">{t("fieldConfirmedBy")}</span>
                    <span className="sales-invoice-drawer-footer-posted-value">{sentByName(confirmedBy) || "\u2014"}</span>
                  </span>
                  <span className="sales-invoice-drawer-footer-posted-item">
                    <span className="sales-invoice-drawer-footer-posted-label">{t("fieldConfirmedOn")}</span>
                    <span className="sales-invoice-drawer-footer-posted-value">{formatTenantDateTime(confirmedAt) || "\u2014"}</span>
                  </span>
                </>
              ) : null}
              {cancelledAt ? (
                <>
                  <span className="sales-invoice-drawer-footer-posted-item">
                    <span className="sales-invoice-drawer-footer-posted-label">{t("fieldCancelledBy")}</span>
                    <span className="sales-invoice-drawer-footer-posted-value">{sentByName(cancelledBy) || "\u2014"}</span>
                  </span>
                  <span className="sales-invoice-drawer-footer-posted-item">
                    <span className="sales-invoice-drawer-footer-posted-label">{t("fieldCancelledOn")}</span>
                    <span className="sales-invoice-drawer-footer-posted-value">{formatTenantDateTime(cancelledAt) || "\u2014"}</span>
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
          <Space className="ms-auto shrink-0">
            {editable && mode !== "create" && access.canDelete ? (
              <Button danger disabled={submitting} onClick={confirmDelete}>
                {t("actionDelete")}
              </Button>
            ) : null}
            <Button onClick={editable ? requestClose : forceClose} disabled={submitting}>
              {editable ? t("drawerCancel") : t("drawerClose")}
            </Button>
            {editable ? (
              <Button disabled={!dirty || submitting} loading={submitting} onClick={runSave}>
                {t("drawerSave")}
              </Button>
            ) : null}
            {config.kind === "quotation" && status === "draft" && mode !== "create" && access.canEdit ? (
              <Button type="primary" disabled={submitting || dirty} onClick={() => runAction("send")}>
                {t("actionSend")}
              </Button>
            ) : null}
            {config.kind === "quotation" && status === "sent" && access.canEdit ? (
              <>
                <Button disabled={submitting} onClick={() => runAction("reject")}>
                  {t("actionReject")}
                </Button>
                <Button type="primary" disabled={submitting} onClick={() => runAction("accept")}>
                  {t("actionAccept")}
                </Button>
              </>
            ) : null}
            {config.kind === "quotation" && status === "accepted" && access.canEdit ? (
              <Button type="primary" disabled={submitting} onClick={() => runAction("convert")}>
                {t("actionConvert")}
              </Button>
            ) : null}
            {config.kind === "order" && (status === "draft" || status === "confirmed") && mode !== "create" && access.canEdit ? (
              <Button danger disabled={submitting} onClick={confirmCancel}>
                {t("actionCancelOrder")}
              </Button>
            ) : null}
            {config.kind === "order" && status === "draft" && mode !== "create" && access.canEdit ? (
              <Button type="primary" disabled={submitting || dirty} onClick={() => runAction("confirm")}>
                {t("actionConfirm")}
              </Button>
            ) : null}
            {config.kind === "order" &&
            (status === "confirmed" || status === "partially_invoiced") &&
            invoiceAccess.canAdd ? (
              <Button type="primary" disabled={submitting} onClick={() => invoiceMutation.mutate()}>
                {t("actionCreateInvoice")}
              </Button>
            ) : null}
          </Space>
        </div>
      }
    >
      <div className="sales-invoice-keyboard-root">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="item-general-form sales-invoice-form"
          disabled={!editable}
        >
          <CommercialDocumentForm
            t={t}
            form={form}
            readOnly={!editable}
            dateField={config.dateField}
            extraDateField={config.extraDateField}
            includeWarehouse={config.includeWarehouse}
            currencyLocked={currencyLocked}
            customerReady={customerId != null && customerId !== ""}
            customerSeedOptions={customerSeedOptions}
            currencyOptions={drawerData.currencyOptions}
            warehouseOptions={drawerData.warehouseOptions}
            salesmanOptions={drawerData.salesmanOptions}
            paymentTermOptions={drawerData.paymentTermOptions}
            warehousesPending={drawerData.warehousesPending}
            currenciesPending={drawerData.currenciesPending}
            salesmenPending={drawerData.salesmenPending}
            paymentTermsPending={drawerData.paymentTermsPending}
          />
          <CommercialDocumentLineEditor
            t={t}
            lines={lines}
            readOnly={!editable}
            exchangeRate={Number(exchangeRate) || 1}
            priceDecimals={settings.priceDecimalPlaces}
            currencySymbol={symbol}
            taxEnabled={settings.taxEnabled}
            pricesIncludeTax={settings.taxPriceMode === "inclusive"}
            customerExempt={customerExempt}
            settings={settings}
            onChange={setLines}
          />
          <div className="sales-invoice-totals">
            <Summary label={t("subtotal")} value={formatTenantMoney(display?.subtotal)} />
            <Summary label={t("discountTotal")} value={formatTenantMoney(display?.discount_total)} />
            <Summary label={t("taxTotal")} value={formatTenantMoney(display?.tax_total)} />
            <Summary label={t("grandTotal")} value={formatTenantMoney(display?.grand_total)} />
          </div>
        </Form>
      </div>
    </ResourceCrudDrawer>
  );
}

/**
 * @param {unknown} user
 * @returns {string | null}
 */
function sentByName(user) {
  if (!user || typeof user !== "object") return null;
  const name = "name" in user && typeof user.name === "string" ? user.name.trim() : "";
  return name || null;
}

/**
 * @param {{ label: string; value?: string }} props
 */
function Summary({ label, value }) {
  return (
    <div className="sales-invoice-totals-pane">
      <div className="text-xs text-neutral-500">{label}</div>
      <div>{value || "\u2014"}</div>
    </div>
  );
}
