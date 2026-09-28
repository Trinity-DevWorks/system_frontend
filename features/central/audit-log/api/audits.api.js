import { downloadAuditsCsv, fetchAudit, fetchAudits } from "@/features/audit-log";
import { centralApiClient, centralRequest } from "@/lib/axios";

/**
 * Central `public.audits` (same response shape as the tenant audit log).
 * @param {Record<string, string | number | undefined>} [params]
 */
export function fetchCentralAudits(params = {}) {
  return fetchAudits(params, centralRequest);
}

/** @param {number | string} auditId */
export function fetchCentralAudit(auditId) {
  return fetchAudit(auditId, centralRequest);
}

/** @param {Record<string, string>} [params] */
export function downloadCentralAuditsCsv(params = {}) {
  return downloadAuditsCsv(params, centralApiClient);
}
