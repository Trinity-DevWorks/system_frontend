/**
 * Public API of the permissions feature.
 *
 * Only API modules and non-component utilities are re-exported here; components
 * and pages are imported by deep path so default exports survive and this barrel
 * cannot introduce a cycle.
 */

export * from "./api/permissions.api";
export * from "./queries/permissionsQueryKeys";
export * from "./utils/permissionsMatrixUtils";
