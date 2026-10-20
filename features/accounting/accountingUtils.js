export const ACCOUNT_TYPE_VALUES = ["asset", "liability", "equity", "revenue", "expense"];

export const NORMAL_BALANCE_VALUES = ["debit", "credit"];

export const JOURNAL_STATUS_VALUES = ["draft", "posted", "reversed"];

export const JOURNAL_SOURCE_TYPES = [
  "manual",
  "sales_invoice",
  "customer_receipt",
  "goods_receipt",
  "purchase_invoice",
  "supplier_payment",
  "stock_adjustment",
  "stock_count",
  "stock_transfer_closure",
  "opening_stock",
  "production",
  "customer_opening_balance",
  "supplier_opening_balance",
  "vat_settlement",
  "year_end_close",
];

/** Source type → FEATURES id whose drawer shows the document. */
export const SOURCE_DOCUMENT_FEATURE = {
  sales_invoice: "salesInvoices",
  customer_receipt: "customerReceipts",
  goods_receipt: "stockGoodsReceipts",
  purchase_invoice: "purchaseInvoices",
  supplier_payment: "supplierPayments",
  stock_adjustment: "stockAdjustments",
  stock_count: "stockStockCounts",
  opening_stock: "stockOpeningStocks",
  production: "stockProductions",
};

/** @param {unknown} status */
export function journalStatusTagColor(status) {
  if (status === "posted") return "green";
  if (status === "reversed") return "red";
  return "default";
}

/** Amounts in 1/10000 so sums of decimal strings stay exact. */
export function amountUnits(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 10000) : 0;
}

/** @param {number} units */
export function unitsToAmount(units) {
  return units / 10000;
}

/**
 * English UI always uses `name`. Arabic UI uses `name_ar` when it is filled.
 *
 * @param {Record<string, unknown> | null | undefined} account
 * @param {string} [locale]
 */
export function accountDisplayName(account, locale = "en") {
  if (locale === "ar") {
    const arabic = String(account?.name_ar ?? account?.account_name_ar ?? "").trim();
    if (arabic) return arabic;
  }
  const english = account?.name ?? account?.account_name;
  return english == null ? "" : String(english);
}

/**
 * @param {Record<string, unknown> | null | undefined} account
 * @param {string} [locale]
 */
export function accountLabel(account, locale = "en") {
  const code = account?.code ?? account?.account_code;
  return [code, accountDisplayName(account, locale)].filter(Boolean).join(" — ");
}
