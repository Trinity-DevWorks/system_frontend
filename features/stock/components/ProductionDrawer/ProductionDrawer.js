"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { PRODUCTION_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { fetchProduction } from "../../api/productions.api";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { normalizeEntityId } from "@/lib/entityId";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isProductionDraft } from "../../utils/productionStatuses";
import ProductionDrawerFooter from "./ProductionDrawerFooter";
import ProductionDrawerForm from "./ProductionDrawerForm";
import ProductionLineEditor from "./ProductionLineEditor";
import {
  arePrdLinesDirty,
  canPostPrd,
  canSavePrdDraft,
  getProductionDefaults,
  isPrdHeaderDirtyVsBaseline,
  isPrdLinePersistable,
  mapPrdLinesFromApi,
  mapPrdRecordToForm,
  recipeHasIngredients,
  recipeUomLabel,
  scaleRecipeToLines,
} from "../../utils/productionDrawerUtils";
import { useProductionDrawerData, useProductionRecipe } from "../../queries/useProductionDrawerData";
import { useProductionDrawerMutations } from "../../queries/useProductionDrawerMutations";

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
export default function ProductionDrawer({
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
  const [headerBaseline, setHeaderBaseline] = useState(() => getProductionDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));

  const drawerData = useProductionDrawerData({ open });
  const defaults = useMemo(
    () => ({
      ...getProductionDefaults(),
      warehouse_id: drawerData.defaultWarehouseId,
    }),
    [drawerData.defaultWarehouseId],
  );
  const loadedDetailVersionRef = useRef(0);
  const lastScaleRef = useRef("");

  const detailEnabled = open && (mode === "edit" || mode === "view") && documentId != null;

  const detailQuery = useQuery({
    queryKey: [...PRODUCTION_DETAIL_QUERY_PREFIX, documentId],
    queryFn: () => fetchProduction(/** @type {string} */ (documentId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapPrdLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      setLines(mappedLines);
      setLinesBaseline(mappedLines);
      setHeaderBaseline(mapPrdRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.prd_number === "string" ? record.prd_number : null);
      form.setFieldsValue(mapPrdRecordToForm(record));
      lastScaleRef.current = `${normalizeEntityId(record.item_id) ?? ""}|${Number(record.quantity ?? 0)}|${record.recipe_id ?? "none"}`;
    },
    [form],
  );

  useLayoutEffect(() => {
    if (!open || mode !== "create") return;
    const nextDefaults = {
      ...getProductionDefaults(),
      warehouse_id: drawerData.defaultWarehouseId,
    };
    form.resetFields();
    form.setFieldsValue(nextDefaults);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset create draft when the drawer opens
    setLines([]);
    setLinesBaseline([]);
    setHeaderBaseline(nextDefaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    loadedDetailVersionRef.current = 0;
    lastScaleRef.current = "";
    // warehouse default is patched below if still empty — do not reset the form when it arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, form]);

  useEffect(() => {
    if (!open || mode !== "create") return;
    if (form.getFieldValue("warehouse_id") != null) return;
    if (drawerData.defaultWarehouseId == null) return;
    form.setFieldsValue({ warehouse_id: drawerData.defaultWarehouseId });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply async warehouse default without wiping the create draft
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
  const readOnly = mode === "view" || !isProductionDraft(effectiveStatus);

  const formValuesWatch = Form.useWatch([], form);
  const watchedWarehouseId = Form.useWatch("warehouse_id", form);
  const watchedItemId = Form.useWatch("item_id", form);
  const watchedQuantity = Form.useWatch("quantity", form);

  const recipeQuery = useProductionRecipe({
    itemId: watchedItemId != null ? String(watchedItemId) : undefined,
    enabled: open && watchedItemId != null,
  });
  const recipe = recipeQuery.data ?? null;

  useEffect(() => {
    if (!open || readOnly) return;
    const currentItem = watchedItemId != null ? String(watchedItemId) : "";
    const currentQty = Number(watchedQuantity ?? 0);
    const clearLines = () => setLines((prev) => (prev.length === 0 ? prev : []));
    if (!currentItem) {
      lastScaleRef.current = "";
      clearLines();
      return;
    }
    if (recipeQuery.isFetching) {
      const previousItem = lastScaleRef.current.split("|")[0];
      if (previousItem && previousItem !== currentItem) clearLines();
      return;
    }
    const signature = `${currentItem}|${currentQty}|${recipe?.id ?? "none"}`;
    if (lastScaleRef.current === signature) return;
    lastScaleRef.current = signature;
    setLines((prev) => scaleRecipeToLines(recipe, currentQty, prev));
  }, [open, readOnly, watchedItemId, watchedQuantity, recipe, recipeQuery.isFetching]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode: "create",
    form,
    defaults,
    isCreateDirtyVsBaseline: isPrdHeaderDirtyVsBaseline,
  });

  const isLinesDirty = useMemo(() => arePrdLinesDirty(lines, linesBaseline), [lines, linesBaseline]);
  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isPrdHeaderDirtyVsBaseline(form, headerBaseline);
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

  const { saveMutation, postMutation, deleteMutation, submitting } = useProductionDrawerMutations({
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
        track_lots: Boolean(current?.track_lots),
      });
    }
    return options;
  }, [drawerData.itemOptions, detailQuery.data, tableSeedRecord]);

  const selectedProduce = itemOptions.find((option) => option.value === watchedItemId);
  const produceTrackLots = Boolean(
    selectedProduce?.track_lots ??
      detailQuery.data?.item?.track_lots ??
      tableSeedRecord?.item?.track_lots,
  );
  const hasIngredients = recipeHasIngredients(recipe) || lines.some(isPrdLinePersistable);
  const canSubmitRequired = useMemo(
    () => canSavePrdDraft(formValuesWatch ?? {}, hasIngredients),
    [formValuesWatch, hasIngredients],
  );
  const canPost =
    canSubmitRequired &&
    canPostPrd({
      values: formValuesWatch ?? {},
      lines,
      produceTrackLots,
    });

  const recipeMissing = Boolean(watchedItemId) && !recipeQuery.isFetching && recipe == null;
  const recipeEmpty = Boolean(watchedItemId) && !recipeQuery.isFetching && recipe != null && !recipeHasIngredients(recipe);
  const yieldHint =
    recipeHasIngredients(recipe) && recipe?.yield_quantity != null
      ? t("prdYieldHint", {
          qty: String(recipe.yield_quantity),
          uom: recipeUomLabel(recipe) || "—",
        })
      : null;

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
          title: t("prdPostConfirmTitle"),
          content: t("prdPostConfirmContent"),
          okText: t("actionPostProduction"),
          cancelText: t("drawerCancel"),
          onOk: () => closeConfirmOnError(postMutation.mutateAsync({ values })),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("prdDeleteConfirmTitle"),
      content: t("prdDeleteConfirmContent", { name: loadedNumber ?? "" }),
      okText: t("prdDeleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
    });
  }, [modal, t, deleteMutation, loadedNumber]);

  const patchLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const title =
    mode === "create"
      ? t("prdDrawerTitleCreate")
      : mode === "view"
        ? t("prdDrawerTitleView")
        : t("prdDrawerTitleEdit");

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
        <ProductionDrawerFooter
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
      <ProductionDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        warehouseOptions={drawerData.warehouseOptions}
        warehousesPending={drawerData.warehousesPending}
        itemOptions={itemOptions}
        itemsPending={drawerData.itemsPending}
        prdNumber={loadedNumber}
        produceTrackLots={produceTrackLots}
        recipeUom={recipeUomLabel(recipe)}
        recipePending={Boolean(watchedItemId) && recipeQuery.isFetching}
        recipeMissing={recipeMissing}
        recipeEmpty={recipeEmpty}
        yieldHint={yieldHint}
      />
      <ProductionLineEditor
        lines={lines}
        readOnly={readOnly || submitting}
        warehouseId={watchedWarehouseId != null ? Number(watchedWarehouseId) : undefined}
        onPatchLine={patchLine}
        t={t}
      />
    </ResourceCrudDrawer>
  );
}
