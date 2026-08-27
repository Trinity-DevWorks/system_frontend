"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { STOCK_ADJUSTMENT_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { fetchStockAdjustment } from "../../api/stockAdjustments.api";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isStockAdjustmentDraft } from "../../utils/stockAdjustmentStatuses";
import StockAdjustmentDrawerFooter from "./StockAdjustmentDrawerFooter";
import StockAdjustmentDrawerForm from "./StockAdjustmentDrawerForm";
import StockAdjustmentLineEditor from "./StockAdjustmentLineEditor";
import {
  areAdjLinesDirty,
  canSaveAdjDraft,
  getEmptyAdjLine,
  getSeededAdjLine,
  getStockAdjustmentDefaults,
  getValidAdjLines,
  isAdjHeaderDirtyVsBaseline,
  mapAdjLinesFromApi,
  mapAdjRecordToForm,
} from "../../utils/stockAdjustmentDrawerUtils";
import { useStockAdjustmentDrawerData } from "../../queries/useStockAdjustmentDrawerData";
import { useStockAdjustmentDrawerMutations } from "../../queries/useStockAdjustmentDrawerMutations";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   documentId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   createSeed?: import("../../utils/stockAdjustmentDrawerUtils").AdjCreateSeed | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function StockAdjustmentDocumentDrawer({
  open,
  mode,
  documentId,
  tableSeedRecord = null,
  createSeed = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();

  const [lines, setLines] = useState(() => [getEmptyAdjLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => []);
  const [headerBaseline, setHeaderBaseline] = useState(() => getStockAdjustmentDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));

  const defaults = useMemo(() => {
    void open;
    return getStockAdjustmentDefaults(createSeed);
  }, [createSeed, open]);
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && (mode === "edit" || mode === "view") && documentId != null;

  const detailQuery = useQuery({
    queryKey: [...STOCK_ADJUSTMENT_DETAIL_QUERY_PREFIX, documentId],
    queryFn: () => fetchStockAdjustment(/** @type {string} */ (documentId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapAdjLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      const nextLines = mappedLines.length > 0 ? mappedLines : [getEmptyAdjLine()];
      setLines(nextLines);
      setLinesBaseline(mappedLines);
      setHeaderBaseline(mapAdjRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.adj_number === "string" ? record.adj_number : null);
      form.setFieldsValue(mapAdjRecordToForm(record));
    },
    [form],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    setLines([getSeededAdjLine(createSeed)]);
    setLinesBaseline([]);
    setHeaderBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    loadedDetailVersionRef.current = 0;
  }, [form, defaults, createSeed]);

  useLayoutEffect(() => {
    if (!open) return;
    if (mode === "create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset create draft when the drawer opens
      resetCreateDraftState();
    }
  }, [open, mode, resetCreateDraftState]);

  useEffect(() => {
    if (!open || mode === "create" || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncBaselinesFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, mode, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncBaselinesFromRecord]);

  const effectiveStatus = loadedStatus ?? (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly = mode === "view" || !isStockAdjustmentDraft(effectiveStatus);

  const formValuesWatch = Form.useWatch([], form);
  const watchedWarehouseId = Form.useWatch("warehouse_id", form);
  const watchedReasonId = Form.useWatch("stock_adjustment_reason_id", form);
  const drawerData = useStockAdjustmentDrawerData({ open });

  const reasonDirection = useMemo(() => {
    const fromOptions = drawerData.reasonOptions.find((option) => option.value === watchedReasonId);
    if (fromOptions?.direction) return fromOptions.direction;
    const fromRecord = detailQuery.data?.reason?.direction;
    return typeof fromRecord === "string" ? fromRecord : null;
  }, [drawerData.reasonOptions, watchedReasonId, detailQuery.data]);

  const reasonSelectOptions = useMemo(() => {
    const options = [...drawerData.reasonOptions];
    const current = detailQuery.data?.reason;
    if (current && !options.some((option) => option.value === current.id)) {
      options.push({
        value: current.id,
        label: String(current.name ?? current.id),
        direction: typeof current.direction === "string" ? current.direction : "both",
        is_active: current.is_active !== false,
      });
    }
    return options;
  }, [drawerData.reasonOptions, detailQuery.data]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode: "create",
    form,
    defaults,
    isCreateDirtyVsBaseline: isAdjHeaderDirtyVsBaseline,
  });

  const isLinesDirty = useMemo(() => areAdjLinesDirty(lines, linesBaseline), [lines, linesBaseline]);
  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isAdjHeaderDirtyVsBaseline(form, headerBaseline);
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

  const { saveMutation, postMutation, deleteMutation, submitting } = useStockAdjustmentDrawerMutations({
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

  const canSubmitRequired = useMemo(() => canSaveAdjDraft(formValuesWatch ?? {}), [formValuesWatch]);
  const canPost = canSubmitRequired && getValidAdjLines(lines).length > 0;

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
          title: t("adjPostConfirmTitle"),
          content: t("adjPostConfirmContent"),
          okText: t("actionPostAdjustment"),
          cancelText: t("drawerCancel"),
          onOk: () => postMutation.mutateAsync({ values }),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("adjDeleteConfirmTitle"),
      content: t("adjDeleteConfirmContent", { name: loadedNumber ?? "" }),
      okText: t("adjDeleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => deleteMutation.mutateAsync(),
    });
  }, [modal, t, deleteMutation, loadedNumber]);

  const patchLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const removeLine = useCallback((index) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [getEmptyAdjLine()];
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptyAdjLine()]);
  }, []);

  const title =
    mode === "create"
      ? t("adjDrawerTitleCreate")
      : mode === "view"
        ? t("adjDrawerTitleView")
        : t("adjDrawerTitleEdit");

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
      size={1100}
      footer={
        <StockAdjustmentDrawerFooter
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
      <StockAdjustmentDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        warehouseOptions={drawerData.warehouseOptions}
        warehousesPending={drawerData.warehousesPending}
        reasonOptions={reasonSelectOptions}
        reasonsPending={drawerData.reasonsPending}
        adjNumber={loadedNumber}
      />
      <StockAdjustmentLineEditor
        lines={lines.length > 0 ? lines : [getEmptyAdjLine()]}
        readOnly={readOnly || submitting}
        warehouseId={watchedWarehouseId != null ? Number(watchedWarehouseId) : undefined}
        reasonDirection={reasonDirection}
        itemOptions={drawerData.itemOptions}
        itemsPending={drawerData.itemsPending}
        onPatchLine={patchLine}
        onRemoveLine={removeLine}
        onAddLine={addLine}
        t={t}
      />
    </ResourceCrudDrawer>
  );
}
