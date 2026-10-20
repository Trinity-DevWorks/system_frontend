"use client";

import { SUPPLIERS_LIST_QUERY_KEY, fetchSupplierNames } from "@/features/suppliers";
import { SUPPLIER_LEDGER_QUERY_KEY } from "@/features/supplier-ledger/supplierLedgerConfig";
import { PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, PURCHASE_INVOICES_QUERY_KEY } from "@/features/purchase-invoices/queries/purchaseInvoicesQueryKeys";
import { fetchPurchaseInvoice, fetchPurchaseInvoices } from "@/features/purchase-invoices/api/purchaseInvoices.api";
import { fetchPurchaseInvoiceSupplierSelectorPage } from "@/features/purchase-invoices/api/purchaseInvoiceSelectors.api";
import { STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY } from "@/features/stock/queries/stockQueryKeys";
import {
  applyPurchaseDebitNote,
  createPurchaseDebitNote,
  deletePurchaseDebitNote,
  fetchPurchaseDebitNote,
  fetchPurchaseDebitNoteInvoiceLines,
  fetchPurchaseDebitNotes,
  postPurchaseDebitNote,
  reversePurchaseDebitNote,
  syncPurchaseDebitNoteLines,
  updatePurchaseDebitNote,
} from "./api/purchaseDebitNotes.api";
import { PURCHASE_DEBIT_NOTE_DETAIL_QUERY_PREFIX, PURCHASE_DEBIT_NOTES_QUERY_KEY } from "./queries/purchaseDebitNotesQueryKeys";

export const purchaseDebitNoteConfig = {
  featureId: "purchaseDebitNotes",
  resource: "purchase_debit_notes",
  i18n: "PurchaseDebitNotes",
  tableId: "purchase-debit-notes",
  queryKey: PURCHASE_DEBIT_NOTES_QUERY_KEY,
  detailPrefix: PURCHASE_DEBIT_NOTE_DETAIL_QUERY_PREFIX,
  invoiceQueryKey: PURCHASE_INVOICES_QUERY_KEY,
  invoiceDetailPrefix: PURCHASE_INVOICE_DETAIL_QUERY_PREFIX,
  numberField: "debit_note_number",
  dateField: "debit_date",
  partyField: "supplier_id",
  partyRelation: "supplier",
  invoiceField: "purchase_invoice_id",
  invoiceRelation: "purchase_invoice",
  lineInvoiceField: "purchase_invoice_line_id",
  showRestock: false,
  extraQueryKeys: [PURCHASE_INVOICES_QUERY_KEY, PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, SUPPLIER_LEDGER_QUERY_KEY, STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY],
  api: {
    list: fetchPurchaseDebitNotes,
    fetch: fetchPurchaseDebitNote,
    create: createPurchaseDebitNote,
    update: updatePurchaseDebitNote,
    remove: deletePurchaseDebitNote,
    syncLines: syncPurchaseDebitNoteLines,
    post: postPurchaseDebitNote,
    reverse: reversePurchaseDebitNote,
    apply: applyPurchaseDebitNote,
    invoiceLines: fetchPurchaseDebitNoteInvoiceLines,
    listInvoices: fetchPurchaseInvoices,
    fetchInvoice: fetchPurchaseInvoice,
  },
  party: {
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    fetchNames: fetchSupplierNames,
    fetchPage: fetchPurchaseInvoiceSupplierSelectorPage,
    recentKind: "purchase-debit-note-supplier",
  },
};
