import { tenantApiClient } from "@/lib/axios";
import tenantApiService from "@/API/TenantApiService";

/**
 * @param {Record<string, string | number | undefined | null>} params
 * @returns {URLSearchParams}
 */
function toAuditQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    query.set(key, String(value));
  }
  return query;
}

/**
 * @param {{
 *   event?: string;
 *   user_id?: string;
 *   auditable_type?: string;
 *   auditable_id?: string;
 *   tags?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 * @returns {Promise<{
 *   rows: Record<string, unknown>[];
 *   total: number;
 *   currentPage: number;
 *   perPage: number;
 *   from: number | null;
 *   to: number | null;
 * }>}
 */
export async function fetchAudits(params = {}) {
  const qs = toAuditQuery(params).toString();
  const endpoint = qs ? `audits?${qs}` : "audits";
  const payload = await tenantApiService("GET", endpoint);

  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return {
    rows,
    total: Number(payload?.total ?? rows.length) || 0,
    currentPage: Number(payload?.current_page ?? params.page ?? 1) || 1,
    perPage: Number(payload?.per_page ?? params.per_page ?? 25) || 25,
    from: payload?.from != null ? Number(payload.from) : null,
    to: payload?.to != null ? Number(payload.to) : null,
  };
}

/**
 * @param {number|string} auditId
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchAudit(auditId) {
  return tenantApiService("GET", `audits/${auditId}`);
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function saveAuditCsvBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * @param {string | null | undefined} contentDisposition
 * @returns {string | null}
 */
function filenameFromContentDisposition(contentDisposition) {
  if (!contentDisposition) return null;
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].trim());
    } catch {
      return utfMatch[1].trim();
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return plainMatch?.[1]?.trim() || null;
}

/**
 * @param {{
 *   event?: string;
 *   user_id?: string;
 *   auditable_type?: string;
 *   auditable_id?: string;
 *   tags?: string;
 *   from?: string;
 *   to?: string;
 * }} [params]
 */
export async function downloadAuditsCsv(params = {}) {
  const query = toAuditQuery({ ...params, format: "csv" });
  try {
    const res = await tenantApiClient.get(`audits/export?${query.toString()}`, {
      responseType: "blob",
      timeout: 120_000,
    });

    const header = res.headers?.["content-disposition"] ?? res.headers?.["Content-Disposition"];
    const filename = filenameFromContentDisposition(header) || `audits-${Date.now()}.csv`;
    saveAuditCsvBlob(res.data, filename);
  } catch (error) {
    const blob = error?.response?.data;
    if (blob instanceof Blob && blob.type?.includes("application/json")) {
      try {
        const text = await blob.text();
        const json = JSON.parse(text);
        const err = new Error(json?.message || "Request failed");
        err.details = { code: json?.code, errors: json?.errors };
        throw err;
      } catch (parsed) {
        if (parsed?.details) throw parsed;
      }
    }
    throw error;
  }
}
