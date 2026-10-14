import { CUSTOMERS_LIST_QUERY_KEY } from "@/features/customers";
import {
  SALES_INVOICE_CUSTOMER_RECENT_KIND,
  SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  fetchSalesInvoiceCustomerSelectorPage,
} from "@/features/sales-invoices/api/salesInvoiceSelectors.api";
import { tenantRequest } from "@/lib/axios";

export const CUSTOMER_LEDGER_QUERY_KEY = /** @type {const} */ (["tenant", "customer-ledger"]);

/**
 * @param {string} id
 */
async function fetchCustomerLedgerOption(id) {
  const customer = await tenantRequest("GET", `customers/${id}`, null, { params: { section: "summary" } });
  return partyOption(customer, "customer_code");
}

/**
 * @param {unknown} party
 * @param {string} codeField
 */
function partyOption(party, codeField) {
  if (!party || typeof party !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (party);
  if (row.id == null || row.id === "") return null;
  const code = typeof row[codeField] === "string" ? row[codeField].trim() : "";
  const name = String(row.name ?? row.id);
  return {
    value: row.id,
    label: code || name,
    name,
    title: name,
  };
}

export const customerLedgerConfig = {
  i18n: "CustomerLedger",
  selectorI18n: "SalesInvoices",
  tableId: "customer-ledger",
  queryKey: CUSTOMER_LEDGER_QUERY_KEY,
  partyQueryKey: CUSTOMERS_LIST_QUERY_KEY,
  fetchPartyPage: fetchSalesInvoiceCustomerSelectorPage,
  partyQueryParams: SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  partyRecentKind: SALES_INVOICE_CUSTOMER_RECENT_KIND,
  partyPlaceholderKey: "customerPlaceholder",
  partyQueryParam: "customer",
  fetchPartyOption: fetchCustomerLedgerOption,
  endpointFor: (/** @type {string} */ partyId) => `customers/${partyId}/ledger-entries`,
  exportEndpointFor: (/** @type {string} */ partyId) => `customers/${partyId}/ledger-export`,
  typeLabelKey: {
    opening_balance: "typeOpeningBalance",
    invoice: "typeInvoice",
    payment: "typePayment",
  },
  documentFeature: {
    invoice: "salesInvoices",
    payment: "customerReceipts",
  },
};
