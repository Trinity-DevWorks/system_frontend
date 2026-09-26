"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

/**
 * Stock transfer drawer — draft header/lines, save, dispatch, receive, leftover close, cancel, delete.
 */

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { STOCK_ADJUSTMENT_REASONS_QUERY_KEY, STOCK_TRANSFER_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { fetchStockAdjustmentReasons } from "../../api/stockAdjustmentReasons.api";
import { fetchStockTransfer } from "../../api/stockTransfers.api";
import { useQuery } from "@tanstack/react-query";
import { App, Form, Tag } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getStockTransferStatusLabel,
  getStockTransferStatusTagColor,
  isStockTransferDraft,
  isStockTransferInTransit,
} from "../../utils/stockTransferStatuses";
import StockTransferCloseOpenModal from "./StockTransferCloseOpenModal";
import StockTransferDrawerFooter from "./StockTransferDrawerFooter";
import StockTransferDrawerForm from "./StockTransferDrawerForm";
import StockTransferHistoryPanel from "./StockTransferHistoryPanel";
import StockTransferLineEditor from "./StockTransferLineEditor";
import StockTransferReceiveModal from "./StockTransferReceiveModal";
import {
  areTransferLinesDirty,
  canAddTransferLine,
  canSaveTransferDraft,
  getEmptyTransferLine,
  getStockTransferDefaults,
  isTransferHeaderDirtyVsBaseline,
  mapTransferLinesFromApi,
  mapTransferRecordToForm,
} from "../../utils/stockTransferDrawerUtils";
import { useStockTransferDrawerData } from "../../queries/useStockTransferDrawerData";
import { useStockTransferDrawerMutations } from "../../queries/useStockTransferDrawerMutations";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   transferId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function StockTransferDrawer({
  open,
  mode,
  transferId,
  tableSeedRecord = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();

  const [lines, setLines] = useState(() => [getEmptyTransferLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => [getEmptyTransferLine()]);
  const [headerBaseline, setHeaderBaseline] = useState(() => getStockTransferDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const [loadedDispatchedAt, setLoadedDispatchedAt] = useState(/** @type {string | null} */ (null));
  const [loadedDispatchedBy, setLoadedDispatchedBy] = useState(/** @type {unknown} */ (null));
  const [loadedReceivedAt, setLoadedReceivedAt] = useState(/** @type {string | null} */ (null));
  const [loadedReceivedBy, setLoadedReceivedBy] = useState(/** @type {unknown} */ (null));
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const defaults = useMemo(() => getStockTransferDefaults(), []);
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && (mode === "edit" || mode === "view") && transferId != null;
  const fetchRemoteDetail = detailEnabled;

  const detailQuery = useQuery({
    queryKey: [...STOCK_TRANSFER_DETAIL_QUERY_PREFIX, transferId],
    queryFn: () => fetchStockTransfer(/** @type {string} */ (transferId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapTransferLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      const nextLines = mappedLines.length > 0 ? mappedLines : [getEmptyTransferLine()];
      setLines(nextLines);
      setLinesBaseline(nextLines);
      setHeaderBaseline(mapTransferRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.transfer_number === "string" ? record.transfer_number : null);
      setLoadedDispatchedAt(typeof record.dispatched_at === "string" ? record.dispatched_at : null);
      setLoadedDispatchedBy(record.dispatched_by ?? null);
      setLoadedReceivedAt(typeof record.received_at === "string" ? record.received_at : null);
      setLoadedReceivedBy(record.received_by ?? null);
      form.setFieldsValue(mapTransferRecordToForm(record));
    },
    [form],
  );
  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    const initialLines = [getEmptyTransferLine()];
    setLines(initialLines);
    setLinesBaseline(initialLines);
    setHeaderBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    setLoadedDispatchedAt(null);
    setLoadedDispatchedBy(null);
    setLoadedReceivedAt(null);
    setLoadedReceivedBy(null);
    loadedDetailVersionRef.current = 0;
  }, [form, defaults]);

  useLayoutEffect(() => {
    if (!open) return;
    if (mode === "create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetCreateDraftState();
      return;
    }

    if (tableSeedRecord && typeof tableSeedRecord === "object") {
      setLoadedStatus(typeof tableSeedRecord.status === "string" ? tableSeedRecord.status : null);
      setLoadedNumber(
        typeof tableSeedRecord.transfer_number === "string"
          ? tableSeedRecord.transfer_number
          : null,
      );
      setLoadedDispatchedAt(
        typeof tableSeedRecord.dispatched_at === "string" ? tableSeedRecord.dispatched_at : null,
      );
      setLoadedDispatchedBy(tableSeedRecord.dispatched_by ?? null);
      setLoadedReceivedAt(
        typeof tableSeedRecord.received_at === "string" ? tableSeedRecord.received_at : null,
      );
      setLoadedReceivedBy(tableSeedRecord.received_by ?? null);
    }
  }, [open, mode, tableSeedRecord, resetCreateDraftState]);

  useEffect(() => {
    if (!open || mode === "create" || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncBaselinesFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, mode, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncBaselinesFromRecord]);

  const effectiveStatus = loadedStatus ?? (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly = mode === "view" || !isStockTransferDraft(effectiveStatus);

  const fromWatch = Form.useWatch("from_warehouse_id", form);
  const toWatch = Form.useWatch("to_warehouse_id", form);
  const formValuesWatch = Form.useWatch([], form);

  const drawerData = useStockTransferDrawerData({ open, t });

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults,
    isCreateDirtyVsBaseline: isTransferHeaderDirtyVsBaseline,
  });

  const isLinesDirty = useMemo(
    () => areTransferLinesDirty(lines, linesBaseline),
    [lines, linesBaseline],
  );

  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isTransferHeaderDirtyVsBaseline(form, headerBaseline);
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
      onCreated?.(record);
      syncBaselinesFromRecordAndBump(record);
    },
    [onCreated, syncBaselinesFromRecordAndBump],
  );

  const { saveMutation, dispatchMutation, receiveMutation, closeOpenMutation, cancelMutation, deleteMutation, submitting } =
    useStockTransferDrawerMutations({
      form,
      message,
      notification,
      t,
      tApiErrors,
      transferId,
      lines,
      onCreated: handleCreated,
      onSaved: syncBaselinesFromRecordAndBump,
      onDispatched: syncBaselinesFromRecordAndBump,
      onReceived: (record) => {
        syncBaselinesFromRecordAndBump(record);
        setReceiveOpen(false);
      },
      onClosedOpen: (record) => {
        syncBaselinesFromRecordAndBump(record);
        setCloseOpen(false);
      },
      onCancelled: syncBaselinesFromRecordAndBump,
      onDeleted: forceClose,
      onClose: forceClose,
    });

  const currentValues = useMemo(
    () => ({
      from_warehouse_id: fromWatch,
      to_warehouse_id: toWatch,
      notes: formValuesWatch?.notes ?? "",
    }),
    [fromWatch, toWatch, formValuesWatch],
  );

  const canSubmitRequired = useMemo(
    () => canSaveTransferDraft(currentValues, lines),
    [currentValues, lines],
  );

  const canAddLine = useMemo(() => canAddTransferLine(lines), [lines]);

  const handleSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => saveMutation.mutate({ values }))
      .catch(() => {});
  }, [form, saveMutation]);

  const handleDispatch = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        modal.confirm({
          title: t("transferDispatchConfirmTitle"),
          content: t("transferDispatchConfirmContent"),
          okText: t("transferDispatchConfirmOk"),
          cancelText: t("drawerCancel"),
          onOk: () => closeConfirmOnError(dispatchMutation.mutateAsync({ values })),
        });
      })
      .catch(() => {});
  }, [form, modal, t, dispatchMutation]);

  const handleReceive = useCallback(() => {
    setReceiveOpen(true);
  }, []);

  const handleCloseOpen = useCallback(() => {
    setCloseOpen(true);
  }, []);

  const handleCancelTransfer = useCallback(() => {
    modal.confirm({
      title: isStockTransferInTransit(effectiveStatus)
        ? t("transferCancelInTransitConfirmTitle")
        : t("transferCancelConfirmTitle"),
      content: isStockTransferInTransit(effectiveStatus)
        ? t("transferCancelInTransitConfirmContent")
        : t("transferCancelConfirmContent"),
      okText: t("transferCancelConfirmOk"),
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(cancelMutation.mutateAsync()),
    });
  }, [modal, t, cancelMutation, effectiveStatus]);

  const handleDelete = useCallback(() => {
    const name = loadedNumber ?? String(transferId ?? "");
    modal.confirm({
      title: t("transferDeleteConfirmTitle"),
      content: t("transferDeleteConfirmContent", { name }),
      okText: t("transferDeleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
    });
  }, [modal, t, deleteMutation, loadedNumber, transferId]);

  const patchLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const removeLine = useCallback((index) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [getEmptyTransferLine()];
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptyTransferLine()]);
  }, []);

  const title =
    mode === "create"
      ? t("transferDrawerTitleCreate")
      : mode === "view"
        ? t("transferDrawerTitleView")
        : t("transferDrawerTitleEdit");

  const showDetailLoading = fetchRemoteDetail && detailQuery.isLoading;
  const detailRecord =
    detailQuery.data && typeof detailQuery.data === "object"
      ? /** @type {Record<string, unknown>} */ (detailQuery.data)
      : tableSeedRecord && typeof tableSeedRecord === "object"
        ? tableSeedRecord
        : null;
  const canReceive = detailRecord?.can_receive === true;
  const canCancelInTransit = detailRecord?.can_cancel_transit === true;
  const canCloseOpen =
    typeof detailRecord?.can_close_open === "boolean" ? detailRecord.can_close_open : false;
  const apiLines = Array.isArray(detailRecord?.lines)
    ? /** @type {Array<Record<string, unknown>>} */ (detailRecord.lines)
    : [];
  const receipts = Array.isArray(detailRecord?.receipts)
    ? /** @type {Array<Record<string, unknown>>} */ (detailRecord.receipts)
    : [];
  const closures = Array.isArray(detailRecord?.closures)
    ? /** @type {Array<Record<string, unknown>>} */ (detailRecord.closures)
    : [];

  const reasonsQuery = useQuery({
    queryKey: [...STOCK_ADJUSTMENT_REASONS_QUERY_KEY, "close-open"],
    queryFn: () => fetchStockAdjustmentReasons({ per_page: 100 }),
    enabled: open && closeOpen,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const reasonOptions = useMemo(
    () =>
      (reasonsQuery.data?.rows ?? [])
        .filter((row) => row && typeof row === "object" && row.is_active !== false)
        .map((row) => ({
          value: Number(row.id),
          label: String(row.name ?? row.code ?? row.id),
        }))
        .filter((row) => Number.isFinite(row.value)),
    [reasonsQuery.data],
  );

  return (
    <ResourceCrudDrawer
      title={title}
      recordName={loadedNumber}
      titleExtra={
        effectiveStatus ? (
          <Tag className="m-0" color={getStockTransferStatusTagColor(effectiveStatus)}>
            {getStockTransferStatusLabel(t, effectiveStatus)}
          </Tag>
        ) : null
      }
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showExpand
      showDetailLoading={showDetailLoading}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      size={1200}
      footer={
        <StockTransferDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!canSubmitRequired}
          dispatchDisabled={!canSubmitRequired}
          showDelete={!readOnly && transferId != null}
          canReceive={canReceive}
          canCancelInTransit={canCancelInTransit}
          canCloseOpen={canCloseOpen}
          onSave={handleSave}
          onDispatch={handleDispatch}
          onReceive={handleReceive}
          onCloseOpen={handleCloseOpen}
          onCancelTransfer={handleCancelTransfer}
          onDelete={handleDelete}
          dispatchedBy={loadedDispatchedBy}
          dispatchedAt={loadedDispatchedAt}
          receivedBy={loadedReceivedBy}
          receivedAt={loadedReceivedAt}
        />
      }
    >
      <StockTransferDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        warehouseOptions={drawerData.warehouseOptions}
        warehousesPending={drawerData.warehousesPending}
      />
      <StockTransferLineEditor
        lines={lines}
        readOnly={readOnly || submitting}
        itemOptions={drawerData.itemOptions}
        stockableItems={drawerData.stockableItems}
        fromWarehouseId={fromWatch}
        itemsPending={drawerData.itemsPending}
        canAddLine={canAddLine}
        onPatchLine={patchLine}
        onRemoveLine={removeLine}
        onAddLine={addLine}
        t={t}
      />
      <StockTransferHistoryPanel receipts={receipts} closures={closures} t={t} />
      <StockTransferReceiveModal
        open={receiveOpen}
        lines={apiLines}
        submitting={receiveMutation.isPending}
        t={t}
        onCancel={() => setReceiveOpen(false)}
        onSubmit={(body) => receiveMutation.mutate(body)}
      />
      <StockTransferCloseOpenModal
        open={closeOpen}
        lines={apiLines}
        reasonOptions={reasonOptions}
        reasonsPending={reasonsQuery.isPending}
        submitting={closeOpenMutation.isPending}
        t={t}
        onCancel={() => setCloseOpen(false)}
        onSubmit={(body) => closeOpenMutation.mutate(body)}
      />
    </ResourceCrudDrawer>
  );
}
