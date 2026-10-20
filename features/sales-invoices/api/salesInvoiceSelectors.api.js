import { fetchCustomers } from "@/features/customers/index";
import { fetchItemsForInvoice } from "@/features/items/index";
import { SERVER_SEARCH_PAGE_SIZE } from "@/shared/components/selects/ServerSearchSelect";
import { mapSalesInvoiceCustomerOption, mapSalesInvoiceItemOption } from "../utils/salesInvoiceDrawerUtils";

export const SALES_INVOICE_CUSTOMER_RECENT_KIND = "sales-invoice-customer";
export const SALES_INVOICE_ITEM_RECENT_KIND = "sales-invoice-item";

export const SALES_INVOICE_CUSTOMER_SELECTOR_PARAMS = { exclude_blacklisted: true };
export const SALES_INVOICE_ITEM_SELECTOR_PARAMS = { context: "sale" };

/**
 * @param {{ search?: string; page?: number }} args
 */
export async function fetchSalesInvoiceCustomerSelectorPage({ search = "", page = 1 } = {}) {
  const result = await fetchCustomers({
    search: search || undefined,
    page,
    per_page: SERVER_SEARCH_PAGE_SIZE,
    exclude_blacklisted: true,
  });
  return {
    rows: (result.rows ?? []).map(mapSalesInvoiceCustomerOption).filter(Boolean),
    total: Number(result.total) || 0,
  };
}

/**
 * @param {{ search?: string; page?: number }} args
 */
export async function fetchSalesInvoiceItemSelectorPage({ search = "", page = 1 } = {}) {
  const result = await fetchItemsForInvoice({
    context: "sale",
    search: search || undefined,
    page,
    per_page: SERVER_SEARCH_PAGE_SIZE,
  });
  return {
    rows: (result.rows ?? []).map(mapSalesInvoiceItemOption).filter(Boolean),
    total: Number(result.total) || 0,
  };
}
