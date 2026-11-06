"use client";

import { fetchCashBankAccountNames } from "@/features/cash-bank-accounts/api/cashBankAccounts.api";
import { fetchPaymentMethodNames } from "@/features/payment-methods/api/paymentMethods.api";
import { CURRENCIES_LIST_QUERY_KEY, fetchCurrencyNames, fetchCurrencyPairRates } from "@/features/currencies/index";
import { useCompanySettings } from "@/lib/company-settings";
import {
  paymentAmountForInvoiceOpen,
  paymentAppliedToInvoice,
  positiveRate,
  rateFromPrimary,
  roundCashAmount,
} from "@/lib/currency/documentExchangeRate";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { dayjsDatePattern, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import { useQuery } from "@tanstack/react-query";
import { Button, DatePicker, Form, Input, Modal, Select, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { defaultPaymentAccountId, paymentAccountOptions } from "@/features/cash-bank-accounts/utils/paymentCashBankAccount";
import {
  salesInvoicePaymentChanges,
  salesInvoicePaymentSummary,
  salesInvoicePaymentsPayload,
} from "../../utils/salesInvoicePayments";

/**
 * Money taken for a sales invoice (cash, card, ...). Each line becomes a receipt allocated to the invoice.
 * A line may be in another currency (e.g. a USD invoice paid partly in LBP): its amount is in that
 * currency at the line's rate (today's rate, editable), and totals are converted to the invoice currency.
 * - `post`: opened by Post; the invoice and its payments are posted together (no lines = all on account).
 * - `record`: on a posted invoice, for money received later (up to what is still open).
 *
 * @param {{
 *   open: boolean;
 *   mode: "post" | "record";
 *   amountDue: unknown;
 *   currencyId: unknown;
 *   exchangeRate?: unknown;
 *   branchId?: unknown;
 *   invoiceMethodId?: unknown;
 *   currencySymbol?: string;
 *   submitting: boolean;
 *   onCancel: () => void;
 *   onSubmit: (body: { payments: ReturnType<typeof salesInvoicePaymentsPayload>; payment_date?: string }) => void;
 * }} props
 */
export default function SalesInvoicePaymentModal({
  open,
  mode,
  amountDue,
  currencyId,
  exchangeRate = null,
  branchId = null,
  invoiceMethodId = null,
  currencySymbol = "",
  submitting,
  onCancel,
  onSubmit,
}) {
  const t = useTranslations("SalesInvoicePayments");
  const [form] = Form.useForm();
  const rows = Form.useWatch("payments", { form, preserve: true });
  const list = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const { settings } = useCompanySettings();

  const methodsQuery = useQuery({
    queryKey: ["tenant", "payment-methods", "names"],
    queryFn: () => fetchPaymentMethodNames(),
    staleTime: QUERY_STALE_TIME.catalog,
    enabled: open,
  });
  const accountsQuery = useQuery({
    queryKey: ["tenant", "cash-bank-accounts", "names"],
    queryFn: () => fetchCashBankAccountNames(),
    staleTime: QUERY_STALE_TIME.catalog,
    enabled: open,
  });
  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencyNames,
    staleTime: QUERY_STALE_TIME.catalog,
    enabled: open,
  });
  const pairRatesQuery = useQuery({
    queryKey: [...CURRENCIES_LIST_QUERY_KEY, "pair-rates"],
    queryFn: fetchCurrencyPairRates,
    staleTime: QUERY_STALE_TIME.catalog,
    enabled: open,
  });

  const methods = useMemo(
    () => (Array.isArray(methodsQuery.data) ? methodsQuery.data : []).filter((m) => m && m.is_active !== false && m.type !== "credit"),
    [methodsQuery.data],
  );
  const methodById = useMemo(() => new Map(methods.map((m) => [Number(m.id), m])), [methods]);
  const accounts = useMemo(() => (Array.isArray(accountsQuery.data) ? accountsQuery.data : []), [accountsQuery.data]);
  const currencies = useMemo(() => (Array.isArray(currenciesQuery.data) ? currenciesQuery.data : []), [currenciesQuery.data]);
  const currencyById = useMemo(() => new Map(currencies.map((c) => [Number(c.id), c])), [currencies]);
  const currencyOptions = useMemo(
    () =>
      currencies
        .filter((c) => c && (c.is_active !== false || Number(c.id) === Number(currencyId)))
        .map((c) => ({ value: Number(c.id), label: String(c.code ?? c.name ?? c.id) })),
    [currencies, currencyId],
  );

  // Fresh form each time it opens.
  const firstRowAddedRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    firstRowAddedRef.current = false;
    form.resetFields();
    form.setFieldsValue({ payments: [], payment_date: dayjs() });
  }, [open, form]);

  const pairRates = pairRatesQuery.data ?? [];
  const invoiceRate = positiveRate(exchangeRate) ?? 1;
  // Across currencies the invoice side uses today's rate, the same rule as the backend.
  const invoiceTodayRate = rateFromPrimary(pairRates, settings.primaryCurrencyId, currencyId) ?? invoiceRate;
  const isInvoiceCurrency = (cid) => cid == null || cid === "" || Number(cid) === Number(currencyId);
  const todayRateFor = (cid) => (isInvoiceCurrency(cid) ? invoiceRate : rateFromPrimary(pairRates, settings.primaryCurrencyId, cid));
  const symbolFor = (cid) => {
    if (isInvoiceCurrency(cid)) return currencySymbol;
    const c = currencyById.get(Number(cid));
    return String(c?.symbol || c?.code || "");
  };

  // Company decimals for every amount; each currency's smallest unit / round limit for cash
  // (same rules as the receipt drawer).
  const decimals = settings.priceDecimalPlaces ?? 2;

  /** Row amount in the invoice currency. */
  const toInvoice = (row) => {
    if (!row) return 0;
    const same = isInvoiceCurrency(row.currency_id);
    return paymentAppliedToInvoice(row.amount, row.exchange_rate, invoiceTodayRate, same, decimals) ?? 0;
  };
  /** Invoice-currency amount expressed in a row currency at a rate, cash-rounded for that currency. */
  const fromInvoice = (invoiceAmount, cid, rate) => {
    const same = isInvoiceCurrency(cid);
    const exact = paymentAmountForInvoiceOpen(invoiceAmount, rate, invoiceTodayRate, same, decimals);
    if (exact == null) return undefined;
    const currency = currencyById.get(Number(same ? currencyId : cid));
    return roundCashAmount(exact, currency?.smallest_unit, currency?.round_limit, decimals);
  };

  const due = Number(amountDue) || 0;
  const invoiceCurrency = currencyById.get(Number(currencyId));
  const money = (value, symbol = currencySymbol) => formatTenantMoneyWithSymbol(value, symbol) || "—";
  const summary = salesInvoicePaymentSummary(list, due, toInvoice, invoiceCurrency?.allowed_difference_in_receipt);
  const changes = salesInvoicePaymentChanges(list);
  const restFor = (index) => Math.max(0, due - list.reduce((sum, r, i) => (i === index ? sum : sum + toInvoice(r)), 0));

  // The invoice's own method first (unless it is "on credit"), then the default method.
  const defaultMethodId = methodById.has(Number(invoiceMethodId))
    ? Number(invoiceMethodId)
    : Number(methods.find((m) => m.is_default)?.id ?? methods[0]?.id) || undefined;
  const accountFor = (methodId, cid) =>
    defaultPaymentAccountId(methodById.get(Number(methodId)), accounts, branchId, isInvoiceCurrency(cid) ? currencyId : cid);

  /** A new row in the invoice currency for `invoiceAmount` (undefined = empty amount). */
  const newRow = (invoiceAmount) => ({
    payment_method_id: defaultMethodId,
    currency_id: currencyId == null ? undefined : Number(currencyId),
    exchange_rate: invoiceRate,
    cash_bank_account_id: accountFor(defaultMethodId, currencyId),
    amount: invoiceAmount == null ? undefined : fromInvoice(invoiceAmount, currencyId, invoiceRate),
  });
  const setRows = (next) => form.setFieldValue("payments", next);
  const patchRow = (index, patch) => setRows(list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const addRow = () => setRows([...list, newRow(restFor(-1))]);
  const payFull = () => setRows([newRow(due)]);

  // Switching a line's currency: today's rate, that currency's account, and what is still due in it.
  const changeRowCurrency = (index, cid) => {
    const row = list[index] ?? {};
    const rate = todayRateFor(cid) ?? undefined;
    patchRow(index, {
      currency_id: cid,
      exchange_rate: rate,
      cash_bank_account_id: accountFor(row.payment_method_id, cid),
      amount: rate != null ? fromInvoice(restFor(index), cid, rate) : row.amount,
      tendered: undefined,
    });
  };
  // A typed rate re-prices the line to what is still due.
  const changeRowRate = (index, rate) => {
    const row = list[index] ?? {};
    const positive = positiveRate(rate);
    patchRow(index, {
      exchange_rate: rate,
      amount: positive != null ? fromInvoice(restFor(index), row.currency_id, positive) : row.amount,
    });
  };

  // Always open with a first row, filled like "Add payment" once methods and accounts load.
  // When the invoice is "on credit", the amount stays empty so it still posts on account.
  const invoiceMethodIsCredit =
    invoiceMethodId != null &&
    (Array.isArray(methodsQuery.data) ? methodsQuery.data : []).some((m) => Number(m?.id) === Number(invoiceMethodId) && m?.type === "credit");
  const lookupsReady = !methodsQuery.isPending && !accountsQuery.isPending;
  useEffect(() => {
    if (!open || !lookupsReady || firstRowAddedRef.current) return;
    firstRowAddedRef.current = true;
    const current = form.getFieldValue("payments");
    if (Array.isArray(current) && current.length > 0) return;
    form.setFieldValue("payments", [newRow(invoiceMethodIsCredit ? undefined : due)]);
  });

  const submit = () => {
    form
      .validateFields()
      .then((values) => {
        const payments = salesInvoicePaymentsPayload(values.payments, currencyId);
        const date = values.payment_date && dayjs.isDayjs(values.payment_date) ? values.payment_date.format("YYYY-MM-DD") : undefined;
        onSubmit(mode === "record" ? { payments, payment_date: date } : { payments });
      })
      .catch(() => {});
  };

  const columns = [
    { key: "payment_method_id", label: t("method"), width: "minmax(120px, 1.1fr)" },
    { key: "currency_id", label: t("currency"), width: "minmax(170px, 1.4fr)" },
    { key: "cash_bank_account_id", label: t("account"), width: "minmax(140px, 1.3fr)" },
    { key: "amount", label: t("amount"), width: "minmax(140px, 1.2fr)" },
    { key: "reference", label: t("reference"), width: "minmax(100px, 1fr)" },
    { key: "tendered", label: t("tendered"), width: "minmax(110px, 1fr)" },
  ];

  const hasRows = summary.paid > 0;
  const okLabel = mode === "record" ? t("recordOk") : hasRows ? t("postWithPayment") : t("postOnAccount");
  const blocked = summary.over || (mode === "record" && !hasRows);

  return (
    <Modal
      open={open}
      title={mode === "record" ? t("recordTitle") : t("postTitle")}
      width={1040}
      mask={{ closable: !submitting }}
      onCancel={submitting ? undefined : onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={submitting}>
          {t("cancel")}
        </Button>,
        <Button key="ok" type="primary" loading={submitting} disabled={blocked} onClick={submit}>
          {okLabel}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" requiredMark={false} disabled={submitting}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Typography.Text>
            {mode === "record" ? t("openAmount") : t("invoiceTotal")} <b className="tabular-nums">{money(due)}</b>
          </Typography.Text>
          <div className="flex items-center gap-2">
            {mode === "record" ? (
              <Form.Item name="payment_date" noStyle rules={[{ required: true }]}>
                <DatePicker format={dayjsDatePattern()} allowClear={false} />
              </Form.Item>
            ) : null}
            <Button onClick={payFull} disabled={methods.length === 0}>
              {t("payFull")}
            </Button>
          </div>
        </div>

        <LinesGrid
          columns={columns}
          lines={list}
          canAddLine
          onAddLine={addRow}
          addLabel={t("add")}
          deleteAriaLabel={t("remove")}
          onRemoveLine={(index) => setRows(list.filter((_, i) => i !== index))}
          canRemoveLine
          renderField={(_line, index, columnKey) => {
            const row = list[index] ?? {};
            const method = methodById.get(Number(row.payment_method_id));
            const rowCurrency = isInvoiceCurrency(row.currency_id) ? currencyId : row.currency_id;
            const foreign = !isInvoiceCurrency(row.currency_id);
            const rowSymbol = symbolFor(row.currency_id);
            if (columnKey === "payment_method_id") {
              return (
                <Form.Item
                  name={["payments", index, "payment_method_id"]}
                  noStyle
                  rules={[{ required: Number(row.amount) > 0, message: t("methodRequired") }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    className="w-full"
                    loading={methodsQuery.isPending}
                    options={methods.map((m) => ({ value: Number(m.id), label: String(m.name) }))}
                    onChange={(value) => form.setFieldValue(["payments", index, "cash_bank_account_id"], accountFor(value, row.currency_id))}
                  />
                </Form.Item>
              );
            }
            if (columnKey === "currency_id") {
              return (
                <div className="flex w-full items-center gap-1">
                  <Form.Item name={["payments", index, "currency_id"]} noStyle>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      className={foreign ? "min-w-0 flex-1" : "w-full"}
                      loading={currenciesQuery.isPending}
                      options={currencyOptions}
                      onChange={(value) => changeRowCurrency(index, value)}
                    />
                  </Form.Item>
                  {foreign ? (
                    <Form.Item
                      name={["payments", index, "exchange_rate"]}
                      noStyle
                      rules={[{ required: Number(row.amount) > 0, message: t("rateRequired") }]}
                    >
                      <TenantNumberInput
                        kind="rate"
                        min={0.000000000001}
                        className="w-[96px] shrink-0"
                        placeholder={t("rate")}
                        aria-label={t("rate")}
                        onChange={(value) => changeRowRate(index, value)}
                      />
                    </Form.Item>
                  ) : null}
                </div>
              );
            }
            if (columnKey === "cash_bank_account_id") {
              return (
                <Form.Item name={["payments", index, "cash_bank_account_id"]} noStyle>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    className="w-full"
                    placeholder={t("accountDefault")}
                    loading={accountsQuery.isPending}
                    options={paymentAccountOptions(accounts, branchId, rowCurrency)}
                  />
                </Form.Item>
              );
            }
            if (columnKey === "amount") {
              // An empty amount is fine: that row is skipped and the rest stays on account.
              return (
                <div className="flex w-full flex-col">
                  <Form.Item name={["payments", index, "amount"]} noStyle>
                    <TenantNumberInput kind="money" min={0} className="w-full" addonAfter={rowSymbol || undefined} />
                  </Form.Item>
                  {foreign && Number(row.amount) > 0 ? (
                    <Typography.Text type="secondary" className="mt-0.5 text-xs tabular-nums">
                      {t("equivalent", { amount: money(toInvoice(row)) })}
                    </Typography.Text>
                  ) : null}
                </div>
              );
            }
            if (columnKey === "reference") {
              return (
                <Form.Item
                  name={["payments", index, "reference"]}
                  noStyle
                  rules={[{ required: Boolean(method?.requires_reference) && Number(row.amount) > 0, message: t("referenceRequired") }]}
                >
                  <Input maxLength={128} placeholder={method?.requires_reference ? t("referenceRequired") : undefined} />
                </Form.Item>
              );
            }
            return (
              <Form.Item name={["payments", index, "tendered"]} noStyle>
                <TenantNumberInput
                  kind="money"
                  min={0}
                  className="w-full"
                  disabled={!method?.supports_change}
                  addonAfter={method?.supports_change && rowSymbol ? rowSymbol : undefined}
                />
              </Form.Item>
            );
          }}
        />
      </Form>

      <div className="mt-3 flex flex-wrap justify-end gap-4 text-sm">
        <span>
          {t("paidNow")} <b className="tabular-nums">{money(summary.paid)}</b>
        </span>
        <span>
          {mode === "record" ? t("stillOpen") : t("onAccount")} <b className="tabular-nums">{money(summary.onAccount)}</b>
        </span>
        {changes.map((c) => (
          <span key={c.index}>
            {t("change")} <b className="tabular-nums">{money(c.change, symbolFor(c.currencyId))}</b>
          </span>
        ))}
        {summary.over ? <Typography.Text type="danger">{t("overTotal")}</Typography.Text> : null}
      </div>
    </Modal>
  );
}
