import {
  PURCHASE_INVOICE_SUPPLIER_RECENT_KIND,
  fetchPurchaseInvoiceSupplierSelectorPage,
} from "@/features/purchase-invoices/api/purchaseInvoiceSelectors.api";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers";
import { tenantRequest } from "@/lib/axios";

export const SUPPLIER_LEDGER_QUERY_KEY = /** @type {const} */ (["tenant", "supplier-ledger"]);

/**
 * @param {string} id
 */
async function fetchSupplierLedgerOption(id) {
  const supplier = await tenantRequest("GET", `suppliers/${id}`, null, { params: { section: "summary" } });
  if (!supplier || typeof supplier !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (supplier);
  if (row.id == null || row.id === "") return null;
  const code = typeof row.supplier_code === "string" ? row.supplier_code.trim() : "";
  const name = String(row.name ?? row.id);
  return { value: row.id, label: code || name, name, title: name };
}

export const supplierLedgerConfig = {
  i18n: "SupplierLedger",
  selectorI18n: "PurchaseInvoices",
  tableId: "supplier-ledger",
  queryKey: SUPPLIER_LEDGER_QUERY_KEY,
  partyQueryKey: SUPPLIERS_LIST_QUERY_KEY,
  fetchPartyPage: fetchPurchaseInvoiceSupplierSelectorPage,
  partyRecentKind: PURCHASE_INVOICE_SUPPLIER_RECENT_KIND,
  partyPlaceholderKey: "supplierPlaceholder",
  partyQueryParam: "supplier",
  fetchPartyOption: fetchSupplierLedgerOption,
  endpointFor: (/** @type {string} */ partyId) => `suppliers/${partyId}/ledger-entries`,
  exportEndpointFor: (/** @type {string} */ partyId) => `suppliers/${partyId}/ledger-export`,
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
