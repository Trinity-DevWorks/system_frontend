/**
 * Public API of the branches feature.
 *
 * Code inside `features/branches/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/branches/page.js`) imports `pages/BranchesPage` directly.
 */

export * from "./api/branches.api";
export * from "./queries/branchesQueryKeys";
