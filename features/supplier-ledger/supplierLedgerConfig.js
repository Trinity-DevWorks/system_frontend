import {
  PURCHASE_INVOICE_SUPPLIER_RECENT_KIND,
  fetchPurchaseInvoiceSupplierSelectorPage,
} from "@/features/purchase-invoices/api/purchaseInvoiceSelectors.api";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers";

export const SUPPLIER_LEDGER_QUERY_KEY = /** @type {const} */ (["tenant", "supplier-ledger"]);

export const supplierLedgerConfig = {
  i18n: "SupplierLedger",
  selectorI18n: "PurchaseInvoices",
  tableId: "supplier-ledger",
  queryKey: SUPPLIER_LEDGER_QUERY_KEY,
  partyQueryKey: SUPPLIERS_LIST_QUERY_KEY,
  fetchPartyPage: fetchPurchaseInvoiceSupplierSelectorPage,
  partyRecentKind: PURCHASE_INVOICE_SUPPLIER_RECENT_KIND,
  partyPlaceholderKey: "supplierPlaceholder",
  endpointFor: (/** @type {string} */ partyId) => `suppliers/${partyId}/ledger-entries`,
  typeLabelKey: {
    opening_balance: "typeOpeningBalance",
    purchase_invoice: "typePurchaseInvoice",
    payment: "typePayment",
  },
  documentFeature: {
    purchase_invoice: "purchaseInvoices",
    payment: "supplierPayments",
  },
};
