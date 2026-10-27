"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { PURCHASE_ORDER_DETAIL_QUERY_PREFIX, PURCHASE_ORDERS_QUERY_KEY } from "../../queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { customerIsExemptOnDate, previewInvoiceTotals } from "@/features/sales-invoices/utils/salesInvoiceTax";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { goodsReceiptFromPoDrawerArgs } from "../../utils/goodsReceiptFromPurchaseOrder";
import {
  downloadPurchaseOrderPdf,
  fetchPurchaseOrder,
  markPurchaseOrderAsSent,
} from "../../api/purchaseOrders.api";
import { useDocumentPdfDownload } from "@/shared/hooks/useDocumentPdfDownload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Form, Tag } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getPurchaseOrderStatusLabel,
  isPurchaseOrderCancellable,
  isPurchaseOrderConfirmed,
  isPurchaseOrderDraft,
  isPurchaseOrderPrintable,
  purchaseOrderStatusTagColor,
} from "../../utils/purchaseOrderStatuses";
import PurchaseOrderDrawerFooter from "./PurchaseOrderDrawerFooter";
import PurchaseOrderDrawerForm from "./PurchaseOrderDrawerForm";
import PurchaseOrderLineEditor from "./PurchaseOrderLineEditor";
import PurchaseOrderTotals from "./PurchaseOrderTotals";
import { useCompanySettings } from "@/lib/company-settings";
import { positiveRate } from "@/lib/currency/documentExchangeRate";
import {
  arePurchaseOrderLinesDirty,
  canAddPurchaseOrderLine,
  canSavePurchaseOrderDraft,
  getEmptyPurchaseOrderLine,
  getPurchaseOrderDefaults,
  isPurchaseOrderHeaderDirtyVsBaseline,
  mapPurchaseOrderLinesFromApi,
  mapPurchaseOrderRecordToForm,
} from "../../utils/purchaseOrderDrawerUtils";
import {
  applySuggestedPurchaseOrderUnitPrices,
  lastPurchasePricesAtRate,
} from "../../utils/purchaseOrderLastPurchasePrice";
import {
  expectedDateKey,
  maxLeadTimeDaysForLines,
  suggestedExpectedDate,
} from "../../utils/purchaseOrderExpectedDate";
import { usePurchaseOrderDrawerData } from "../../queries/usePurchaseOrderDrawerData";
import { usePurchaseOrderDrawerMutations } from "../../queries/usePurchaseOrderDrawerMutations";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   orderId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   createSeed?: { header: Record<string, unknown>; lines: Array<Record<string, unknown>> } | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function PurchaseOrderDrawer({
  open,
  mode,
  orderId,
  tableSeedRecord = null,
  createSeed = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const { openDrawer } = useGlobalDrawer();
  const access = useResourceAccess("stock");
  const [form] = Form.useForm();

  const [lines, setLines] = useState(() => [getEmptyPurchaseOrderLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => [getEmptyPurchaseOrderLine()]);
  const [headerBaseline, setHeaderBaseline] = useState(() => getPurchaseOrderDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const [loadedSentAt, setLoadedSentAt] = useState(/** @type {string | null} */ (null));
  const [loadedSentBy, setLoadedSentBy] = useState(/** @type {unknown} */ (null));
  const [loadedCreatedAt, setLoadedCreatedAt] = useState(/** @type {string | null} */ (null));
  const [loadedCreatedBy, setLoadedCreatedBy] = useState(/** @type {unknown} */ (null));
  const [canReceive, setCanReceive] = useState(false);
  const [loadedTotals, setLoadedTotals] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const { settings } = useCompanySettings();

  const queryClient = useQueryClient();
  const hydrateSupplierPricesRef = useRef(true);
  const pendingSupplierPriceOverwriteRef = useRef(false);
  const prevSupplierIdRef = useRef(/** @type {unknown} */ (undefined));
  const skipNextExpectedDateSyncRef = useRef(false);
  const applyingExpectedDateRef = useRef(false);
  const expectedDateAutoRef = useRef(true);

  const defaults = useMemo(() => {
    void open;
    return getPurchaseOrderDefaults();
  }, [open]);
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && (mode === "edit" || mode === "view") && orderId != null;
  const fetchRemoteDetail = detailEnabled;

  const detailQuery = useQuery({
    queryKey: [...PURCHASE_ORDER_DETAIL_QUERY_PREFIX, orderId],
    queryFn: () => fetchPurchaseOrder(/** @type {string} */ (orderId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapPurchaseOrderLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      const nextLines = mappedLines.length > 0 ? mappedLines : [getEmptyPurchaseOrderLine()];
      setLines(nextLines);
      setLinesBaseline(nextLines);
      setHeaderBaseline(mapPurchaseOrderRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.po_number === "string" ? record.po_number : null);
      setLoadedSentAt(typeof record.sent_at === "string" ? record.sent_at : null);
      setLoadedSentBy(record.sent_by ?? null);
      setLoadedCreatedAt(typeof record.created_at === "string" ? record.created_at : null);
      setLoadedCreatedBy(record.created_by ?? null);
      setCanReceive(Boolean(record.can_receive));
      setLoadedTotals({
        subtotal: record.subtotal,
        discount_total: record.discount_total,
        tax_total: record.tax_total,
        grand_total: record.grand_total,
      });
      form.setFieldsValue(mapPurchaseOrderRecordToForm(record));
      prevSupplierIdRef.current = record.supplier_id;
      hydrateSupplierPricesRef.current = false;
      pendingSupplierPriceOverwriteRef.current = false;
      skipNextExpectedDateSyncRef.current = true;
      expectedDateAutoRef.current = false;
    },
    [form],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    const initialLines = [getEmptyPurchaseOrderLine()];
    setLines(initialLines);
    setLinesBaseline(initialLines);
    setHeaderBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    setLoadedSentAt(null);
    setLoadedSentBy(null);
    setLoadedCreatedAt(null);
    setLoadedCreatedBy(null);
    setCanReceive(false);
    setLoadedTotals(null);
    loadedDetailVersionRef.current = 0;
  }, [form, defaults]);

  useLayoutEffect(() => {
    if (!open) return;
    hydrateSupplierPricesRef.current = true;
    pendingSupplierPriceOverwriteRef.current = false;
    skipNextExpectedDateSyncRef.current = mode !== "create";
    expectedDateAutoRef.current = mode === "create";
    if (mode === "create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetCreateDraftState();
      if (createSeed && typeof createSeed === "object") {
        const header = createSeed.header ?? {};
        form.setFieldsValue({ ...defaults, ...header });
        const seededLines =
          Array.isArray(createSeed.lines) && createSeed.lines.length > 0
            ? createSeed.lines
            : [getEmptyPurchaseOrderLine()];
        setLines(seededLines);
        setLinesBaseline([getEmptyPurchaseOrderLine()]);
        setHeaderBaseline(defaults);
        prevSupplierIdRef.current = header.supplier_id;
        hydrateSupplierPricesRef.current = false;
      }
      return;
    }

    if (tableSeedRecord && typeof tableSeedRecord === "object") {
      setLoadedStatus(typeof tableSeedRecord.status === "string" ? tableSeedRecord.status : null);
      setLoadedNumber(typeof tableSeedRecord.po_number === "string" ? tableSeedRecord.po_number : null);
      setLoadedSentAt(typeof tableSeedRecord.sent_at === "string" ? tableSeedRecord.sent_at : null);
      setLoadedSentBy(tableSeedRecord.sent_by ?? null);
      setLoadedCreatedAt(typeof tableSeedRecord.created_at === "string" ? tableSeedRecord.created_at : null);
      setLoadedCreatedBy(tableSeedRecord.created_by ?? null);
    }
  }, [open, mode, tableSeedRecord, createSeed, resetCreateDraftState, form, defaults]);

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
  const readOnly = mode === "view" || !isPurchaseOrderDraft(effectiveStatus);

  const formValuesWatch = Form.useWatch([], form);
  const supplierId = formValuesWatch?.supplier_id ?? null;

  const drawerData = usePurchaseOrderDrawerData({
    open,
    t,
    supplierId,
    loadSupplierPrices: !readOnly,
  });

  const currencyId = formValuesWatch?.currency_id ?? null;
  const exchangeRateLocked =
    currencyId == null ||
    drawerData.primaryCurrencyId == null ||
    Number(currencyId) === Number(drawerData.primaryCurrencyId);
  const headerRate = exchangeRateLocked ? 1 : positiveRate(formValuesWatch?.exchange_rate);
  const documentCurrencySymbol = drawerData.currencySymbol(currencyId);
  const primaryCurrencyCode = drawerData.currencyCode(drawerData.primaryCurrencyId);
  const documentCurrencyCode = drawerData.currencyCode(currencyId);
  const exchangeRateHelp =
    !exchangeRateLocked && primaryCurrencyCode && documentCurrencyCode
      ? `1 ${primaryCurrencyCode} = ${headerRate ?? "?"} ${documentCurrencyCode}`
      : "";

  // Supplier last purchase prices are in the primary currency; suggest them in the order currency.
  const lastPriceByItemId = useMemo(
    () => lastPurchasePricesAtRate(drawerData.lastPriceByItemId, headerRate, settings.priceDecimalPlaces),
    [drawerData.lastPriceByItemId, headerRate, settings.priceDecimalPlaces],
  );

  const primaryCurrencyId = drawerData.primaryCurrencyId;
  useEffect(() => {
    if (!open || readOnly || mode !== "create") return;
    if (form.getFieldValue("currency_id") != null) return;
    if (primaryCurrencyId == null) return;
    form.setFieldsValue({ currency_id: primaryCurrencyId, exchange_rate: 1 });
  }, [open, readOnly, mode, primaryCurrencyId, form]);

  useEffect(() => {
    if (hydrateSupplierPricesRef.current) {
      hydrateSupplierPricesRef.current = false;
      prevSupplierIdRef.current = supplierId;
      return;
    }
    if (prevSupplierIdRef.current === supplierId) return;
    prevSupplierIdRef.current = supplierId;
    if (readOnly || supplierId == null) return;
    pendingSupplierPriceOverwriteRef.current = true;
  }, [supplierId, readOnly]);

  useEffect(() => {
    if (readOnly || drawerData.supplierPricesPending) return;
    if (pendingSupplierPriceOverwriteRef.current) {
      pendingSupplierPriceOverwriteRef.current = false;
      setLines((prev) =>
        applySuggestedPurchaseOrderUnitPrices(prev, lastPriceByItemId, { overwrite: true }),
      );
      return;
    }
    setLines((prev) =>
      applySuggestedPurchaseOrderUnitPrices(prev, lastPriceByItemId, { overwrite: false }),
    );
  }, [lastPriceByItemId, drawerData.supplierPricesPending, readOnly]);

  useEffect(() => {
    if (readOnly || drawerData.supplierPricesPending) return;
    if (skipNextExpectedDateSyncRef.current) {
      skipNextExpectedDateSyncRef.current = false;
      return;
    }
    if (!expectedDateAutoRef.current) return;
    const next = suggestedExpectedDate(
      formValuesWatch?.order_date,
      maxLeadTimeDaysForLines(lines, drawerData.leadTimeByItemId),
    );
    if (expectedDateKey(form.getFieldValue("expected_date")) === expectedDateKey(next)) return;
    applyingExpectedDateRef.current = true;
    form.setFieldsValue({ expected_date: next });
    applyingExpectedDateRef.current = false;
  }, [
    drawerData.leadTimeByItemId,
    drawerData.supplierPricesPending,
    form,
    formValuesWatch?.order_date,
    lines,
    readOnly,
  ]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults,
    isCreateDirtyVsBaseline: isPurchaseOrderHeaderDirtyVsBaseline,
  });

  const isLinesDirty = useMemo(
    () => arePurchaseOrderLinesDirty(lines, linesBaseline),
    [lines, linesBaseline],
  );

  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isPurchaseOrderHeaderDirtyVsBaseline(form, headerBaseline);
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

  const { saveMutation, confirmMutation, cancelMutation, deleteMutation, submitting } =
    usePurchaseOrderDrawerMutations({
      form,
      message,
      notification,
      t,
      tApiErrors,
      orderId,
      lines,
      onCreated: handleCreated,
      onSaved: syncBaselinesFromRecordAndBump,
      onConfirmed: syncBaselinesFromRecordAndBump,
      onCancelled: syncBaselinesFromRecordAndBump,
      onDeleted: forceClose,
      onClose: forceClose,
    });

  const currentValues = useMemo(
    () => ({
      supplier_id: formValuesWatch?.supplier_id,
      warehouse_id: formValuesWatch?.warehouse_id,
      currency_id: formValuesWatch?.currency_id,
      exchange_rate: formValuesWatch?.exchange_rate,
      order_date: formValuesWatch?.order_date,
      expected_date: formValuesWatch?.expected_date,
      notes: formValuesWatch?.notes ?? "",
    }),
    [formValuesWatch],
  );

  const canSubmitRequired = useMemo(
    () => canSavePurchaseOrderDraft(currentValues, lines),
    [currentValues, lines],
  );

  const canAddLine = useMemo(() => canAddPurchaseOrderLine(lines), [lines]);

  const handleSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => saveMutation.mutate({ values }))
      .catch(() => {});
  }, [form, saveMutation]);

  const handleConfirm = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        modal.confirm({
          title: t("poConfirmConfirmTitle"),
          content: t("poConfirmConfirmContent"),
          okText: t("poConfirmConfirmOk"),
          cancelText: t("drawerCancel"),
          onOk: () => closeConfirmOnError(confirmMutation.mutateAsync({ values })),
        });
      })
      .catch(() => {});
  }, [form, modal, t, confirmMutation]);

  const handleCancelOrder = useCallback(() => {
    modal.confirm({
      title: t("poCancelConfirmTitle"),
      content: t("poCancelConfirmContent"),
      okText: t("poCancelConfirmOk"),
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(cancelMutation.mutateAsync()),
    });
  }, [modal, t, cancelMutation]);

  const handleDelete = useCallback(() => {
    const name = loadedNumber ?? String(orderId ?? "");
    modal.confirm({
      title: t("poDeleteConfirmTitle"),
      content: t("poDeleteConfirmContent", { name }),
      okText: t("poDeleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
    });
  }, [modal, t, deleteMutation, loadedNumber, orderId]);

  const { downloadPdf, printPdf, isPending: pdfPending, isPrintPending, isDownloadPending } = useDocumentPdfDownload({
    download: downloadPurchaseOrderPdf,
    errorTitle: t("poPdfError"),
  });

  const markSentMutation = useMutation({
    mutationFn: () => {
      if (orderId == null) throw new Error("Missing purchase order id");
      return markPurchaseOrderAsSent(orderId);
    },
    onError: (err) => {
      notification.error({
        title: t("poMarkSentError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (record) => {
      message.success(t("poMarkSentSuccess"));
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
      syncBaselinesFromRecordAndBump(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const handleDownloadPdf = useCallback(() => {
    downloadPdf(orderId, loadedNumber);
  }, [downloadPdf, orderId, loadedNumber]);

  const handlePrint = useCallback(() => {
    printPdf(orderId, loadedNumber);
  }, [printPdf, orderId, loadedNumber]);

  const handleMarkSent = useCallback(() => {
    modal.confirm({
      title: t("poMarkSentConfirmTitle"),
      content: t("poMarkSentConfirmContent"),
      okText: t("actionMarkPoSent"),
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(markSentMutation.mutateAsync()),
    });
  }, [modal, t, markSentMutation]);

  const handleReceive = useCallback(() => {
    const args = goodsReceiptFromPoDrawerArgs(orderId);
    if (!args) return;
    openDrawer(args);
  }, [openDrawer, orderId]);

  const showSupplierActions = isPurchaseOrderPrintable(effectiveStatus);
  const canMarkSent = isPurchaseOrderConfirmed(effectiveStatus) && access.canEdit;
  const showReceive = access.canAdd && canReceive;
  const editable = !readOnly && (mode === "create" ? access.canAdd : access.canEdit);
  const supplierActionPending = pdfPending || markSentMutation.isPending;

  const patchLine = useCallback((index, patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, "item_id")) {
      expectedDateAutoRef.current = true;
    }
    // Saved VAT and line totals no longer match once the line changes; they refresh on save.
    setLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, ...patch, saved_tax_rate: undefined, saved_line_total: undefined } : line,
      ),
    );
  }, []);

  const removeLine = useCallback((index) => {
    expectedDateAutoRef.current = true;
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [getEmptyPurchaseOrderLine()];
    });
  }, []);

  const handleHeaderValuesChange = useCallback((changed) => {
    if (!changed || typeof changed !== "object") return;
    if ("currency_id" in changed) {
      const nextId = changed.currency_id;
      if (nextId == null || primaryCurrencyId == null || Number(nextId) === Number(primaryCurrencyId)) {
        form.setFieldsValue({ exchange_rate: 1 });
      } else {
        const rate = drawerData.rateFromPrimary(Number(nextId));
        form.setFieldsValue({ exchange_rate: rate != null && rate > 0 ? rate : undefined });
      }
    }
    if ("order_date" in changed || "supplier_id" in changed) {
      expectedDateAutoRef.current = true;
    }
    if ("expected_date" in changed && !applyingExpectedDateRef.current) {
      expectedDateAutoRef.current = false;
    }
  }, [form, primaryCurrencyId, drawerData]);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptyPurchaseOrderLine()]);
  }, []);

  const titleBase =
    mode === "create"
      ? t("poDrawerTitleCreate")
      : readOnly
        ? t("poDrawerTitleView")
        : t("poDrawerTitleEdit");
  const title = loadedNumber ? `${titleBase} # ${loadedNumber}` : titleBase;

  const showDetailLoading = fetchRemoteDetail && detailQuery.isLoading;
  const busy = submitting || supplierActionPending;
  const saveDisabled = !canSubmitRequired;

  useDrawerSubmitShortcut({
    enabled: open && editable,
    submitting: busy,
    onSave: handleSave,
    saveDisabled,
    onPost: handleConfirm,
    postDisabled: !canSubmitRequired,
  });

  // Live totals while editing (same tax rules as the server: item VAT group, supplier exemption on the order date).
  const supplierExempt = customerIsExemptOnDate(drawerData.supplierDetail, formValuesWatch?.order_date);
  const itemsById = useMemo(
    () => new Map(drawerData.itemOptions.map((row) => [String(row.value), row])),
    [drawerData.itemOptions],
  );
  const pricesIncludeTax = settings.taxPriceMode === "inclusive";
  const liveTotals = previewInvoiceTotals({
    lines,
    itemsById,
    taxEnabled: settings.taxEnabled,
    pricesIncludeTax,
    customerExempt: supplierExempt,
    settings,
  });
  const displayTotals = editable ? liveTotals : loadedTotals;

  return (
    <ResourceCrudDrawer
      documentBranch={detailEnabled && detailQuery.data && typeof detailQuery.data === "object" ? detailQuery.data : null}
      className="sales-invoice-crud-drawer"
      title={title}
      open={open}
      requestClose={requestClose}
      submitting={busy}
      showExpand={false}
      placement="top"
      size="100%"
      headerExtra={
        effectiveStatus ? (
          <div className="sales-invoice-drawer-header-meta">
            <Tag className="m-0" color={purchaseOrderStatusTagColor(effectiveStatus)}>
              {getPurchaseOrderStatusLabel(t, effectiveStatus)}
            </Tag>
          </div>
        ) : null
      }
      showDetailLoading={showDetailLoading}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        <PurchaseOrderDrawerFooter
          t={t}
          editable={editable}
          isNew={mode === "create" || orderId == null}
          submitting={busy}
          saveDisabled={saveDisabled}
          confirmDisabled={!canSubmitRequired}
          showDelete={editable && orderId != null && access.canDelete}
          showConfirm={editable}
          showCancelOrder={orderId != null && access.canEdit && isPurchaseOrderCancellable(effectiveStatus)}
          showPdf={showSupplierActions && access.canPrint}
          showMarkSent={canMarkSent}
          showReceive={showReceive}
          pdfLoading={isDownloadPending}
          printLoading={isPrintPending}
          createdBy={loadedCreatedBy}
          createdAt={loadedCreatedAt}
          sentBy={loadedSentBy}
          sentAt={loadedSentAt}
          forceClose={forceClose}
          requestClose={requestClose}
          onSave={handleSave}
          onConfirm={handleConfirm}
          onCancelOrder={handleCancelOrder}
          onDelete={handleDelete}
          onPrint={handlePrint}
          onDownloadPdf={handleDownloadPdf}
          onMarkSent={handleMarkSent}
          onReceive={handleReceive}
        />
      }
    >
      <div className="sales-invoice-keyboard-root">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="item-general-form sales-invoice-form"
          disabled={!editable || submitting}
          onValuesChange={handleHeaderValuesChange}
        >
          <PurchaseOrderDrawerForm
            readOnly={!editable || submitting}
            t={t}
            supplierOptions={drawerData.supplierOptions}
            warehouseOptions={drawerData.warehouseOptions}
            suppliersPending={drawerData.suppliersPending}
            warehousesPending={drawerData.warehousesPending}
            currencyOptions={drawerData.currencyOptions}
            currenciesPending={drawerData.currenciesPending}
            exchangeRateLocked={exchangeRateLocked}
            exchangeRateHelp={exchangeRateHelp}
          />
          <PurchaseOrderLineEditor
            lines={lines}
            readOnly={!editable || submitting}
            itemOptions={drawerData.itemOptions}
            itemsPending={drawerData.itemsPending}
            lastPriceByItemId={lastPriceByItemId}
            canAddLine={canAddLine}
            currencySymbol={documentCurrencySymbol}
            taxEnabled={settings.taxEnabled}
            pricesIncludeTax={pricesIncludeTax}
            supplierExempt={supplierExempt}
            settings={settings}
            onPatchLine={patchLine}
            onRemoveLine={removeLine}
            onAddLine={addLine}
            t={t}
          />
          <PurchaseOrderTotals t={t} totals={displayTotals} />
        </Form>
      </div>
    </ResourceCrudDrawer>
  );
}
