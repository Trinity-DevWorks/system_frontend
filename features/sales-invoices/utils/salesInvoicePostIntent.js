import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";

/** @typedef {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent} SalesInvoicePostIntent */

export const SALES_INVOICE_POST_INTENT_KEY = "salesInvoiceDrawer:postIntent";
export const SALES_INVOICE_POST_INTENT_EVENT = "salesInvoiceDrawer:postIntent:change";

/**
 * @param {SalesInvoicePostIntent} intent
 */
export function persistSalesInvoicePostIntent(intent) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SALES_INVOICE_POST_INTENT_KEY, intent);
  } catch {
    /* ignore */
  }
  notifyPersistedSaveIntent(SALES_INVOICE_POST_INTENT_EVENT);
}
