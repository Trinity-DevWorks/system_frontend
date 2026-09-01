"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { STOCK_COUNT_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { fetchStockCount } from "../../api/stockCounts.api";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isStockCountDraft } from "../../utils/stockCountStatuses";
import StockCountDrawerFooter from "./StockCountDrawerFooter";
import StockCountDrawerForm from "./StockCountDrawerForm";
import StockCountLineEditor from "./StockCountLineEditor";
import {
  areCntLinesDirty,
  canSaveCntDraft,
  getEmptyCntLine,
  getStockCountDefaults,
  getValidCntLines,
  isCntHeaderDirtyVsBaseline,
  mapCntLinesFromApi,
  mapCntRecordToForm,
} from "../../utils/stockCountDrawerUtils";
import { useStockCountDrawerData } from "../../queries/useStockCountDrawerData";
import { useStockCountDrawerMutations } from "../../queries/useStockCountDrawerMutations";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   documentId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function StockCountDrawer({
  open,
  mode,
  documentId,
  tableSeedRecord = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();

  const [lines, setLines] = useState(() => [getEmptyCntLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => []);
  const [headerBaseline, setHeaderBaseline] = useState(() => getStockCountDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));

  const drawerData = useStockCountDrawerData({ open });
  const defaults = useMemo(() => {
    void open;
    return {
      ...getStockCountDefaults(),
      warehouse_id: drawerData.defaultWarehouseId,
    };
  }, [open, drawerData.defaultWarehouseId]);
  const loadedDetailVersionRef = useRef(0);
  const warehouseIdRef = useRef(/** @type {unknown} */ (undefined));

  const detailEnabled = open && (mode === "edit" || mode === "view") && documentId != null;

  const detailQuery = useQuery({
    queryKey: [...STOCK_COUNT_DETAIL_QUERY_PREFIX, documentId],
    queryFn: () => fetchStockCount(/** @type {string} */ (documentId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapCntLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      const nextLines = mappedLines.length > 0 ? mappedLines : [getEmptyCntLine()];
      setLines(nextLines);
      setLinesBaseline(mappedLines);
      setHeaderBaseline(mapCntRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.cnt_number === "string" ? record.cnt_number : null);
      form.setFieldsValue(mapCntRecordToForm(record));
      warehouseIdRef.current = record.warehouse_id != null ? Number(record.warehouse_id) : undefined;
    },
    [form],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    setLines([getEmptyCntLine()]);
    setLinesBaseline([]);
    setHeaderBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    loadedDetailVersionRef.current = 0;
    warehouseIdRef.current =
      defaults.warehouse_id != null ? Number(defaults.warehouse_id) : undefined;
  }, [form, defaults]);

  useLayoutEffect(() => {
    if (!open || mode !== "create") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset create draft when the drawer opens
    resetCreateDraftState();
  }, [open, mode, resetCreateDraftState]);

  useEffect(() => {
    if (!open || mode === "create" || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncBaselinesFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, mode, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncBaselinesFromRecord]);

  const effectiveStatus = loadedStatus ?? (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly = mode === "view" || !isStockCountDraft(effectiveStatus);

  const formValuesWatch = Form.useWatch([], form);
  const watchedWarehouseId = Form.useWatch("warehouse_id", form);

  useEffect(() => {
    if (!open || readOnly) return;
    const next = watchedWarehouseId != null ? Number(watchedWarehouseId) : undefined;
    const prev = warehouseIdRef.current;
    warehouseIdRef.current = next;
    if (prev == null || next == null || Number(prev) === Number(next)) return;
    setLines([getEmptyCntLine()]);
  }, [open, readOnly, watchedWarehouseId]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode: "create",
    form,
    defaults,
    isCreateDirtyVsBaseline: isCntHeaderDirtyVsBaseline,
  });

  const isLinesDirty = useMemo(() => areCntLinesDirty(lines, linesBaseline), [lines, linesBaseline]);
  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isCntHeaderDirtyVsBaseline(form, headerBaseline);
  }, [mode, isCreateDirty, form, headerBaseline]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirty() || isLinesDirty;
    return isHeaderDirty || isLinesDirty;
  }, [readOnly, mode, isCreateDirty, isLinesDirty, isHeaderDirty]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose,
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

  const { saveMutation, loadBalancesMutation, postMutation, deleteMutation, submitting } =
    useStockCountDrawerMutations({
      form,
      message,
      notification,
      t,
      tApiErrors,
      documentId,
      lines,
      onCreated: handleCreated,
      onSaved: syncBaselinesFromRecordAndBump,
      onPosted: syncBaselinesFromRecordAndBump,
      onDeleted: forceClose,
      onClose: forceClose,
    });

  const canSubmitRequired = useMemo(() => canSaveCntDraft(formValuesWatch ?? {}), [formValuesWatch]);
  const canPost = canSubmitRequired && getValidCntLines(lines).length > 0;

  const handleSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => saveMutation.mutate({ values }))
      .catch(() => {});
  }, [form, saveMutation]);

  const handleLoadBalances = useCallback(() => {
    if (!canSubmitRequired) return;
    loadBalancesMutation.mutate();
  }, [canSubmitRequired, loadBalancesMutation]);

  const handlePost = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        modal.confirm({
          title: t("cntPostConfirmTitle"),
          content: t("cntPostConfirmContent"),
          okText: t("actionPostStockCount"),
          cancelText: t("drawerCancel"),
          onOk: () => closeConfirmOnError(postMutation.mutateAsync({ values })),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("cntDeleteConfirmTitle"),
      content: t("cntDeleteConfirmContent", { name: loadedNumber ?? "" }),
      okText: t("cntDeleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
    });
  }, [modal, t, deleteMutation, loadedNumber]);

  const patchLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const removeLine = useCallback((index) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [getEmptyCntLine()];
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptyCntLine()]);
  }, []);

  const title =
    mode === "create"
      ? t("cntDrawerTitleCreate")
      : mode === "view"
        ? t("cntDrawerTitleView")
        : t("cntDrawerTitleEdit");

  return (
    <ResourceCrudDrawer
      title={title}
      recordName={loadedNumber}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showExpand
      showDetailLoading={detailEnabled && detailQuery.isLoading}
      detailLoadFailed={Boolean(detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      size={1300}
      footer={
        <StockCountDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!canSubmitRequired}
          postDisabled={!canPost}
          showDelete={!readOnly && documentId != null}
          showPost={!readOnly}
          onSave={handleSave}
          onPost={handlePost}
          onDelete={handleDelete}
        />
      }
    >
      <StockCountDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        warehouseOptions={drawerData.warehouseOptions}
        warehousesPending={drawerData.warehousesPending}
        cntNumber={loadedNumber}
      />
      <StockCountLineEditor
        lines={lines.length > 0 ? lines : [getEmptyCntLine()]}
        readOnly={readOnly || submitting}
        warehouseId={watchedWarehouseId != null ? Number(watchedWarehouseId) : undefined}
        itemOptions={drawerData.itemOptions}
        itemsPending={drawerData.itemsPending}
        canLoadBalances={canSubmitRequired}
        loadingBalances={loadBalancesMutation.isPending}
        onLoadBalances={handleLoadBalances}
        onPatchLine={patchLine}
        onRemoveLine={removeLine}
        onAddLine={addLine}
        t={t}
      />
    </ResourceCrudDrawer>
  );
}
