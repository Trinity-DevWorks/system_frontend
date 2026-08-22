/**
 * Persists last create save intent (keep / new / close) to localStorage after a successful create.
 *
 * Used by:
 * - drawer/hooks/useItemDrawerMutations.js
 * (Intent keys/constants are read in ItemDrawer.js via itemDrawerConstants.js.)
 */

import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { ITEM_CREATE_SAVE_INTENT_EVENT, ITEM_CREATE_SAVE_INTENT_KEY } from "./itemDrawerConstants";

/**
 * @param {"keep" | "new" | "close"} intent
 */
export function persistItemDrawerSaveIntent(intent) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ITEM_CREATE_SAVE_INTENT_KEY, intent);
  } catch {
    /* ignore */
  }
  notifyPersistedSaveIntent(ITEM_CREATE_SAVE_INTENT_EVENT);
}
