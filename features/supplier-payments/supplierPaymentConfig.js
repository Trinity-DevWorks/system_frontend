"use client";

import { SUPPLIERS_LIST_QUERY_KEY, fetchSupplierNames } from "@/features/suppliers";
import { PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, PURCHASE_INVOICES_QUERY_KEY } from "@/features/purchase-invoices/queries/purchaseInvoicesQueryKeys";
import { fetchPurchaseInvoiceSupplierSelectorPage } from "@/features/purchase-invoices/api/purchaseInvoiceSelectors.api";
import {
  createSupplierPayment,
  deleteSupplierPayment,
  fetchSupplierPayment,
  fetchSupplierPaymentOpenInvoices,
  fetchSupplierPayments,
  postSupplierPayment,
  reverseSupplierPayment,
  syncSupplierPaymentAllocations,
  updateSupplierPayment,
} from "./api/supplierPayments.api";
import {
  SUPPLIER_PAYMENT_DETAIL_QUERY_PREFIX,
  SUPPLIER_PAYMENTS_QUERY_KEY,
} from "./queries/supplierPaymentsQueryKeys";

export const supplierPaymentConfig = {
  featureId: "supplierPayments",
  resource: "supplier_payments",
  i18n: "SupplierPayments",
  tableId: "supplier-payments",
  queryKey: SUPPLIER_PAYMENTS_QUERY_KEY,
  detailPrefix: SUPPLIER_PAYMENT_DETAIL_QUERY_PREFIX,
  invoiceQueryKey: PURCHASE_INVOICES_QUERY_KEY,
  invoiceDetailPrefix: PURCHASE_INVOICE_DETAIL_QUERY_PREFIX,
  numberField: "payment_number",
  partyField: "supplier_id",
  partyRelation: "supplier",
  invoiceIdField: "purchase_invoice_id",
  documentKey: "supplier_payment",
  api: {
    list: fetchSupplierPayments,
    fetch: fetchSupplierPayment,
    create: createSupplierPayment,
    update: updateSupplierPayment,
    remove: deleteSupplierPayment,
    syncAllocations: syncSupplierPaymentAllocations,
    post: postSupplierPayment,
    reverse: reverseSupplierPayment,
    openInvoices: (partyId, currencyId) =>
      fetchSupplierPaymentOpenInvoices({ supplierId: partyId, currencyId }),
  },
  party: {
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    fetchNames: fetchSupplierNames,
    fetchPage: fetchPurchaseInvoiceSupplierSelectorPage,
    recentKind: "supplier-payment-supplier",
  },
};
