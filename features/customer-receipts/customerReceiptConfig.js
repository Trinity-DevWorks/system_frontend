"use client";

import { CUSTOMERS_LIST_QUERY_KEY, fetchCustomerNames } from "@/features/customers";
import { SALES_INVOICE_DETAIL_QUERY_PREFIX, SALES_INVOICES_QUERY_KEY } from "@/features/sales-invoices/queries/salesInvoicesQueryKeys";
import {
  SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  fetchSalesInvoiceCustomerSelectorPage,
} from "@/features/sales-invoices/api/salesInvoiceSelectors.api";
import {
  createCustomerReceipt,
  deleteCustomerReceipt,
  fetchCustomerReceipt,
  fetchCustomerReceiptOpenInvoices,
  fetchCustomerReceipts,
  postCustomerReceipt,
  reverseCustomerReceipt,
  syncCustomerReceiptAllocations,
  updateCustomerReceipt,
} from "./api/customerReceipts.api";
import {
  CUSTOMER_RECEIPT_DETAIL_QUERY_PREFIX,
  CUSTOMER_RECEIPTS_QUERY_KEY,
} from "./queries/customerReceiptsQueryKeys";

export const customerReceiptConfig = {
  featureId: "customerReceipts",
  resource: "customer_receipts",
  i18n: "CustomerReceipts",
  tableId: "customer-receipts",
  queryKey: CUSTOMER_RECEIPTS_QUERY_KEY,
  detailPrefix: CUSTOMER_RECEIPT_DETAIL_QUERY_PREFIX,
  invoiceQueryKey: SALES_INVOICES_QUERY_KEY,
  invoiceDetailPrefix: SALES_INVOICE_DETAIL_QUERY_PREFIX,
  numberField: "receipt_number",
  partyField: "customer_id",
  partyRelation: "customer",
  invoiceIdField: "sales_invoice_id",
  documentKey: "customer_receipt",
  api: {
    list: fetchCustomerReceipts,
    fetch: fetchCustomerReceipt,
    create: createCustomerReceipt,
    update: updateCustomerReceipt,
    remove: deleteCustomerReceipt,
    syncAllocations: syncCustomerReceiptAllocations,
    post: postCustomerReceipt,
    reverse: reverseCustomerReceipt,
    openInvoices: (partyId, currencyId) =>
      fetchCustomerReceiptOpenInvoices({ customerId: partyId, currencyId }),
  },
  party: {
    queryKey: CUSTOMERS_LIST_QUERY_KEY,
    fetchNames: fetchCustomerNames,
    fetchPage: fetchSalesInvoiceCustomerSelectorPage,
    recentKind: "customer-receipt-customer",
    selectorParams: SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  },
};
