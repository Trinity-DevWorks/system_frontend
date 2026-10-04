import { CUSTOMERS_LIST_QUERY_KEY } from "@/features/customers";
import {
  SALES_INVOICE_CUSTOMER_RECENT_KIND,
  SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  fetchSalesInvoiceCustomerSelectorPage,
} from "@/features/sales-invoices/api/salesInvoiceSelectors.api";

export const CUSTOMER_LEDGER_QUERY_KEY = /** @type {const} */ (["tenant", "customer-ledger"]);

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
  endpointFor: (/** @type {string} */ partyId) => `customers/${partyId}/ledger-entries`,
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
