"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { PURCHASE_INVOICE_DETAIL_QUERY_PREFIX } from "../../queries/purchaseInvoiceQueryKeys";
import { GOODS_RECEIPT_DETAIL_QUERY_PREFIX } from "@/features/stock/queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { isPersistedEntityId } from "@/lib/entityId";
import { formatTenantMoney } from "@/lib/tenant-format";
import { useCompanySettings } from "@/lib/company-settings";
import { fetchPurchaseInvoice } from "../../api/purchaseInvoices.api";
import { fetchGoodsReceipt } from "@/features/stock/api/goodsReceipts.api";
import {
  goodsReceiptHasOpenToInvoice,
  mapGoodsReceiptToPiCreateSeed,
  PI_GR_NO_OPEN_QTY_MESSAGE_KEY,
} from "../../utils/purchaseInvoiceFromGoodsReceipt";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isPurchaseInvoiceDraft } from "../../utils/purchaseInvoiceStatuses";
import PurchaseInvoiceDrawerFooter from "./PurchaseInvoiceDrawerFooter";
import PurchaseInvoiceDrawerForm from "./PurchaseInvoiceDrawerForm";
import PurchaseInvoiceLineEditor from "./PurchaseInvoiceLineEditor";
import {
  arePiLinesDirty,
  canSavePiDraft,
  getEmptyPiLine,
  getPurchaseInvoiceDefaults,
  getValidPiLines,
  isPiHeaderDirtyVsBaseline,
  mapPiLinesFromApi,
  mapPiRecordToForm,
} from "../../utils/purchaseInvoiceDrawerUtils";
import { usePurchaseInvoiceDrawerData } from "../../queries/usePurchaseInvoiceDrawerData";
import { usePurchaseInvoiceDrawerMutations } from "../../queries/usePurchaseInvoiceDrawerMutations";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   invoiceId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   fromGoodsReceiptId?: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function PurchaseInvoiceDrawer({
  open,
  mode,
  invoiceId,
  tableSeedRecord = null,
  fromGoodsReceiptId = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("PurchaseInvoices");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();

  const [lines, setLines] = useState(() => /** @type {import("../../utils/purchaseInvoiceDrawerUtils").PiLineFormRow[]} */ ([]));
  const [linesBaseline, setLinesBaseline] = useState(() => /** @type {import("../../utils/purchaseInvoiceDrawerUtils").PiLineFormRow[]} */ ([]));
  const [headerBaseline, setHeaderBaseline] = useState(() => getPurchaseInvoiceDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const [loadedGrNumber, setLoadedGrNumber] = useState(/** @type {string | null} */ (null));
  const [loadedSupplierName, setLoadedSupplierName] = useState(/** @type {string | null} */ (null));
  const [totals, setTotals] = useState({
    subtotal: /** @type {string | null} */ (null),
    tax_total: /** @type {string | null} */ (null),
    grand_total: /** @type {string | null} */ (null),
    currency_code: /** @type {string | null} */ (null),
  });

  const defaults = useMemo(() => {
    void open;
    return getPurchaseInvoiceDefaults();
  }, [open]);
  const loadedDetailVersionRef = useRef(0);
  const appliedGrSeedIdRef = useRef(/** @type {string | null} */ (null));
  const warnedNoOpenQtyGrIdRef = useRef(/** @type {string | null} */ (null));
  const createResetKeyRef = useRef(/** @type {string | null} */ (null));
  const { settings: companySettings } = useCompanySettings();

  const detailEnabled = open && (mode === "edit" || mode === "view") && invoiceId != null;

  const detailQuery = useQuery({
    queryKey: [...PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, invoiceId],
    queryFn: () => fetchPurchaseInvoice(/** @type {string} */ (invoiceId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const detailMatchesInvoice =
    mode !== "create" &&
    detailQuery.data != null &&
    invoiceId != null &&
    String(/** @type {{ id?: unknown }} */ (detailQuery.data).id) === String(invoiceId);
  const effectiveStatus =
    mode === "create"
      ? loadedStatus
      : ((detailMatchesInvoice && typeof detailQuery.data.status === "string"
          ? detailQuery.data.status
          : null) ??
        (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : null) ??
        loadedStatus);
  const effectiveNumber =
    mode === "create"
      ? loadedNumber
      : ((detailMatchesInvoice && typeof detailQuery.data.invoice_number === "string"
          ? detailQuery.data.invoice_number
          : null) ??
        (typeof tableSeedRecord?.invoice_number === "string" ? tableSeedRecord.invoice_number : null) ??
        loadedNumber);
  const isDraft = isPurchaseInvoiceDraft(effectiveStatus);
  const readOnly = mode === "view" || !isDraft;
  const loadCatalogs = open && !readOnly;

  const { supplierOptions, currencyOptions, paymentTermOptions, itemOptions, catalogsPending } =
    usePurchaseInvoiceDrawerData({ open, loadCatalogs, t });

  const { isCreateDirty, syncBaselineFromFormFields } = useCreateDiscardBaseline({
    open,
    mode: "create",
    form,
    defaults,
    isCreateDirtyVsBaseline: isPiHeaderDirtyVsBaseline,
  });

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapPiLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
      );
      setLines(mappedLines);
      setLinesBaseline(mappedLines);
      setHeaderBaseline(mapPiRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.invoice_number === "string" ? record.invoice_number : null);
      setLoadedGrNumber(
        typeof record.goods_receipt?.grn_number === "string" ? record.goods_receipt.grn_number : null,
      );
      setLoadedSupplierName(typeof record.supplier?.name === "string" ? record.supplier.name : null);
      setTotals({
        subtotal: record.subtotal != null ? String(record.subtotal) : null,
        tax_total: record.tax_total != null ? String(record.tax_total) : null,
        grand_total: record.grand_total != null ? String(record.grand_total) : null,
        currency_code: typeof record.currency?.code === "string" ? record.currency.code : null,
      });
      form.setFieldsValue(mapPiRecordToForm(record));
    },
    [form],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    const initialLines = [getEmptyPiLine()];
    setLines(initialLines);
    setLinesBaseline(initialLines);
    setHeaderBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    setLoadedGrNumber(null);
    setLoadedSupplierName(null);
    setTotals({ subtotal: null, tax_total: null, grand_total: null, currency_code: null });
    loadedDetailVersionRef.current = 0;
  }, [form, defaults]);

  useLayoutEffect(() => {
    if (!open) {
      loadedDetailVersionRef.current = 0;
      appliedGrSeedIdRef.current = null;
      warnedNoOpenQtyGrIdRef.current = null;
      createResetKeyRef.current = null;
      return;
    }
    if (mode !== "create") return;
    const resetKey = `create:${fromGoodsReceiptId ?? ""}`;
    if (createResetKeyRef.current === resetKey) return;
    createResetKeyRef.current = resetKey;
    resetCreateDraftState();
    if (fromGoodsReceiptId) {
      form.setFieldsValue({ ...defaults, goods_receipt_id: fromGoodsReceiptId });
    }
  }, [open, mode, resetCreateDraftState, fromGoodsReceiptId, form, defaults]);

  useEffect(() => {
    if (!open || mode === "create" || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncBaselinesFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [
    open,
    mode,
    invoiceId,
    detailQuery.isSuccess,
    detailQuery.data,
    detailQuery.dataUpdatedAt,
    syncBaselinesFromRecord,
  ]);

  const formValuesWatch = Form.useWatch([], form);
  const watchedGrId = Form.useWatch("goods_receipt_id", form);
  const watchedSupplierId = Form.useWatch("supplier_id", form);
  const watchedCurrencyId = Form.useWatch("currency_id", form);
  const hasGoodsReceipt = watchedGrId != null && watchedGrId !== "";
  const grSeedEnabled = open && mode === "create" && isPersistedEntityId(fromGoodsReceiptId || watchedGrId);

  const applyGoodsReceiptSeed = useCallback(
    (receipt) => {
      const seed = mapGoodsReceiptToPiCreateSeed(/** @type {Record<string, unknown>} */ (receipt), {
        currencyId: companySettings.primaryCurrencyId,
      });
      if (!seed) {
        // Incomplete cache (no lines) is not "fully billed" — wait for a refetch.
        if (goodsReceiptHasOpenToInvoice(receipt) !== false) return false;
        const grId = String(/** @type {{ id?: unknown }} */ (receipt).id ?? fromGoodsReceiptId ?? "");
        if (grId && warnedNoOpenQtyGrIdRef.current !== grId) {
          warnedNoOpenQtyGrIdRef.current = grId;
          message.warning({ content: t("grNoOpenQty"), key: PI_GR_NO_OPEN_QTY_MESSAGE_KEY });
        }
        if (fromGoodsReceiptId) {
          onClose();
        } else {
          setLines([]);
          setLinesBaseline([]);
          setLoadedGrNumber(null);
          setLoadedSupplierName(null);
          syncBaselineFromFormFields();
        }
        return true;
      }
      form.setFieldsValue(seed.header);
      setLines(seed.lines);
      setLinesBaseline(seed.lines);
      setHeaderBaseline(seed.header);
      setLoadedGrNumber(seed.goodsReceiptNumber);
      setLoadedSupplierName(seed.supplierName);
      syncBaselineFromFormFields();
      return true;
    },
    [companySettings.primaryCurrencyId, form, fromGoodsReceiptId, message, onClose, syncBaselineFromFormFields, t],
  );

  const grSeedQuery = useQuery({
    queryKey: [...GOODS_RECEIPT_DETAIL_QUERY_PREFIX, fromGoodsReceiptId || watchedGrId],
    queryFn: () => fetchGoodsReceipt(/** @type {string} */ (fromGoodsReceiptId || watchedGrId)),
    enabled: grSeedEnabled,
    staleTime: fromGoodsReceiptId ? 0 : QUERY_STALE_TIME.default,
  });

  useEffect(() => {
    if (!open || mode !== "create" || !grSeedQuery.isSuccess || !grSeedQuery.data) return;
    const grId = String(/** @type {{ id?: unknown }} */ (grSeedQuery.data).id ?? "");
    const stamp = `${grId}:${companySettings.primaryCurrencyId ?? ""}`;
    if (!grId || appliedGrSeedIdRef.current === stamp) return;
    if (applyGoodsReceiptSeed(grSeedQuery.data)) {
      appliedGrSeedIdRef.current = stamp;
    }
  }, [open, mode, grSeedQuery.isSuccess, grSeedQuery.data, grSeedQuery.dataUpdatedAt, applyGoodsReceiptSeed, companySettings.primaryCurrencyId]);

  const isLinesDirty = useMemo(() => arePiLinesDirty(lines, linesBaseline), [lines, linesBaseline]);
  const isHeaderDirty =
    mode === "create" ? isCreateDirty() : isPiHeaderDirtyVsBaseline(form, headerBaseline);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") {
      if (grSeedEnabled && (grSeedQuery.isPending || (grSeedQuery.isFetching && !loadedGrNumber))) {
        return false;
      }
      return isCreateDirty() || isLinesDirty;
    }
    return isHeaderDirty || isLinesDirty;
  }, [readOnly, mode, grSeedEnabled, grSeedQuery.isPending, grSeedQuery.isFetching, loadedGrNumber, isCreateDirty, isLinesDirty, isHeaderDirty]);

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
      loadedDetailVersionRef.current = detailQuery.dataUpdatedAt;
      if (mode === "create") {
        syncBaselineFromFormFields();
      }
    },
    [syncBaselinesFromRecord, mode, syncBaselineFromFormFields, detailQuery.dataUpdatedAt],
  );

  const handleCreated = useCallback(
    (record) => {
      onCreated?.(record);
      syncBaselinesFromRecordAndBump(record);
    },
    [onCreated, syncBaselinesFromRecordAndBump],
  );

  const { saveMutation, postMutation, deleteMutation } = usePurchaseInvoiceDrawerMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    invoiceId: mode === "create" ? null : invoiceId,
    lines,
    onCreated: handleCreated,
    onSaved: syncBaselinesFromRecordAndBump,
    onPosted: syncBaselinesFromRecordAndBump,
    onDeleted: forceClose,
    onClose: forceClose,
  });

  const canSave = canSavePiDraft(formValuesWatch ?? {}, lines);
  const canPost =
    isPersistedEntityId(invoiceId) && getValidPiLines(lines).length > 0 && !isHeaderDirty && !isLinesDirty;

  const submitting =
    saveMutation.isPending || postMutation.isPending || deleteMutation.isPending;

  const handleSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => saveMutation.mutate({ values }))
      .catch(() => undefined);
  }, [form, saveMutation]);

  const handlePost = useCallback(() => {
    modal.confirm({
      title: t("postConfirmTitle"),
      content: t("postConfirmContent"),
      okText: t("actionPost"),
      cancelText: t("drawerCancel"),
      onOk: () => postMutation.mutateAsync(),
    });
  }, [modal, t, postMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("deleteConfirmTitle"),
      content: t("deleteConfirmContent", { name: effectiveNumber ?? invoiceId }),
      okText: t("deleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => deleteMutation.mutateAsync(),
    });
  }, [modal, t, deleteMutation, effectiveNumber, invoiceId]);

  const title =
    mode === "create"
      ? t("drawerCreateTitle")
      : effectiveNumber
        ? t("drawerEditTitle", { number: effectiveNumber })
        : t("drawerTitle");

  const supplierOptionsForForm = useMemo(() => {
    if (watchedSupplierId == null || watchedSupplierId === "") return supplierOptions;
    if (supplierOptions.some((o) => String(o.value) === String(watchedSupplierId))) return supplierOptions;
    return [
      {
        value: String(watchedSupplierId),
        label: loadedSupplierName || String(watchedSupplierId),
      },
      ...supplierOptions,
    ];
  }, [loadedSupplierName, supplierOptions, watchedSupplierId]);

  const currencyOptionsForForm = useMemo(() => {
    if (watchedCurrencyId == null || watchedCurrencyId === "") return currencyOptions;
    if (currencyOptions.some((o) => Number(o.value) === Number(watchedCurrencyId))) return currencyOptions;
    return [{ value: Number(watchedCurrencyId), label: String(watchedCurrencyId) }, ...currencyOptions];
  }, [currencyOptions, watchedCurrencyId]);

  return (
    <ResourceCrudDrawer
      open={open}
      requestClose={requestClose}
      title={title}
      recordName={effectiveNumber}
      size={1100}
      submitting={submitting}
      showDetailLoading={
        (detailEnabled && detailQuery.isPending) ||
        (grSeedEnabled && (grSeedQuery.isPending || (Boolean(fromGoodsReceiptId) && grSeedQuery.isFetching && !loadedGrNumber)))
      }
      detailLoadFailed={Boolean(
        (detailEnabled && detailQuery.isError) || (grSeedEnabled && grSeedQuery.isError),
      )}
      detailError={detailQuery.error ?? grSeedQuery.error}
      tApiErrors={tApiErrors}
      footer={
        <PurchaseInvoiceDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!canSave}
          postDisabled={!canPost}
          showDelete={mode === "edit" && !readOnly}
          showPost={mode === "edit" && !readOnly}
          onSave={handleSave}
          onPost={handlePost}
          onDelete={handleDelete}
        />
      }
    >
      <PurchaseInvoiceDrawerForm
        form={form}
        readOnly={readOnly}
        linkedToGoodsReceipt={hasGoodsReceipt || Boolean(loadedGrNumber)}
        goodsReceiptNumber={loadedGrNumber}
        supplierOptions={supplierOptionsForForm}
        currencyOptions={currencyOptionsForForm}
        paymentTermOptions={paymentTermOptions}
        catalogsPending={catalogsPending}
        t={t}
      />

      <PurchaseInvoiceLineEditor
        lines={lines}
        readOnly={readOnly}
        linkedToGoodsReceipt={hasGoodsReceipt || Boolean(loadedGrNumber)}
        itemOptions={itemOptions}
        itemsPending={catalogsPending}
        onPatchLine={(index, patch) => {
          setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
        }}
        onRemoveLine={(index) => {
          setLines((prev) => prev.filter((_, i) => i !== index));
        }}
        onAddLine={() => setLines((prev) => [...prev, getEmptyPiLine()])}
        t={t}
      />

      {(totals.grand_total != null || mode !== "create") && (
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <div>
            <div className="text-neutral-500">{t("totalSubtotal")}</div>
            <div className="font-medium">
              {formatTenantMoney(totals.subtotal) || "—"}
              {totals.currency_code ? ` ${totals.currency_code}` : ""}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">{t("totalTax")}</div>
            <div className="font-medium">
              {formatTenantMoney(totals.tax_total) || "—"}
              {totals.currency_code ? ` ${totals.currency_code}` : ""}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">{t("totalGrand")}</div>
            <div className="font-medium">
              {formatTenantMoney(totals.grand_total) || "—"}
              {totals.currency_code ? ` ${totals.currency_code}` : ""}
            </div>
          </div>
        </div>
      )}
    </ResourceCrudDrawer>
  );
}
