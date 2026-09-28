/**
 * Public API of the central permissions feature.
 *
 * The matrix table and its pure helpers are shared with the tenant
 * `features/permissions` feature; only the API and cache keys are central.
 */

export * from "./api/permissions.api";
export * from "./queries/permissionsQueryKeys";
