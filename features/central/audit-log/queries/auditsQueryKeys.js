/**
 * Central audit-log cache keys. Entries hold `{ rows, total, ... }` pages keyed
 * by the active filter set, plus single records under `"record"`.
 */

export const CENTRAL_AUDIT_LOG_QUERY_KEY = /** @type {const} */ (["central", "audits"]);

/** @param {Record<string, unknown>} filters */
export function centralAuditLogListQueryKey(filters) {
  return [...CENTRAL_AUDIT_LOG_QUERY_KEY, filters];
}

/** @param {number | string | null} id */
export function centralAuditLogRecordQueryKey(id) {
  return [...CENTRAL_AUDIT_LOG_QUERY_KEY, "record", id];
}
