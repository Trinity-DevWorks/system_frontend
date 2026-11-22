import dayjs from "dayjs";

export function deferralDefaults() {
  return {
    kind: "prepaid_expense",
    name: "",
    description: "",
    deferral_account_id: undefined,
    recognition_account_id: undefined,
    currency_id: undefined,
    exchange_rate: null,
    total_amount: null,
    period: null,
    method: "straight_line_monthly",
    posting_day: "period_end",
    auto_post: true,
    supplier_id: undefined,
    customer_id: undefined,
  };
}

function num(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** @param {Record<string, unknown>} record */
export function deferralToFormValues(record) {
  return {
    kind: record.kind,
    name: record.name ?? "",
    description: record.description ?? "",
    deferral_account_id: record.deferral_account?.id,
    recognition_account_id: record.recognition_account?.id,
    currency_id: record.currency?.id,
    exchange_rate: record.exchange_rate,
    total_amount: record.total_amount,
    period:
      record.start_date && record.end_date
        ? [dayjs(String(record.start_date)), dayjs(String(record.end_date))]
        : null,
    method: record.method,
    posting_day: record.posting_day,
    auto_post: Boolean(record.auto_post),
    supplier_id: record.supplier?.id,
    customer_id: record.customer?.id,
  };
}

/** @param {Record<string, unknown>} values */
export function deferralToPayload(values) {
  const period = Array.isArray(values.period) ? values.period : [];
  const trim = (value) => {
    const s = String(value ?? "").trim();
    return s === "" ? null : s;
  };
  return {
    kind: values.kind,
    name: trim(values.name),
    description: trim(values.description),
    deferral_account_id: num(values.deferral_account_id),
    recognition_account_id: num(values.recognition_account_id),
    currency_id: num(values.currency_id),
    exchange_rate: num(values.exchange_rate),
    total_amount: num(values.total_amount),
    start_date: period[0] ? dayjs(period[0]).format("YYYY-MM-DD") : null,
    end_date: period[1] ? dayjs(period[1]).format("YYYY-MM-DD") : null,
    method: values.method,
    posting_day: values.posting_day,
    auto_post: Boolean(values.auto_post),
    supplier_id: values.supplier_id || null,
    customer_id: values.customer_id || null,
  };
}
