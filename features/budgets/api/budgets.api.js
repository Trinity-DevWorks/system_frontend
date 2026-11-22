import { downloadPartyLedger } from "@/features/party-ledger/api/partyLedger.api";
import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

export const BUDGETS_QUERY_KEY = /** @type {const} */ (["tenant", "budgets"]);

/** @param {string} id */
export const budgetDetailQueryKey = (id) => [
  ...BUDGETS_QUERY_KEY,
  "detail",
  String(id),
];

/** @param {string} id */
export const budgetGridQueryKey = (id) => [
  ...BUDGETS_QUERY_KEY,
  "grid",
  String(id),
];

/** @param {Record<string, string | number | boolean | undefined | null>} [params] */
export function fetchBudgets(params = {}) {
  return fetchPaginatedResource("budgets", params);
}

/** @param {string} id */
export function fetchBudget(id) {
  return tenantRequest("GET", `budgets/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createBudget(body) {
  return tenantRequest("POST", "budgets", body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function updateBudget(id, body) {
  return tenantRequest("PUT", `budgets/${id}`, body);
}

/** @param {string} id */
export function deleteBudget(id) {
  return tenantRequest("DELETE", `budgets/${id}`);
}

/** Accounts × months, with group roll-ups. @param {string} id */
export function fetchBudgetGrid(id) {
  return tenantRequest("GET", `budgets/${id}/grid`);
}

/** @param {string} id @param {{ account_id: number; period_month: string; amount: number | string }[]} lines */
export function saveBudgetLines(id, lines) {
  return tenantRequest("PUT", `budgets/${id}/lines`, { lines });
}

/** @param {string} id @param {{ account_id: number; amount: number | string }} body */
export function spreadBudget(id, body) {
  return tenantRequest("POST", `budgets/${id}/spread`, body);
}

/** @param {string} id @param {{ year: number; percent?: number | null }} body */
export function copyBudgetActuals(id, body) {
  return tenantRequest("POST", `budgets/${id}/copy-actuals`, body);
}

/** @param {string} id @param {{ source_budget_id: string; percent?: number | null }} body */
export function copyBudgetFrom(id, body) {
  return tenantRequest("POST", `budgets/${id}/copy-from`, body);
}

/** @param {string} id */
export const approveBudget = (id) =>
  tenantRequest("POST", `budgets/${id}/approve`);
/** @param {string} id */
export const reviseBudget = (id) =>
  tenantRequest("POST", `budgets/${id}/revise`);
/** @param {string} id */
export const archiveBudget = (id) =>
  tenantRequest("POST", `budgets/${id}/archive`);

/**
 * Downloads the budget as Excel: only the accounts that have an amount,
 * or with `template` every account (an empty sheet to fill and import).
 * @param {string} id @param {{ template?: boolean }} [options]
 */
export function downloadBudget(id, { template = false } = {}) {
  return downloadPartyLedger(`budgets/${id}/export`, {
    format: "xlsx",
    ...(template ? { template: 1 } : {}),
  });
}

/** @param {string} id @param {File} file */
export function importBudget(id, file) {
  const body = new FormData();
  body.append("file", file);
  return tenantRequest("POST", `budgets/${id}/import`, body);
}

/**
 * Over-budget warnings for a saved document. `posted` = it is already in the ledger.
 * Never throws: a failed check must not stop posting.
 *
 * @param {"expense_voucher" | "purchase_invoice" | "journal_entry"} source
 * @param {string} id
 * @param {boolean} [posted]
 * @returns {Promise<Record<string, any>[]>}
 */
export async function fetchBudgetWarnings(source, id, posted = false) {
  try {
    const data = await tenantRequest("POST", "budgets/check", {
      source,
      id,
      posted,
    });
    return Array.isArray(data?.warnings) ? data.warnings : [];
  } catch {
    return [];
  }
}

/** @param {Record<string, string | number | undefined | null>} params */
export function fetchBudgetVsActual(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "") query.set(key, String(value));
  });
  return tenantRequest("GET", `reports/budget-vs-actual?${query}`);
}

/** @param {Record<string, string | number | undefined | null>} params */
export function downloadBudgetVsActual(params) {
  return downloadPartyLedger("reports/budget-vs-actual/export", params);
}
