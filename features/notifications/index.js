/**
 * Public API of the notifications feature.
 *
 * Only API modules and non-component utilities are re-exported here; components
 * and pages are imported by deep path so default exports survive and this barrel
 * cannot introduce a cycle.
 */

export * from "./api/notifications.api";
export * from "./queries/notificationsQueryKeys";
export * from "./utils/navigateNotificationActionPath";
