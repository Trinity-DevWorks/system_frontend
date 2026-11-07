"use client";

import { CUSTOMERS_LIST_QUERY_KEY, fetchCustomerNames } from "@/features/customers";
import { CUSTOMER_LEDGER_QUERY_KEY } from "@/features/customer-ledger/customerLedgerConfig";
import { SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX, SALES_CREDIT_NOTES_QUERY_KEY } from "@/features/sales-credit-notes/queries/salesCreditNotesQueryKeys";
import {
  SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  fetchSalesInvoiceCustomerSelectorPage,
} from "@/features/sales-invoices/api/salesInvoiceSelectors.api";
import { fetchSalesCreditNote } from "@/features/sales-credit-notes/api/salesCreditNotes.api";
import {
  createCustomerRefund,
  deleteCustomerRefund,
  fetchCustomerRefund,
  fetchCustomerRefundOpenCreditNotes,
  fetchCustomerRefunds,
  postCustomerRefund,
  downloadCustomerRefundPdf,
  reverseCustomerRefund,
  syncCustomerRefundAllocations,
  updateCustomerRefund,
} from "./api/customerRefunds.api";
import { CUSTOMER_REFUND_DETAIL_QUERY_PREFIX, CUSTOMER_REFUNDS_QUERY_KEY } from "./queries/customerRefundsQueryKeys";

export const customerRefundConfig = {
  featureId: "customerRefunds",
  resource: "customer_refunds",
  i18n: "CustomerRefunds",
  tableId: "customer-refunds",
  queryKey: CUSTOMER_REFUNDS_QUERY_KEY,
  detailPrefix: CUSTOMER_REFUND_DETAIL_QUERY_PREFIX,
  invoiceQueryKey: SALES_CREDIT_NOTES_QUERY_KEY,
  invoiceDetailPrefix: SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX,
  numberField: "refund_number",
  dateField: "refund_date",
  partyField: "customer_id",
  partyRelation: "customer",
  invoiceIdField: "sales_credit_note_id",
  documentKey: "customer_refund",
  extraQueryKeys: [CUSTOMER_LEDGER_QUERY_KEY, SALES_CREDIT_NOTES_QUERY_KEY, SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX],
  api: {
    list: fetchCustomerRefunds,
    fetch: fetchCustomerRefund,
    create: createCustomerRefund,
    update: updateCustomerRefund,
    remove: deleteCustomerRefund,
    syncAllocations: syncCustomerRefundAllocations,
    post: postCustomerRefund,
    reverse: reverseCustomerRefund,
    downloadPdf: downloadCustomerRefundPdf,
    openInvoices: (partyId, currencyId) => fetchCustomerRefundOpenCreditNotes({ customerId: partyId, currencyId }),
    fetchInvoice: fetchSalesCreditNote,
  },
  party: {
    queryKey: CUSTOMERS_LIST_QUERY_KEY,
    fetchNames: fetchCustomerNames,
    fetchPage: fetchSalesInvoiceCustomerSelectorPage,
    recentKind: "customer-refund-customer",
    selectorParams: SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  },
};
