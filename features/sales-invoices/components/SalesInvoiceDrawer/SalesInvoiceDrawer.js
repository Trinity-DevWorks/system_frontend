"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { SALES_INVOICE_DETAIL_QUERY_PREFIX } from "../../queries/salesInvoicesQueryKeys";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { fetchSalesInvoice } from "../../api/salesInvoices.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import CustomerDrawer from "@/features/customers/components/CustomerDrawer/CustomerDrawer";
import { CUSTOMERS_LIST_QUERY_KEY } from "@/features/customers";
import ItemDrawer from "@/features/items/components/ItemDrawer/ItemDrawer";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isSalesInvoiceDraft } from "../../utils/salesInvoiceStatuses";
import SalesInvoiceDrawerFooter from "./SalesInvoiceDrawerFooter";
import SalesInvoiceDrawerForm from "./SalesInvoiceDrawerForm";
import SalesInvoiceDrawerHeaderMeta from "./SalesInvoiceDrawerHeaderMeta";
import SalesInvoiceLineEditor from "./SalesInvoiceLineEditor";
import SalesInvoiceTotals from "./SalesInvoiceTotals";
import {
  areSalesInvoiceLinesDirty,
  canAddSalesInvoiceLine,
  canSaveSalesInvoiceDraft,
  getEmptySalesInvoiceLine,
  getSalesInvoiceDefaults,
  isSalesInvoiceHeaderDirtyVsBaseline,
  mapAddressSnapshot,
  mapSalesInvoiceLinesFromApi,
  mapSalesInvoiceRecordToForm,
  suggestedDueOn,
  customerAddressSelectOptions,
} from "../../utils/salesInvoiceDrawerUtils";
import {
  customerIsExemptOnDate,
  previewInvoiceTotals,
} from "../../utils/salesInvoiceTax";
import { useSalesInvoiceDrawerData } from "../../queries/useSalesInvoiceDrawerData";
import { useSalesInvoiceDrawerMutations } from "../../queries/useSalesInvoiceDrawerMutations";
import { tenantPricesIncludeTax, useCompanySettings } from "@/lib/company-settings";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   invoiceId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   createSeed?: { header?: Record<string, unknown>; lines?: Array<Record<string, unknown>> } | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function SalesInvoiceDrawer({
  open,
  mode,
  invoiceId,
  tableSeedRecord = null,
  createSeed = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("SalesInvoices");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const access = useResourceAccess("sales_invoices");
  const customerAccess = useResourceAccess("customers");
  const itemAccess = useResourceAccess("items");
  const queryClient = useQueryClient();
  const { settings } = useCompanySettings();
  const [form] = Form.useForm();
  const [customerCreateOpen, setCustomerCreateOpen] = useState(false);
  const [itemViewId, setItemViewId] = useState(/** @type {string | null} */ (null));

  const [lines, setLines] = useState(() => [getEmptySalesInvoiceLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => [getEmptySalesInvoiceLine()]);
  const [headerBaseline, setHeaderBaseline] = useState(() => getSalesInvoiceDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const [loadedPostedBy, setLoadedPostedBy] = useState(/** @type {unknown} */ (null));
  const [loadedPostedAt, setLoadedPostedAt] = useState(/** @type {string | null} */ (null));
  const [totals, setTotals] = useState(/** @type {Record<string, unknown> | null} */ (null));

  const dueOnAutoRef = useRef(true);
  const applyingDueOnRef = useRef(false);
  const prevCustomerIdRef = useRef(/** @type {unknown} */ (undefined));
  const hydrateCustomerRef = useRef(true);
  const loadedDetailVersionRef = useRef(0);

  const defaults = useMemo(() => {
    void open;
    return getSalesInvoiceDefaults();
  }, [open]);

  const detailEnabled = open && (mode === "edit" || mode === "view") && invoiceId != null;
  const fetchRemoteDetail = detailEnabled;

  const detailQuery = useQuery({
    queryKey: [...SALES_INVOICE_DETAIL_QUERY_PREFIX, invoiceId],
    queryFn: () => fetchSalesInvoice(/** @type {string} */ (invoiceId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const applyTotals = useCallback((record) => {
    if (!record || typeof record !== "object") {
      setTotals(null);
      return;
    }
    setTotals({
      subtotal: record.subtotal,
      discount_total: record.discount_total,
      tax_total: record.tax_total,
      grand_total: record.grand_total,
      paid_total: record.paid_total,
      net_to_pay: record.net_to_pay,
    });
  }, []);

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapSalesInvoiceLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      const nextLines = mappedLines.length > 0 ? mappedLines : [getEmptySalesInvoiceLine()];
      setLines(nextLines);
      setLinesBaseline(nextLines);
      const mappedHeader = mapSalesInvoiceRecordToForm(record);
      setHeaderBaseline(mappedHeader);
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.invoice_number === "string" ? record.invoice_number : null);
      setLoadedPostedBy(record.posted_by ?? null);
      setLoadedPostedAt(typeof record.posted_at === "string" ? record.posted_at : null);
      applyTotals(record);
      form.setFieldsValue(mappedHeader);
      prevCustomerIdRef.current = record.customer_id;
      hydrateCustomerRef.current = false;
      dueOnAutoRef.current = false;
    },
    [form, applyTotals],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    const initialLines = [getEmptySalesInvoiceLine()];
    setLines(initialLines);
    setLinesBaseline(initialLines);
    setHeaderBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    setLoadedPostedBy(null);
    setLoadedPostedAt(null);
    setTotals(null);
    loadedDetailVersionRef.current = 0;
    dueOnAutoRef.current = true;
    hydrateCustomerRef.current = true;
    prevCustomerIdRef.current = undefined;
  }, [form, defaults]);

  useLayoutEffect(() => {
    if (!open) {
      setItemViewId(null);
      return;
    }
    dueOnAutoRef.current = mode === "create";
    hydrateCustomerRef.current = true;
    if (mode === "create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetCreateDraftState();
      if (createSeed && typeof createSeed === "object") {
        const header = createSeed.header ?? {};
        form.setFieldsValue({ ...defaults, ...header });
        const seededLines =
          Array.isArray(createSeed.lines) && createSeed.lines.length > 0
            ? createSeed.lines
            : [getEmptySalesInvoiceLine()];
        setLines(seededLines);
        setLinesBaseline([getEmptySalesInvoiceLine()]);
        setHeaderBaseline(defaults);
        prevCustomerIdRef.current = header.customer_id;
        hydrateCustomerRef.current = false;
      }
      return;
    }

    if (tableSeedRecord && typeof tableSeedRecord === "object") {
      setLoadedStatus(typeof tableSeedRecord.status === "string" ? tableSeedRecord.status : null);
      setLoadedNumber(typeof tableSeedRecord.invoice_number === "string" ? tableSeedRecord.invoice_number : null);
      setLoadedPostedBy(tableSeedRecord.posted_by ?? null);
      setLoadedPostedAt(typeof tableSeedRecord.posted_at === "string" ? tableSeedRecord.posted_at : null);
      applyTotals(tableSeedRecord);
    }
  }, [open, mode, tableSeedRecord, createSeed, resetCreateDraftState, form, defaults, applyTotals]);

  useEffect(() => {
    if (!open || mode === "create" || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncBaselinesFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, mode, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncBaselinesFromRecord]);

  const effectiveStatus =
    loadedStatus ??
    (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly = mode === "view" || !isSalesInvoiceDraft(effectiveStatus) || (mode === "edit" && !access.canEdit);

  const formValuesWatch = Form.useWatch([], form);
  const customerId = formValuesWatch?.customer_id ?? null;
  const customerReady = customerId != null && customerId !== "";
  const currencyId = formValuesWatch?.currency_id ?? null;
  const warehouseId = formValuesWatch?.warehouse_id ?? null;

  const invoiceLookups = useMemo(() => {
    const record = detailQuery.data ?? tableSeedRecord;
    if (!record || typeof record !== "object") return null;
    return {
      salesman: record.salesman ?? null,
      payment_method: record.payment_method ?? null,
      payment_term: record.payment_term ?? null,
    };
  }, [detailQuery.data, tableSeedRecord]);

  const drawerData = useSalesInvoiceDrawerData({
    open,
    t,
    customerId,
    invoiceLookups,
  });

  useEffect(() => {
    if (!open || readOnly || mode !== "create") return;
    if (form.getFieldValue("warehouse_id") != null) return;
    if (drawerData.defaultWarehouseId == null) return;
    form.setFieldsValue({ warehouse_id: drawerData.defaultWarehouseId });
  }, [open, readOnly, mode, drawerData.defaultWarehouseId, form]);

  useEffect(() => {
    if (!open || readOnly || mode !== "create") return;
    if (form.getFieldValue("currency_id") != null) return;
    if (drawerData.primaryCurrencyId == null) return;
    form.setFieldsValue({ currency_id: drawerData.primaryCurrencyId, exchange_rate: 1 });
  }, [open, readOnly, mode, drawerData.primaryCurrencyId, form]);

  useEffect(() => {
    if (!open || readOnly) return;

    if (hydrateCustomerRef.current) {
      hydrateCustomerRef.current = false;
      prevCustomerIdRef.current = customerId;
      return;
    }

    if (prevCustomerIdRef.current === customerId) return;

    if (customerId == null) {
      prevCustomerIdRef.current = null;
      form.setFieldsValue({
        salesman_id: undefined,
        payment_method_id: undefined,
        payment_terms_id: undefined,
        billing_address_id: undefined,
        shipping_address_id: undefined,
        billing_address: mapAddressSnapshot(null),
        shipping_address: mapAddressSnapshot(null),
      });
      return;
    }

    if (drawerData.customerDetailPending) return;
    const customer = drawerData.customerDetail;
    if (!customer || String(customer.id) !== String(customerId)) return;

    const addresses = Array.isArray(customer.addresses) ? customer.addresses : [];
    const billing =
      addresses.find((row) => row.address_type === "billing" && row.is_default) ??
      addresses.find((row) => row.address_type === "billing");
    const shipping =
      addresses.find((row) => row.address_type === "shipping" && row.is_default) ??
      addresses.find((row) => row.address_type === "shipping");

    prevCustomerIdRef.current = customerId;
    dueOnAutoRef.current = true;
    form.setFieldsValue({
      salesman_id: customer.salesman_id ?? undefined,
      payment_method_id: customer.payment_method_id ?? undefined,
      payment_terms_id: customer.payment_terms_id ?? undefined,
      billing_address_id: billing?.id != null ? Number(billing.id) : undefined,
      shipping_address_id: shipping?.id != null ? Number(shipping.id) : undefined,
      billing_address: mapAddressSnapshot(billing),
      shipping_address: mapAddressSnapshot(shipping),
    });
  }, [open, customerId, drawerData.customerDetail, drawerData.customerDetailPending, form, readOnly]);

  const exchangeRateLocked =
    currencyId == null ||
    drawerData.primaryCurrencyId == null ||
    Number(currencyId) === Number(drawerData.primaryCurrencyId);

  useEffect(() => {
    if (readOnly || currencyId == null) return;
    if (exchangeRateLocked) {
      if (Number(form.getFieldValue("exchange_rate")) !== 1) {
        form.setFieldsValue({ exchange_rate: 1 });
      }
      return;
    }
    const current = form.getFieldValue("exchange_rate");
    if (current != null && Number(current) > 0 && Number(current) !== 1) return;
    const rate = drawerData.pairRateToPrimary(currencyId);
    if (rate != null && rate > 0) {
      form.setFieldsValue({ exchange_rate: rate });
    }
  }, [currencyId, drawerData, exchangeRateLocked, form, readOnly]);

  const paymentTermDueDays = useMemo(() => {
    const termId = formValuesWatch?.payment_terms_id;
    const term = drawerData.paymentTermOptions.find((row) => Number(row.value) === Number(termId));
    return term?.due_days ?? 0;
  }, [drawerData.paymentTermOptions, formValuesWatch?.payment_terms_id]);

  useEffect(() => {
    if (readOnly || !dueOnAutoRef.current) return;
    const next = suggestedDueOn(formValuesWatch?.invoice_date, paymentTermDueDays);
    if (String(form.getFieldValue("due_on") ?? "") === next) return;
    applyingDueOnRef.current = true;
    form.setFieldsValue({ due_on: next });
    applyingDueOnRef.current = false;
  }, [form, formValuesWatch?.invoice_date, paymentTermDueDays, readOnly]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults,
    isCreateDirtyVsBaseline: (instance, baseline) =>
      isSalesInvoiceHeaderDirtyVsBaseline(instance, {
        ...baseline,
        warehouse_id: baseline.warehouse_id ?? drawerData.defaultWarehouseId,
        currency_id: baseline.currency_id ?? drawerData.primaryCurrencyId,
        exchange_rate: baseline.exchange_rate ?? 1,
      }),
  });

  const isLinesDirty = useMemo(
    () => areSalesInvoiceLinesDirty(lines, linesBaseline),
    [lines, linesBaseline],
  );

  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isSalesInvoiceHeaderDirtyVsBaseline(form, headerBaseline);
  }, [mode, isCreateDirty, form, headerBaseline]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirty() || isLinesDirty;
    return isHeaderDirty || isLinesDirty;
  }, [readOnly, mode, isCreateDirty, isLinesDirty, isHeaderDirty]);

  const handleDrawerClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose: handleDrawerClose,
    shouldConfirmDiscard,
  });

  const syncBaselinesFromRecordAndBump = useCallback(
    (record) => {
      syncBaselinesFromRecord(record);
      loadedDetailVersionRef.current = Date.now();
    },
    [syncBaselinesFromRecord],
  );

  const handleCreated = useCallback(
    (record) => {
      syncBaselinesFromRecordAndBump(record);
      onCreated?.(record);
    },
    [onCreated, syncBaselinesFromRecordAndBump],
  );

  const onCustomerCreated = useCallback(
    (record) => {
      const id = record?.id;
      if (id == null || id === "") return;
      form.setFieldValue("customer_id", id);
      invalidateTenantListQueries(queryClient, CUSTOMERS_LIST_QUERY_KEY);
      setCustomerCreateOpen(false);
    },
    [form, queryClient],
  );

  const { saveMutation, postMutation, deleteMutation, submitting } = useSalesInvoiceDrawerMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    invoiceId,
    lines,
    onCreated: handleCreated,
    onSaved: syncBaselinesFromRecordAndBump,
    onPosted: syncBaselinesFromRecordAndBump,
    onDeleted: forceClose,
    onClose: forceClose,
  });

  const currentValues = useMemo(
    () => ({
      customer_id: formValuesWatch?.customer_id,
      warehouse_id: formValuesWatch?.warehouse_id,
      invoice_date: formValuesWatch?.invoice_date,
    }),
    [formValuesWatch],
  );

  const canSubmitRequired = useMemo(
    () => canSaveSalesInvoiceDraft(currentValues, lines),
    [currentValues, lines],
  );

  const canAddLine = useMemo(() => canAddSalesInvoiceLine(lines), [lines]);

  const taxContext = useMemo(() => {
    const customerExempt = customerIsExemptOnDate(
      drawerData.customerDetail,
      formValuesWatch?.invoice_date,
    );
    return {
      taxEnabled: Boolean(settings.taxEnabled),
      pricesIncludeTax: tenantPricesIncludeTax(settings),
      customerExempt,
      settings,
    };
  }, [drawerData.customerDetail, formValuesWatch?.invoice_date, settings]);

  const liveTotals = useMemo(
    () =>
      previewInvoiceTotals({
        lines,
        itemsById: drawerData.itemsById,
        adjustment: formValuesWatch?.adjustment ?? 0,
        taxEnabled: taxContext.taxEnabled,
        pricesIncludeTax: taxContext.pricesIncludeTax,
        customerExempt: taxContext.customerExempt,
        settings,
      }),
    [
      lines,
      drawerData.itemsById,
      formValuesWatch?.adjustment,
      taxContext,
      settings,
    ],
  );

  const displayTotals = readOnly && totals ? totals : liveTotals;

  const billingAddressOptions = useMemo(
    () =>
      customerAddressSelectOptions(
        /** @type {Array<Record<string, unknown>>} */ (drawerData.customerDetail?.addresses ?? []),
        "billing",
        /** @type {Record<string, unknown> | null} */ (formValuesWatch?.billing_address ?? headerBaseline.billing_address),
      ),
    [drawerData.customerDetail?.addresses, formValuesWatch?.billing_address, headerBaseline.billing_address],
  );
  const shippingAddressOptions = useMemo(
    () =>
      customerAddressSelectOptions(
        /** @type {Array<Record<string, unknown>>} */ (drawerData.customerDetail?.addresses ?? []),
        "shipping",
        /** @type {Record<string, unknown> | null} */ (formValuesWatch?.shipping_address ?? headerBaseline.shipping_address),
      ),
    [drawerData.customerDetail?.addresses, formValuesWatch?.shipping_address, headerBaseline.shipping_address],
  );

  const handleSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => saveMutation.mutate({ values }))
      .catch(() => {});
  }, [form, saveMutation]);

  const handlePost = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        modal.confirm({
          title: t("postConfirmTitle"),
          content: t("postConfirmContent"),
          okText: t("postConfirmOk"),
          cancelText: t("drawerCancel"),
          onOk: () => closeConfirmOnError(postMutation.mutateAsync({ values })),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleDelete = useCallback(() => {
    const name = loadedNumber ?? String(invoiceId ?? "");
    modal.confirm({
      title: t("deleteConfirmTitle"),
      content: t("deleteConfirmContent", { name }),
      okText: t("deleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
    });
  }, [modal, t, deleteMutation, loadedNumber, invoiceId]);

  const patchLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const clearLine = useCallback((index) => {
    setLines((prev) => prev.map((line, i) => (i === index ? getEmptySalesInvoiceLine() : line)));
  }, []);

  const removeLine = useCallback((index) => {
    if (index === 0) return;
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [getEmptySalesInvoiceLine()];
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptySalesInvoiceLine()]);
  }, []);

  const viewLineItem = useCallback((itemId) => {
    const id = normalizeEntityId(itemId);
    if (id == null) return;
    setItemViewId(String(id));
  }, []);

  const handleHeaderValuesChange = useCallback((changed) => {
    if (!changed || typeof changed !== "object") return;
    if ("invoice_date" in changed || "payment_terms_id" in changed || "customer_id" in changed) {
      dueOnAutoRef.current = true;
    }
    if ("due_on" in changed && !applyingDueOnRef.current) {
      dueOnAutoRef.current = false;
    }
    if ("warehouse_id" in changed) {
      const nextWarehouse = changed.warehouse_id;
      setLines((prev) =>
        prev.map((line) =>
          line.track_inventory && line.item_id && line.warehouse_id == null
            ? { ...line, warehouse_id: nextWarehouse }
            : line,
        ),
      );
    }
    if ("currency_id" in changed) {
      const nextId = changed.currency_id;
      const primaryId = drawerData.primaryCurrencyId;
      if (nextId == null || primaryId == null || Number(nextId) === Number(primaryId)) {
        form.setFieldsValue({ exchange_rate: 1 });
        return;
      }
      const rate = drawerData.pairRateToPrimary(nextId);
      form.setFieldsValue({ exchange_rate: rate != null && rate > 0 ? rate : undefined });
    }
  }, [drawerData, form]);

  const baseTitle =
    mode === "create"
      ? t("drawerTitleCreate")
      : mode === "view" || readOnly
        ? t("drawerTitleView")
        : t("drawerTitleEdit");
  const title = loadedNumber ? `${baseTitle} # ${loadedNumber}` : baseTitle;

  const showDetailLoading = fetchRemoteDetail && detailQuery.isLoading;

  return (
    <>
    <ResourceCrudDrawer
      title={title}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showExpand={false}
      placement="top"
      size="100%"
      headerExtra={
        <SalesInvoiceDrawerHeaderMeta
          t={t}
          invoiceStatus={effectiveStatus}
        />
      }
      showDetailLoading={showDetailLoading}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        <SalesInvoiceDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!canSubmitRequired}
          postDisabled={!canSubmitRequired || !access.canEdit}
          showDelete={!readOnly && invoiceId != null && access.canDelete}
          postedBy={loadedPostedBy}
          postedAt={loadedPostedAt}
          onSave={handleSave}
          onPost={handlePost}
          onDelete={handleDelete}
        />
      }
    >
      <SalesInvoiceDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        customerOptions={drawerData.customerOptions}
        warehouseOptions={drawerData.warehouseOptions}
        currencyOptions={drawerData.currencyOptions}
        salesmanOptions={drawerData.salesmanOptions}
        paymentMethodOptions={drawerData.paymentMethodOptions}
        paymentTermOptions={drawerData.paymentTermOptions}
        customersPending={drawerData.customersPending}
        warehousesPending={drawerData.warehousesPending}
        currenciesPending={drawerData.currenciesPending}
        salesmenPending={drawerData.salesmenPending}
        paymentMethodsPending={drawerData.paymentMethodsPending}
        paymentTermsPending={drawerData.paymentTermsPending}
        exchangeRateLocked={exchangeRateLocked}
        billingAddressOptions={billingAddressOptions}
        shippingAddressOptions={shippingAddressOptions}
        onOpenCustomerDrawer={
          !readOnly && customerAccess.canAdd ? () => setCustomerCreateOpen(true) : undefined
        }
        onValuesChange={handleHeaderValuesChange}
      >
        <SalesInvoiceLineEditor
          lines={lines}
          readOnly={readOnly || submitting || !customerReady}
          itemOptions={drawerData.itemOptions}
          taxContext={taxContext}
          warehouseOptions={drawerData.warehouseOptions}
          itemsPending={drawerData.itemsPending}
          headerWarehouseId={warehouseId}
          canAddLine={canAddLine}
          canViewItem={itemAccess.canView}
          onPatchLine={patchLine}
          onClearLine={clearLine}
          onRemoveLine={removeLine}
          onAddLine={addLine}
          onViewItem={viewLineItem}
          t={t}
        />
        <SalesInvoiceTotals t={t} readOnly={readOnly || submitting} totals={displayTotals} />
      </SalesInvoiceDrawerForm>
    </ResourceCrudDrawer>
    {!readOnly && customerAccess.canAdd ? (
      <CustomerDrawer
        open={open && customerCreateOpen}
        mode="create"
        customerId={null}
        zIndex={1100}
        onClose={() => setCustomerCreateOpen(false)}
        onCreateSuccess={onCustomerCreated}
      />
    ) : null}
    {itemAccess.canView ? (
      <ItemDrawer
        open={open && itemViewId != null}
        mode="view"
        itemId={itemViewId}
        zIndex={1100}
        onClose={() => setItemViewId(null)}
      />
    ) : null}
    </>
  );
}
