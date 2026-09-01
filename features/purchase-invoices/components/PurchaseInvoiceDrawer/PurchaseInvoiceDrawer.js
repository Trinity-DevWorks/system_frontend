"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { PURCHASE_INVOICE_DETAIL_QUERY_PREFIX } from "../../queries/purchaseInvoiceQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { isPersistedEntityId } from "@/lib/entityId";
import { formatTenantMoney } from "@/lib/tenant-format";
import { fetchPurchaseInvoice } from "../../api/purchaseInvoices.api";
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
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function PurchaseInvoiceDrawer({
  open,
  mode,
  invoiceId,
  tableSeedRecord = null,
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

  const detailEnabled = open && (mode === "edit" || mode === "view") && invoiceId != null;

  const detailQuery = useQuery({
    queryKey: [...PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, invoiceId],
    queryFn: () => fetchPurchaseInvoice(/** @type {string} */ (invoiceId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const isDraft = isPurchaseInvoiceDraft(loadedStatus);
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
    setTotals({ subtotal: null, tax_total: null, grand_total: null, currency_code: null });
    loadedDetailVersionRef.current = 0;
  }, [form, defaults]);

  useLayoutEffect(() => {
    if (!open) {
      loadedDetailVersionRef.current = 0;
      return;
    }
    if (mode === "create") {
      resetCreateDraftState();
      return;
    }
    // Table row has no lines — only paint header metadata until detail loads (see GoodsReceiptDrawer).
    if (tableSeedRecord && typeof tableSeedRecord === "object") {
      setLoadedStatus(typeof tableSeedRecord.status === "string" ? tableSeedRecord.status : null);
      setLoadedNumber(
        typeof tableSeedRecord.invoice_number === "string" ? tableSeedRecord.invoice_number : null,
      );
    }
  }, [open, mode, invoiceId, tableSeedRecord, resetCreateDraftState]);

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
  const isLinesDirty = useMemo(() => arePiLinesDirty(lines, linesBaseline), [lines, linesBaseline]);
  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isPiHeaderDirtyVsBaseline(form, headerBaseline);
  }, [mode, isCreateDirty, form, headerBaseline, formValuesWatch]);

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
      content: t("deleteConfirmContent", { name: loadedNumber ?? invoiceId }),
      okText: t("deleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => deleteMutation.mutateAsync(),
    });
  }, [modal, t, deleteMutation, loadedNumber, invoiceId]);

  const title =
    mode === "create"
      ? t("drawerCreateTitle")
      : loadedNumber
        ? t("drawerEditTitle", { number: loadedNumber })
        : t("drawerTitle");

  return (
    <ResourceCrudDrawer
      open={open}
      requestClose={requestClose}
      title={title}
      recordName={loadedNumber}
      size={1100}
      submitting={submitting}
      showDetailLoading={detailEnabled && detailQuery.isPending}
      detailLoadFailed={Boolean(detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
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
        supplierOptions={supplierOptions}
        currencyOptions={currencyOptions}
        paymentTermOptions={paymentTermOptions}
        catalogsPending={catalogsPending}
        t={t}
      />

      <PurchaseInvoiceLineEditor
        lines={lines}
        readOnly={readOnly}
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
