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
  "opening_stock",
  "production",
  "customer_opening_balance",
  "supplier_opening_balance",
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
 * @param {Record<string, unknown>} account
 */
export function accountLabel(account) {
  return [account.code, account.name].filter(Boolean).join(" — ");
}
