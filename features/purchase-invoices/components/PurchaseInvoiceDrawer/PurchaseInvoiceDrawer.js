"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, PURCHASE_INVOICES_QUERY_KEY } from "../../queries/purchaseInvoicesQueryKeys";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { fetchPurchaseInvoice, verifyPurchaseInvoice } from "../../api/purchaseInvoices.api";
import { createVendorPortalLink, createPurchaseInvoiceProofDisclosure, fetchPurchaseInvoiceProofFields } from "../../api/purchaseInvoices.api";
import { purchaseInvoiceProofQueryKey } from "../../queries/purchaseInvoicesQueryKeys";
import { usePurchaseInvoiceProofMutations } from "../../queries/usePurchaseInvoiceProofMutations";
import {
  INVOICE_CHAIN_PENDING_POLL_MS,
  invoiceProofShouldPoll,
  isInvoiceChainPending,
} from "@/features/sales-invoices/utils/invoiceProofStatuses";
import { purchaseInvoiceProofPortalAbsoluteUrl } from "../../utils/invoiceProofPortalUrl";
import { fetchGoodsReceipt } from "@/features/stock/api/goodsReceipts.api";
import { fetchPurchaseOrder } from "@/features/stock/api/purchaseOrders.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import SupplierDrawer from "@/features/suppliers/components/SupplierDrawer/SupplierDrawer";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers/queries/suppliersQueryKeys";
import { ROUTES } from "@/features/registry";
import { useCompanyProfile } from "@/features/settings/queries/companyProfile";
import { useRouter } from "@/i18n/navigation";
import ItemDrawer from "@/features/items/components/ItemDrawer/ItemDrawer";
import { App, Form, Input, Modal, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePurchaseInvoiceDrawerKeyboard } from "./purchaseInvoiceDrawerKeyboard";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import {
  isPurchaseInvoiceDraft,
  isPurchaseInvoicePosted,
  purchaseInvoiceCanReissue,
  purchaseInvoiceCanReverse,
  purchaseInvoiceReissueDisabledReason,
  purchaseInvoiceReverseDisabledReason,
} from "../../utils/purchaseInvoiceStatuses";
import {
  PURCHASE_INVOICE_POST_INTENT_EVENT,
  PURCHASE_INVOICE_POST_INTENT_KEY,
} from "../../utils/purchaseInvoicePostIntent";
import PurchaseInvoiceDrawerFooter from "./PurchaseInvoiceDrawerFooter";
import PurchaseInvoiceDrawerForm from "./PurchaseInvoiceDrawerForm";
import PurchaseInvoiceDrawerHeaderMeta from "./PurchaseInvoiceDrawerHeaderMeta";
import PurchaseInvoiceLineEditor from "./PurchaseInvoiceLineEditor";
import PurchaseInvoiceTotals from "./PurchaseInvoiceTotals";
import { rememberRecentSelectorOption } from "@/lib/recentSelectorOptions";
import {
  arePurchaseInvoiceLinesDirty,
  canAddPurchaseInvoiceLine,
  canSavePurchaseInvoiceDraft,
  getEmptyPurchaseInvoiceLine,
  getPurchaseInvoiceDefaults,
  isPurchaseInvoiceHeaderDirtyVsBaseline,
  isPurchaseInvoiceLineEmpty,
  mapPurchaseInvoiceGrnOption,
  mapPurchaseInvoiceLinesFromApi,
  mapPurchaseInvoicePoOption,
  mapPurchaseInvoiceRecordToForm,
  mapPurchaseInvoiceSupplierOption,
  seedLinesFromGoodsReceipt,
  seedLinesFromPurchaseOrder,
  suggestedDueOn,
  withPurchaseInvoiceLineMismatchFlags,
} from "../../utils/purchaseInvoiceDrawerUtils";
import {
  customerIsExemptOnDate as supplierIsExemptOnDate,
  previewInvoiceTotals,
} from "@/features/sales-invoices/utils/salesInvoiceTax";
import { usePurchaseInvoiceDrawerData } from "../../queries/usePurchaseInvoiceDrawerData";
import { usePurchaseInvoiceDrawerMutations } from "../../queries/usePurchaseInvoiceDrawerMutations";
import { tenantPricesIncludeTax, useCompanySettings } from "@/lib/company-settings";
import { withConfirmKeyboard } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { PURCHASE_INVOICE_SUPPLIER_RECENT_KIND } from "../../api/purchaseInvoiceSelectors.api";
import LinePriceRateBanner from "@/shared/components/lines-grid/LinePriceRateBanner";
import { formatExchangeRate } from "@/shared/components/lines-grid/LinePriceInput";
import {
  lineAtRate,
  lineAwaitsRateUpdate,
  manualLineAtOtherRate,
  positiveRate,
} from "@/lib/currency/documentExchangeRate";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   invoiceId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   createSeed?: { header?: Record<string, unknown>; lines?: Array<Record<string, unknown>> } | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onPostAndNew?: () => void;
 * }} props
 */
