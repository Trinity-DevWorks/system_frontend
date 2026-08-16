"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import { PURCHASE_ORDER_DETAIL_QUERY_PREFIX, PURCHASE_ORDERS_QUERY_KEY } from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCreateDiscardBaseline } from "@/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import {
  downloadPurchaseOrderPdf,
  fetchPurchaseOrder,
  markPurchaseOrderAsSent,
} from "@/services/purchaseOrdersApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  isPurchaseOrderCancellable,
  isPurchaseOrderConfirmed,
  isPurchaseOrderDraft,
  isPurchaseOrderPrintable,
} from "../../shared/purchaseOrderStatuses";
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
} from "./purchaseOrderDrawerUtils";
import { usePurchaseOrderDrawerData } from "./usePurchaseOrderDrawerData";
import { usePurchaseOrderDrawerMutations } from "./usePurchaseOrderDrawerMutations";

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
  const [form] = Form.useForm();

  const [lines, setLines] = useState(() => [getEmptyPurchaseOrderLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => [getEmptyPurchaseOrderLine()]);
  const [headerBaseline, setHeaderBaseline] = useState(() => getPurchaseOrderDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const [loadedSentAt, setLoadedSentAt] = useState(/** @type {string | null} */ (null));

  const queryClient = useQueryClient();

  const defaults = useMemo(() => getPurchaseOrderDefaults(), []);
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && (mode === "edit" || mode === "view") && orderId != null;
  const fetchRemoteDetail = detailEnabled;

  const detailQuery = useQuery({
    queryKey: [...PURCHASE_ORDER_DETAIL_QUERY_PREFIX, orderId],
    queryFn: () => fetchPurchaseOrder(/** @type {string} */ (orderId)),
    enabled: detailEnabled,
    staleTime: 60_000,
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
      form.setFieldsValue(mapPurchaseOrderRecordToForm(record));
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
    loadedDetailVersionRef.current = 0;
  }, [form, defaults]);

  useLayoutEffect(() => {
    if (!open) return;
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

  const drawerData = usePurchaseOrderDrawerData({ open, t });

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
          onOk: () => confirmMutation.mutateAsync({ values }),
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
      onOk: () => cancelMutation.mutateAsync(),
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
      onOk: () => deleteMutation.mutateAsync(),
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
      onOk: () => markSentMutation.mutateAsync(),
    });
  }, [modal, t, markSentMutation]);

  const showSupplierActions = isPurchaseOrderPrintable(effectiveStatus);
  const canMarkSent = isPurchaseOrderConfirmed(effectiveStatus);
  const supplierActionPending = pdfMutation.isPending || markSentMutation.isPending;

  const patchLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const removeLine = useCallback((index) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [getEmptyPurchaseOrderLine()];
    });
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
      size={980}
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
          pdfLoading={pdfMutation.isPending}
          onSave={handleSave}
          onConfirm={handleConfirm}
          onCancelOrder={handleCancelOrder}
          onDelete={handleDelete}
          onDownloadPdf={handleDownloadPdf}
          onMarkSent={handleMarkSent}
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
      />
      <PurchaseOrderLineEditor
        lines={lines}
        readOnly={readOnly || submitting}
        itemOptions={drawerData.itemOptions}
        itemsPending={drawerData.itemsPending}
        canAddLine={canAddLine}
        onPatchLine={patchLine}
        onRemoveLine={removeLine}
        onAddLine={addLine}
        t={t}
      />
    </ResourceCrudDrawer>
  );
}
