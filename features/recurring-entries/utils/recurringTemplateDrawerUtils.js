import dayjs from "dayjs";

export function emptyLine(documentType) {
  return documentType === "expense_voucher"
    ? { account_id: undefined, description: "", amount: null, vat_group_id: undefined }
    : { account_id: undefined, description: "", debit: null, credit: null, party_type: undefined, party_id: undefined };
}

export function recurringDefaults() {
  return {
    name: "",
    description: "",
    document_type: "expense_voucher",
    auto_post: false,
    currency_id: undefined,
    rate_mode: "current",
    fixed_exchange_rate: null,
    cash_bank_account_id: undefined,
    payee: "",
    supplier_id: undefined,
    reference: "",
    notes: "",
    frequency: "monthly",
    interval: 1,
    day_of_month: 1,
    day_of_week: 1,
    start_date: dayjs(),
    end_mode: "never",
    end_date: null,
    max_occurrences: null,
    lines: [emptyLine("expense_voucher")],
  };
}

function dateString(value) {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
}

function num(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** @param {Record<string, unknown>} record */
export function toFormValues(record) {
  const type = String(record.document_type ?? "expense_voucher");
  const lines = Array.isArray(record.lines) ? record.lines : [];
  return {
    name: record.name ?? "",
    description: record.description ?? "",
    document_type: type,
    auto_post: Boolean(record.auto_post),
    currency_id: record.currency && typeof record.currency === "object" ? record.currency.id : undefined,
    rate_mode: record.rate_mode ?? "current",
    fixed_exchange_rate: record.fixed_exchange_rate ?? null,
    cash_bank_account_id: record.cash_bank_account && typeof record.cash_bank_account === "object" ? record.cash_bank_account.id : undefined,
    payee: record.payee ?? "",
    supplier_id: record.supplier && typeof record.supplier === "object" ? record.supplier.id : undefined,
    reference: record.reference ?? "",
    notes: record.notes ?? "",
    frequency: record.frequency ?? "monthly",
    interval: record.interval ?? 1,
    day_of_month: record.day_of_month ?? 1,
    day_of_week: record.day_of_week ?? 1,
    start_date: record.start_date ? dayjs(String(record.start_date)) : null,
    end_mode: record.end_date ? "date" : record.max_occurrences ? "count" : "never",
    end_date: record.end_date ? dayjs(String(record.end_date)) : null,
    max_occurrences: record.max_occurrences ?? null,
    occurrences_count: record.occurrences_count ?? 0,
    lines: lines.length
      ? lines.map((line) => ({
          account_id: line.account?.id ?? line.account_id,
          description: line.description ?? "",
          debit: num(line.debit),
          credit: num(line.credit),
          amount: num(line.amount),
          vat_group_id: line.vat_group_id ?? undefined,
          party_type: line.party_type ?? undefined,
          party_id: line.party_id ?? undefined,
        }))
      : [emptyLine(type)],
  };
}

/** @param {Record<string, unknown>} values */
export function toPayload(values) {
  const type = String(values.document_type ?? "expense_voucher");
  const trim = (value) => {
    const s = String(value ?? "").trim();
    return s === "" ? null : s;
  };
  const lines = (Array.isArray(values.lines) ? values.lines : []).filter((line) => line && line.account_id != null);
  return {
    name: trim(values.name),
    description: trim(values.description),
    document_type: type,
    auto_post: Boolean(values.auto_post),
    currency_id: type === "journal_entry" ? num(values.currency_id) : null,
    rate_mode: values.rate_mode ?? "current",
    fixed_exchange_rate: values.rate_mode === "fixed" ? num(values.fixed_exchange_rate) : null,
    cash_bank_account_id: type === "expense_voucher" ? num(values.cash_bank_account_id) : null,
    payee: type === "expense_voucher" ? trim(values.payee) : null,
    supplier_id: type === "expense_voucher" ? values.supplier_id || null : null,
    reference: trim(values.reference),
    notes: trim(values.notes),
    frequency: values.frequency,
    interval: num(values.interval) ?? 1,
    day_of_month: ["monthly", "quarterly", "semi_annual", "yearly"].includes(String(values.frequency)) ? num(values.day_of_month) : null,
    day_of_week: values.frequency === "weekly" ? num(values.day_of_week) : null,
    start_date: dateString(values.start_date),
    end_date: values.end_mode === "date" ? dateString(values.end_date) : null,
    max_occurrences: values.end_mode === "count" ? num(values.max_occurrences) : null,
    lines: lines.map((line) =>
      type === "expense_voucher"
        ? {
            account_id: Number(line.account_id),
            description: trim(line.description),
            amount: num(line.amount),
            vat_group_id: line.vat_group_id ? Number(line.vat_group_id) : null,
          }
        : {
            account_id: Number(line.account_id),
            description: trim(line.description),
            debit: num(line.debit) ?? 0,
            credit: num(line.credit) ?? 0,
            party_type: line.party_type || null,
            party_id: line.party_id || null,
          },
    ),
  };
}

/** @param {(key: string, values?: Record<string, unknown>) => string} t @param {Record<string, unknown>} record */
export function frequencyText(t, record) {
  const interval = Number(record.interval ?? 1);
  const frequency = String(record.frequency ?? "");
  const day = Number(record.day_of_month) === -1 ? t("lastDay") : String(record.day_of_month ?? "");
  const weekday = t(`weekday_${record.day_of_week ?? 1}`);
  // "Monthly on day 1" reads better than "Every 1 month(s) on day 1".
  if (interval === 1) return t(`freqOne_${frequency}`, { day: frequency === "weekly" ? weekday : day });
  if (frequency === "weekly") return t("freqWeekly", { day: weekday, interval });
  if (frequency === "daily") return t("freqDaily", { interval });
  return t(`freq_${frequency}`, { interval, day });
}
