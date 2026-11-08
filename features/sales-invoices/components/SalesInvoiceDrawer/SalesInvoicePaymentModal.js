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
import { Button, DatePicker, Form, Input, Modal, Select, Spin, Switch, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultPaymentAccountId, paymentAccountOptions } from "@/features/cash-bank-accounts/utils/paymentCashBankAccount";
import { fetchCustomerAvailableCredit } from "../../api/salesInvoices.api";
import {
  isCreditRow,
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
 *   customerId?: unknown;
 *   exchangeRate?: unknown;
 *   branchId?: unknown;
 *   invoiceMethodId?: unknown;
 *   currencySymbol?: string;
 *   submitting: boolean;
 *   onCancel: () => void;
 *   onSubmit: (body: { payments: ReturnType<typeof salesInvoicePaymentsPayload>; payment_date?: string; keep_extra_as_credit?: boolean }) => void;
 * }} props
 */
export default function SalesInvoicePaymentModal({
  open,
  mode,
  amountDue,
  currencyId,
  customerId = null,
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
  // Shown in the footer (outside the form), only while payments exceed the total.
  const [keepExtra, setKeepExtra] = useState(false);
  // Off again each time the window opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setKeepExtra(false);
  }
  const { settings } = useCompanySettings();

  // The customer's credit from earlier overpayments, valued in the invoice currency.
  const creditQuery = useQuery({
    queryKey: ["tenant", "customer-receipts", "available-credit", customerId, currencyId],
    queryFn: () => fetchCustomerAvailableCredit(String(customerId), currencyId),
    enabled: open && customerId != null && customerId !== "",
    staleTime: 0,
  });
  const availableCredit = useMemo(
    () => (Array.isArray(creditQuery.data) ? creditQuery.data : []).reduce((sum, c) => sum + (Number(c.in_invoice_currency) || 0), 0),
    [creditQuery.data],
  );

  // Lookup lists load with the invoice drawer (this window stays mounted), so they are ready when it opens.
  const methodsQuery = useQuery({
    queryKey: ["tenant", "payment-methods", "names"],
    queryFn: () => fetchPaymentMethodNames(),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const accountsQuery = useQuery({
    queryKey: ["tenant", "cash-bank-accounts", "names"],
    queryFn: () => fetchCashBankAccountNames(),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencyNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const pairRatesQuery = useQuery({
    queryKey: [...CURRENCIES_LIST_QUERY_KEY, "pair-rates"],
    queryFn: fetchCurrencyPairRates,
    staleTime: QUERY_STALE_TIME.catalog,
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
    if (isCreditRow(row)) return Number(row.amount) || 0;
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
    // Nothing left to pay → leave it empty so the placeholder can show the rest later.
    amount: invoiceAmount == null || !(invoiceAmount > 0) ? undefined : fromInvoice(invoiceAmount, currencyId, invoiceRate),
  });
  const setRows = (next) => form.setFieldValue("payments", next);
  const patchRow = (index, patch) => setRows(list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const addRow = () => setRows([...list, newRow(restFor(-1))]);
  const payFull = () => setRows([newRow(due)]);
  const creditUsed = list.filter(isCreditRow).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const creditLeft = Math.max(0, Math.round((availableCredit - creditUsed) * 10000) / 10000);
  // Uses the customer's credit for what is still due (or all of it, when less).
  const addCreditRow = () => {
    const amount = Math.min(creditLeft, restFor(-1));
    if (!(amount > 0)) return;
    setRows([{ kind: "credit", amount: Math.round(amount * 10000) / 10000 }, ...list]);
  };

  /** Change amount in `changeCurrencyId` for a row's extra cash (today's rate, cash-rounded for that currency). */
  const changeIn = (row, changeCurrencyId) => {
    const extra = Number(row?.tendered) - Number(row?.amount);
    if (!(extra > 0) || changeCurrencyId == null) return { change_amount: undefined, change_rate: undefined };
    const rowRate = isInvoiceCurrency(row.currency_id) ? invoiceRate : positiveRate(row.exchange_rate);
    const changeRate = todayRateFor(changeCurrencyId);
    if (rowRate == null || changeRate == null) return { change_amount: undefined, change_rate: undefined };
    const exact = (extra / rowRate) * changeRate;
    const currency = currencyById.get(Number(changeCurrencyId));
    return {
      change_amount: roundCashAmount(exact, currency?.smallest_unit, currency?.round_limit, decimals),
      change_rate: changeRate,
    };
  };
  const rowCurrencyId = (row) => (isInvoiceCurrency(row?.currency_id) ? Number(currencyId) : Number(row.currency_id));
  /** The currency after `cid` in the list, wrapping back to the first. */
  const nextCurrencyId = (cid) => {
    const ids = currencyOptions.map((o) => o.value);
    const at = ids.indexOf(Number(cid));
    return ids[(at + 1) % ids.length];
  };
  const changeRowChangeCurrency = (index, cid) => {
    const row = list[index] ?? {};
    const foreign = cid != null && Number(cid) !== rowCurrencyId(row);
    patchRow(index, foreign ? { change_currency_id: cid, ...changeIn(row, cid) } : { change_currency_id: undefined, change_amount: undefined, change_rate: undefined });
  };
  const changeRowTendered = (index, tendered) => {
    const row = { ...(list[index] ?? {}), tendered };
    const foreign = row.change_currency_id != null && Number(row.change_currency_id) !== rowCurrencyId(row);
    patchRow(index, foreign ? { tendered, ...changeIn(row, row.change_currency_id) } : { tendered });
  };

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
      // Change goes back to the line's own currency.
      change_currency_id: undefined,
      change_amount: undefined,
      change_rate: undefined,
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

  // The first row appears at once from what the invoice already knows (method, currency, amount);
  // method and cash/bank are corrected / filled in when their lists arrive.
  // When the invoice is "on credit", the amount is cleared so it still posts on account.
  const invoiceMethodIsCredit =
    invoiceMethodId != null &&
    (Array.isArray(methodsQuery.data) ? methodsQuery.data : []).some((m) => Number(m?.id) === Number(invoiceMethodId) && m?.type === "credit");
  const lookupsReady = !methodsQuery.isPending && !accountsQuery.isPending;
  const lookupsAppliedRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (!firstRowAddedRef.current) {
      firstRowAddedRef.current = true;
      lookupsAppliedRef.current = false;
      const current = form.getFieldValue("payments");
      if (!Array.isArray(current) || current.length === 0) {
        const row = newRow(invoiceMethodIsCredit ? undefined : due);
        if (row.payment_method_id == null && !lookupsReady && invoiceMethodId != null) row.payment_method_id = Number(invoiceMethodId);
        form.setFieldValue("payments", [row]);
      }
    }
    if (!lookupsReady || lookupsAppliedRef.current) return;
    lookupsAppliedRef.current = true;
    const current = form.getFieldValue("payments");
    if (!Array.isArray(current)) return;
    form.setFieldValue(
      "payments",
      current.map((row, i) => {
        if (isCreditRow(row)) return row;
        const next = { ...row };
        if (!methodById.has(Number(next.payment_method_id))) next.payment_method_id = defaultMethodId;
        if (next.cash_bank_account_id == null) next.cash_bank_account_id = accountFor(next.payment_method_id, next.currency_id);
        if (i === 0 && invoiceMethodIsCredit) next.amount = undefined;
        return next;
      }),
    );
  });

  const submit = () => {
    form
      .validateFields()
      .then((values) => {
        // The full rows: some fields (kind, change amount, rates) are set in code, not shown as inputs.
        const payments = salesInvoicePaymentsPayload(form.getFieldValue("payments"), currencyId);
        const date = values.payment_date && dayjs.isDayjs(values.payment_date) ? values.payment_date.format("YYYY-MM-DD") : undefined;
        const keep = summary.over && keepExtra;
        onSubmit(mode === "record" ? { payments, payment_date: date, keep_extra_as_credit: keep } : { payments, keep_extra_as_credit: keep });
      })
      .catch(() => {});
  };

  const anyForeignRow = list.some((r) => !isCreditRow(r) && !isInvoiceCurrency(r?.currency_id));
  const accountCode = (id) => accounts.find((a) => Number(a?.id) === Number(id))?.code;
  const columns = [
    { key: "payment_method_id", label: t("method"), width: "minmax(120px, 1.1fr)" },
    // Narrow unless a line is in another currency and needs room for its rate.
    { key: "currency_id", label: t("currency"), width: anyForeignRow ? "minmax(170px, 1.2fr)" : "minmax(90px, 0.6fr)" },
    { key: "cash_bank_account_id", label: t("account"), width: "minmax(110px, 1fr)" },
    { key: "amount", label: t("amount"), width: "minmax(140px, 1.2fr)" },
    { key: "reference", label: t("referenceCheque"), width: "minmax(130px, 1.1fr)" },
    { key: "tendered", label: t("tendered"), width: "minmax(130px, 1fr)" },
  ];

  const hasRows = summary.paid > 0;
  const okLabel = mode === "record" ? t("recordOk") : hasRows ? t("postWithPayment") : t("postOnAccount");
  // Paying more than due is fine only when the extra is kept as customer credit.
  const blocked = (summary.over && !keepExtra) || (mode === "record" && !hasRows);

  return (
    <Modal
      open={open}
      title={mode === "record" ? t("recordTitle") : t("postTitle")}
      width={1040}
      mask={{ closable: !submitting }}
      onCancel={submitting ? undefined : onCancel}
      footer={[
        summary.over ? (
          <label key="keep" className="me-3 inline-flex cursor-pointer items-center gap-2 align-middle text-sm">
            <Switch size="small" checked={keepExtra} onChange={setKeepExtra} disabled={submitting} />
            <span>{t("keepExtraAsCredit")}</span>
          </label>
        ) : null,
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
            {summary.over && !keepExtra ? <Typography.Text type="danger">{t("overTotal")}</Typography.Text> : null}
            {mode === "record" ? (
              <Form.Item name="payment_date" noStyle rules={[{ required: true }]}>
                <DatePicker format={dayjsDatePattern()} allowClear={false} />
              </Form.Item>
            ) : null}
            {creditLeft > 0 ? (
              <Button onClick={addCreditRow} disabled={!(restFor(-1) > 0)}>
                {t("useCredit", { amount: money(creditLeft) })}
              </Button>
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
            const isCheque = method?.type === "cheque";

            // The customer's existing credit: an amount in the invoice currency, nothing else to fill.
            if (isCreditRow(row)) {
              if (columnKey === "payment_method_id") return <Tag color="blue" className="!m-0">{t("customerCredit")}</Tag>;
              if (columnKey === "currency_id") return <Typography.Text type="secondary">{invoiceCurrency?.code ?? ""}</Typography.Text>;
              if (columnKey === "amount") {
                return (
                  <Form.Item
                    name={["payments", index, "amount"]}
                    noStyle
                    rules={[{ validator: (_, v) => (Number(v) <= creditLeft + Number(row.amount) + 0.00001 ? Promise.resolve() : Promise.reject(new Error(t("creditTooMuch")))) }]}
                  >
                    <TenantNumberInput kind="money" min={0} className="w-full" addonAfter={currencySymbol || undefined} />
                  </Form.Item>
                );
              }
              if (columnKey === "reference") {
                return <Typography.Text type="secondary" className="text-xs">{t("creditAvailable", { amount: money(availableCredit) })}</Typography.Text>;
              }
              return null;
            }

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
                    labelRender={(selected) => (selected.label == null && methodsQuery.isPending ? <Spin size="small" /> : selected.label)}
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
                      labelRender={(selected) => (selected.label == null && currenciesQuery.isPending ? <Spin size="small" /> : selected.label)}
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
              if (isCheque) {
                // Cheques wait in "Cheques to collect" until they clear into a bank account.
                return <Typography.Text type="secondary" className="text-xs">{t("chequesToCollect")}</Typography.Text>;
              }
              return (
                <Form.Item name={["payments", index, "cash_bank_account_id"]} noStyle>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    className="w-full"
                    placeholder={lookupsReady ? t("accountDefault") : <Spin size="small" />}
                    loading={accountsQuery.isPending}
                    options={paymentAccountOptions(accounts, branchId, rowCurrency)}
                    // The field shows the code only; the list keeps "code — name".
                    labelRender={(selected) => accountCode(selected.value) ?? (accountsQuery.isPending ? <Spin size="small" /> : selected.label)}
                    popupMatchSelectWidth={false}
                  />
                </Form.Item>
              );
            }
            if (columnKey === "amount") {
              // An empty amount is fine: that row is skipped and the rest stays on account.
              // While empty, the placeholder shows what is still due in this line's currency (pays the invoice in full).
              const rowRate = foreign ? positiveRate(row.exchange_rate) : invoiceRate;
              const rest = restFor(index);
              const restInRow = rest > 0 && rowRate != null ? fromInvoice(rest, row.currency_id, rowRate) : undefined;
              return (
                <div className="flex w-full flex-col">
                  <Form.Item name={["payments", index, "amount"]} noStyle>
                    <TenantNumberInput
                      kind="money"
                      min={0}
                      className="w-full"
                      addonAfter={rowSymbol || undefined}
                      placeholder={restInRow != null ? formatTenantMoneyWithSymbol(restInRow, "") : undefined}
                    />
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
              if (isCheque) {
                const needed = Number(row.amount) > 0;
                return (
                  <div className="flex w-full flex-col gap-1">
                    <Form.Item name={["payments", index, "cheque_number"]} noStyle rules={[{ required: needed, message: t("chequeRequired") }]}>
                      <Input maxLength={64} placeholder={t("chequeNumber")} />
                    </Form.Item>
                    <Form.Item name={["payments", index, "cheque_bank"]} noStyle>
                      <Input maxLength={128} placeholder={t("chequeBank")} />
                    </Form.Item>
                    <Form.Item name={["payments", index, "cheque_due_date"]} noStyle rules={[{ required: needed, message: t("chequeRequired") }]}>
                      <DatePicker className="w-full" format={dayjsDatePattern()} placeholder={t("chequeDueDate")} />
                    </Form.Item>
                  </div>
                );
              }
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
            // Cash given is in the line's currency; the change currency is picked on the Change total below.
            return (
              <Form.Item name={["payments", index, "tendered"]} noStyle>
                <TenantNumberInput
                  kind="money"
                  min={0}
                  className="w-full"
                  disabled={!method?.supports_change}
                  addonAfter={method?.supports_change && rowSymbol ? rowSymbol : undefined}
                  onChange={(value) => changeRowTendered(index, value)}
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
        {changes.map((c) => {
          // Clicking the currency gives the change back in the next currency instead.
          const changeCurrencyId = isInvoiceCurrency(c.currencyId) ? Number(currencyId) : Number(c.currencyId);
          const code = currencyById.get(changeCurrencyId)?.code ?? "";
          return (
            <span key={c.index} className="inline-flex items-center gap-1">
              {t("change")} <b className="tabular-nums">{formatTenantMoneyWithSymbol(c.change, "")}</b>
              {currencyOptions.length > 1 ? (
                <Tooltip title={t("changeReturnedIn", { code })}>
                  <Button
                    size="small"
                    className="!px-1.5 font-semibold"
                    aria-label={t("changeReturnedIn", { code })}
                    onClick={() => changeRowChangeCurrency(c.index, nextCurrencyId(changeCurrencyId))}
                  >
                    {symbolFor(changeCurrencyId)}
                  </Button>
                </Tooltip>
              ) : (
                <b>{symbolFor(changeCurrencyId)}</b>
              )}
            </span>
          );
        })}
        {summary.over && keepExtra ? (
          <span>
            {t("keptAsCredit")} <b className="tabular-nums">{money(summary.extra)}</b>
          </span>
        ) : null}
      </div>
    </Modal>
  );
}
