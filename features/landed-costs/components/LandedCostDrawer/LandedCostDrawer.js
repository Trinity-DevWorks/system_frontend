"use client";

import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useDocumentPdfDownload } from "@/shared/hooks/useDocumentPdfDownload";
import { useQuery } from "@tanstack/react-query";
import { App, Form, Tag } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { downloadLandedCostPdf, fetchLandedCost } from "../../api/landedCosts.api";
import { landedCostDetailQueryKey } from "../../queries/landedCostsQueryKeys";
import { useLandedCostDrawerData } from "../../queries/useLandedCostDrawerData";
import { useLandedCostDrawerMutations } from "../../queries/useLandedCostDrawerMutations";
import {
  areLandedCostLinesDirty,
  chargeFromSource,
  chargeKey,
  getLandedCostDefaults,
  getLandedCostStatusLabel,
  isLandedCostHeaderDirty,
  landedCostMoney,
  landedCostStatusColor,
  mapLandedCostCharges,
  mapLandedCostReceipts,
  mapLandedCostRecordToForm,
  receiptKey,
} from "../../utils/landedCostDrawerUtils";
import LandedCostAllocationTable from "./LandedCostAllocationTable";
import LandedCostChargesEditor from "./LandedCostChargesEditor";
import LandedCostDrawerFooter from "./LandedCostDrawerFooter";
import LandedCostDrawerForm from "./LandedCostDrawerForm";

/**
 * Landed cost: pick the shipment's receipts and its freight / customs charges, see the new unit costs, post.
 *
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   landedCostId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   fromReceipt?: { source_type: string; source_id: string } | null;
 * }} props
 */
