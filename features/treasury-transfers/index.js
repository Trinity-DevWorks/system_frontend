/**
 * Public API of the treasury-transfers feature.
 *
 * Code inside `features/treasury-transfers/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/treasury-transfers/page.js`) imports `pages/TreasuryTransfersPage` directly.
 */

export * from "./api/treasuryTransfers.api";
export * from "./queries/treasuryTransfersQueryKeys";
