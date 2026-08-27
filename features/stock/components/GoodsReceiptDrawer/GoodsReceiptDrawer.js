"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { GOODS_RECEIPT_DETAIL_QUERY_PREFIX, PURCHASE_ORDER_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { isPersistedEntityId } from "@/lib/entityId";
import { fetchGoodsReceipt } from "../../api/goodsReceipts.api";
import { fetchPurchaseOrder } from "../../api/purchaseOrders.api";
import { mapPurchaseOrderToGrnCreateSeed } from "../../utils/goodsReceiptFromPurchaseOrder";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isGoodsReceiptDraft } from "../../utils/goodsReceiptStatuses";
import GoodsReceiptDrawerFooter from "./GoodsReceiptDrawerFooter";
import GoodsReceiptDrawerForm from "./GoodsReceiptDrawerForm";
import GoodsReceiptLineEditor from "./GoodsReceiptLineEditor";
import {
  areGrnLinesDirty,
  canSaveGrnDraft,
  getEmptyGrnLine,
  getGoodsReceiptDefaults,
  getValidGrnLines,
  isGrnHeaderDirtyVsBaseline,
  mapGrnLinesFromApi,
  mapGrnRecordToForm,
} from "../../utils/goodsReceiptDrawerUtils";
import { useGoodsReceiptDrawerData } from "../../queries/useGoodsReceiptDrawerData";
import { useGoodsReceiptDrawerMutations } from "../../queries/useGoodsReceiptDrawerMutations";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   receiptId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   fromPurchaseOrderId?: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function GoodsReceiptDrawer({
  open,
  mode,
  receiptId,
  tableSeedRecord = null,
  fromPurchaseOrderId = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();

  const [lines, setLines] = useState(() => []);
  const [linesBaseline, setLinesBaseline] = useState(() => []);
  const [headerBaseline, setHeaderBaseline] = useState(() => getGoodsReceiptDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const [loadedWarehouseName, setLoadedWarehouseName] = useState(/** @type {string | null} */ (null));
  const [loadedSupplierName, setLoadedSupplierName] = useState(/** @type {string | null} */ (null));
  const [loadedWarehouseId, setLoadedWarehouseId] = useState(/** @type {number | undefined} */ (undefined));
  const [loadedPoNumber, setLoadedPoNumber] = useState(/** @type {string | null} */ (null));

  const defaults = useMemo(() => {
    void open;
    return getGoodsReceiptDefaults();
  }, [open]);
  const loadedDetailVersionRef = useRef(0);
  const appliedPoSeedIdRef = useRef(/** @type {string | null} */ (null));

  const detailEnabled = open && (mode === "edit" || mode === "view") && receiptId != null;

  const detailQuery = useQuery({
    queryKey: [...GOODS_RECEIPT_DETAIL_QUERY_PREFIX, receiptId],
    queryFn: () => fetchGoodsReceipt(/** @type {string} */ (receiptId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapGrnLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      setLines(mappedLines);
      setLinesBaseline(mappedLines);
      setHeaderBaseline(mapGrnRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.grn_number === "string" ? record.grn_number : null);
      setLoadedWarehouseName(record.warehouse?.name ?? null);
      setLoadedSupplierName(record.supplier?.name ?? record.purchase_order?.supplier?.name ?? null);
      setLoadedWarehouseId(record.warehouse_id != null ? Number(record.warehouse_id) : undefined);
      setLoadedPoNumber(
        typeof record.purchase_order?.po_number === "string" ? record.purchase_order.po_number : null,
      );
      form.setFieldsValue(mapGrnRecordToForm(record));
    },
    [form],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    setLines([getEmptyGrnLine()]);
    setLinesBaseline([]);
    setHeaderBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    setLoadedWarehouseName(null);
    setLoadedSupplierName(null);
    setLoadedWarehouseId(undefined);
    setLoadedPoNumber(null);
    loadedDetailVersionRef.current = 0;
    appliedPoSeedIdRef.current = null;
  }, [form, defaults]);

  const { isCreateDirty, syncBaselineFromFormFields, resetBaselineToDefaults } =
    useCreateDiscardBaseline({
      open,
      mode: "create",
      form,
      defaults,
      isCreateDirtyVsBaseline: isGrnHeaderDirtyVsBaseline,
    });

  const applyPurchaseOrderSeed = useCallback(
    (order) => {
      const seed = mapPurchaseOrderToGrnCreateSeed(/** @type {Record<string, unknown>} */ (order));
      if (!seed) {
        setLines([]);
        setLinesBaseline([]);
        setLoadedWarehouseName(null);
        setLoadedSupplierName(null);
        setLoadedWarehouseId(undefined);
        setLoadedPoNumber(null);
        syncBaselineFromFormFields();
        message.warning(t("grnPoNoOpenQty"));
        return;
      }
      form.setFieldsValue(seed.header);
      setLines(seed.lines);
      setLinesBaseline(seed.lines);
      setHeaderBaseline(seed.header);
      setLoadedWarehouseName(seed.warehouseName);
      setLoadedSupplierName(seed.supplierName);
      setLoadedWarehouseId(
        seed.header.warehouse_id != null ? Number(seed.header.warehouse_id) : undefined,
      );
      setLoadedPoNumber(seed.purchaseOrderNumber);
      syncBaselineFromFormFields();
    },
    [form, message, syncBaselineFromFormFields, t],
  );

  useLayoutEffect(() => {
    if (!open) return;
    if (mode === "create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset create draft when the drawer opens
      resetCreateDraftState();
      if (fromPurchaseOrderId) {
        form.setFieldsValue({ ...defaults, purchase_order_id: fromPurchaseOrderId });
      }
    }
  }, [open, mode, fromPurchaseOrderId, resetCreateDraftState, form, defaults]);

  useEffect(() => {
    if (!open || mode === "create" || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncBaselinesFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, mode, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncBaselinesFromRecord]);

  const effectiveStatus = loadedStatus ?? (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly = mode === "view" || !isGoodsReceiptDraft(effectiveStatus);

  const formValuesWatch = Form.useWatch([], form);
  const watchedPoId = Form.useWatch("purchase_order_id", form);
  const watchedWarehouseId = Form.useWatch("warehouse_id", form);
  const hasPurchaseOrder = watchedPoId != null && watchedPoId !== "";
  const poSeedEnabled = open && mode === "create" && isPersistedEntityId(watchedPoId);

  const poSeedQuery = useQuery({
    queryKey: [...PURCHASE_ORDER_DETAIL_QUERY_PREFIX, watchedPoId],
    queryFn: () => fetchPurchaseOrder(/** @type {string} */ (watchedPoId)),
    enabled: poSeedEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  useEffect(() => {
    if (!open || mode !== "create" || !poSeedQuery.isSuccess || !poSeedQuery.data) return;
    const poId = String(/** @type {{ id?: unknown }} */ (poSeedQuery.data).id ?? "");
    const stamp = `${poId}:${poSeedQuery.dataUpdatedAt}`;
    if (!poId || appliedPoSeedIdRef.current === stamp) return;
    appliedPoSeedIdRef.current = stamp;
    applyPurchaseOrderSeed(poSeedQuery.data);
  }, [open, mode, poSeedQuery.isSuccess, poSeedQuery.data, poSeedQuery.dataUpdatedAt, applyPurchaseOrderSeed]);

  const drawerData = useGoodsReceiptDrawerData({
    open,
    loadPurchaseOrders: open && mode === "create",
    loadCatalogs: open && !readOnly && !hasPurchaseOrder,
  });
  const effectiveWarehouseId =
    watchedWarehouseId != null ? Number(watchedWarehouseId) : loadedWarehouseId;
  const purchaseOrderOptions = useMemo(() => {
    const options = drawerData.purchaseOrderOptions;
    if (!hasPurchaseOrder || loadedPoNumber == null) return options;
    if (options.some((option) => String(option.value) === String(watchedPoId))) return options;
    return [{ value: watchedPoId, label: loadedPoNumber }, ...options];
  }, [drawerData.purchaseOrderOptions, hasPurchaseOrder, loadedPoNumber, watchedPoId]);

  const isLinesDirty = useMemo(() => areGrnLinesDirty(lines, linesBaseline), [lines, linesBaseline]);
  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isGrnHeaderDirtyVsBaseline(form, headerBaseline);
  }, [mode, isCreateDirty, form, headerBaseline]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") {
      if (poSeedEnabled && poSeedQuery.isLoading) return false;
      return isCreateDirty() || isLinesDirty;
    }
    return isHeaderDirty || isLinesDirty;
  }, [readOnly, mode, poSeedEnabled, poSeedQuery.isLoading, isCreateDirty, isLinesDirty, isHeaderDirty]);

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

  const { saveMutation, postMutation, deleteMutation, submitting } = useGoodsReceiptDrawerMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    receiptId,
    lines,
    onCreated: handleCreated,
    onSaved: syncBaselinesFromRecordAndBump,
    onPosted: syncBaselinesFromRecordAndBump,
    onDeleted: forceClose,
    onClose: forceClose,
  });

  const canSubmitRequired = useMemo(() => canSaveGrnDraft(formValuesWatch ?? {}), [formValuesWatch]);
  const canPost = canSubmitRequired && getValidGrnLines(lines).length > 0;

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
          title: t("grnPostConfirmTitle"),
          content: t("grnPostConfirmContent"),
          okText: t("actionPostGrn"),
          cancelText: t("drawerCancel"),
          onOk: () => postMutation.mutateAsync({ values }),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("grnDeleteConfirmTitle"),
      content: t("grnDeleteConfirmContent", { name: loadedNumber ?? "" }),
      okText: t("grnDeleteConfirmOk"),
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
      return next.length > 0 ? next : [getEmptyGrnLine()];
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptyGrnLine()]);
  }, []);

  const handlePurchaseOrderChange = useCallback(
    (value) => {
      appliedPoSeedIdRef.current = null;
      setLoadedWarehouseName(null);
      setLoadedSupplierName(null);
      setLoadedWarehouseId(undefined);
      setLoadedPoNumber(null);
      if (value == null || value === "") {
        setLines([getEmptyGrnLine()]);
        setLinesBaseline([]);
        form.setFieldsValue({ warehouse_id: undefined, supplier_id: undefined });
        resetBaselineToDefaults();
        return;
      }
      setLines([]);
      setLinesBaseline([]);
      form.setFieldsValue({ warehouse_id: undefined, supplier_id: undefined });
    },
    [form, resetBaselineToDefaults],
  );

  const title =
    mode === "create"
      ? t("grnDrawerTitleCreate")
      : mode === "view"
        ? t("grnDrawerTitleView")
        : t("grnDrawerTitleEdit");

  return (
    <ResourceCrudDrawer
      title={title}
      recordName={loadedNumber}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showExpand
      showDetailLoading={
        (detailEnabled && detailQuery.isLoading) ||
        (poSeedEnabled && poSeedQuery.isLoading)
      }
      detailLoadFailed={Boolean(
        (detailEnabled && detailQuery.isError) || (poSeedEnabled && poSeedQuery.isError),
      )}
      detailError={detailQuery.error ?? poSeedQuery.error}
      tApiErrors={tApiErrors}
      size={1100}
      footer={
        <GoodsReceiptDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!canSubmitRequired}
          postDisabled={!canPost}
          showDelete={!readOnly && receiptId != null}
          showPost={!readOnly}
          onSave={handleSave}
          onPost={handlePost}
          onDelete={handleDelete}
        />
      }
    >
      <GoodsReceiptDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        createMode={mode === "create"}
        hasPurchaseOrder={hasPurchaseOrder}
        t={t}
        purchaseOrderOptions={purchaseOrderOptions}
        purchaseOrdersPending={drawerData.purchaseOrdersPending}
        warehouseOptions={drawerData.warehouseOptions}
        warehousesPending={drawerData.warehousesPending}
        supplierOptions={drawerData.supplierOptions}
        suppliersPending={drawerData.suppliersPending}
        grnNumber={loadedNumber}
        warehouseName={loadedWarehouseName}
        supplierName={loadedSupplierName}
        purchaseOrderNumber={loadedPoNumber}
        onPurchaseOrderChange={handlePurchaseOrderChange}
      />
      <GoodsReceiptLineEditor
        lines={lines.length > 0 ? lines : [getEmptyGrnLine()]}
        readOnly={readOnly || submitting}
        warehouseId={effectiveWarehouseId}
        hasPurchaseOrder={hasPurchaseOrder}
        itemOptions={drawerData.itemOptions}
        itemsPending={drawerData.itemsPending}
        canAddLine={!hasPurchaseOrder}
        onPatchLine={patchLine}
        onRemoveLine={removeLine}
        onAddLine={addLine}
        t={t}
      />
    </ResourceCrudDrawer>
  );
}
