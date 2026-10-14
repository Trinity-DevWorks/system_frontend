import { tenantApiClient, tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {string} endpoint
 * @param {Record<string, string | number | boolean | undefined | null>} [params]
 */
export async function fetchPartyLedger(endpoint, params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `${endpoint}?${qs}` : endpoint);
  const page = parsePaginatedList(payload, params);
  const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : null;
  const summaries = Array.isArray(payload?.summaries) ? payload.summaries : [];
  return { ...page, summary, summaries };
}

/**
 * @param {string} header
 * @param {string} fallback
 */
function filenameFromDisposition(header, fallback) {
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return star[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] || fallback;
}

/**
 * @param {Blob} blob
 */
async function errorFromBlob(blob) {
  const text = await blob.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  const error = new Error("Request failed");
  error.details = {
    code: typeof payload?.code === "string" ? payload.code : undefined,
    errors: payload?.errors,
  };
  return error;
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Download the full filtered statement as xlsx or pdf.
 * @param {string} endpoint
 * @param {Record<string, string | number | boolean | undefined | null>} params
 */
export async function downloadPartyLedger(endpoint, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  const format = params.format === "pdf" ? "pdf" : "xlsx";
  try {
    const response = await tenantApiClient.get(qs ? `${endpoint}?${qs}` : endpoint, {
      responseType: "blob",
      timeout: 120_000,
    });
    const blob = response.data;
    if (blob instanceof Blob && String(blob.type).includes("json")) {
      throw await errorFromBlob(blob);
    }
    const filename = filenameFromDisposition(
      String(response.headers?.["content-disposition"] ?? ""),
      `ledger.${format}`,
    );
    saveBlob(blob, filename);
  } catch (error) {
    const details = error && typeof error === "object" && "details" in error ? error.details : null;
    if (details instanceof Blob) {
      throw await errorFromBlob(details);
    }
    throw error;
  }
}
