/**
 * Public API of the currencies feature.
 *
 * Code inside `features/currencies/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/currencies/page.js`) imports `pages/CurrenciesPage` directly.
 */

export * from "./api/currencies.api";
export * from "./queries/currenciesQueryKeys";