export default function PurchaseInvoiceDrawer({
  open,
  mode,
  invoiceId,
  tableSeedRecord = null,
  createSeed = null,
  onClose,
  onCreated,
  onPostAndNew,
}) {
  const t = useTranslations("PurchaseInvoices");
  const tSales = useTranslations("SalesInvoices");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const access = useResourceAccess("purchase_invoices");
  const invoiceProofAccess = useResourceAccess("invoice_proofs");
  const { openDrawer } = useGlobalDrawer();
  const supplierAccess = useResourceAccess("suppliers");
  const companyProfileAccess = useResourceAccess("company_profile");
  const itemAccess = useResourceAccess("items");
  const queryClient = useQueryClient();
  const { settings } = useCompanySettings();
  const companyProfile = useCompanyProfile();
  const router = useRouter();
  const [form] = Form.useForm();
  const [supplierCreateOpen, setSupplierCreateOpen] = useState(false);
  const [linkedDisclosure, setLinkedDisclosure] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [linkedSupplierSeed, setLinkedSupplierSeed] = useState(
    /** @type {{ value: string; label: string } | null} */ (null),
  );
  const [supplierEditOpen, setSupplierEditOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [itemViewId, setItemViewId] = useState(/** @type {string | null} */ (null));
  const [itemViewTrackedOpen, setItemViewTrackedOpen] = useState(open);
  if (open !== itemViewTrackedOpen) {
    setItemViewTrackedOpen(open);
    if (!open) setItemViewId(null);
  }

  const [lines, setLines] = useState(() => [getEmptyPurchaseInvoiceLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => [getEmptyPurchaseInvoiceLine()]);
  const [headerBaseline, setHeaderBaseline] = useState(() => getPurchaseInvoiceDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const [loadedPostedBy, setLoadedPostedBy] = useState(/** @type {unknown} */ (null));
  const [loadedPostedAt, setLoadedPostedAt] = useState(/** @type {string | null} */ (null));
  const [totals, setTotals] = useState(/** @type {Record<string, unknown> | null} */ (null));

  const dueOnAutoRef = useRef(true);
  const applyingDueOnRef = useRef(false);
  const prevSupplierIdRef = useRef(/** @type {unknown} */ (undefined));
  const hydrateSupplierRef = useRef(true);
  const loadedDetailVersionRef = useRef(0);
  const keyboardRootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const tamperedToastKeyRef = useRef(/** @type {string | null} */ (null));
  const previousProofStatusRef = useRef(/** @type {string | null} */ (null));
  const linesRef = useRef(lines);
  useLayoutEffect(() => {
    linesRef.current = lines;
  }, [lines]);
  const grnApplyRef = useRef(/** @type {string | null} */ (null));
  const poApplyRef = useRef(/** @type {string | null} */ (null));

  const defaults = useMemo(() => {
    void open;
    return getPurchaseInvoiceDefaults();
  }, [open]);

  const detailEnabled = open && (mode === "edit" || mode === "view") && invoiceId != null;
  const fetchRemoteDetail = detailEnabled;

  const detailQuery = useQuery({
    queryKey: [...PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, invoiceId],
    queryFn: () => fetchPurchaseInvoice(/** @type {string} */ (invoiceId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const applyTotals = useCallback((record) => {
    if (!record || typeof record !== "object") {
      setTotals(null);
      return;
    }
    setTotals({
      subtotal: record.subtotal,
      discount_total: record.discount_total,
      tax_total: record.tax_total,
      grand_total: record.grand_total,
      paid_total: record.paid_total,
      net_to_pay: record.net_to_pay,
    });
  }, []);

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapPurchaseInvoiceLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
        record.exchange_rate,
      );
      const nextLines = mappedLines.length > 0 ? mappedLines : [getEmptyPurchaseInvoiceLine()];
      setLines(nextLines);
      setLinesBaseline(nextLines);
      const mappedHeader = mapPurchaseInvoiceRecordToForm(record);
      setHeaderBaseline(mappedHeader);
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.invoice_number === "string" ? record.invoice_number : null);
      setLoadedPostedBy(record.posted_by ?? null);
      setLoadedPostedAt(typeof record.posted_at === "string" ? record.posted_at : null);
      applyTotals(record);
      form.setFieldsValue(mappedHeader);
      prevSupplierIdRef.current = record.supplier_id;
      hydrateSupplierRef.current = false;
      dueOnAutoRef.current = false;
      grnApplyRef.current =
        record.goods_receipt_id != null ? String(record.goods_receipt_id) : null;
      poApplyRef.current =
        record.purchase_order_id != null ? String(record.purchase_order_id) : null;
    },
    [form, applyTotals],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    const initialLines = [getEmptyPurchaseInvoiceLine()];
    setLines(initialLines);
    setLinesBaseline(initialLines);
    setHeaderBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    setLoadedPostedBy(null);
    setLoadedPostedAt(null);
    setTotals(null);
    loadedDetailVersionRef.current = 0;
    dueOnAutoRef.current = true;
    hydrateSupplierRef.current = true;
    prevSupplierIdRef.current = undefined;
    grnApplyRef.current = null;
    poApplyRef.current = null;
  }, [form, defaults]);

  useLayoutEffect(() => {
    if (!open) return;
    dueOnAutoRef.current = mode === "create";
    hydrateSupplierRef.current = true;
    if (mode === "create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset create draft when the drawer opens
      resetCreateDraftState();
      if (createSeed && typeof createSeed === "object") {
        const header = createSeed.header ?? {};
        form.setFieldsValue({ ...defaults, ...header });
        const seededLines =
          Array.isArray(createSeed.lines) && createSeed.lines.length > 0
            ? createSeed.lines
            : [getEmptyPurchaseInvoiceLine()];
        setLines(seededLines);
        setLinesBaseline([getEmptyPurchaseInvoiceLine()]);
        setHeaderBaseline(defaults);
        prevSupplierIdRef.current = header.supplier_id;
        hydrateSupplierRef.current = false;
      }
      return;
    }

    if (tableSeedRecord && typeof tableSeedRecord === "object") {
      setLoadedStatus(typeof tableSeedRecord.status === "string" ? tableSeedRecord.status : null);
      setLoadedNumber(
        typeof tableSeedRecord.invoice_number === "string" ? tableSeedRecord.invoice_number : null,
      );
      setLoadedPostedBy(tableSeedRecord.posted_by ?? null);
      setLoadedPostedAt(typeof tableSeedRecord.posted_at === "string" ? tableSeedRecord.posted_at : null);
      applyTotals(tableSeedRecord);
    }
  }, [open, mode, tableSeedRecord, createSeed, resetCreateDraftState, form, defaults, applyTotals]);

  useEffect(() => {
    if (!open || mode === "create" || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncBaselinesFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, mode, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncBaselinesFromRecord]);

  const effectiveStatus =
    loadedStatus ?? (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly =
    mode === "view" || !isPurchaseInvoiceDraft(effectiveStatus) || (mode === "edit" && !access.canEdit);
  const invoiceRecord = detailQuery.data ?? tableSeedRecord;
  const reverseEnabled = purchaseInvoiceCanReverse(invoiceRecord);
  const reissueEnabled = purchaseInvoiceCanReissue(invoiceRecord);
  const proofEnabled =
    open &&
    invoiceId != null &&
    (isPurchaseInvoicePosted(effectiveStatus) || effectiveStatus === "reversed") &&
    Boolean(settings.invoiceProofsEnabled) &&
    access.canView &&
    (invoiceProofAccess.canView || invoiceProofAccess.canEdit);
  const showProofView = proofEnabled && invoiceProofAccess.canView;

  const proofQuery = useQuery({
    queryKey: purchaseInvoiceProofQueryKey(invoiceId),
    queryFn: () => verifyPurchaseInvoice(/** @type {string} */ (invoiceId)),
    enabled: proofEnabled,
    staleTime: QUERY_STALE_TIME.ledger,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const linked =
        invoiceRecord && typeof invoiceRecord === "object" && invoiceRecord.linked_proof_id != null && invoiceRecord.linked_proof_id !== "";
      if (linked) return false;
      const data = query.state.data;
      const status = data && typeof data === "object" ? data.status : null;
      return invoiceProofShouldPoll(status, effectiveStatus) ? INVOICE_CHAIN_PENDING_POLL_MS : false;
    },
  });
  const proofResult = proofEnabled && proofQuery.data && typeof proofQuery.data === "object" ? proofQuery.data : null;
  const proofStatus = typeof proofResult?.status === "string" ? proofResult.status : null;

  useEffect(() => {
    const previous = previousProofStatusRef.current;
    previousProofStatusRef.current = proofStatus;
    if (previous != null && isInvoiceChainPending(previous) && proofStatus && !isInvoiceChainPending(proofStatus)) {
      queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICES_QUERY_KEY });
    }
  }, [proofStatus, queryClient]);

  useEffect(() => {
    if (!open) {
      tamperedToastKeyRef.current = null;
      return;
    }
    if (!invoiceProofAccess.canView || invoiceId == null || proofStatus !== "tampered") return;
    if (tamperedToastKeyRef.current === invoiceId) return;
    tamperedToastKeyRef.current = invoiceId;
    notification.error({
      title: tSales("proofStatusTampered"),
      description: tSales("verifySuccessTampered"),
    });
  }, [open, invoiceId, invoiceProofAccess.canView, proofStatus, notification, tSales]);

  const formValuesWatch = Form.useWatch([], form);
  const supplierId = formValuesWatch?.supplier_id ?? null;
  const supplierReady = supplierId != null && supplierId !== "";
  const currencyId = formValuesWatch?.currency_id ?? null;
  const warehouseId = formValuesWatch?.warehouse_id ?? null;
  const goodsReceiptId = formValuesWatch?.goods_receipt_id ?? null;
  const purchaseOrderId = formValuesWatch?.purchase_order_id ?? null;
  const hasGrn = goodsReceiptId != null && goodsReceiptId !== "";
  const hasPo = purchaseOrderId != null && purchaseOrderId !== "";
  const hasSource = hasGrn || hasPo;

  const invoiceLookups = useMemo(() => {
    const record = detailQuery.data ?? tableSeedRecord;
    if (!record || typeof record !== "object") return null;
    return {
      payment_method: record.payment_method ?? null,
      payment_term: record.payment_term ?? null,
    };
  }, [detailQuery.data, tableSeedRecord]);

  const drawerData = usePurchaseInvoiceDrawerData({
    open,
    t,
    supplierId,
    invoiceLookups,
  });

  const invoiceSupplier =
    drawerData.supplierDetail && typeof drawerData.supplierDetail === "object"
      ? drawerData.supplierDetail
      : detailQuery.data?.supplier && typeof detailQuery.data.supplier === "object"
        ? detailQuery.data.supplier
        : null;
  const invoiceSupplierId = normalizeEntityId(invoiceSupplier?.id) ?? normalizeEntityId(supplierId);
  const supplierWalletSaved = invoiceSupplier ? Boolean(invoiceSupplier.wallet_address) : null;
  const companyWalletSaved = companyProfile.isReady ? Boolean(companyProfile.profile.wallet_address) : null;

  const closeSupplierEdit = useCallback(() => {
    setSupplierEditOpen(false);
    if (invoiceId != null) {
      queryClient.invalidateQueries({ queryKey: [...PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, invoiceId] });
    }
    invalidateTenantListQueries(queryClient, SUPPLIERS_LIST_QUERY_KEY);
    if (invoiceSupplierId != null) {
      queryClient.invalidateQueries({ queryKey: [...SUPPLIERS_LIST_QUERY_KEY, invoiceSupplierId, "full"] });
    }
  }, [queryClient, invoiceId, invoiceSupplierId]);

  const grnSeedOptions = useMemo(() => {
    const record = detailQuery.data ?? tableSeedRecord;
    const grn = record?.goods_receipt;
    const option = mapPurchaseInvoiceGrnOption(
      grn && typeof grn === "object" ? /** @type {Record<string, unknown>} */ (grn) : null,
    );
    return option ? [option] : [];
  }, [detailQuery.data, tableSeedRecord]);

  const poSeedOptions = useMemo(() => {
    const record = detailQuery.data ?? tableSeedRecord;
    const order = record?.purchase_order;
    const option = mapPurchaseInvoicePoOption(
      order && typeof order === "object" ? /** @type {Record<string, unknown>} */ (order) : null,
    );
    return option ? [option] : [];
  }, [detailQuery.data, tableSeedRecord]);

  useEffect(() => {
    if (!open || readOnly || mode !== "create") return;
    if (form.getFieldValue("warehouse_id") != null) return;
    if (drawerData.defaultWarehouseId == null) return;
    form.setFieldsValue({ warehouse_id: drawerData.defaultWarehouseId });
  }, [open, readOnly, mode, drawerData.defaultWarehouseId, form]);

  useEffect(() => {
    if (!open || readOnly || mode !== "create") return;
    if (form.getFieldValue("currency_id") != null) return;
    if (drawerData.primaryCurrencyId == null) return;
    form.setFieldsValue({ currency_id: drawerData.primaryCurrencyId, exchange_rate: 1 });
  }, [open, readOnly, mode, drawerData.primaryCurrencyId, form]);

  useEffect(() => {
    if (!open || readOnly) return;

    if (hydrateSupplierRef.current) {
      hydrateSupplierRef.current = false;
      prevSupplierIdRef.current = supplierId;
      return;
    }

    if (prevSupplierIdRef.current === supplierId) return;

    if (supplierId == null) {
      const hadLink = grnApplyRef.current != null || poApplyRef.current != null;
      prevSupplierIdRef.current = null;
      grnApplyRef.current = null;
      poApplyRef.current = null;
      form.setFieldsValue({
        payment_method_id: undefined,
        payment_terms_id: undefined,
        goods_receipt_id: undefined,
        purchase_order_id: undefined,
      });
      if (hadLink) setLines([getEmptyPurchaseInvoiceLine()]);
      return;
    }

    if (
      prevSupplierIdRef.current != null &&
      String(prevSupplierIdRef.current) !== String(supplierId)
    ) {
      const hadLink = grnApplyRef.current != null || poApplyRef.current != null;
      grnApplyRef.current = null;
      poApplyRef.current = null;
      form.setFieldsValue({
        goods_receipt_id: undefined,
        purchase_order_id: undefined,
      });
      if (hadLink) setLines([getEmptyPurchaseInvoiceLine()]);
    }

    if (drawerData.supplierDetailPending) return;
    const supplier = drawerData.supplierDetail;
    if (!supplier || String(supplier.id) !== String(supplierId)) return;

    prevSupplierIdRef.current = supplierId;
    if (!form.getFieldValue("use_linked_proof")) dueOnAutoRef.current = true;
    form.setFieldsValue({
      payment_method_id: supplier.payment_method_id ?? undefined,
      payment_terms_id: supplier.payment_terms_id ?? undefined,
    });
  }, [open, supplierId, drawerData.supplierDetail, drawerData.supplierDetailPending, form, readOnly]);

  const sourceLinePricing = useCallback(() => {
    const headerCurrencyId = form.getFieldValue("currency_id");
    const primaryId = drawerData.primaryCurrencyId;
    const isPrimary = headerCurrencyId == null || primaryId == null || Number(headerCurrencyId) === Number(primaryId);
    return {
      rate: isPrimary ? 1 : positiveRate(form.getFieldValue("exchange_rate")),
      priceDecimals: settings.priceDecimalPlaces,
    };
  }, [form, drawerData.primaryCurrencyId, settings.priceDecimalPlaces]);

  const applyGrnToForm = useCallback(
    async (grnId) => {
      if (grnId == null || grnId === "") return;
      try {
        const grn = /** @type {Record<string, unknown>} */ (await fetchGoodsReceipt(String(grnId)));
        poApplyRef.current = null;
        form.setFieldsValue({
          warehouse_id: grn.warehouse_id != null ? Number(grn.warehouse_id) : form.getFieldValue("warehouse_id"),
          purchase_order_id: undefined,
        });
        setLines(seedLinesFromGoodsReceipt(grn, sourceLinePricing()));
        grnApplyRef.current = String(grnId);
      } catch (err) {
        grnApplyRef.current = null;
        form.setFieldValue("goods_receipt_id", undefined);
        notification.error({
          title: t("grnLoadError"),
          description: String(err?.message ?? err),
        });
      }
    },
    [form, notification, t, sourceLinePricing],
  );

  const confirmGrnChange = useCallback(
    (nextGrnId) => {
      const previousGrnId = grnApplyRef.current;
      const clearing = nextGrnId == null || nextGrnId === "";
      const hasItemLines = linesRef.current.some(
        (line) => line.item_id != null && String(line.item_id).trim() !== "",
      );

      const restorePrevious = () => {
        form.setFieldValue("goods_receipt_id", previousGrnId ?? undefined);
      };

      const apply = () => {
        if (clearing) {
          grnApplyRef.current = null;
          setLines([getEmptyPurchaseInvoiceLine()]);
          return;
        }
        void applyGrnToForm(nextGrnId);
      };

      // Empty lines: apply/clear immediately (first GRN pick, or clear with nothing filled).
      if (!hasItemLines) {
        apply();
        return;
      }

      // Lines already filled — ask before replacing or wiping them.
      modal.confirm(
        withConfirmKeyboard({
          title: clearing ? t("grnClearLinesTitle") : t("grnChangeLinesTitle"),
          content: clearing ? t("grnClearLinesContent") : t("grnChangeLinesContent"),
          okText: clearing ? t("grnClearLinesOk") : t("grnChangeLinesOk"),
          cancelText: clearing ? t("grnClearLinesKeep") : t("grnChangeLinesKeep"),
          onOk: apply,
          onCancel: restorePrevious,
        }),
      );
    },
    [applyGrnToForm, form, modal, t],
  );

  useEffect(() => {
    if (!open || readOnly) return;
    const nextKey = goodsReceiptId != null && goodsReceiptId !== "" ? String(goodsReceiptId) : null;
    if (grnApplyRef.current === nextKey) return;
    if (grnApplyRef.current == null && nextKey == null) return;
    confirmGrnChange(nextKey);
  }, [open, readOnly, goodsReceiptId, confirmGrnChange]);

  const applyPoToForm = useCallback(
    async (poId) => {
      if (poId == null || poId === "") return;
      try {
        const order = /** @type {Record<string, unknown>} */ (await fetchPurchaseOrder(String(poId)));
        grnApplyRef.current = null;
        form.setFieldsValue({
          warehouse_id:
            order.warehouse_id != null ? Number(order.warehouse_id) : form.getFieldValue("warehouse_id"),
          goods_receipt_id: undefined,
        });
        setLines(seedLinesFromPurchaseOrder(order, sourceLinePricing()));
        poApplyRef.current = String(poId);
      } catch (err) {
        poApplyRef.current = null;
        form.setFieldValue("purchase_order_id", undefined);
        notification.error({
          title: t("poLoadError"),
          description: String(err?.message ?? err),
        });
      }
    },
    [form, notification, t, sourceLinePricing],
  );

  const confirmPoChange = useCallback(
    (nextPoId) => {
      const previousPoId = poApplyRef.current;
      const clearing = nextPoId == null || nextPoId === "";
      const hasItemLines = linesRef.current.some(
        (line) => line.item_id != null && String(line.item_id).trim() !== "",
      );

      const restorePrevious = () => {
        form.setFieldValue("purchase_order_id", previousPoId ?? undefined);
      };

      const apply = () => {
        if (clearing) {
          poApplyRef.current = null;
          setLines([getEmptyPurchaseInvoiceLine()]);
          return;
        }
        void applyPoToForm(nextPoId);
      };

      if (!hasItemLines) {
        apply();
        return;
      }

      modal.confirm(
        withConfirmKeyboard({
          title: clearing ? t("poClearLinesTitle") : t("poChangeLinesTitle"),
          content: clearing ? t("poClearLinesContent") : t("poChangeLinesContent"),
          okText: clearing ? t("poClearLinesOk") : t("poChangeLinesOk"),
          cancelText: clearing ? t("poClearLinesKeep") : t("poChangeLinesKeep"),
          onOk: apply,
          onCancel: restorePrevious,
        }),
      );
    },
    [applyPoToForm, form, modal, t],
  );

  useEffect(() => {
    if (!open || readOnly) return;
    const nextKey = purchaseOrderId != null && purchaseOrderId !== "" ? String(purchaseOrderId) : null;
    if (poApplyRef.current === nextKey) return;
    if (poApplyRef.current == null && nextKey == null) return;
    confirmPoChange(nextKey);
  }, [open, readOnly, purchaseOrderId, confirmPoChange]);

  const exchangeRateLocked =
    currencyId == null ||
    drawerData.primaryCurrencyId == null ||
    Number(currencyId) === Number(drawerData.primaryCurrencyId);

  const headerRate = exchangeRateLocked ? 1 : positiveRate(formValuesWatch?.exchange_rate);
  const primaryCode = drawerData.currencyCode(drawerData.primaryCurrencyId);
  const documentCurrencyCode = drawerData.currencyCode(currencyId);
  const linePricing = useMemo(
    () => ({
      rate: headerRate,
      foreign: !exchangeRateLocked,
      primaryCode,
      currencyCode: documentCurrencyCode,
    }),
    [headerRate, exchangeRateLocked, primaryCode, documentCurrencyCode],
  );
  const exchangeRateHelp = exchangeRateLocked
    ? undefined
    : t("fieldExchangeRateHelp", {
        primary: primaryCode,
        rate: headerRate != null ? formatExchangeRate(headerRate) : "?",
        currency: documentCurrencyCode,
      });
  const linesAwaitingRate = useMemo(
    () => lines.filter((line) => lineAwaitsRateUpdate(line, headerRate)).length,
    [lines, headerRate],
  );
  const manualLinesAtOtherRate = useMemo(
    () => lines.filter((line) => manualLineAtOtherRate(line, headerRate)).length,
    [lines, headerRate],
  );
  const updateLinePrices = useCallback(() => {
    if (headerRate == null) return;
    setLines((prev) =>
      prev.map((line) =>
        lineAwaitsRateUpdate(line, headerRate)
          ? withPurchaseInvoiceLineMismatchFlags(lineAtRate(line, headerRate, settings.priceDecimalPlaces))
          : line,
      ),
    );
  }, [headerRate, settings.priceDecimalPlaces]);

  useEffect(() => {
    if (readOnly || currencyId == null || formValuesWatch?.use_linked_proof) return;
    if (exchangeRateLocked) {
      if (Number(form.getFieldValue("exchange_rate")) !== 1) {
        form.setFieldsValue({ exchange_rate: 1 });
      }
      return;
    }
    const current = form.getFieldValue("exchange_rate");
    if (current != null && Number(current) > 0 && Number(current) !== 1) return;
    const rate = drawerData.rateFromPrimary(currencyId);
    if (rate != null && rate > 0) {
      form.setFieldsValue({ exchange_rate: rate });
    }
  }, [currencyId, drawerData, exchangeRateLocked, form, formValuesWatch?.use_linked_proof, readOnly]);

  const paymentTermDueDays = useMemo(() => {
    const termId = formValuesWatch?.payment_terms_id;
    const term = drawerData.paymentTermOptions.find((row) => Number(row.value) === Number(termId));
    return term?.due_days ?? 0;
  }, [drawerData.paymentTermOptions, formValuesWatch?.payment_terms_id]);

  useEffect(() => {
    if (readOnly || formValuesWatch?.use_linked_proof || !dueOnAutoRef.current) return;
    const next = suggestedDueOn(formValuesWatch?.invoice_date, paymentTermDueDays);
    if (String(form.getFieldValue("due_on") ?? "") === next) return;
    applyingDueOnRef.current = true;
    form.setFieldsValue({ due_on: next });
    applyingDueOnRef.current = false;
  }, [form, formValuesWatch?.invoice_date, formValuesWatch?.use_linked_proof, paymentTermDueDays, readOnly]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults,
    isCreateDirtyVsBaseline: (instance, baseline) =>
      isPurchaseInvoiceHeaderDirtyVsBaseline(instance, {
        ...baseline,
        warehouse_id: baseline.warehouse_id ?? drawerData.defaultWarehouseId,
        currency_id: baseline.currency_id ?? drawerData.primaryCurrencyId,
        exchange_rate: baseline.exchange_rate ?? 1,
      }),
  });

  const isLinesDirty = useMemo(
    () => arePurchaseInvoiceLinesDirty(lines, linesBaseline),
    [lines, linesBaseline],
  );

  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isPurchaseInvoiceHeaderDirtyVsBaseline(form, headerBaseline);
  }, [mode, isCreateDirty, form, headerBaseline]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirty() || isLinesDirty;
    return isHeaderDirty || isLinesDirty;
  }, [readOnly, mode, isCreateDirty, isLinesDirty, isHeaderDirty]);

  const handleDrawerClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose: handleDrawerClose,
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
      syncBaselinesFromRecordAndBump(record);
      onCreated?.(record);
    },
    [onCreated, syncBaselinesFromRecordAndBump],
  );

  const onSupplierCreated = useCallback(
    (record) => {
      const id = record?.id;
      if (id == null || id === "") return;
      form.setFieldValue("supplier_id", id);
      const recent = mapPurchaseInvoiceSupplierOption(
        /** @type {Record<string, unknown>} */ (record),
      );
      if (recent) rememberRecentSelectorOption(PURCHASE_INVOICE_SUPPLIER_RECENT_KIND, recent);
      invalidateTenantListQueries(queryClient, SUPPLIERS_LIST_QUERY_KEY);
      setSupplierCreateOpen(false);
    },
    [form, queryClient],
  );

  const handleLinkedProofImported = useCallback(
    (result, disclosure) => {
      setLinkedDisclosure(disclosure);
      dueOnAutoRef.current = false;
      const supplierId = result.supplier_id;
      const supplierName = typeof result.supplier_name === "string" ? result.supplier_name : "";
      if (supplierId != null && supplierId !== "") {
        setLinkedSupplierSeed({ value: String(supplierId), label: supplierName || String(supplierId) });
      }
      form.setFieldsValue({
        use_linked_proof: true,
        linked_proof_id: result.proof_id ?? "",
        supplier_id: supplierId,
        currency_id: result.currency_id,
        invoice_date: result.invoice_date,
        ...(result.due_on ? { due_on: result.due_on } : {}),
        exchange_rate: result.exchange_rate != null && result.exchange_rate !== "" ? Number(result.exchange_rate) : undefined,
        notes: typeof result.notes === "string" ? result.notes : "",
        adjustment: result.adjustment != null && result.adjustment !== "" ? Number(result.adjustment) : 0,
        goods_receipt_id: undefined,
        purchase_order_id: undefined,
      });
      const imported = Array.isArray(result.lines) ? result.lines : [];
      setLines(
        imported.length > 0
          ? imported.map((line) => {
              const row = line && typeof line === "object" ? /** @type {Record<string, unknown>} */ (line) : {};
              return {
                ...getEmptyPurchaseInvoiceLine(),
                item_id: row.item_id != null ? String(row.item_id) : undefined,
                item_label: typeof row.item_label === "string" ? row.item_label : "",
                item_uom_id: row.item_uom_id != null ? Number(row.item_uom_id) : undefined,
                quantity: row.quantity != null && row.quantity !== "" ? Number(row.quantity) : undefined,
                unit_price: row.unit_price != null && row.unit_price !== "" ? Number(row.unit_price) : undefined,
                discount_percent: row.discount_percent != null && row.discount_percent !== "" ? Number(row.discount_percent) : 0,
                description: typeof row.description === "string" ? row.description : "",
              };
            })
          : [getEmptyPurchaseInvoiceLine()],
      );
    },
    [form],
  );

  const { saveMutation, postMutation, reverseMutation, reissueMutation, deleteMutation, submitting } = usePurchaseInvoiceDrawerMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    invoiceId,
    lines,
    linkedDisclosure,
    onCreated: handleCreated,
    onSaved: syncBaselinesFromRecordAndBump,
    onPosted: syncBaselinesFromRecordAndBump,
    onReversed: syncBaselinesFromRecordAndBump,
    onReissued: (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      openDrawer({
        featureId: "purchaseInvoices",
        id,
        mode: "edit",
        seed: record,
      });
    },
    onDeleted: forceClose,
    onClose: forceClose,
    onPostAndNew,
  });

  const { verifyMutation, approveBuyerMutation, disputeBuyerMutation } = usePurchaseInvoiceProofMutations({
    message,
    notification,
    t,
    tSales,
    tApiErrors,
  });

  const handleOpenRelatedInvoice = useCallback(
    (invoice) => {
      const id = normalizeEntityId(invoice?.id);
      if (id == null) return;
      const status = typeof invoice?.status === "string" ? invoice.status : "";
      openDrawer({
        featureId: "purchaseInvoices",
        id,
        mode: status === "draft" && access.canEdit ? "edit" : "view",
        seed: invoice && typeof invoice === "object" ? { ...invoice } : null,
      });
    },
    [access.canEdit, openDrawer],
  );

  const currentValues = useMemo(
    () => ({
      supplier_id: formValuesWatch?.supplier_id,
      warehouse_id: formValuesWatch?.warehouse_id,
      invoice_date: formValuesWatch?.invoice_date,
    }),
    [formValuesWatch],
  );

  const canSubmitRequired = useMemo(
    () => canSavePurchaseInvoiceDraft(currentValues, lines),
    [currentValues, lines],
  );

  const canAddLine = useMemo(
    () => !hasSource && canAddPurchaseInvoiceLine(lines),
    [hasSource, lines],
  );

  const taxContext = useMemo(() => {
    const supplierExempt = supplierIsExemptOnDate(
      drawerData.supplierDetail,
      formValuesWatch?.invoice_date,
    );
    return {
      taxEnabled: Boolean(settings.taxEnabled),
      pricesIncludeTax: tenantPricesIncludeTax(settings),
      supplierExempt,
      settings,
    };
  }, [drawerData.supplierDetail, formValuesWatch?.invoice_date, settings]);

  const liveTotals = useMemo(
    () =>
      previewInvoiceTotals({
        lines,
        itemsById: new Map(
          lines
            .filter((line) => line.item_id != null && line.item_id !== "")
            .map((line) => [
              String(line.item_id),
              {
                vat_percentage: line.vat_percentage,
                track_inventory: line.track_inventory,
                track_lots: line.track_lots,
              },
            ]),
        ),
        adjustment: formValuesWatch?.adjustment ?? 0,
        taxEnabled: taxContext.taxEnabled,
        pricesIncludeTax: taxContext.pricesIncludeTax,
        customerExempt: taxContext.supplierExempt,
        settings,
      }),
    [lines, formValuesWatch?.adjustment, taxContext, settings],
  );

  const displayTotals = readOnly && totals ? totals : liveTotals;

  const handleSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => saveMutation.mutate({ values }))
      .catch(() => {});
  }, [form, saveMutation]);

  const lastPostIntent = usePersistedSaveIntent(
    PURCHASE_INVOICE_POST_INTENT_KEY,
    PURCHASE_INVOICE_POST_INTENT_EVENT,
  );

  const postIntentLabel = useCallback(
    (/** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent} */ intent) => {
      if (intent === "keep") return t("actionPost");
      if (intent === "new") return t("actionPostAndNew");
      return t("actionPostAndClose");
    },
    [t],
  );

  const postMenuItems = useMemo(
    () =>
      /** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent[]} */ ([
        "keep",
        "new",
        "close",
      ])
        .filter((key) => key !== lastPostIntent)
        .map((key) => ({ key, label: postIntentLabel(key) })),
    [lastPostIntent, postIntentLabel],
  );

  const handlePost = useCallback(
    (/** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent} */ intent = lastPostIntent) => {
      const postIntent = intent === "keep" || intent === "new" || intent === "close" ? intent : "close";
      form
        .validateFields()
        .then((values) => {
          const content = hasGrn ? t("postConfirmContentApOnly") : t("postConfirmContentApAndStock");
          modal.confirm(
            withConfirmKeyboard({
              title: t("postConfirmTitle"),
              content,
              okText: t("postConfirmOk"),
              cancelText: t("drawerCancel"),
              onOk: () => closeConfirmOnError(postMutation.mutateAsync({ values, intent: postIntent })),
            }),
          );
        })
        .catch(() => {});
    },
    [form, modal, t, postMutation, lastPostIntent, hasGrn],
  );

  const handleReverse = useCallback(() => {
    if (!reverseEnabled) return;
    modal.confirm(
      withConfirmKeyboard({
        title: t("reverseConfirmTitle"),
        content: hasGrn ? t("reverseConfirmContentApOnly") : t("reverseConfirmContentApAndStock"),
        okText: t("actionReverse"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(reverseMutation.mutateAsync()),
      }),
    );
  }, [modal, t, reverseMutation, hasGrn, reverseEnabled]);

  const handleReissue = useCallback(() => {
    if (!reissueEnabled) return;
    modal.confirm(
      withConfirmKeyboard({
        title: t("reissueConfirmTitle"),
        content: t("reissueConfirmContent"),
        okText: t("actionReissue"),
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(reissueMutation.mutateAsync()),
      }),
    );
  }, [modal, t, reissueMutation, reissueEnabled]);

  const handleDelete = useCallback(() => {
    const name = loadedNumber ?? String(invoiceId ?? "");
    modal.confirm(
      withConfirmKeyboard({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
      }),
    );
  }, [modal, t, deleteMutation, loadedNumber, invoiceId]);

  const patchLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const clearLine = useCallback((index) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (line.goods_receipt_line_id != null || line.purchase_order_line_id != null) return line;
        return getEmptyPurchaseInvoiceLine();
      }),
    );
  }, []);

  const removeLine = useCallback((index) => {
    setLines((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      if (prev.length <= 1) return prev;
      const line = prev[index];
      if (line?.goods_receipt_line_id != null || line?.purchase_order_line_id != null) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const addLine = useCallback(() => {
    if (hasSource) return;
    setLines((prev) => [...prev, getEmptyPurchaseInvoiceLine()]);
  }, [hasSource]);

  const duplicateLine = useCallback((index) => {
    setLines((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const source = prev[index];
      if (source.goods_receipt_line_id != null || source.purchase_order_line_id != null) return prev;
      const copy = { ...source, catalogReloadKey: 0 };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }, []);

  const viewLineItem = useCallback((itemId) => {
    const id = normalizeEntityId(itemId);
    if (id == null) return;
    setItemViewId(String(id));
  }, []);

  const handleHeaderValuesChange = useCallback(
    (changed) => {
      if (!changed || typeof changed !== "object") return;
      if ("invoice_date" in changed || "payment_terms_id" in changed || "supplier_id" in changed) {
        dueOnAutoRef.current = true;
      }
      if ("due_on" in changed && !applyingDueOnRef.current) {
        dueOnAutoRef.current = false;
      }
      if ("warehouse_id" in changed && !hasSource) {
        const nextWarehouse = changed.warehouse_id;
        setLines((prev) =>
          prev.map((line) =>
            line.track_inventory &&
            line.item_id &&
            !line.goods_receipt_line_id &&
            !line.purchase_order_line_id &&
            line.warehouse_id == null
              ? { ...line, warehouse_id: nextWarehouse }
              : line,
          ),
        );
      }
      if ("currency_id" in changed) {
        const nextId = changed.currency_id;
        const primaryId = drawerData.primaryCurrencyId;
        if (nextId == null || primaryId == null || Number(nextId) === Number(primaryId)) {
          form.setFieldsValue({ exchange_rate: 1 });
          return;
        }
        const rate = drawerData.rateFromPrimary(nextId);
        form.setFieldsValue({ exchange_rate: rate != null && rate > 0 ? rate : undefined });
      }
    },
    [drawerData, form, hasSource],
  );

  const baseTitle =
    mode === "create"
      ? t("drawerTitleCreate")
      : mode === "view" || readOnly
        ? t("drawerTitleView")
        : t("drawerTitleEdit");
  const title = loadedNumber ? `${baseTitle} # ${loadedNumber}` : baseTitle;

  const showDetailLoading = fetchRemoteDetail && detailQuery.isLoading;
  const keyboardEnabled = open && !readOnly && !submitting && !showDetailLoading;

  const lineKeyboardActionsRef = useRef(
    /** @type {{ duplicateLine?: (index: number) => void }} */ ({}),
  );

  usePurchaseInvoiceDrawerKeyboard({
    enabled: keyboardEnabled,
    rootRef: keyboardRootRef,
    linesLength: lines.length,
    supplierReady,
    onAddLine: addLine,
    isLineEmpty: (index) => isPurchaseInvoiceLineEmpty(lines[index]),
    onClearLine: clearLine,
    onRemoveLine: removeLine,
    onDuplicateLine: (index) => {
      if (lineKeyboardActionsRef.current.duplicateLine) {
        lineKeyboardActionsRef.current.duplicateLine(index);
        return;
      }
      duplicateLine(index);
    },
  });

  return (
    <>
      <ResourceCrudDrawer
        title={title}
        open={open}
        requestClose={requestClose}
        submitting={submitting}
        showExpand={false}
        placement="top"
        size="100%"
        className="sales-invoice-crud-drawer"
        headerExtra={
          <PurchaseInvoiceDrawerHeaderMeta
            t={t}
            invoiceStatus={effectiveStatus}
            chainIssue={
              showProofView
                ? ((detailQuery.data ? detailQuery.data.chain_issue : tableSeedRecord?.chain_issue) ?? null)
                : null
            }
          />
        }
        showDetailLoading={showDetailLoading}
        detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
        detailError={detailQuery.error}
        tApiErrors={tApiErrors}
        footer={
          <PurchaseInvoiceDrawerFooter
            readOnly={readOnly}
            t={t}
            tSales={tSales}
            forceClose={forceClose}
            requestClose={requestClose}
            submitting={submitting}
            saveDisabled={!canSubmitRequired}
            postDisabled={!canSubmitRequired || !access.canEdit}
            showDelete={!readOnly && invoiceId != null && access.canDelete}
            showReverse={effectiveStatus === "posted" && invoiceId != null && access.canReverse}
            reverseDisabled={!reverseEnabled}
            reverseDisabledReason={purchaseInvoiceReverseDisabledReason(t, invoiceRecord)}
            onReverse={handleReverse}
            postedBy={loadedPostedBy}
            postedAt={loadedPostedAt}
            onSave={handleSave}
            onPost={handlePost}
            lastPostIntent={lastPostIntent}
            postIntentLabel={postIntentLabel}
            postMenuItems={postMenuItems}
            onDelete={handleDelete}
            showVerify={showProofView}
            verifying={verifyMutation.isPending || (proofQuery.isFetching && !proofResult)}
            proofStatus={proofStatus}
            chainRegisteredAt={typeof proofResult?.registered_at === "string" ? proofResult.registered_at : null}
            chainSupplierApprovedAt={
              typeof proofResult?.supplier_approved_at === "string" ? proofResult.supplier_approved_at : null
            }
            chainBuyerApprovedAt={
              typeof proofResult?.buyer_approved_at === "string" ? proofResult.buyer_approved_at : null
            }
            chainDisputedAt={typeof proofResult?.disputed_at === "string" ? proofResult.disputed_at : null}
            chainDisputeReason={typeof proofResult?.dispute_reason === "string" ? proofResult.dispute_reason : null}
            chainSupplierWallet={typeof proofResult?.supplier_wallet === "string" ? proofResult.supplier_wallet : null}
            chainBuyerWallet={typeof proofResult?.buyer_wallet === "string" ? proofResult.buyer_wallet : null}
            chainAttestations={Array.isArray(proofResult?.attestations) ? proofResult.attestations : []}
            companyWalletSaved={companyWalletSaved}
            supplierWalletSaved={supplierWalletSaved}
            onOpenCompanyProfile={
              companyProfileAccess.canEdit ? () => router.push(ROUTES.settingsCompanyProfile) : undefined
            }
            onOpenSupplier={
              supplierAccess.canEdit && invoiceSupplierId != null ? () => setSupplierEditOpen(true) : undefined
            }
            showApproveBuyer={Boolean(
              effectiveStatus === "posted" && invoiceProofAccess.canEdit && proofResult?.can_approve_as_buyer,
            )}
            approvingBuyer={approveBuyerMutation.isPending}
            onApproveBuyer={() => {
              if (invoiceId != null) approveBuyerMutation.mutate({ invoiceId, proof: proofResult });
            }}
            showDispute={Boolean(
              effectiveStatus === "posted" && invoiceProofAccess.canEdit && proofResult?.can_dispute_as_buyer,
            )}
            onDispute={() => {
              setDisputeReason("");
              setDisputeOpen(true);
            }}
            showVendorLink={
              showProofView &&
              effectiveStatus === "posted" &&
              !(invoiceRecord && invoiceRecord.linked_proof_id)
            }
            vendorLinkInvoiceId={invoiceId}
            vendorLinkInvoiceNumber={loadedNumber}
            issueVendorLink={createVendorPortalLink}
            vendorAbsoluteUrl={purchaseInvoiceProofPortalAbsoluteUrl}
            fetchProofFields={fetchPurchaseInvoiceProofFields}
            createProofDisclosure={createPurchaseInvoiceProofDisclosure}
            showReissue={Boolean(
              invoiceId != null &&
                access.canAdd &&
                (effectiveStatus === "reversed" || (effectiveStatus === "posted" && access.canReverse)),
            )}
            reissueDisabled={!reissueEnabled}
            reissueDisabledReason={purchaseInvoiceReissueDisabledReason(t, invoiceRecord)}
            onReissue={handleReissue}
            replacesInvoice={invoiceRecord?.replaces_invoice ?? null}
            replacedByInvoice={invoiceRecord?.replaced_by_invoice ?? null}
            onOpenRelatedInvoice={handleOpenRelatedInvoice}
            onVerify={() => {
              if (invoiceId != null) verifyMutation.mutate(invoiceId);
            }}
          />
        }
      >
        <PurchaseInvoiceDrawerForm
          form={form}
          readOnly={readOnly || submitting}
          t={t}
          supplierSeedOptions={
            linkedSupplierSeed
              ? [linkedSupplierSeed, ...drawerData.supplierSeedOptions]
              : drawerData.supplierSeedOptions
          }
          onLinkedProofImported={handleLinkedProofImported}
          onLinkedProofCleared={() => {
            setLinkedDisclosure(null);
            setLinkedSupplierSeed(null);
          }}
          grnSeedOptions={grnSeedOptions}
          poSeedOptions={poSeedOptions}
          warehouseOptions={drawerData.warehouseOptions}
          currencyOptions={drawerData.currencyOptions}
          paymentMethodOptions={drawerData.paymentMethodOptions}
          paymentTermOptions={drawerData.paymentTermOptions}
          warehousesPending={drawerData.warehousesPending}
          currenciesPending={drawerData.currenciesPending}
          paymentMethodsPending={drawerData.paymentMethodsPending}
          paymentTermsPending={drawerData.paymentTermsPending}
          exchangeRateLocked={exchangeRateLocked}
          exchangeRateHelp={exchangeRateHelp}
          supplierLocked={hasSource}
          warehouseLocked={hasSource}
          grnDisabled={!supplierReady}
          poDisabled={!supplierReady}
          invoiceId={invoiceId}
          showLinkedProof={Boolean(settings.invoiceProofsEnabled) || Boolean(invoiceRecord?.linked_proof_id)}
          tSales={tSales}
          onOpenSupplierDrawer={
            !readOnly && supplierAccess.canAdd ? () => setSupplierCreateOpen(true) : undefined
          }
          onValuesChange={handleHeaderValuesChange}
          keyboardRootRef={keyboardRootRef}
        >
          <PurchaseInvoiceLineEditor
            lines={lines}
            pricing={linePricing}
            rateBanner={
              !readOnly ? (
                <LinePriceRateBanner
                  count={linesAwaitingRate}
                  manualCount={manualLinesAtOtherRate}
                  disabled={submitting}
                  t={t}
                  onUpdate={updateLinePrices}
                />
              ) : null
            }
            readOnly={readOnly || submitting || !supplierReady}
            sealLocked={Boolean(formValuesWatch?.use_linked_proof && formValuesWatch?.linked_proof_id)}
            taxContext={taxContext}
            warehouseOptions={drawerData.warehouseOptions}
            headerWarehouseId={warehouseId}
            canAddLine={canAddLine}
            canViewItem={itemAccess.canView}
            onPatchLine={patchLine}
            onClearLine={clearLine}
            onRemoveLine={removeLine}
            onDuplicateLine={duplicateLine}
            lineKeyboardActionsRef={lineKeyboardActionsRef}
            onAddLine={addLine}
            onViewItem={viewLineItem}
            t={t}
          />
          <PurchaseInvoiceTotals
            t={t}
            readOnly={readOnly || submitting}
            sealLocked={Boolean(formValuesWatch?.use_linked_proof && formValuesWatch?.linked_proof_id)}
            totals={displayTotals}
          />
        </PurchaseInvoiceDrawerForm>
      </ResourceCrudDrawer>
      {!readOnly && supplierAccess.canAdd ? (
        <SupplierDrawer
          open={open && supplierCreateOpen}
          mode="create"
          supplierId={null}
          zIndex={1100}
          onClose={() => setSupplierCreateOpen(false)}
          onCreated={onSupplierCreated}
        />
      ) : null}
      {supplierAccess.canEdit && invoiceSupplierId != null ? (
        <SupplierDrawer
          open={open && supplierEditOpen}
          mode="edit"
          supplierId={String(invoiceSupplierId)}
          zIndex={1100}
          onClose={closeSupplierEdit}
        />
      ) : null}
      {itemAccess.canView ? (
        <ItemDrawer
          open={open && itemViewId != null}
          mode="view"
          itemId={itemViewId}
          zIndex={1100}
          onClose={() => setItemViewId(null)}
        />
      ) : null}
      <Modal
        title={t("disputeTitle")}
        open={open && disputeOpen}
        onCancel={() => setDisputeOpen(false)}
        okText={t("disputeConfirm")}
        confirmLoading={disputeBuyerMutation.isPending}
        okButtonProps={{ danger: true, disabled: disputeReason.trim() === "" }}
        styles={{ body: { paddingBottom: 28 } }}
        onOk={() => {
          if (invoiceId == null) return;
          return disputeBuyerMutation.mutateAsync({
            invoiceId,
            proof: proofResult,
            reason: disputeReason.trim(),
          }).then(() => {
            setDisputeOpen(false);
            setDisputeReason("");
          });
        }}
      >
        <Typography.Paragraph className="!mb-3">{t("disputeHint")}</Typography.Paragraph>
        <Input.TextArea
          value={disputeReason}
          onChange={(event) => setDisputeReason(event.target.value)}
          rows={4}
          maxLength={2000}
          showCount
          placeholder={t("disputeReasonPlaceholder")}
        />
      </Modal>
    </>
  );
}
