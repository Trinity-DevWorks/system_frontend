"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useResourceAccess } from "@/lib/permissions";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { STOCK_REVALUATION_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { fetchStockRevaluation } from "../../api/stockRevaluations.api";
import { useQuery } from "@tanstack/react-query";
import { App, Form, Tag } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getStockRevaluationStatusLabel, isStockRevaluationDraft } from "../../utils/stockRevaluationStatuses";
import StockRevaluationDrawerFooter from "./StockRevaluationDrawerFooter";
import StockRevaluationDrawerForm from "./StockRevaluationDrawerForm";
import StockRevaluationLineEditor from "./StockRevaluationLineEditor";
import {
  areSrvLinesDirty,
  canSaveSrvDraft,
  getEmptySrvLine,
  getSeededSrvLine,
  getStockRevaluationDefaults,
  getValidSrvLines,
  isSrvHeaderDirtyVsBaseline,
  mapSrvLinesFromApi,
  mapSrvRecordToForm,
} from "../../utils/stockRevaluationDrawerUtils";
import { useStockRevaluationDrawerData } from "../../queries/useStockRevaluationDrawerData";
import { useStockRevaluationDrawerMutations } from "../../queries/useStockRevaluationDrawerMutations";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   documentId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   createSeed?: import("../../utils/stockRevaluationDrawerUtils").SrvCreateSeed | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function StockRevaluationDocumentDrawer({
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
  const access = useResourceAccess("stock");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();

  const [lines, setLines] = useState(() => [getEmptySrvLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => []);
  const [headerBaseline, setHeaderBaseline] = useState(() => getStockRevaluationDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));

  const defaults = useMemo(() => {
    void open;
    return getStockRevaluationDefaults(createSeed);
  }, [createSeed, open]);
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && (mode === "edit" || mode === "view") && documentId != null;

  const detailQuery = useQuery({
    queryKey: [...STOCK_REVALUATION_DETAIL_QUERY_PREFIX, documentId],
    queryFn: () => fetchStockRevaluation(/** @type {string} */ (documentId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapSrvLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      const nextLines = mappedLines.length > 0 ? mappedLines : [getEmptySrvLine()];
      setLines(nextLines);
      setLinesBaseline(mappedLines);
      setHeaderBaseline(mapSrvRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.srv_number === "string" ? record.srv_number : null);
      form.setFieldsValue(mapSrvRecordToForm(record));
    },
    [form],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    setLines([getSeededSrvLine(createSeed)]);
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
  const readOnly = mode === "view" || !isStockRevaluationDraft(effectiveStatus);

  const formValuesWatch = Form.useWatch([], form);
  const watchedWarehouseId = Form.useWatch("warehouse_id", form);
  const drawerData = useStockRevaluationDrawerData({ open });

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode: "create",
    form,
    defaults,
    isCreateDirtyVsBaseline: isSrvHeaderDirtyVsBaseline,
  });

  const isLinesDirty = useMemo(() => areSrvLinesDirty(lines, linesBaseline), [lines, linesBaseline]);
  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isSrvHeaderDirtyVsBaseline(form, headerBaseline);
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

  const { saveMutation, postMutation, reverseMutation, deleteMutation, submitting } = useStockRevaluationDrawerMutations({
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
    onReversed: syncBaselinesFromRecordAndBump,
    onDeleted: forceClose,
    onClose: forceClose,
  });

  const canSubmitRequired = useMemo(() => canSaveSrvDraft(formValuesWatch ?? {}), [formValuesWatch]);
  const canPost = canSubmitRequired && getValidSrvLines(lines).length > 0;

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
          title: t("srvPostConfirmTitle"),
          content: t("srvPostConfirmContent"),
          okText: t("actionPostRevaluation"),
          cancelText: t("drawerCancel"),
          onOk: () => closeConfirmOnError(postMutation.mutateAsync({ values })),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleReverse = useCallback(() => {
    modal.confirm({
      title: t("reverseConfirmTitle"),
      content: t("reverseConfirmContent"),
      okText: t("actionReverseRevaluation"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(reverseMutation.mutateAsync()),
    });
  }, [modal, t, reverseMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("srvDeleteConfirmTitle"),
      content: t("srvDeleteConfirmContent", { name: loadedNumber ?? "" }),
      okText: t("srvDeleteConfirmOk"),
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
      return next.length > 0 ? next : [getEmptySrvLine()];
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptySrvLine()]);
  }, []);

  const title =
    mode === "create"
      ? t("srvDrawerTitleCreate")
      : mode === "view"
        ? t("srvDrawerTitleView")
        : t("srvDrawerTitleEdit");

  return (
    <ResourceCrudDrawer
      documentBranch={detailEnabled && detailQuery.data && typeof detailQuery.data === "object" ? detailQuery.data : null}
      title={title}
      recordName={loadedNumber}
      titleExtra={
        effectiveStatus ? (
          <Tag className="m-0" color={effectiveStatus === "posted" ? "green" : effectiveStatus === "reversed" ? "warning" : "default"}>
            {getStockRevaluationStatusLabel(t, effectiveStatus)}
          </Tag>
        ) : null
      }
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showExpand
      showDetailLoading={detailEnabled && detailQuery.isLoading}
      detailLoadFailed={Boolean(detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      size={1180}
      footer={
        <StockRevaluationDrawerFooter
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
          showReverse={effectiveStatus === "posted" && documentId != null && access.canReverse}
          onReverse={handleReverse}
          onDelete={handleDelete}
        />
      }
    >
      <StockRevaluationDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        warehouseOptions={drawerData.warehouseOptions}
        warehousesPending={drawerData.warehousesPending}
      />
      <StockRevaluationLineEditor
        lines={lines.length > 0 ? lines : [getEmptySrvLine()]}
        readOnly={readOnly || submitting}
        warehouseId={watchedWarehouseId != null ? Number(watchedWarehouseId) : undefined}
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
