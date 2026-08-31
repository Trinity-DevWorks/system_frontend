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
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { goodsReceiptFromPoDrawerArgs } from "../../utils/goodsReceiptFromPurchaseOrder";
import {
  downloadPurchaseOrderPdf,
  fetchPurchaseOrder,
  markPurchaseOrderAsSent,
} from "../../api/purchaseOrders.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  isPurchaseOrderCancellable,
  isPurchaseOrderConfirmed,
  isPurchaseOrderDraft,
  isPurchaseOrderPrintable,
} from "../../utils/purchaseOrderStatuses";
import PurchaseOrderDrawerFooter from "./PurchaseOrderDrawerFooter";
import PurchaseOrderDrawerForm from "./PurchaseOrderDrawerForm";
import PurchaseOrderLineEditor from "./PurchaseOrderLineEditor";
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
import { applySuggestedPurchaseOrderUnitPrices } from "../../utils/purchaseOrderLastPurchasePrice";
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
  const [canReceive, setCanReceive] = useState(false);

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
      setCanReceive(Boolean(record.can_receive));
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
    setCanReceive(false);
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
        applySuggestedPurchaseOrderUnitPrices(prev, drawerData.lastPriceByItemId, { overwrite: true }),
      );
      return;
    }
    setLines((prev) =>
      applySuggestedPurchaseOrderUnitPrices(prev, drawerData.lastPriceByItemId, { overwrite: false }),
    );
  }, [drawerData.lastPriceByItemId, drawerData.supplierPricesPending, readOnly]);

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

  const pdfMutation = useMutation({
    mutationFn: async () => {
      if (orderId == null) throw new Error("Missing purchase order id");
      await downloadPurchaseOrderPdf(orderId, loadedNumber ?? undefined);
    },
    onError: (err) => {
      notification.error({
        title: t("poPdfError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
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
    pdfMutation.mutate();
  }, [pdfMutation]);

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
  const canMarkSent = isPurchaseOrderConfirmed(effectiveStatus);
  const showReceive = access.canAdd && canReceive;
  const supplierActionPending = pdfMutation.isPending || markSentMutation.isPending;

  const patchLine = useCallback((index, patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, "item_id")) {
      expectedDateAutoRef.current = true;
    }
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
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
    if ("order_date" in changed || "supplier_id" in changed) {
      expectedDateAutoRef.current = true;
    }
    if ("expected_date" in changed && !applyingExpectedDateRef.current) {
      expectedDateAutoRef.current = false;
    }
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptyPurchaseOrderLine()]);
  }, []);

  const title =
    mode === "create"
      ? t("poDrawerTitleCreate")
      : mode === "view"
        ? t("poDrawerTitleView")
        : t("poDrawerTitleEdit");

  const showDetailLoading = fetchRemoteDetail && detailQuery.isLoading;

  return (
    <ResourceCrudDrawer
      title={title}
      recordName={loadedNumber}
      open={open}
      requestClose={requestClose}
      submitting={submitting || supplierActionPending}
      showExpand
      showDetailLoading={showDetailLoading}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      size={1100}
      skeletonParagraphRows={6}
      footer={
        <PurchaseOrderDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting || supplierActionPending}
          saveDisabled={!canSubmitRequired}
          confirmDisabled={!canSubmitRequired}
          showDelete={!readOnly && orderId != null}
          showCancelOrder={orderId != null && isPurchaseOrderCancellable(effectiveStatus)}
          showSupplierActions={showSupplierActions}
          canMarkSent={canMarkSent}
          canReceive={showReceive}
          pdfLoading={pdfMutation.isPending}
          onSave={handleSave}
          onConfirm={handleConfirm}
          onCancelOrder={handleCancelOrder}
          onDelete={handleDelete}
          onDownloadPdf={handleDownloadPdf}
          onMarkSent={handleMarkSent}
          onReceive={handleReceive}
        />
      }
    >
      <PurchaseOrderDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        supplierOptions={drawerData.supplierOptions}
        warehouseOptions={drawerData.warehouseOptions}
        suppliersPending={drawerData.suppliersPending}
        warehousesPending={drawerData.warehousesPending}
        poNumber={loadedNumber}
        poStatus={effectiveStatus}
        sentAt={loadedSentAt}
        showMeta={mode !== "create"}
        onValuesChange={handleHeaderValuesChange}
      />
      <PurchaseOrderLineEditor
        lines={lines}
        readOnly={readOnly || submitting}
        itemOptions={drawerData.itemOptions}
        itemsPending={drawerData.itemsPending}
        lastPriceByItemId={drawerData.lastPriceByItemId}
        canAddLine={canAddLine}
        onPatchLine={patchLine}
        onRemoveLine={removeLine}
        onAddLine={addLine}
        t={t}
      />
    </ResourceCrudDrawer>
  );
}
