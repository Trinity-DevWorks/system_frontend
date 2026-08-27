/**
 * Public API of the payment-methods feature.
 *
 * Code inside `features/payment-methods/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/payment-methods/page.js`) imports `pages/PaymentMethodsPage` directly.
 */

export * from "./api/paymentMethods.api";
export * from "./queries/paymentMethodsQueryKeys";
