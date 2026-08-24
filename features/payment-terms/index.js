/**
 * Public API of the payment-terms feature.
 *
 * Code inside `features/payment-terms/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/payment-terms/page.js`) imports `pages/PaymentTermsPage` directly.
 */

export * from "./api/paymentTerms.api";
export * from "./queries/paymentTermsQueryKeys";
