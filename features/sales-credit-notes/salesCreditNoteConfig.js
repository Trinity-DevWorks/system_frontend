"use client";

import { CUSTOMERS_LIST_QUERY_KEY, fetchCustomerNames } from "@/features/customers";
import { CUSTOMER_LEDGER_QUERY_KEY } from "@/features/customer-ledger/customerLedgerConfig";
import { SALES_INVOICE_DETAIL_QUERY_PREFIX, SALES_INVOICES_QUERY_KEY } from "@/features/sales-invoices/queries/salesInvoicesQueryKeys";
import { fetchSalesInvoice, fetchSalesInvoices } from "@/features/sales-invoices/api/salesInvoices.api";
import {
  SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  fetchSalesInvoiceCustomerSelectorPage,
} from "@/features/sales-invoices/api/salesInvoiceSelectors.api";
import { STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY } from "@/features/stock/queries/stockQueryKeys";
import {
  applySalesCreditNote,
  createSalesCreditNote,
  deleteSalesCreditNote,
  fetchSalesCreditNote,
  fetchSalesCreditNoteInvoiceLines,
  fetchSalesCreditNotes,
  postSalesCreditNote,
  reverseSalesCreditNote,
  syncSalesCreditNoteLines,
  updateSalesCreditNote,
} from "./api/salesCreditNotes.api";
import { SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX, SALES_CREDIT_NOTES_QUERY_KEY } from "./queries/salesCreditNotesQueryKeys";

export const salesCreditNoteConfig = {
  featureId: "salesCreditNotes",
  resource: "sales_credit_notes",
  i18n: "SalesCreditNotes",
  tableId: "sales-credit-notes",
  queryKey: SALES_CREDIT_NOTES_QUERY_KEY,
  detailPrefix: SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX,
  invoiceQueryKey: SALES_INVOICES_QUERY_KEY,
  invoiceDetailPrefix: SALES_INVOICE_DETAIL_QUERY_PREFIX,
  numberField: "credit_note_number",
  dateField: "credit_date",
  partyField: "customer_id",
  partyRelation: "customer",
  invoiceField: "sales_invoice_id",
  invoiceRelation: "sales_invoice",
  lineInvoiceField: "sales_invoice_line_id",
  showRestock: true,
  extraQueryKeys: [SALES_INVOICES_QUERY_KEY, SALES_INVOICE_DETAIL_QUERY_PREFIX, CUSTOMER_LEDGER_QUERY_KEY, STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY],
  api: {
    list: fetchSalesCreditNotes,
    fetch: fetchSalesCreditNote,
    create: createSalesCreditNote,
    update: updateSalesCreditNote,
    remove: deleteSalesCreditNote,
    syncLines: syncSalesCreditNoteLines,
    post: postSalesCreditNote,
    reverse: reverseSalesCreditNote,
    apply: applySalesCreditNote,
    invoiceLines: fetchSalesCreditNoteInvoiceLines,
    listInvoices: fetchSalesInvoices,
    fetchInvoice: fetchSalesInvoice,
  },
  party: {
    queryKey: CUSTOMERS_LIST_QUERY_KEY,
    fetchNames: fetchCustomerNames,
    fetchPage: fetchSalesInvoiceCustomerSelectorPage,
    recentKind: "sales-credit-note-customer",
    selectorParams: SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS,
  },
};
