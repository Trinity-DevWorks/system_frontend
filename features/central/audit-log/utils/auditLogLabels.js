/**
 * Event + auditable type labels for the central audit log.
 */

/** @type {readonly string[]} */
export const CENTRAL_AUDIT_EVENT_VALUES = Object.freeze([
  "created",
  "updated",
  "deleted",
  "login",
  "login_failed",
  "logout",
  "modules_updated",
  "export",
]);

/** Central morph aliases (`AppServiceProvider` morph map). */
/** @type {readonly string[]} */
export const CENTRAL_AUDIT_AUDITABLE_TYPE_VALUES = Object.freeze([
  "tenant",
  "user",
  "central_role",
  "central_permission",
]);

/**
 * @param {(key: string, values?: Record<string, string>) => string} t
 * @param {string | null | undefined} event
 */
export function getCentralAuditEventLabel(t, event) {
  if (!event) return "\u2014";
  if (CENTRAL_AUDIT_EVENT_VALUES.includes(event)) {
    return t(`event_${event}`);
  }
  return String(event);
}

/**
 * @param {(key: string, values?: Record<string, string>) => string} t
 * @param {string | null | undefined} type
 */
export function getCentralAuditableTypeLabel(t, type) {
  if (!type) return "\u2014";
  if (CENTRAL_AUDIT_AUDITABLE_TYPE_VALUES.includes(type)) {
    return t(`auditable_${type}`);
  }
  return String(type);
}
