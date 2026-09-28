import { fetchItemsForInvoice } from "@/features/items/index";
import { fetchSuppliers } from "@/features/suppliers/api/suppliers.api";
import { fetchGoodsReceipts } from "@/features/stock/api/goodsReceipts.api";
import { fetchPurchaseOrders } from "@/features/stock/api/purchaseOrders.api";
import { SERVER_SEARCH_PAGE_SIZE } from "@/shared/components/selects/ServerSearchSelect";
import {
  mapPurchaseInvoiceGrnOption,
  mapPurchaseInvoicePoOption,
  mapPurchaseInvoiceItemOption,
  mapPurchaseInvoiceSupplierOption,
} from "../utils/purchaseInvoiceDrawerUtils";

export const PURCHASE_INVOICE_SUPPLIER_RECENT_KIND = "purchase-invoice-supplier";
export const PURCHASE_INVOICE_ITEM_RECENT_KIND = "purchase-invoice-item";

export const PURCHASE_INVOICE_ITEM_SELECTOR_PARAMS = { context: "purchase" };

/**
 * @param {{ search?: string; page?: number }} args
 */
export async function fetchPurchaseInvoiceSupplierSelectorPage({ search = "", page = 1 } = {}) {
  const result = await fetchSuppliers({
    search: search || undefined,
    page,
    per_page: SERVER_SEARCH_PAGE_SIZE,
  });
  return {
    rows: (result.rows ?? []).map(mapPurchaseInvoiceSupplierOption).filter(Boolean),
    total: Number(result.total) || 0,
  };
}

/**
 * @param {{ search?: string; page?: number }} args
 */
export async function fetchPurchaseInvoiceItemSelectorPage({ search = "", page = 1 } = {}) {
  const result = await fetchItemsForInvoice({
    context: "purchase",
    search: search || undefined,
    page,
    per_page: SERVER_SEARCH_PAGE_SIZE,
  });
  return {
    rows: (result.rows ?? []).map(mapPurchaseInvoiceItemOption).filter(Boolean),
    total: Number(result.total) || 0,
  };
}

/**
 * Posted GRNs for the supplier that are not already on another purchase invoice.
 * `invoiceId` keeps the current invoice's own GRN in the list while editing.
 *
 * @param {{ search?: string; page?: number; supplierId?: string | null; invoiceId?: string | null }} args
 */
export async function fetchPurchaseInvoiceGrnSelectorPage({
  search = "",
  page = 1,
  supplierId = null,
  invoiceId = null,
} = {}) {
  if (supplierId == null || supplierId === "") {
    return { rows: [], total: 0 };
  }

  const result = await fetchGoodsReceipts({
    search: search || undefined,
    status: "posted",
    supplier_id: String(supplierId),
    available_for_invoice: true,
    except_purchase_invoice_id: invoiceId ? String(invoiceId) : undefined,
    page,
    per_page: SERVER_SEARCH_PAGE_SIZE,
  });

  return {
    rows: (result.rows ?? []).map(mapPurchaseInvoiceGrnOption).filter(Boolean),
    total: Number(result.total) || 0,
  };
}

/**
 * Confirmed or sent purchase orders for the supplier that have no goods receipt
 * and are not already on another purchase invoice.
 *
 * @param {{ search?: string; page?: number; supplierId?: string | null; invoiceId?: string | null }} args
 */
export async function fetchPurchaseInvoicePoSelectorPage({
  search = "",
  page = 1,
  supplierId = null,
  invoiceId = null,
} = {}) {
  if (supplierId == null || supplierId === "") {
    return { rows: [], total: 0 };
  }

  const result = await fetchPurchaseOrders({
    search: search || undefined,
    supplier_id: String(supplierId),
    available_for_invoice: true,
    except_purchase_invoice_id: invoiceId ? String(invoiceId) : undefined,
    page,
    per_page: SERVER_SEARCH_PAGE_SIZE,
  });

  return {
    rows: (result.rows ?? []).map(mapPurchaseInvoicePoOption).filter(Boolean),
    total: Number(result.total) || 0,
  };
}
