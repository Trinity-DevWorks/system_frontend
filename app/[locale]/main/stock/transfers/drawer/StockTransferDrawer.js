"use client";

/**
 * Stock transfer drawer — draft header/lines, save, post, cancel, delete.
 */

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import { STOCK_TRANSFER_DETAIL_QUERY_PREFIX } from "@/components/stock/stockQueryCache";
import { useCreateDiscardBaseline } from "@/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { fetchStockTransfer } from "@/services/stockTransfersApi";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isStockTransferDraft } from "../../shared/stockTransferStatuses";
import StockTransferDrawerFooter from "./StockTransferDrawerFooter";
import StockTransferDrawerForm from "./StockTransferDrawerForm";
import StockTransferLineEditor from "./StockTransferLineEditor";
import {
  areTransferLinesDirty,
  canAddTransferLine,
  canSaveTransferDraft,
  getEmptyTransferLine,
  getStockTransferDefaults,
  isTransferHeaderDirtyVsBaseline,
  mapTransferLinesFromApi,
  mapTransferRecordToForm,
} from "./stockTransferDrawerUtils";
import { useStockTransferDrawerData } from "./useStockTransferDrawerData";
import { useStockTransferDrawerMutations } from "./useStockTransferDrawerMutations";

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

  const defaults = useMemo(() => getStockTransferDefaults(), []);
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && (mode === "edit" || mode === "view") && transferId != null;
  const fetchRemoteDetail = detailEnabled;

  const detailQuery = useQuery({
    queryKey: [...STOCK_TRANSFER_DETAIL_QUERY_PREFIX, transferId],
    queryFn: () => fetchStockTransfer(/** @type {string} */ (transferId)),
    enabled: detailEnabled,
    staleTime: 60_000,
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

  const { saveMutation, postMutation, cancelMutation, deleteMutation, submitting } =
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
      onPosted: syncBaselinesFromRecordAndBump,
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

  const handlePost = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        modal.confirm({
          title: t("transferPostConfirmTitle"),
          content: t("transferPostConfirmContent"),
          okText: t("transferPostConfirmOk"),
          cancelText: t("drawerCancel"),
          onOk: () => postMutation.mutateAsync({ values }),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleCancelTransfer = useCallback(() => {
    modal.confirm({
      title: t("transferCancelConfirmTitle"),
      content: t("transferCancelConfirmContent"),
      okText: t("transferCancelConfirmOk"),
      cancelText: t("drawerCancel"),
      onOk: () => cancelMutation.mutateAsync(),
    });
  }, [modal, t, cancelMutation]);

  const handleDelete = useCallback(() => {
    const name = loadedNumber ?? String(transferId ?? "");
    modal.confirm({
      title: t("transferDeleteConfirmTitle"),
      content: t("transferDeleteConfirmContent", { name }),
      okText: t("transferDeleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => deleteMutation.mutateAsync(),
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

  return (
    <ResourceCrudDrawer
      title={title}
      recordName={loadedNumber}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showExpand
      showDetailLoading={showDetailLoading}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      size={950}
      skeletonParagraphRows={6}
      footer={
        <StockTransferDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!canSubmitRequired}
          postDisabled={!canSubmitRequired}
          showDelete={!readOnly && transferId != null}
          showCancelTransfer={!readOnly && transferId != null}
          onSave={handleSave}
          onPost={handlePost}
          onCancelTransfer={handleCancelTransfer}
          onDelete={handleDelete}
        />
      }
    >
      <StockTransferDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        warehouseOptions={drawerData.warehouseOptions}
        warehousesPending={drawerData.warehousesPending}
        transferNumber={loadedNumber}
        transferStatus={effectiveStatus}
        showMeta={mode !== "create"}
      />
      <StockTransferLineEditor
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
