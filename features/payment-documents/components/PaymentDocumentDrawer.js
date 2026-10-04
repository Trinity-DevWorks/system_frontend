"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { useCompanySettings } from "@/lib/company-settings";
import {
  convertPriceBetweenRates,
  paymentAmountForInvoiceOpen,
  positiveRate,
  rateFromPrimary,
} from "@/lib/currency/documentExchangeRate";
import { formatExchangeRate } from "@/shared/components/lines-grid/LinePriceInput";
import { dayjsDatePattern, formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import LookupSelectWithCreate from "@/shared/components/resource-drawer/LookupSelectWithCreate";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { CURRENCIES_LIST_QUERY_KEY, fetchCurrencyNames, fetchCurrencyPairRates } from "@/features/currencies";
import { fetchPaymentMethodNames } from "@/features/payment-methods/api/paymentMethods.api";
import { PAYMENT_METHODS_LIST_QUERY_KEY } from "@/features/payment-methods/queries/paymentMethodsQueryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Col, DatePicker, Form, Input, Row, Select, Space, Tag } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PaymentAllocationGrid from "./PaymentAllocationGrid";
import {
  getPaymentDocumentStatusLabel,
  isPaymentDocumentDraft,
  moneyUnits,
  paymentDocumentStatusTagColor,
  unitsToAmount,
} from "../paymentDocumentUtils";

/**
 * @param {unknown} value
 */
function toIsoDate(value) {
  if (!value) return dayjs().format("YYYY-MM-DD");
  if (dayjs.isDayjs(value)) return value.format("YYYY-MM-DD");
  return String(value).slice(0, 10);
}

/**
 * @param {unknown} user
 */
function postedByDisplayName(user) {
  if (!user || typeof user !== "object") return null;
  const name = "name" in user && typeof user.name === "string" ? user.name.trim() : "";
  return name || null;
}

/**
 * @param {Record<string, unknown>} invoice
 * @param {string} invoiceIdField
 * @param {number} amount
 */
function invoiceCurrencyCode(invoice) {
  const currency = invoice.currency;
  if (currency && typeof currency === "object" && "code" in currency && currency.code) {
    return String(currency.code);
  }
  return "";
}

function rowFromInvoice(invoice, invoiceIdField, amount) {
  const invoiceId = String(invoice.id ?? invoice[invoiceIdField] ?? "");
  return {
    key: invoiceId,
    invoiceId,
    invoiceNumber: String(invoice.invoice_number ?? ""),
    invoiceDate: invoice.invoice_date ? String(invoice.invoice_date).slice(0, 10) : null,
    grandTotal: /** @type {string | number} */ (invoice.grand_total ?? 0),
    netToPay: /** @type {string | number} */ (invoice.net_to_pay ?? 0),
    currencyId: invoice.currency_id ?? null,
    currencyCode: invoiceCurrencyCode(invoice),
    amount,
  };
}

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   documentId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   config: {
 *     resource: string;
 *     i18n: string;
 *     queryKey: readonly unknown[];
 *     detailPrefix: readonly unknown[];
 *     invoiceQueryKey: readonly unknown[];
 *     invoiceDetailPrefix: readonly unknown[];
 *     numberField: string;
 *     partyField: string;
 *     invoiceIdField: string;
 *     documentKey: string;
 *     api: {
 *       fetch: (id: string) => Promise<Record<string, unknown>>;
 *       create: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
 *       update: (id: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;
 *       remove: (id: string) => Promise<unknown>;
 *       syncAllocations: (id: string, body: { allocations: Array<Record<string, unknown>> }) => Promise<Record<string, unknown>>;
 *       post: (id: string) => Promise<Record<string, unknown>>;
 *       reverse: (id: string) => Promise<Record<string, unknown>>;
 *       openInvoices: (partyId: string, currencyId: number | string) => Promise<Array<Record<string, unknown>>>;
 *     };
 *     party: {
 *       queryKey: readonly unknown[];
 *       fetchPage: (args: { search?: string; page?: number }) => Promise<{ rows: unknown[]; total: number }>;
 *       recentKind: string;
 *       selectorParams?: Record<string, unknown>;
 *     };
 *   };
 * }} props
 */
