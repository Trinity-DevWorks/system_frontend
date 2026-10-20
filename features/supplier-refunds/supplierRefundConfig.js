"use client";

import { SUPPLIERS_LIST_QUERY_KEY, fetchSupplierNames } from "@/features/suppliers";
import { SUPPLIER_LEDGER_QUERY_KEY } from "@/features/supplier-ledger/supplierLedgerConfig";
import { fetchPurchaseInvoiceSupplierSelectorPage } from "@/features/purchase-invoices/api/purchaseInvoiceSelectors.api";
import { PURCHASE_DEBIT_NOTE_DETAIL_QUERY_PREFIX, PURCHASE_DEBIT_NOTES_QUERY_KEY } from "@/features/purchase-debit-notes/queries/purchaseDebitNotesQueryKeys";
import { fetchPurchaseDebitNote } from "@/features/purchase-debit-notes/api/purchaseDebitNotes.api";
import {
  createSupplierRefund,
  deleteSupplierRefund,
  fetchSupplierRefund,
  fetchSupplierRefundOpenDebitNotes,
  fetchSupplierRefunds,
  postSupplierRefund,
  reverseSupplierRefund,
  syncSupplierRefundAllocations,
  updateSupplierRefund,
} from "./api/supplierRefunds.api";
import { SUPPLIER_REFUND_DETAIL_QUERY_PREFIX, SUPPLIER_REFUNDS_QUERY_KEY } from "./queries/supplierRefundsQueryKeys";

export const supplierRefundConfig = {
  featureId: "supplierRefunds",
  resource: "supplier_refunds",
  i18n: "SupplierRefunds",
  tableId: "supplier-refunds",
  queryKey: SUPPLIER_REFUNDS_QUERY_KEY,
  detailPrefix: SUPPLIER_REFUND_DETAIL_QUERY_PREFIX,
  invoiceQueryKey: PURCHASE_DEBIT_NOTES_QUERY_KEY,
  invoiceDetailPrefix: PURCHASE_DEBIT_NOTE_DETAIL_QUERY_PREFIX,
  numberField: "refund_number",
  dateField: "refund_date",
  partyField: "supplier_id",
  partyRelation: "supplier",
  invoiceIdField: "purchase_debit_note_id",
  documentKey: "supplier_refund",
  extraQueryKeys: [SUPPLIER_LEDGER_QUERY_KEY, PURCHASE_DEBIT_NOTES_QUERY_KEY, PURCHASE_DEBIT_NOTE_DETAIL_QUERY_PREFIX],
  api: {
    list: fetchSupplierRefunds,
    fetch: fetchSupplierRefund,
    create: createSupplierRefund,
    update: updateSupplierRefund,
    remove: deleteSupplierRefund,
    syncAllocations: syncSupplierRefundAllocations,
    post: postSupplierRefund,
    reverse: reverseSupplierRefund,
    openInvoices: (partyId, currencyId) => fetchSupplierRefundOpenDebitNotes({ supplierId: partyId, currencyId }),
    fetchInvoice: fetchPurchaseDebitNote,
  },
  party: {
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    fetchNames: fetchSupplierNames,
    fetchPage: fetchPurchaseInvoiceSupplierSelectorPage,
    recentKind: "supplier-refund-supplier",
  },
};
