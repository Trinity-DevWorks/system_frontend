"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { SALES_INVOICE_DETAIL_QUERY_PREFIX, SALES_INVOICES_QUERY_KEY, salesInvoiceProofQueryKey } from "../../queries/salesInvoicesQueryKeys";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { visibleAttestations } from "../../utils/invoiceAttestationSides";
import { fetchSalesInvoice, verifySalesInvoice } from "../../api/salesInvoices.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import CustomerDrawer from "@/features/customers/components/CustomerDrawer/CustomerDrawer";
import { CUSTOMERS_LIST_QUERY_KEY } from "@/features/customers";
import { ROUTES } from "@/features/registry";
import { useCompanyProfile } from "@/features/settings/queries/companyProfile";
import { useRouter } from "@/i18n/navigation";
import ItemDrawer from "@/features/items/components/ItemDrawer/ItemDrawer";
import { App, Form } from "antd";
import { useTranslations, useMessages } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  useSalesInvoiceDrawerKeyboard,
} from "./salesInvoiceDrawerKeyboard";
import {
  isSalesInvoiceDraft,
  isSalesInvoicePosted,
  salesInvoiceCanReissue,
  salesInvoiceCanReverse,
  salesInvoiceReissueDisabledReason,
  salesInvoiceReverseDisabledReason,
} from "../../utils/salesInvoiceStatuses";
import {
  INVOICE_CHAIN_PENDING_POLL_MS,
  describeTamper,
  disclosureFieldLabels,
  invoiceProofShouldPoll,
  isInvoiceChainPending,
} from "../../utils/invoiceProofStatuses";
import SalesInvoiceDrawerFooter from "./SalesInvoiceDrawerFooter";
import SalesInvoiceDrawerForm from "./SalesInvoiceDrawerForm";
import SalesInvoiceDrawerHeaderMeta from "./SalesInvoiceDrawerHeaderMeta";
import SalesInvoiceLineEditor from "./SalesInvoiceLineEditor";
import SalesInvoiceTotals from "./SalesInvoiceTotals";
import { InvoiceTamperProvider, TamperBesideLabel } from "../InvoiceTamper/InvoiceTamperMark";
import { rememberRecentSelectorOption } from "@/lib/recentSelectorOptions";
import {
  areSalesInvoiceLinesDirty,
  canAddSalesInvoiceLine,
  canSaveSalesInvoiceDraft,
  getEmptySalesInvoiceLine,
  getSalesInvoiceDefaults,
  isSalesInvoiceHeaderDirtyVsBaseline,
  isSalesInvoiceLineEmpty,
  mapAddressSnapshot,
  mapSalesInvoiceCustomerOption,
  mapSalesInvoiceLinesFromApi,
  mapSalesInvoiceRecordToForm,
  suggestedDueOn,
  customerAddressSelectOptions,
} from "../../utils/salesInvoiceDrawerUtils";
import {
  customerIsExemptOnDate,
  previewInvoiceTotals,
} from "../../utils/salesInvoiceTax";
import { useSalesInvoiceDrawerData } from "../../queries/useSalesInvoiceDrawerData";
import { useSalesInvoiceDrawerMutations } from "../../queries/useSalesInvoiceDrawerMutations";
import { tenantPricesIncludeTax, useCompanySettings } from "@/lib/company-settings";
import { withConfirmKeyboard } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { SALES_INVOICE_CUSTOMER_RECENT_KIND } from "../../api/salesInvoiceSelectors.api";
import {
  SALES_INVOICE_POST_INTENT_EVENT,
  SALES_INVOICE_POST_INTENT_KEY,
} from "../../utils/salesInvoicePostIntent";
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
export default function SalesInvoiceDrawer({
  open,
  mode,
  invoiceId,
  tableSeedRecord = null,
  createSeed = null,
  onClose,
  onCreated,
  onPostAndNew,
}) {
  const t = useTranslations("SalesInvoices");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const access = useResourceAccess("sales_invoices");
  const invoiceProofAccess = useResourceAccess("invoice_proofs");
  const customerAccess = useResourceAccess("customers");
  const itemAccess = useResourceAccess("items");
  const companyProfileAccess = useResourceAccess("company_profile");
  const creditNotesAccess = useResourceAccess("sales_credit_notes");
  const queryClient = useQueryClient();
  const { openDrawer } = useGlobalDrawer();
  const router = useRouter();
  const { settings } = useCompanySettings();
  const companyProfile = useCompanyProfile();
  const [form] = Form.useForm();
  const [customerCreateOpen, setCustomerCreateOpen] = useState(false);
  const [customerEditOpen, setCustomerEditOpen] = useState(false);
  const [itemViewId, setItemViewId] = useState(/** @type {string | null} */ (null));
  const [itemViewDrawerOpen, setItemViewDrawerOpen] = useState(open);
  if (open !== itemViewDrawerOpen) {
    setItemViewDrawerOpen(open);
    if (!open) {
      setItemViewId(null);
      setCustomerEditOpen(false);
    }
  }

  const [lines, setLines] = useState(() => [getEmptySalesInvoiceLine()]);
  const [linesBaseline, setLinesBaseline] = useState(() => [getEmptySalesInvoiceLine()]);
  const [headerBaseline, setHeaderBaseline] = useState(() => getSalesInvoiceDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const [loadedPostedBy, setLoadedPostedBy] = useState(/** @type {unknown} */ (null));
  const [loadedPostedAt, setLoadedPostedAt] = useState(/** @type {string | null} */ (null));
  const [totals, setTotals] = useState(/** @type {Record<string, unknown> | null} */ (null));

  const dueOnAutoRef = useRef(true);
  const applyingDueOnRef = useRef(false);
  const prevCustomerIdRef = useRef(/** @type {unknown} */ (undefined));
  const hydrateCustomerRef = useRef(true);
  const loadedDetailVersionRef = useRef(0);
  const tamperedToastKeyRef = useRef(/** @type {string | null} */ (null));
  const keyboardRootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const defaults = useMemo(() => {
    void open;
    return getSalesInvoiceDefaults();
  }, [open]);

  const detailEnabled = open && (mode === "edit" || mode === "view") && invoiceId != null;
  const fetchRemoteDetail = detailEnabled;

  const detailQuery = useQuery({
    queryKey: [...SALES_INVOICE_DETAIL_QUERY_PREFIX, invoiceId],
    queryFn: () => fetchSalesInvoice(/** @type {string} */ (invoiceId)),
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
      credited_total: record.credited_total,
      net_to_pay: record.net_to_pay,
    });
  }, []);

  const syncBaselinesFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const mappedLines = mapSalesInvoiceLinesFromApi(
        /** @type {Array<Record<string, unknown>>} */ (record.lines),
        record.exchange_rate,
      );
      const nextLines = mappedLines.length > 0 ? mappedLines : [getEmptySalesInvoiceLine()];
      setLines(nextLines);
      setLinesBaseline(nextLines);
      const mappedHeader = mapSalesInvoiceRecordToForm(record);
      setHeaderBaseline(mappedHeader);
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.invoice_number === "string" ? record.invoice_number : null);
      setLoadedPostedBy(record.posted_by ?? null);
      setLoadedPostedAt(typeof record.posted_at === "string" ? record.posted_at : null);
      applyTotals(record);
      form.setFieldsValue(mappedHeader);
      prevCustomerIdRef.current = record.customer_id;
      hydrateCustomerRef.current = false;
      dueOnAutoRef.current = false;
    },
    [form, applyTotals],
  );

  const resetCreateDraftState = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(defaults);
    const initialLines = [getEmptySalesInvoiceLine()];
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
    hydrateCustomerRef.current = true;
    prevCustomerIdRef.current = undefined;
  }, [form, defaults]);

  useLayoutEffect(() => {
    if (!open) return;
    dueOnAutoRef.current = mode === "create";
    hydrateCustomerRef.current = true;
    if (mode === "create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset create draft when the drawer opens
      resetCreateDraftState();
      if (createSeed && typeof createSeed === "object") {
        const header = createSeed.header ?? {};
        form.setFieldsValue({ ...defaults, ...header });
        const seededLines =
          Array.isArray(createSeed.lines) && createSeed.lines.length > 0
            ? createSeed.lines
            : [getEmptySalesInvoiceLine()];
        setLines(seededLines);
        setLinesBaseline([getEmptySalesInvoiceLine()]);
        setHeaderBaseline(defaults);
        prevCustomerIdRef.current = header.customer_id;
        hydrateCustomerRef.current = false;
      }
      return;
    }

    if (tableSeedRecord && typeof tableSeedRecord === "object") {
      setLoadedStatus(typeof tableSeedRecord.status === "string" ? tableSeedRecord.status : null);
      setLoadedNumber(typeof tableSeedRecord.invoice_number === "string" ? tableSeedRecord.invoice_number : null);
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
    loadedStatus ??
    (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const invoiceRecord = detailQuery.data ?? tableSeedRecord;
  const reverseEnabled = salesInvoiceCanReverse(invoiceRecord);
  const reissueEnabled = salesInvoiceCanReissue(invoiceRecord);
  const readOnly = mode === "view" || !isSalesInvoiceDraft(effectiveStatus) || (mode === "edit" && !access.canEdit);

  const proofEnabled =
    open &&
    invoiceId != null &&
    (isSalesInvoicePosted(effectiveStatus) || effectiveStatus === "reversed") &&
    Boolean(settings.invoiceProofsEnabled) &&
    access.canView &&
    (invoiceProofAccess.canView || invoiceProofAccess.canEdit);
  const showProofView = proofEnabled && invoiceProofAccess.canView;

  const proofQuery = useQuery({
    queryKey: salesInvoiceProofQueryKey(invoiceId),
    queryFn: () => verifySalesInvoice(/** @type {string} */ (invoiceId)),
    enabled: proofEnabled,
    staleTime: QUERY_STALE_TIME.ledger,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const data = query.state.data;
      const status = data && typeof data === "object" ? data.status : null;
      return invoiceProofShouldPoll(status, effectiveStatus) ? INVOICE_CHAIN_PENDING_POLL_MS : false;
    },
  });
  const proofResult = proofEnabled && proofQuery.data && typeof proofQuery.data === "object" ? proofQuery.data : null;
  const proofStatus = typeof proofResult?.status === "string" ? proofResult.status : null;
  const messages = useMessages();
  const tamperMessage =
    proofStatus === "tampered"
      ? describeTamper(t, disclosureFieldLabels(messages), proofResult?.tamper_reason, proofResult?.tampered_fields)
      : null;
  const tamperedPaths =
    proofResult?.tamper_reason === "snapshot" && Array.isArray(proofResult?.tampered_fields)
      ? proofResult.tampered_fields.map(String)
      : [];
  const previousProofStatusRef = useRef(/** @type {string | null} */ (null));

  useEffect(() => {
    const previous = previousProofStatusRef.current;
    previousProofStatusRef.current = proofStatus;
    if (previous != null && isInvoiceChainPending(previous) && proofStatus && !isInvoiceChainPending(proofStatus)) {
      queryClient.invalidateQueries({ queryKey: SALES_INVOICES_QUERY_KEY });
    }
  }, [proofStatus, queryClient]);

  const invoiceCustomer =
    detailQuery.data?.customer && typeof detailQuery.data.customer === "object" ? detailQuery.data.customer : null;
  const invoiceCustomerId = normalizeEntityId(invoiceCustomer?.id);
  const buyerWalletSaved = invoiceCustomer ? Boolean(invoiceCustomer.wallet_address) : null;
  const companyWalletSaved = companyProfile.isReady ? Boolean(companyProfile.profile.wallet_address) : null;

  const closeCustomerEdit = useCallback(() => {
    setCustomerEditOpen(false);
    queryClient.invalidateQueries({ queryKey: [...SALES_INVOICE_DETAIL_QUERY_PREFIX, invoiceId] });
  }, [queryClient, invoiceId]);

  useEffect(() => {
    if (!open) {
      tamperedToastKeyRef.current = null;
      return;
    }
    if (!invoiceProofAccess.canView || invoiceId == null || proofStatus !== "tampered") return;
    if (tamperedToastKeyRef.current === invoiceId) return;
    tamperedToastKeyRef.current = invoiceId;
    notification.error({
      title: t("proofStatusTampered"),
      description: tamperMessage || t("verifySuccessTampered"),
    });
  }, [open, invoiceId, invoiceProofAccess.canView, proofStatus, tamperMessage, notification, t]);

  const formValuesWatch = Form.useWatch([], form);
  const customerId = formValuesWatch?.customer_id ?? null;
  const customerReady = customerId != null && customerId !== "";
  const currencyId = formValuesWatch?.currency_id ?? null;
  const warehouseId = formValuesWatch?.warehouse_id ?? null;

  const invoiceLookups = useMemo(() => {
    const record = detailQuery.data ?? tableSeedRecord;
    if (!record || typeof record !== "object") return null;
    return {
      salesman: record.salesman ?? null,
      payment_method: record.payment_method ?? null,
      payment_term: record.payment_term ?? null,
      customer: record.customer ?? null,
      warehouse: record.warehouse ?? null,
      preferSealed: isSalesInvoicePosted(record.status),
    };
  }, [detailQuery.data, tableSeedRecord]);

  const drawerData = useSalesInvoiceDrawerData({
    open,
    t,
    customerId,
    invoiceLookups,
  });

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

    if (hydrateCustomerRef.current) {
      hydrateCustomerRef.current = false;
      prevCustomerIdRef.current = customerId;
      return;
    }

    if (prevCustomerIdRef.current === customerId) return;

    if (customerId == null) {
      prevCustomerIdRef.current = null;
      form.setFieldsValue({
        salesman_id: undefined,
        payment_method_id: undefined,
        payment_terms_id: undefined,
        billing_address_id: undefined,
        shipping_address_id: undefined,
        billing_address: mapAddressSnapshot(null),
        shipping_address: mapAddressSnapshot(null),
      });
      return;
    }

    if (drawerData.customerDetailPending) return;
    const customer = drawerData.customerDetail;
    if (!customer || String(customer.id) !== String(customerId)) return;

    const addresses = Array.isArray(customer.addresses) ? customer.addresses : [];
    const billing =
      addresses.find((row) => row.address_type === "billing" && row.is_default) ??
      addresses.find((row) => row.address_type === "billing");
    const shipping =
      addresses.find((row) => row.address_type === "shipping" && row.is_default) ??
      addresses.find((row) => row.address_type === "shipping");

    const previousCustomerId = prevCustomerIdRef.current;
    prevCustomerIdRef.current = customerId;
    dueOnAutoRef.current = true;
    form.setFieldsValue({
      salesman_id: customer.salesman_id ?? undefined,
      payment_method_id: customer.payment_method_id ?? undefined,
      payment_terms_id: customer.payment_terms_id ?? undefined,
      billing_address_id: billing?.id != null ? Number(billing.id) : undefined,
      shipping_address_id: shipping?.id != null ? Number(shipping.id) : undefined,
      billing_address: mapAddressSnapshot(billing),
      shipping_address: mapAddressSnapshot(shipping),
    });

    const hadPreviousCustomer = previousCustomerId != null && previousCustomerId !== "";
    const hasItemLines = linesRef.current.some(
      (line) => line.item_id != null && String(line.item_id).trim() !== "",
    );
    if (!hadPreviousCustomer || !hasItemLines) return;
    if (String(previousCustomerId) === String(customerId)) return;

    modal.confirm(
      withConfirmKeyboard({
        title: t("customerChangeLinesTitle"),
        content: t("customerChangeLinesContent"),
        okText: t("customerChangeLinesOk"),
        cancelText: t("customerChangeLinesKeep"),
        onOk: () => {
          setLines((prev) =>
            prev.map((line) =>
              line.item_id != null && String(line.item_id).trim() !== ""
                ? {
                    ...line,
                    discount_percent: 0,
                    tax_rate: undefined,
                    line_total: undefined,
                    catalogReloadKey: (line.catalogReloadKey ?? 0) + 1,
                  }
                : line,
            ),
          );
        },
      }),
    );
  }, [open, customerId, drawerData.customerDetail, drawerData.customerDetailPending, form, readOnly, modal, t]);

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
        lineAwaitsRateUpdate(line, headerRate) ? lineAtRate(line, headerRate, settings.priceDecimalPlaces) : line,
      ),
    );
  }, [headerRate, settings.priceDecimalPlaces]);

  useEffect(() => {
    if (readOnly || currencyId == null) return;
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
  }, [currencyId, drawerData, exchangeRateLocked, form, readOnly]);

  const paymentTermDueDays = useMemo(() => {
    const termId = formValuesWatch?.payment_terms_id;
    const term = drawerData.paymentTermOptions.find((row) => Number(row.value) === Number(termId));
    return term?.due_days ?? 0;
  }, [drawerData.paymentTermOptions, formValuesWatch?.payment_terms_id]);

  useEffect(() => {
    if (readOnly || !dueOnAutoRef.current) return;
    const next = suggestedDueOn(formValuesWatch?.invoice_date, paymentTermDueDays);
    if (String(form.getFieldValue("due_on") ?? "") === next) return;
    applyingDueOnRef.current = true;
    form.setFieldsValue({ due_on: next });
    applyingDueOnRef.current = false;
  }, [form, formValuesWatch?.invoice_date, paymentTermDueDays, readOnly]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults,
    isCreateDirtyVsBaseline: (instance, baseline) =>
      isSalesInvoiceHeaderDirtyVsBaseline(instance, {
        ...baseline,
        warehouse_id: baseline.warehouse_id ?? drawerData.defaultWarehouseId,
        currency_id: baseline.currency_id ?? drawerData.primaryCurrencyId,
        exchange_rate: baseline.exchange_rate ?? 1,
      }),
  });

  const isLinesDirty = useMemo(
    () => areSalesInvoiceLinesDirty(lines, linesBaseline),
    [lines, linesBaseline],
  );

  const isHeaderDirty = useMemo(() => {
    if (mode === "create") return isCreateDirty();
    return isSalesInvoiceHeaderDirtyVsBaseline(form, headerBaseline);
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

  const onCustomerCreated = useCallback(
    (record) => {
      const id = record?.id;
      if (id == null || id === "") return;
      form.setFieldValue("customer_id", id);
      const recent = mapSalesInvoiceCustomerOption(
        /** @type {Record<string, unknown>} */ (record),
      );
      if (recent) rememberRecentSelectorOption(SALES_INVOICE_CUSTOMER_RECENT_KIND, recent);
      invalidateTenantListQueries(queryClient, CUSTOMERS_LIST_QUERY_KEY);
      setCustomerCreateOpen(false);
    },
    [form, queryClient],
  );

  const {
    saveMutation,
    postMutation,
    reverseMutation,
    reissueMutation,
    deleteMutation,
    verifyMutation,
    approveCompanyMutation,
    submitting,
  } = useSalesInvoiceDrawerMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    invoiceId,
    lines,
    onCreated: handleCreated,
    onSaved: syncBaselinesFromRecordAndBump,
    onPosted: syncBaselinesFromRecordAndBump,
    onReversed: syncBaselinesFromRecordAndBump,
    onReissued: (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      openDrawer({
        featureId: "salesInvoices",
        id,
        mode: "edit",
        seed: record,
      });
    },
    onDeleted: forceClose,
    onClose: forceClose,
    onPostAndNew,
  });

  const handleOpenRelatedInvoice = useCallback(
    (invoice) => {
      const id = normalizeEntityId(invoice?.id);
      if (id == null) return;
      const status = typeof invoice?.status === "string" ? invoice.status : "";
      openDrawer({
        featureId: "salesInvoices",
        id,
        mode: status === "draft" && access.canEdit ? "edit" : "view",
        seed: invoice && typeof invoice === "object" ? { ...invoice } : null,
      });
    },
    [access.canEdit, openDrawer],
  );

  const handleCreateCreditNote = useCallback(() => {
    if (invoiceId == null) return;
    openDrawer({
      featureId: "salesCreditNotes",
      mode: "create",
      extras: { fromInvoiceId: invoiceId },
    });
  }, [invoiceId, openDrawer]);

  const handleOpenCreditNote = useCallback(
    (note) => {
      const id = normalizeEntityId(note?.id);
      if (id == null) return;
      const noteStatus = typeof note?.status === "string" ? note.status : "";
      openDrawer({
        featureId: "salesCreditNotes",
        id,
        mode: noteStatus === "draft" && creditNotesAccess.canEdit ? "edit" : "view",
        seed: note && typeof note === "object" ? { ...note } : null,
      });
    },
    [creditNotesAccess.canEdit, openDrawer],
  );

  const currentValues = useMemo(
    () => ({
      customer_id: formValuesWatch?.customer_id,
      warehouse_id: formValuesWatch?.warehouse_id,
      invoice_date: formValuesWatch?.invoice_date,
    }),
    [formValuesWatch],
  );

  const canSubmitRequired = useMemo(
    () => canSaveSalesInvoiceDraft(currentValues, lines),
    [currentValues, lines],
  );

  const canAddLine = useMemo(() => canAddSalesInvoiceLine(lines), [lines]);

  const taxContext = useMemo(() => {
    const customerExempt = customerIsExemptOnDate(
      drawerData.customerDetail,
      formValuesWatch?.invoice_date,
    );
    return {
      taxEnabled: Boolean(settings.taxEnabled),
      pricesIncludeTax: tenantPricesIncludeTax(settings),
      customerExempt,
      settings,
    };
  }, [drawerData.customerDetail, formValuesWatch?.invoice_date, settings]);

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
        customerExempt: taxContext.customerExempt,
        settings,
      }),
    [
      lines,
      formValuesWatch?.adjustment,
      taxContext,
      settings,
    ],
  );

  const displayTotals = readOnly && totals ? totals : liveTotals;

  const billingAddressOptions = useMemo(
    () =>
      customerAddressSelectOptions(
        /** @type {Array<Record<string, unknown>>} */ (drawerData.customerDetail?.addresses ?? []),
        "billing",
        /** @type {Record<string, unknown> | null} */ (formValuesWatch?.billing_address ?? headerBaseline.billing_address),
      ),
    [drawerData.customerDetail?.addresses, formValuesWatch?.billing_address, headerBaseline.billing_address],
  );
  const shippingAddressOptions = useMemo(
    () =>
      customerAddressSelectOptions(
        /** @type {Array<Record<string, unknown>>} */ (drawerData.customerDetail?.addresses ?? []),
        "shipping",
        /** @type {Record<string, unknown> | null} */ (formValuesWatch?.shipping_address ?? headerBaseline.shipping_address),
      ),
    [drawerData.customerDetail?.addresses, formValuesWatch?.shipping_address, headerBaseline.shipping_address],
  );

  const handleSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => saveMutation.mutate({ values }))
      .catch(() => {});
  }, [form, saveMutation]);

  const lastPostIntent = usePersistedSaveIntent(
    SALES_INVOICE_POST_INTENT_KEY,
    SALES_INVOICE_POST_INTENT_EVENT,
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
          modal.confirm(
            withConfirmKeyboard({
              title: t("postConfirmTitle"),
              content: t("postConfirmContent"),
              okText: t("postConfirmOk"),
              cancelText: t("drawerCancel"),
              onOk: () => closeConfirmOnError(postMutation.mutateAsync({ values, intent: postIntent })),
            }),
          );
        })
        .catch(() => {});
    },
    [form, modal, t, postMutation, lastPostIntent],
  );

  const handleReverse = useCallback(() => {
    if (!reverseEnabled) return;
    modal.confirm(
      withConfirmKeyboard({
        title: t("reverseConfirmTitle"),
        content: t("reverseConfirmContent"),
        okText: t("actionReverse"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(reverseMutation.mutateAsync()),
      }),
    );
  }, [modal, t, reverseMutation, reverseEnabled]);

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
    setLines((prev) => prev.map((line, i) => (i === index ? getEmptySalesInvoiceLine() : line)));
  }, []);

  const removeLine = useCallback((index) => {
    setLines((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      // Always keep at least one row; any cleared/filled row (including first) may be removed otherwise.
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, getEmptySalesInvoiceLine()]);
  }, []);

  const duplicateLine = useCallback((index) => {
    setLines((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const source = prev[index];
      const copy = {
        ...source,
        catalogReloadKey: 0,
      };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }, []);

  const viewLineItem = useCallback((itemId) => {
    const id = normalizeEntityId(itemId);
    if (id == null) return;
    setItemViewId(String(id));
  }, []);

  const handleHeaderValuesChange = useCallback((changed) => {
    if (!changed || typeof changed !== "object") return;
    if ("invoice_date" in changed || "payment_terms_id" in changed || "customer_id" in changed) {
      dueOnAutoRef.current = true;
    }
    if ("due_on" in changed && !applyingDueOnRef.current) {
      dueOnAutoRef.current = false;
    }
    if ("warehouse_id" in changed) {
      const nextWarehouse = changed.warehouse_id;
      setLines((prev) =>
        prev.map((line) =>
          line.track_inventory && line.item_id && line.warehouse_id == null
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
  }, [drawerData, form]);

  const baseTitle =
    mode === "create"
      ? t("drawerTitleCreate")
      : mode === "view" || readOnly
        ? t("drawerTitleView")
        : t("drawerTitleEdit");
  const title = loadedNumber ? (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="truncate">
        {baseTitle}
        {" # "}
      </span>
      <TamperBesideLabel path="invoice_number">
        <span>{loadedNumber}</span>
      </TamperBesideLabel>
    </span>
  ) : (
    baseTitle
  );

  const showDetailLoading = fetchRemoteDetail && detailQuery.isLoading;
  const keyboardEnabled = open && !readOnly && !submitting && !showDetailLoading;

  const lineKeyboardActionsRef = useRef(
    /** @type {{ duplicateLine?: (index: number) => void }} */ ({}),
  );

  useSalesInvoiceDrawerKeyboard({
    enabled: keyboardEnabled,
    rootRef: keyboardRootRef,
    linesLength: lines.length,
    customerReady,
    onAddLine: addLine,
    isLineEmpty: (index) => isSalesInvoiceLineEmpty(lines[index]),
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
    <InvoiceTamperProvider paths={tamperedPaths} labels={disclosureFieldLabels(messages)} t={t}>
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
        <SalesInvoiceDrawerHeaderMeta
          t={t}
          invoiceStatus={effectiveStatus}
          chainIssue={
            mode === "create"
              ? null
              : ((detailQuery.data ? detailQuery.data.chain_issue : tableSeedRecord?.chain_issue) ?? null)
          }
        />
      }
      showDetailLoading={showDetailLoading}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        <SalesInvoiceDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!canSubmitRequired}
          postDisabled={!canSubmitRequired || !access.canEdit}
          showDelete={!readOnly && invoiceId != null && access.canDelete}
          showReverse={effectiveStatus === "posted" && invoiceId != null && access.canReverse}
          reverseDisabled={!reverseEnabled}
          reverseDisabledReason={salesInvoiceReverseDisabledReason(t, invoiceRecord)}
          onReverse={handleReverse}
          showReissue={Boolean(
            invoiceId != null &&
              access.canAdd &&
              (effectiveStatus === "reversed" || (effectiveStatus === "posted" && access.canReverse)),
          )}
          reissueDisabled={!reissueEnabled}
          reissueDisabledReason={salesInvoiceReissueDisabledReason(t, invoiceRecord)}
          onReissue={handleReissue}
          replacesInvoice={invoiceRecord?.replaces_invoice ?? null}
          replacedByInvoice={invoiceRecord?.replaced_by_invoice ?? null}
          creditNotes={Array.isArray(invoiceRecord?.credit_notes) ? invoiceRecord.credit_notes : []}
          onOpenRelatedInvoice={handleOpenRelatedInvoice}
          onOpenCreditNote={creditNotesAccess.canView ? handleOpenCreditNote : undefined}
          showCreditNote={Boolean(effectiveStatus === "posted" && invoiceId != null && creditNotesAccess.canAdd)}
          creditNoteDisabled={Number(invoiceRecord?.net_to_pay ?? 0) <= 0}
          creditNoteDisabledReason={
            Number(invoiceRecord?.net_to_pay ?? 0) <= 0 ? t("creditNoteDisabledClosed") : ""
          }
          onCreditNote={handleCreateCreditNote}
          postedBy={loadedPostedBy}
          postedAt={loadedPostedAt}
          showVerify={showProofView}
          verifying={verifyMutation.isPending || (proofQuery.isFetching && !proofResult)}
          proofStatus={proofStatus}
          tamperMessage={tamperMessage}
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
          chainAttestations={visibleAttestations(proofResult?.attestations, "both")}
          companyWalletSaved={companyWalletSaved}
          buyerWalletSaved={buyerWalletSaved}
          onOpenCompanyProfile={
            companyProfileAccess.canEdit ? () => router.push(ROUTES.settingsCompanyProfile) : undefined
          }
          onOpenBuyer={
            customerAccess.canEdit && invoiceCustomerId != null ? () => setCustomerEditOpen(true) : undefined
          }
          showApproveCompany={Boolean(
            isSalesInvoicePosted(effectiveStatus) &&
              invoiceProofAccess.canEdit &&
              proofResult?.can_approve_as_company,
          )}
          approvingCompany={approveCompanyMutation.isPending}
          showBuyerLink={showProofView && isSalesInvoicePosted(effectiveStatus)}
          buyerLinkInvoiceId={invoiceId}
          buyerLinkInvoiceNumber={loadedNumber}
          pdfInvoiceId={invoiceId}
          pdfInvoiceNumber={loadedNumber}
          onSave={handleSave}
          onPost={handlePost}
          lastPostIntent={lastPostIntent}
          postIntentLabel={postIntentLabel}
          postMenuItems={postMenuItems}
          onDelete={handleDelete}
          onVerify={() => {
            if (invoiceId != null) verifyMutation.mutate(invoiceId);
          }}
          onApproveCompany={() => {
            if (invoiceId != null) approveCompanyMutation.mutate({ invoiceId, proof: proofResult });
          }}
        />
      }
    >
      <SalesInvoiceDrawerForm
        form={form}
        readOnly={readOnly || submitting}
        t={t}
        customerSeedOptions={drawerData.customerSeedOptions}
        warehouseOptions={drawerData.warehouseOptions}
        currencyOptions={drawerData.currencyOptions}
        salesmanOptions={drawerData.salesmanOptions}
        paymentMethodOptions={drawerData.paymentMethodOptions}
        paymentTermOptions={drawerData.paymentTermOptions}
        warehousesPending={drawerData.warehousesPending}
        currenciesPending={drawerData.currenciesPending}
        salesmenPending={drawerData.salesmenPending}
        paymentMethodsPending={drawerData.paymentMethodsPending}
        paymentTermsPending={drawerData.paymentTermsPending}
        exchangeRateLocked={exchangeRateLocked}
        exchangeRateHelp={exchangeRateHelp}
        billingAddressOptions={billingAddressOptions}
        shippingAddressOptions={shippingAddressOptions}
        onOpenCustomerDrawer={
          !readOnly && customerAccess.canAdd ? () => setCustomerCreateOpen(true) : undefined
        }
        onValuesChange={handleHeaderValuesChange}
        keyboardRootRef={keyboardRootRef}
      >
        <SalesInvoiceLineEditor
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
          readOnly={readOnly || submitting || !customerReady}
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
        <SalesInvoiceTotals t={t} readOnly={readOnly || submitting} totals={displayTotals} />
      </SalesInvoiceDrawerForm>
    </ResourceCrudDrawer>
    </InvoiceTamperProvider>
    {!readOnly && customerAccess.canAdd ? (
      <CustomerDrawer
        open={open && customerCreateOpen}
        mode="create"
        customerId={null}
        zIndex={1100}
        onClose={() => setCustomerCreateOpen(false)}
        onCreateSuccess={onCustomerCreated}
      />
    ) : null}
    {customerAccess.canEdit && invoiceCustomerId != null ? (
      <CustomerDrawer
        open={open && customerEditOpen}
        mode="edit"
        customerId={String(invoiceCustomerId)}
        zIndex={1100}
        onClose={closeCustomerEdit}
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
    </>
  );
}
