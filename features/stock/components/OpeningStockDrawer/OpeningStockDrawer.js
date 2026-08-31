"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { OPENING_STOCK_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { fetchOpeningStock } from "../../api/openingStocks.api";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isOpeningStockDraft } from "../../utils/openingStockStatuses";
import OpeningStockDrawerFooter from "./OpeningStockDrawerFooter";
import OpeningStockDrawerForm from "./OpeningStockDrawerForm";
import OpeningStockLineEditor from "./OpeningStockLineEditor";
import {
  areOsLinesDirty,
  canSaveOsDraft,
  getEmptyOsLine,
  getOpeningStockDefaults,
  getValidOsLines,
  isOsHeaderDirtyVsBaseline,
  mapOsLinesFromApi,
  mapOsRecordToForm,
} from "../../utils/openingStockDrawerUtils";
import { useOpeningStockDrawerData } from "../../queries/useOpeningStockDrawerData";
import { useOpeningStockDrawerMutations } from "../../queries/useOpeningStockDrawerMutations";

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
export default function OpeningStockDrawer({
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

  const [lines, setLines] = useState(() => [getEmptyOsLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => []);
  const [headerBaseline, setHeaderBaseline] = useState(() => getOpeningStockDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));

  const defaults = useMemo(() => {
    void open;
    return getOpeningStockDefaults();
  }, [open]);
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && (mode === "edit" || mode === "view") && documentId != null;

  const detailQuery = useQuery({
    queryKey: [...OPENING_STOCK_DETAIL_QUERY_PREFIX, documentId],
    queryFn: () => fetchOpeningStock(/** @type {string} */ (documentId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapOsLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      const nextLines = mappedLines.length > 0 ? mappedLines : [getEmptyOsLine()];
      setLines(nextLines);
      setLinesBaseline(mappedLines);
      setHeaderBaseline(mapOsRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.os_number === "string" ? record.os_number : null);
      form.setFieldsValue(mapOsRecordToForm(record));
    },
    [form],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    setLines([getEmptyOsLine()]);
    setLinesBaseline([]);
    setHeaderBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    loadedDetailVersionRef.current = 0;
  }, [form, defaults]);

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
  const readOnly = mode === "view" || !isOpeningStockDraft(effectiveStatus);

  const formValuesWatch = Form.useWatch([], form);
  const watchedWarehouseId = Form.useWatch("warehouse_id", form);
  const drawerData = useOpeningStockDrawerData({ open });

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode: "create",
    form,
    defaults,
    isCreateDirtyVsBaseline: isOsHeaderDirtyVsBaseline,
  });

  const isLinesDirty = useMemo(() => areOsLinesDirty(lines, linesBaseline), [lines, linesBaseline]);
  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isOsHeaderDirtyVsBaseline(form, headerBaseline);
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

  const { saveMutation, postMutation, deleteMutation, submitting } = useOpeningStockDrawerMutations({
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

  const canSubmitRequired = useMemo(() => canSaveOsDraft(formValuesWatch ?? {}), [formValuesWatch]);
  const canPost = canSubmitRequired && getValidOsLines(lines).length > 0;

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
          title: t("osPostConfirmTitle"),
          content: t("osPostConfirmContent"),
          okText: t("actionPostOpeningStock"),
          cancelText: t("drawerCancel"),
          onOk: () => closeConfirmOnError(postMutation.mutateAsync({ values })),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("osDeleteConfirmTitle"),
      content: t("osDeleteConfirmContent", { name: loadedNumber ?? "" }),
      okText: t("osDeleteConfirmOk"),
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
      return next.length > 0 ? next : [getEmptyOsLine()];
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptyOsLine()]);
  }, []);

  const title =
    mode === "create"
      ? t("osDrawerTitleCreate")
      : mode === "view"
        ? t("osDrawerTitleView")
        : t("osDrawerTitleEdit");

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
        <OpeningStockDrawerFooter
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
      <OpeningStockDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        warehouseOptions={drawerData.warehouseOptions}
        warehousesPending={drawerData.warehousesPending}
        osNumber={loadedNumber}
      />
      <OpeningStockLineEditor
        lines={lines.length > 0 ? lines : [getEmptyOsLine()]}
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