export default function PaymentDocumentDrawer({ open, mode, documentId, onClose, onCreated, config }) {
  const t = useTranslations(config.i18n);
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const access = useResourceAccess(config.resource);
  const { settings } = useCompanySettings();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [rows, setRows] = useState(/** @type {import("./PaymentAllocationGrid").AllocationRow[]} */ ([]));
  const baselineRef = useRef("");
  const rowsRef = useRef(rows);
  const sessionRef = useRef("");
  const applyingRef = useRef(false);
  const amountLockRef = useRef(false);
  const amountEditedRef = useRef(false);
  const rateRef = useRef(1);
  const currencyRef = useRef(/** @type {number | string | null} */ (null));
  const skipRateSyncRef = useRef(false);

  const detailEnabled = open && documentId != null && (mode === "edit" || mode === "view");
  const detailQuery = useQuery({
    queryKey: [...config.detailPrefix, documentId],
    queryFn: () => config.api.fetch(/** @type {string} */ (documentId)),
    enabled: detailEnabled,
  });

  const record = detailEnabled ? detailQuery.data : null;
  const status = typeof record?.status === "string" ? record.status : mode === "create" ? "draft" : null;
  const readOnly = mode === "view" || (status != null && !isPaymentDocumentDraft(status));

  const partyId = Form.useWatch(config.partyField, form);
  const currencyId = Form.useWatch("currency_id", form);
  const paymentMethodId = Form.useWatch("payment_method_id", form);
  const headerAmount = Form.useWatch("amount", form);

  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencyNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const pairRatesQuery = useQuery({
    queryKey: [...CURRENCIES_LIST_QUERY_KEY, "pair-rates"],
    queryFn: fetchCurrencyPairRates,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const methodsQuery = useQuery({
    queryKey: PAYMENT_METHODS_LIST_QUERY_KEY,
    queryFn: fetchPaymentMethodNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const openInvoicesQuery = useQuery({
    queryKey: [...config.queryKey, "open-invoices", partyId ?? null, currencyId ?? null],
    queryFn: () => config.api.openInvoices(String(partyId), /** @type {number | string} */ (currencyId)),
    enabled: open && partyId != null && partyId !== "" && currencyId != null && currencyId !== "",
  });

  const currencyOptions = useMemo(
    () =>
      (currenciesQuery.data ?? [])
        .filter((row) => row?.is_active !== false)
        .map((row) => ({
          value: row.id,
          label: [row.code, row.name].filter(Boolean).join(" — ") || String(row.id),
        })),
    [currenciesQuery.data],
  );

  const methodOptions = useMemo(() => {
    const rows = Array.isArray(methodsQuery.data) ? methodsQuery.data : [];
    return rows
      .filter((row) => row && row.is_active !== false && row.type !== "credit")
      .map((row) => ({
        value: row.id,
        label: [row.code, row.name].filter(Boolean).join(" — ") || String(row.id),
        requires_reference: Boolean(row.requires_reference),
      }));
  }, [methodsQuery.data]);

  const selectedMethod = methodOptions.find((row) => Number(row.value) === Number(paymentMethodId));
  const exchangeRateLocked =
    currencyId == null ||
    settings.primaryCurrencyId == null ||
    Number(currencyId) === Number(settings.primaryCurrencyId);
  const exchangeRateWatch = Form.useWatch("exchange_rate", form);
  const currencyCode = (id) => {
    const row = (currenciesQuery.data ?? []).find((c) => Number(c.id) === Number(id));
    return String(row?.code ?? row?.name ?? "");
  };
  const exchangeRateHelp = exchangeRateLocked
    ? undefined
    : t("fieldExchangeRateHelp", {
        primary: currencyCode(settings.primaryCurrencyId),
        rate: positiveRate(exchangeRateWatch) != null ? formatExchangeRate(exchangeRateWatch) : "?",
        currency: currencyCode(currencyId),
      });

  const snapshotOf = useCallback(
    (nextRows) => {
      const values = form.getFieldsValue(true);
      return JSON.stringify({
        party: values[config.partyField] ?? null,
        currency_id: values.currency_id ?? null,
        exchange_rate: values.exchange_rate ?? null,
        payment_method_id: values.payment_method_id ?? null,
        payment_date: toIsoDate(values.payment_date),
        amount: moneyUnits(values.amount),
        reference: values.reference ?? "",
        notes: values.notes ?? "",
        rows: nextRows.map((row) => [row.invoiceId, moneyUnits(row.amount)]),
      });
    },
    [config.partyField, form],
  );

  const snapshot = useCallback(() => snapshotOf(rows), [rows, snapshotOf]);

  const remember = useCallback(
    (nextRows) => {
      baselineRef.current = snapshotOf(nextRows);
    },
    [snapshotOf],
  );

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const applyRecord = useCallback(
    (next) => {
      if (!next) return;
      const allocations = Array.isArray(next.allocations) ? next.allocations : [];
      const nextRows = allocations.map((row) => ({
        key: String(row[config.invoiceIdField] ?? ""),
        invoiceId: String(row[config.invoiceIdField] ?? ""),
        invoiceNumber: String(row.invoice_number ?? ""),
        invoiceDate: row.invoice_date ? String(row.invoice_date).slice(0, 10) : null,
        grandTotal: /** @type {string | number} */ (row.grand_total ?? 0),
        netToPay: /** @type {string | number} */ (row.net_to_pay ?? 0),
        currencyId: row.currency_id ?? null,
        currencyCode: invoiceCurrencyCode(row),
        appliedAmount: row.applied_amount != null ? Number(row.applied_amount) : null,
        amount: Number(row.amount ?? 0),
      }));
      applyingRef.current = true;
      amountEditedRef.current = Number(next.amount ?? 0) > 0;
      rateRef.current = positiveRate(next.exchange_rate) ?? 1;
      currencyRef.current = next.currency_id ?? null;
      form.setFieldsValue({
        [config.partyField]: next[config.partyField],
        currency_id: next.currency_id,
        exchange_rate: next.exchange_rate != null ? Number(next.exchange_rate) : 1,
        payment_method_id: next.payment_method_id,
        payment_date: next.payment_date ? String(next.payment_date).slice(0, 10) : dayjs().format("YYYY-MM-DD"),
        amount: next.amount != null ? Number(next.amount) : undefined,
        reference: next.reference ?? "",
        notes: next.notes ?? "",
      });
      setRows(nextRows);
      remember(nextRows);
      applyingRef.current = false;
    },
    [config.invoiceIdField, config.partyField, form, remember],
  );

  useEffect(() => {
    if (!open) {
      sessionRef.current = "";
      return;
    }
    if (mode === "create") {
      if (sessionRef.current === "create") {
        const currentCurrency = form.getFieldValue("currency_id");
        if ((currentCurrency == null || currentCurrency === "") && settings.primaryCurrencyId != null) {
          const currentRows = rowsRef.current;
          const before = snapshotOf(currentRows);
          const wasClean = baselineRef.current === "" || baselineRef.current === before;
          applyingRef.current = true;
          form.setFieldValue("currency_id", settings.primaryCurrencyId);
          form.setFieldValue("exchange_rate", 1);
          rateRef.current = 1;
          currencyRef.current = settings.primaryCurrencyId;
          applyingRef.current = false;
          if (wasClean) remember(currentRows);
        }
        return;
      }
      sessionRef.current = "create";
      applyingRef.current = true;
      amountEditedRef.current = false;
      rateRef.current = 1;
      currencyRef.current = settings.primaryCurrencyId ?? null;
      form.setFieldsValue({
        [config.partyField]: undefined,
        currency_id: settings.primaryCurrencyId ?? undefined,
        exchange_rate: 1,
        payment_method_id: undefined,
        payment_date: dayjs().format("YYYY-MM-DD"),
        amount: undefined,
        reference: "",
        notes: "",
      });
      setRows([]);
      remember([]);
      applyingRef.current = false;
      return;
    }
    if (!record?.id || sessionRef.current === String(record.id)) return;
    sessionRef.current = String(record.id);
    applyRecord(record);
  }, [applyRecord, config.partyField, form, mode, open, record, remember, settings.primaryCurrencyId, snapshotOf]);

  const headerPayload = useCallback(
    (values) => ({
      [config.partyField]: values[config.partyField],
      currency_id: values.currency_id,
      exchange_rate: exchangeRateLocked ? 1 : values.exchange_rate,
      payment_method_id: values.payment_method_id,
      payment_date: toIsoDate(values.payment_date),
      amount: values.amount,
      reference: values.reference ? String(values.reference).trim() : null,
      notes: values.notes ? String(values.notes).trim() : null,
    }),
    [config.partyField, exchangeRateLocked],
  );

  const allocationPayload = useCallback(
    () =>
      rows
        .filter((row) => row.invoiceId)
        .map((row) => ({
          [config.invoiceIdField]: row.invoiceId,
          amount: row.amount,
        })),
    [config.invoiceIdField, rows],
  );

  const invalidatePosted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: config.queryKey });
    queryClient.invalidateQueries({ queryKey: config.detailPrefix });
    queryClient.invalidateQueries({ queryKey: config.invoiceQueryKey });
    queryClient.invalidateQueries({ queryKey: config.invoiceDetailPrefix });
  }, [config.detailPrefix, config.invoiceDetailPrefix, config.invoiceQueryKey, config.queryKey, queryClient]);

  const persist = useCallback(
    async (values, shouldPost) => {
      const header = headerPayload(values);
      const allocations = allocationPayload();
      let id = documentId;
      /** @type {Record<string, unknown>} */
      let saved;
      if (id == null) {
        saved = await config.api.create({ ...header, allocations });
        id = normalizeEntityId(saved?.id);
      } else {
        const loadedParty = record?.[config.partyField];
        const loadedCurrency = record?.currency_id;
        const partyChanged =
          String(values[config.partyField] ?? "") !== String(loadedParty ?? "") ||
          Number(values.currency_id) !== Number(loadedCurrency);
        if (partyChanged) {
          await config.api.syncAllocations(id, { allocations: [] });
        }
        await config.api.update(id, header);
        const synced = await config.api.syncAllocations(id, { allocations });
        saved = /** @type {Record<string, unknown>} */ (synced?.[config.documentKey] ?? synced);
      }
      if (id == null) throw new Error("Missing document id");
      if (shouldPost) {
        saved = await config.api.post(id);
        invalidatePosted();
      } else {
        queryClient.invalidateQueries({ queryKey: config.queryKey });
      }
      queryClient.setQueryData([...config.detailPrefix, id], saved);
      return saved;
    },
    [
      allocationPayload,
      config,
      documentId,
      headerPayload,
      invalidatePosted,
      queryClient,
      record,
    ],
  );

  const saveMutation = useMutation({
    mutationFn: (/** @type {{ values: Record<string, unknown>; shouldPost: boolean }} */ args) =>
      persist(args.values, args.shouldPost),
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("saveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (saved, args) => {
      message.success(args.shouldPost ? t("postSuccess") : documentId == null ? t("createSuccess") : t("updateSuccess"));
      if (documentId == null) onCreated?.(saved);
      else applyRecord(saved);
    },
  });

  const reverseMutation = useMutation({
    mutationFn: () => config.api.reverse(/** @type {string} */ (documentId)),
    onSuccess: (saved) => {
      message.success(t("reverseSuccess"));
      invalidatePosted();
      queryClient.setQueryData([...config.detailPrefix, documentId], saved);
      applyRecord(saved);
    },
    onError: (err) => {
      notification.error({
        title: t("reverseError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => config.api.remove(/** @type {string} */ (documentId)),
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: config.queryKey });
      onClose();
    },
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const remainderUnits = moneyUnits(headerAmount) - rows.reduce((sum, row) => sum + moneyUnits(row.amount), 0);
  const canPost =
    access.canEdit &&
    moneyUnits(headerAmount) > 0 &&
    rows.length > 0 &&
    remainderUnits === 0 &&
    rows.every((row) => moneyUnits(row.amount) > 0);

  const runSave = useCallback(
    (shouldPost) => {
      if (rows.some((row) => !row.invoiceId || moneyUnits(row.amount) <= 0)) {
        notification.error({ title: t("saveError"), description: t("allocationAmountRequired") });
        return;
      }
      form
        .validateFields()
        .then((values) => saveMutation.mutate({ values, shouldPost }))
        .catch(() => {});
    },
    [form, notification, rows, saveMutation, t],
  );

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly || baselineRef.current === "") return false;
    return snapshot() !== baselineRef.current;
  }, [readOnly, snapshot]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose,
    shouldConfirmDiscard,
  });

  const submitting = saveMutation.isPending || reverseMutation.isPending || deleteMutation.isPending;
  useDrawerSubmitShortcut({
    enabled: open && !readOnly,
    submitting,
    onSave: () => runSave(false),
    saveDisabled: submitting,
    onPost: () => runSave(true),
    postDisabled: !canPost || submitting,
  });

  const onCurrencyChange = (nextId) => {
    if (nextId == null || settings.primaryCurrencyId == null || Number(nextId) === Number(settings.primaryCurrencyId)) {
      form.setFieldValue("exchange_rate", 1);
      return;
    }
    const rate = rateFromPrimary(pairRatesQuery.data ?? [], settings.primaryCurrencyId, nextId);
    form.setFieldValue("exchange_rate", rate ?? undefined);
  };

  const priceDecimals = settings.priceDecimalPlaces ?? 2;
  const partyReady = partyId != null && partyId !== "" && currencyId != null && currencyId !== "";
  const addInvoiceOptions = (openInvoicesQuery.data ?? [])
    .filter((invoice) => !rows.some((row) => row.invoiceId === String(invoice.id)))
    .map((invoice) => {
      const code = invoice.currency && typeof invoice.currency === "object" ? invoice.currency.code : "";
      const open = formatTenantMoney(invoice.net_to_pay);
      return {
        value: String(invoice.id),
        label: [invoice.invoice_number ?? invoice.id, [code, open].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
        invoice,
      };
    });
  const paymentCap = (invoiceCurrencyId, netToPay, rate, paymentCurrencyId) => {
    const paymentRate = positiveRate(rate ?? form.getFieldValue("exchange_rate")) ?? 1;
    const paymentCurrency = paymentCurrencyId ?? form.getFieldValue("currency_id");
    const same = Number(invoiceCurrencyId) === Number(paymentCurrency);
    const invoiceRate = same
      ? paymentRate
      : rateFromPrimary(pairRatesQuery.data ?? [], settings.primaryCurrencyId, invoiceCurrencyId);
    return paymentAmountForInvoiceOpen(netToPay, paymentRate, invoiceRate, same, priceDecimals);
  };

  const userEnteredAmount = () =>
    amountEditedRef.current && moneyUnits(form.getFieldValue("amount")) > 0;

  const writeAmount = (value) => {
    amountLockRef.current = true;
    form.setFieldValue("amount", value);
    amountLockRef.current = false;
  };

  const sumRows = (nextRows) =>
    unitsToAmount(nextRows.reduce((sum, row) => sum + moneyUnits(row.amount), 0));

  const commitRows = (nextRows) => {
    rowsRef.current = nextRows;
    setRows(nextRows);
    writeAmount(sumRows(nextRows));
  };

  const lineUnitsWithin = (row, requestedUnits, rowsForBudget, keepHeader) => {
    const cap = paymentCap(row.currencyId, row.netToPay);
    const capUnits = cap == null ? null : moneyUnits(cap);
    let nextUnits = Math.max(0, requestedUnits);
    if (capUnits != null) nextUnits = Math.min(nextUnits, capUnits);
    if (keepHeader) {
      const headerUnits = moneyUnits(form.getFieldValue("amount"));
      const others = rowsForBudget.reduce(
        (sum, item) => (item.key === row.key ? sum : sum + moneyUnits(item.amount)),
        0,
      );
      nextUnits = Math.min(nextUnits, Math.max(0, headerUnits - others));
    }
    return nextUnits;
  };

  const repriceForRate = (oldRate, newRate, oldCurrencyId, nextCurrencyId) => {
    const from = positiveRate(oldRate);
    const to = positiveRate(newRate);
    if (from == null || to == null) return;
    rateRef.current = to;
    if (nextCurrencyId != null) currencyRef.current = nextCurrencyId;
    const prev = rowsRef.current;
    const next = prev.map((row) => {
      const oldCap = paymentCap(row.currencyId, row.netToPay, from, oldCurrencyId);
      const newCap = paymentCap(row.currencyId, row.netToPay, to, nextCurrencyId);
      const wasFull = oldCap != null && moneyUnits(row.amount) === moneyUnits(oldCap);
      const converted = wasFull
        ? newCap
        : convertPriceBetweenRates(row.amount, from, to, priceDecimals);
      const convertedUnits = moneyUnits(converted ?? 0);
      const capUnits = newCap == null ? null : moneyUnits(newCap);
      const nextUnits = capUnits == null ? convertedUnits : Math.min(convertedUnits, capUnits);
      return { ...row, amount: unitsToAmount(nextUnits) };
    });
    rowsRef.current = next;
    setRows(next);
    if (userEnteredAmount()) {
      const converted = convertPriceBetweenRates(form.getFieldValue("amount"), from, to, priceDecimals);
      writeAmount(converted ?? 0);
      return;
    }
    if (next.length > 0) writeAmount(sumRows(next));
  };

  const addInvoice = (invoice) => {
    const cap = paymentCap(invoice.currency_id, invoice.net_to_pay);
    const capUnits = cap == null ? 0 : moneyUnits(cap);
    if (!userEnteredAmount()) {
      commitRows([...rowsRef.current, rowFromInvoice(invoice, "id", unitsToAmount(capUnits))]);
      return;
    }
    const headerUnits = moneyUnits(form.getFieldValue("amount"));
    const used = rowsRef.current.reduce((sum, row) => sum + moneyUnits(row.amount), 0);
    const lineUnits = Math.min(capUnits, Math.max(0, headerUnits - used));
    const next = [...rowsRef.current, rowFromInvoice(invoice, "id", unitsToAmount(lineUnits))];
    rowsRef.current = next;
    setRows(next);
  };

  const applyRemainder = (key) => {
    const keepHeader = userEnteredAmount();
    const prev = rowsRef.current;
    const next = prev.map((row) => {
      if (row.key !== key) return row;
      const cap = paymentCap(row.currencyId, row.netToPay);
      const capUnits = cap == null ? moneyUnits(row.amount) : moneyUnits(cap);
      const nextUnits = keepHeader ? lineUnitsWithin(row, capUnits, prev, true) : capUnits;
      return { ...row, amount: unitsToAmount(nextUnits) };
    });
    if (keepHeader) {
      rowsRef.current = next;
      setRows(next);
      return;
    }
    commitRows(next);
  };

  const changeLineAmount = (key, amount) => {
    const keepHeader = userEnteredAmount();
    const prev = rowsRef.current;
    const next = prev.map((row) => {
      if (row.key !== key) return row;
      const nextUnits = lineUnitsWithin(row, Math.max(0, moneyUnits(amount ?? 0)), prev, keepHeader);
      return { ...row, amount: unitsToAmount(nextUnits) };
    });
    if (keepHeader) {
      rowsRef.current = next;
      setRows(next);
      return;
    }
    commitRows(next);
  };

  const number = record?.[config.numberField];
  const titleBase =
    mode === "create" ? t("drawerTitleCreate") : readOnly ? t("drawerTitleView") : t("drawerTitleEdit");
  const title = number ? `${titleBase} # ${number}` : titleBase;

  return (
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
        status ? (
          <Tag className="m-0" color={paymentDocumentStatusTagColor(status)}>
            {getPaymentDocumentStatusLabel(t, status)}
          </Tag>
        ) : null
      }
      showDetailLoading={detailEnabled && detailQuery.isLoading}
      detailLoadFailed={Boolean(detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        readOnly ? (
          <div className="flex w-full min-w-0 items-center gap-3">
            <div className="sales-invoice-drawer-footer-posted">
              <span className="sales-invoice-drawer-footer-posted-item">
                <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedBy")}</span>
                <span className="sales-invoice-drawer-footer-posted-value">
                  {postedByDisplayName(record?.posted_by) || "\u2014"}
                </span>
              </span>
              <span className="sales-invoice-drawer-footer-posted-item">
                <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedOn")}</span>
                <span className="sales-invoice-drawer-footer-posted-value">
                  {formatTenantDateTime(/** @type {string} */ (record?.posted_at)) || "\u2014"}
                </span>
              </span>
            </div>
            <Button onClick={forceClose}>{t("drawerClose")}</Button>
            {status === "posted" && access.canReverse ? (
              <Button
                danger
                loading={submitting}
                onClick={() =>
                  modal.confirm({
                    title: t("reverseConfirmTitle"),
                    content: t("reverseConfirmContent"),
                    okText: t("actionReverse"),
                    okButtonProps: { danger: true },
                    cancelText: t("drawerCancel"),
                    onOk: () => closeConfirmOnError(reverseMutation.mutateAsync()),
                  })
                }
              >
                {t("actionReverse")}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex w-full min-w-0 items-center gap-3">
            {documentId != null && access.canDelete ? (
              <Button
                danger
                disabled={submitting}
                onClick={() =>
                  modal.confirm({
                    title: t("deleteConfirmTitle"),
                    content: t("deleteConfirmContent", { name: String(number ?? documentId) }),
                    okText: t("deleteConfirmOk"),
                    okButtonProps: { danger: true },
                    cancelText: t("drawerCancel"),
                    onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
                  })
                }
              >
                {t("actionDelete")}
              </Button>
            ) : null}
            <Space className="ms-auto">
              <Button onClick={requestClose} disabled={submitting}>
                {t("drawerCancel")}
              </Button>
              <Button disabled={submitting} loading={submitting} onClick={() => runSave(false)}>
                {t("drawerSave")}
              </Button>
              <Button type="primary" disabled={!canPost || submitting} loading={submitting} onClick={() => runSave(true)}>
                {t("actionPost")}
              </Button>
            </Space>
          </div>
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        className="item-general-form sales-invoice-form"
        disabled={readOnly || submitting}
        onValuesChange={(changed) => {
          if (applyingRef.current || amountLockRef.current || readOnly) return;
          if (config.partyField in changed) {
            rowsRef.current = [];
            setRows([]);
            amountEditedRef.current = false;
            writeAmount(0);
          }
          if ("currency_id" in changed) {
            const oldRate = positiveRate(rateRef.current) ?? 1;
            const oldCurrencyId = currencyRef.current;
            skipRateSyncRef.current = true;
            onCurrencyChange(changed.currency_id);
            const newRate = positiveRate(form.getFieldValue("exchange_rate"));
            skipRateSyncRef.current = false;
            if (newRate != null) {
              repriceForRate(oldRate, newRate, oldCurrencyId, changed.currency_id);
            } else {
              currencyRef.current = changed.currency_id;
            }
          }
          if ("exchange_rate" in changed && !skipRateSyncRef.current) {
            const oldRate = positiveRate(rateRef.current) ?? 1;
            const newRate = positiveRate(changed.exchange_rate);
            if (newRate != null) {
              repriceForRate(oldRate, newRate, currencyRef.current, form.getFieldValue("currency_id"));
            }
          }
          if ("amount" in changed && !("currency_id" in changed) && !(config.partyField in changed)) {
            const requested = Math.max(0, moneyUnits(changed.amount));
            amountEditedRef.current = requested > 0;
            const prev = rowsRef.current;
            if (prev.length !== 1) return;
            const row = prev[0];
            const nextUnits = lineUnitsWithin(row, requested, prev, false);
            const next = [{ ...row, amount: unitsToAmount(nextUnits) }];
            rowsRef.current = next;
            setRows(next);
            if (nextUnits !== requested) {
              amountEditedRef.current = nextUnits > 0;
              writeAmount(unitsToAmount(nextUnits));
            }
          }
        }}
      >
        <div className="sales-invoice-header payment-document-header">
          <div className="sales-invoice-header-pane">
            <Row gutter={[12, 8]}>
              <Col xs={24} md={8}>
                <LookupSelectWithCreate
                  form={form}
                  name={config.partyField}
                  label={<ResourceDrawerFieldLabel text={t("fieldParty")} required />}
                  rules={[{ required: true, message: t("partyRequired") }]}
                  readOnly={readOnly}
                  fetchPage={config.party.fetchPage}
                  queryKey={config.party.queryKey}
                  queryParams={config.party.selectorParams}
                  recentKind={config.party.recentKind}
                  seedOptions={
                    record?.[config.partyRelation]?.id
                      ? [
                          {
                            value: record[config.partyRelation].id,
                            label: String(record[config.partyRelation].name ?? record[config.partyRelation].id),
                          },
                        ]
                      : []
                  }
                  recentLabel={t("selectorRecent")}
                  clearRecentLabel={t("selectorClearRecent")}
                  placeholder={t("fieldPartyPlaceholder")}
                />
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="payment_date"
                  label={<ResourceDrawerFieldLabel text={t("fieldDate")} required />}
                  rules={[{ required: true, message: t("dateRequired") }]}
                  getValueProps={(value) => ({
                    value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
                  })}
                >
                  <DatePicker className="w-full" format={dayjsDatePattern()} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="payment_method_id"
                  label={<ResourceDrawerFieldLabel text={t("fieldMethod")} required />}
                  rules={[{ required: true, message: t("methodRequired") }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={methodOptions}
                    loading={methodsQuery.isPending}
                    placeholder={t("fieldMethodPlaceholder")}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="currency_id"
                  label={<ResourceDrawerFieldLabel text={t("fieldCurrency")} required />}
                  rules={[{ required: true, message: t("currencyRequired") }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={currencyOptions}
                    loading={currenciesQuery.isPending}
                    placeholder={t("fieldCurrencyPlaceholder")}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label={
                    <span className="invisible" aria-hidden="true">
                      <ResourceDrawerFieldLabel text={t("fieldExchangeRate")} required />
                    </span>
                  }
                >
                  <div className="sales-invoice-exchange-rate-inline">
                    <ResourceDrawerFieldLabel text={t("fieldExchangeRate")} required help={exchangeRateHelp} />
                    <div className="sales-invoice-exchange-rate-input">
                      <Form.Item
                        name="exchange_rate"
                        noStyle
                        rules={[{ required: true, message: t("exchangeRateRequired") }]}
                      >
                        <TenantNumberInput
                          kind="rate"
                          className="w-full"
                          min={0.000000000001}
                          disabled={readOnly || exchangeRateLocked}
                        />
                      </Form.Item>
                    </div>
                  </div>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label={
                    <span className="invisible" aria-hidden="true">
                      <ResourceDrawerFieldLabel text={t("fieldAmount")} required />
                    </span>
                  }
                >
                  <div className="sales-invoice-exchange-rate-inline">
                    <ResourceDrawerFieldLabel text={t("fieldAmount")} required />
                    <div className="sales-invoice-exchange-rate-input">
                      <Form.Item name="amount" noStyle rules={[{ required: true, message: t("amountRequired") }]}>
                        <TenantNumberInput kind="money" className="w-full" min={0} />
                      </Form.Item>
                    </div>
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </div>
          <div className="sales-invoice-header-pane">
            <Row gutter={[12, 8]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="reference"
                  label={
                    <ResourceDrawerFieldLabel text={t("fieldReference")} required={Boolean(selectedMethod?.requires_reference)} />
                  }
                  rules={
                    selectedMethod?.requires_reference
                      ? [{ required: true, message: t("referenceRequired") }]
                      : []
                  }
                >
                  <Input maxLength={128} placeholder={t("fieldReferencePlaceholder")} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("fieldNotes")} optional />}>
                  <Input maxLength={2000} />
                </Form.Item>
              </Col>
              {readOnly ? null : (
                <Col span={24}>
                  <Form.Item label={<ResourceDrawerFieldLabel text={t("addInvoice")} />}>
                    <Select
                      className="w-full"
                      showSearch
                      optionFilterProp="label"
                      placeholder={partyReady ? t("addInvoice") : t("addInvoiceLocked")}
                      disabled={!partyReady}
                      loading={openInvoicesQuery.isFetching}
                      value={null}
                      options={addInvoiceOptions}
                      onChange={(_value, option) => {
                        const selected = /** @type {{ invoice?: Record<string, unknown> }} */ (option);
                        if (selected?.invoice) addInvoice(selected.invoice);
                      }}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
          </div>
        </div>
        <PaymentAllocationGrid
          t={t}
          readOnly={readOnly || submitting}
          rows={rows}
          headerAmount={headerAmount}
          receiptCurrencyId={currencyId}
          receiptRate={positiveRate(exchangeRateWatch) ?? 1}
          primaryCurrencyId={settings.primaryCurrencyId}
          pairRates={pairRatesQuery.data ?? []}
          priceDecimals={priceDecimals}
          onAmount={changeLineAmount}
          onApplyRemainder={applyRemainder}
          onRemove={(key) => commitRows(rowsRef.current.filter((row) => row.key !== key))}
        />
      </Form>
    </ResourceCrudDrawer>
  );
}
