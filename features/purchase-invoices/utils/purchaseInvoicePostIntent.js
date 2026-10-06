import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";

/** @typedef {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent} PurchaseInvoicePostIntent */

export const PURCHASE_INVOICE_POST_INTENT_KEY = "purchaseInvoiceDrawer:postIntent";
export const PURCHASE_INVOICE_POST_INTENT_EVENT = "purchaseInvoiceDrawer:postIntent:change";

/**
 * @param {PurchaseInvoicePostIntent} intent
 */
export function persistPurchaseInvoicePostIntent(intent) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PURCHASE_INVOICE_POST_INTENT_KEY, intent);
  } catch {
    /* ignore */
  }
  notifyPersistedSaveIntent(PURCHASE_INVOICE_POST_INTENT_EVENT);
}
