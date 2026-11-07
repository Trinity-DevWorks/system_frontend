/**
 * Public API of the delivery-notes feature.
 *
 * Code inside `features/delivery-notes/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/delivery-notes/page.js`) imports `pages/DeliveryNotesPage` directly.
 */

export * from "./api/deliveryNotes.api";
export * from "./queries/deliveryNotesQueryKeys";
