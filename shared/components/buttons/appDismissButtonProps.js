/**
 * Shared props for dismissive actions (Cancel / Close).
 *
 * Professional ERP hierarchy:
 * - Primary / solid brand → commit (Save, Post, Confirm)
 * - Default / outlined → secondary commit (e.g. Save draft beside Post)
 * - Filled neutral → dismiss (Cancel, Close) — soft bg, never brand or danger
 * - Danger → destructive (Delete, discard)
 *
 * Do not use these props for business “cancel document” actions (cancel PO, etc.).
 */
export const APP_DISMISS_BUTTON_PROPS = Object.freeze({
  variant: "filled",
});
