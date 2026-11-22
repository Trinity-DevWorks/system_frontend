/**
 * What kind of business this system runs.
 *
 * Retail: kitchen / restaurant fields (kitchen ticket, send to kitchen, QR menu) are hidden.
 * Set to true to show them again for a restaurant.
 */
export const RESTAURANT_FEATURES = false;

/** Restaurant-only prices (per order type). Hidden in retail. */
export const RESTAURANT_PRICE_FIELDS = ["takeaway_price", "dine_in_price", "delivery_price"];

/** @param {string} field */
export function isShownPriceField(field) {
  return RESTAURANT_FEATURES || !RESTAURANT_PRICE_FIELDS.includes(field);
}