export default function LandedCostDrawer({ open, mode, landedCostId, tableSeedRecord = null, onClose, onCreated, fromReceipt = null }) {
  const t = useTranslations("LandedCosts");
  const tApiErrors = useTranslations("ApiErrors");
  const access = useResourceAccess("landed_costs");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();

  // A new landed cost keeps its id after the first save, so Post and Delete work in the same drawer.
  const [savedId, setSavedId] = useState(/** @type {string | null} */ (null));
  const documentId = landedCostId ?? savedId;

  /** @type {[import("../../utils/landedCostDrawerUtils").LandedCostReceipt[], Function]} */
  const [receipts, setReceipts] = useState([]);
  /** @type {[import("../../utils/landedCostDrawerUtils").LandedCostCharge[], Function]} */
  const [charges, setCharges] = useState([]);
  const [linesBaseline, setLinesBaseline] = useState(() => ({ receipts: [], charges: [] }));
  const [headerBaseline, setHeaderBaseline] = useState(() => getLandedCostDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && documentId != null;
  const detailQuery = useQuery({
    queryKey: landedCostDetailQueryKey(/** @type {string} */ (documentId)),
    queryFn: () => fetchLandedCost(/** @type {string} */ (documentId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const nextReceipts = mapLandedCostReceipts(record);
      const nextCharges = mapLandedCostCharges(record);
      setReceipts(nextReceipts);
      setCharges(nextCharges);
      setLinesBaseline({ receipts: nextReceipts, charges: nextCharges });
      setHeaderBaseline(mapLandedCostRecordToForm(record));
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.landed_cost_number === "string" ? record.landed_cost_number : null);
      form.setFieldsValue(mapLandedCostRecordToForm(record));
    },
    [form],
  );

  // Each time the drawer opens for a new landed cost, start clean (optionally with one receipt).
  useLayoutEffect(() => {
    if (!open) return;
    if (mode === "create" && landedCostId == null) {
      const seeded = fromReceipt?.source_id ? [{ source_type: fromReceipt.source_type, source_id: fromReceipt.source_id }] : [];
      /* eslint-disable react-hooks/set-state-in-effect -- reset the create draft when the drawer opens */
      setSavedId(null);
      setReceipts(seeded);
      setCharges([]);
      setLinesBaseline({ receipts: seeded, charges: [] });
      setHeaderBaseline(getLandedCostDefaults());
      setLoadedStatus("draft");
      setLoadedNumber(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      loadedDetailVersionRef.current = 0;
      form.resetFields();
      form.setFieldsValue(getLandedCostDefaults());
    }
  }, [open, mode, landedCostId, fromReceipt, form]);

  useEffect(() => {
    if (!open || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncFromRecord]);

  const effectiveStatus = loadedStatus ?? (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly =
    mode === "view" || effectiveStatus !== "draft" || (documentId == null ? !access.canAdd : !access.canEdit);

  const costDateWatch = Form.useWatch("cost_date", form);
  const drawerData = useLandedCostDrawerData({
    open,
    readOnly,
    landedCostId: documentId,
    receipts,
    charges,
    costDate: costDateWatch ? dayjs(costDateWatch).format("YYYY-MM-DD") : null,
    t,
  });

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    return isLandedCostHeaderDirty(form, headerBaseline) || areLandedCostLinesDirty({ receipts, charges }, linesBaseline);
  }, [readOnly, form, headerBaseline, receipts, charges, linesBaseline]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({ readOnly, modal, t, onClose, shouldConfirmDiscard });

  const afterSave = useCallback(
    (record) => {
      syncFromRecord(record);
      loadedDetailVersionRef.current = Date.now();
    },
    [syncFromRecord],
  );

  const handleCreated = useCallback(
    (record) => {
      if (record?.id != null) setSavedId(String(record.id));
      onCreated?.(record);
    },
    [onCreated],
  );

  const { saveMutation, postMutation, reverseMutation, deleteMutation, submitting } = useLandedCostDrawerMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    landedCostId: documentId,
    receipts,
    charges,
    onCreated: handleCreated,
    onSaved: afterSave,
    onPosted: afterSave,
    onReversed: afterSave,
    onDeleted: forceClose,
  });

  const { downloadPdf, printPdf, isPrintPending, isDownloadPending } = useDocumentPdfDownload({
    download: downloadLandedCostPdf,
    errorTitle: t("actionError"),
  });

  const hasLines = receipts.length > 0 && charges.length > 0;

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
          title: t("postConfirmTitle"),
          content: t("postConfirmContent"),
          okText: t("actionPost"),
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
      okText: t("actionReverse"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(reverseMutation.mutateAsync()),
    });
  }, [modal, t, reverseMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("deleteConfirmTitle"),
      content: t("deleteConfirmContent"),
      okText: t("actionDelete"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
    });
  }, [modal, t, deleteMutation]);

  const handleReceiptsChange = useCallback((values, options) => {
    const list = Array.isArray(options) ? options : [];
    setReceipts(
      list.map((o, i) => {
        const row = o?.row ?? {};
        const [source_type, source_id] = String(values[i]).split(":");
        return { source_type, source_id, number: row.number, date: row.date, supplier: row.supplier };
      }),
    );
  }, []);

  const addCharge = useCallback((_value, option) => {
    const row = option?.row;
    if (!row) return;
    setCharges((list) => [...list, chargeFromSource(row)]);
  }, []);

  const previewData = /** @type {Record<string, any> | undefined} */ (drawerData.previewQuery.data);
  const patchCharge = useCallback(
    (index, patch) => {
      setCharges((list) =>
        list.map((c, i) => {
          if (i !== index) return c;
          // Switching to Manual starts from the split shown so far (value, weight, ...), so only adjustments are needed.
          if (patch.method === "manual" && c.method !== "manual") {
            const shown = previewData?.charges?.find((x) => chargeKey(x) === chargeKey(c))?.allocations ?? {};
            const manual = Object.fromEntries(Object.entries(shown).map(([key, a]) => [key, Number(a?.amount ?? 0)]));
            return { ...c, ...patch, manual };
          }
          return { ...c, ...patch };
        }),
      );
    },
    [previewData],
  );

  const removeCharge = useCallback((index) => {
    setCharges((list) => list.filter((_, i) => i !== index));
  }, []);

  // Once posted, each charge shows how it split between stock, cost of sales and variance.
  const doc = /** @type {Record<string, any> | null} */ (detailQuery.data ?? null);
  const splitColumn = useMemo(() => {
    if (!readOnly || effectiveStatus === "draft") return null;
    return {
      title: t("colSplit"),
      render: (c) => {
        const allocs = Object.values(
          doc?.charges?.find((x) => Number(x.source_line_id) === c.source_line_id && x.source_type === c.source_type)?.allocations ?? {},
        );
        const sum = (k) => allocs.reduce((s, a) => s + Number(a[k] ?? 0), 0);
        return (
          <span className="text-xs">
            {t("toStock")} {landedCostMoney(sum("inventory_amount"))} · {t("toCogs")} {landedCostMoney(sum("cogs_amount"))}
            {sum("variance_amount") > 0 ? ` · ${t("toVariance")} ${landedCostMoney(sum("variance_amount"))}` : ""}
          </span>
        );
      },
    };
  }, [readOnly, effectiveStatus, doc, t]);

  const previewQuery = drawerData.previewQuery;
  const view = readOnly ? doc : previewQuery.data ?? null;
  const previewError = !readOnly && previewQuery.isError ? getLocalizedApiErrorMessage(tApiErrors, previewQuery.error) : null;

  const title = mode === "create" && documentId == null ? t("drawerTitleCreate") : readOnly ? t("drawerTitleView") : t("drawerTitleEdit");

  return (
    <ResourceCrudDrawer
      documentBranch={doc}
      title={title}
      recordName={loadedNumber}
      titleExtra={
        effectiveStatus ? (
          <Tag className="m-0" color={landedCostStatusColor(effectiveStatus)}>
            {getLandedCostStatusLabel(t, effectiveStatus)}
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
      size={1100}
      footer={
        <LandedCostDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!hasLines}
          postDisabled={!hasLines}
          showDelete={!readOnly && documentId != null && access.canDelete}
          showPost={!readOnly && access.canEdit}
          showReverse={effectiveStatus === "posted" && documentId != null && access.canReverse}
          showPdf={effectiveStatus !== "draft" && documentId != null && access.canPrint}
          pdfLoading={isDownloadPending}
          printLoading={isPrintPending}
          onSave={handleSave}
          onPost={handlePost}
          onDelete={handleDelete}
          onReverse={handleReverse}
          onPrint={() => printPdf(documentId, loadedNumber)}
          onDownloadPdf={() => downloadPdf(documentId, loadedNumber)}
        />
      }
    >
      <LandedCostDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        receiptValues={receipts.map(receiptKey)}
        receiptOptions={drawerData.receiptOptions}
        receiptsPending={drawerData.receiptsPending}
        onReceiptsChange={handleReceiptsChange}
      />
      <LandedCostChargesEditor
        t={t}
        readOnly={readOnly || submitting}
        charges={charges}
        chargeOptions={drawerData.chargeOptions}
        chargesPending={drawerData.chargesPending}
        onAddCharge={addCharge}
        onPatchCharge={patchCharge}
        onRemoveCharge={removeCharge}
        splitColumn={splitColumn}
      />
      <LandedCostAllocationTable
        t={t}
        readOnly={readOnly || submitting}
        view={view}
        loading={!readOnly && previewQuery.isFetching}
        previewError={previewError}
        charges={charges}
        onPatchCharge={patchCharge}
      />
    </ResourceCrudDrawer>
  );
}
