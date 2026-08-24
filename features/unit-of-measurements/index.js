/**
 * Public API of the unit-of-measurements feature.
 *
 * Code inside `features/unit-of-measurements/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/unit-of-measurements/page.js`) imports `pages/UnitOfMeasurementsPage` directly.
 */

export * from "./api/unitOfMeasurements.api";
export * from "./queries/unitOfMeasurementsQueryKeys";
