"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { BUNDLE_EXPLOSION_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { fetchBundleExplosion } from "../../api/bundleExplosions.api";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { normalizeEntityId } from "@/lib/entityId";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isBundleExplosionDraft } from "../../utils/bundleExplosionStatuses";
import BundleExplosionDrawerFooter from "./BundleExplosionDrawerFooter";
import BundleExplosionDrawerForm from "./BundleExplosionDrawerForm";
import BundleExplosionLineEditor from "./BundleExplosionLineEditor";
import {
  areBexLinesDirty,
  bundleComponentSignature,
  bundleHasStockableComponents,
  canPostBex,
  canSaveBexDraft,
  getBundleExplosionDefaults,
  isBexHeaderDirtyVsBaseline,
  isBexLinePersistable,
  mapBexLinesFromApi,
  mapBexRecordToForm,
  scaleBundleToLines,
} from "../../utils/bundleExplosionDrawerUtils";
import {
  useBundleExplosionComponents,
  useBundleExplosionDrawerData,
} from "../../queries/useBundleExplosionDrawerData";
import { useBundleExplosionDrawerMutations } from "../../queries/useBundleExplosionDrawerMutations";

const EMPTY_COMPONENTS = [];

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
export default function BundleExplosionDrawer({
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

  const [lines, setLines] = useState(() => []);
  const [linesBaseline, setLinesBaseline] = useState(() => []);
  const [headerBaseline, setHeaderBaseline] = useState(() => getBundleExplosionDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const drawerData = useBundleExplosionDrawerData({ open });
  const defaults = useMemo(
    () => ({
      ...getBundleExplosionDefaults(),
      warehouse_id: drawerData.defaultWarehouseId,
    }),
    [drawerData.defaultWarehouseId],
  );
  const loadedDetailVersionRef = useRef(0);
  const lastScaleRef = useRef("");

  const detailEnabled = open && (mode === "edit" || mode === "view") && documentId != null;

  const detailQuery = useQuery({
    queryKey: [...BUNDLE_EXPLOSION_DETAIL_QUERY_PREFIX, documentId],
    queryFn: () => fetchBundleExplosion(/** @type {string} */ (documentId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapBexLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      setLines(mappedLines);
      setLinesBaseline(mappedLines);
      setHeaderBaseline(mapBexRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.bex_number === "string" ? record.bex_number : null);
      form.setFieldsValue(mapBexRecordToForm(record));
      lastScaleRef.current = `${normalizeEntityId(record.item_id) ?? ""}|${Number(record.quantity ?? 0)}|${mappedLines
        .map((line) => line.item_id ?? "")
        .sort()
        .join(",")}`;
    },
    [form],
  );

  useLayoutEffect(() => {
    if (!open || mode !== "create") return;
    const nextDefaults = {
      ...getBundleExplosionDefaults(),
      warehouse_id: drawerData.defaultWarehouseId,
    };
    form.resetFields();
    form.setFieldsValue(nextDefaults);
    setLines([]);
    setLinesBaseline([]);
    setHeaderBaseline(nextDefaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    loadedDetailVersionRef.current = 0;
    lastScaleRef.current = "";
  }, [open, mode, form]);

  useEffect(() => {
    if (!open || mode !== "create") return;
    if (form.getFieldValue("warehouse_id") != null) return;
    if (drawerData.defaultWarehouseId == null) return;
    form.setFieldsValue({ warehouse_id: drawerData.defaultWarehouseId });
    setHeaderBaseline((prev) => ({ ...prev, warehouse_id: drawerData.defaultWarehouseId }));
  }, [open, mode, form, drawerData.defaultWarehouseId]);

  useEffect(() => {
    if (!open || mode === "create" || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncBaselinesFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, mode, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncBaselinesFromRecord]);

  const effectiveStatus = loadedStatus ?? (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly = mode === "view" || !isBundleExplosionDraft(effectiveStatus);

  const formValuesWatch = Form.useWatch([], form);
  const watchedWarehouseId = Form.useWatch("warehouse_id", form);
  const watchedItemId = Form.useWatch("item_id", form);
  const watchedQuantity = Form.useWatch("quantity", form);

  const componentsQuery = useBundleExplosionComponents({
    itemId: watchedItemId != null ? String(watchedItemId) : undefined,
    enabled: open && watchedItemId != null,
  });
  const components = componentsQuery.data ?? EMPTY_COMPONENTS;

  useEffect(() => {
    if (!open || readOnly) return;
    const currentItem = watchedItemId != null ? String(watchedItemId) : "";
    const currentQty = Number(watchedQuantity ?? 0);
    const clearLines = () => setLines((prev) => (prev.length === 0 ? prev : []));
    if (!currentItem) {
      if (mode === "create") {
        lastScaleRef.current = "";
        clearLines();
      }
      return;
    }
    if (componentsQuery.isFetching) {
      const previousItem = lastScaleRef.current.split("|")[0];
      if (previousItem && previousItem !== currentItem) clearLines();
      return;
    }
    const signature = `${currentItem}|${currentQty}|${bundleComponentSignature(components)}`;
    if (lastScaleRef.current === signature) return;
    lastScaleRef.current = signature;
    setLines(scaleBundleToLines(components, currentQty, linesRef.current));
  }, [open, readOnly, mode, watchedItemId, watchedQuantity, components, componentsQuery.isFetching]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode: "create",
    form,
    defaults,
    isCreateDirtyVsBaseline: isBexHeaderDirtyVsBaseline,
  });

  const isLinesDirty = useMemo(() => areBexLinesDirty(lines, linesBaseline), [lines, linesBaseline]);
  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isBexHeaderDirtyVsBaseline(form, headerBaseline);
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

  const { saveMutation, postMutation, deleteMutation, submitting } = useBundleExplosionDrawerMutations({
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

  const itemOptions = useMemo(() => {
    const options = [...drawerData.itemOptions];
    const current = detailQuery.data?.item ?? tableSeedRecord?.item;
    const currentId = normalizeEntityId(current?.id);
    if (currentId && !options.some((option) => option.value === currentId)) {
      options.unshift({
        value: currentId,
        label: formatItemOptionLabel(current),
      });
    }
    return options;
  }, [drawerData.itemOptions, detailQuery.data, tableSeedRecord]);

  const hasComponents = bundleHasStockableComponents(components) || lines.some(isBexLinePersistable);
  const canSubmitRequired = useMemo(
    () => canSaveBexDraft(formValuesWatch ?? {}, hasComponents),
    [formValuesWatch, hasComponents],
  );
  const canPost = canSubmitRequired && canPostBex({ lines });
  const componentsEmpty =
    Boolean(watchedItemId) && !componentsQuery.isFetching && !bundleHasStockableComponents(components);

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
          title: t("bexPostConfirmTitle"),
          content: t("bexPostConfirmContent"),
          okText: t("actionPostBundleExplosion"),
          cancelText: t("drawerCancel"),
          onOk: () => postMutation.mutateAsync({ values }),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("bexDeleteConfirmTitle"),
      content: t("bexDeleteConfirmContent", { name: loadedNumber ?? "" }),
      okText: t("bexDeleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => deleteMutation.mutateAsync(),
    });
  }, [modal, t, deleteMutation, loadedNumber]);

  const patchLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const title =
    mode === "create"
      ? t("bexDrawerTitleCreate")
      : mode === "view"
        ? t("bexDrawerTitleView")
        : t("bexDrawerTitleEdit");

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
      size={1000}
      footer={
        <BundleExplosionDrawerFooter
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
      <BundleExplosionDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        warehouseOptions={drawerData.warehouseOptions}
        warehousesPending={drawerData.warehousesPending}
        itemOptions={itemOptions}
        itemsPending={drawerData.itemsPending}
        bexNumber={loadedNumber}
        componentsPending={Boolean(watchedItemId) && componentsQuery.isFetching}
        componentsEmpty={componentsEmpty}
      />
      <BundleExplosionLineEditor
        lines={lines}
        readOnly={readOnly || submitting}
        warehouseId={watchedWarehouseId != null ? Number(watchedWarehouseId) : undefined}
        onPatchLine={patchLine}
        t={t}
      />
    </ResourceCrudDrawer>
  );
}
