import { downloadPartyLedger } from "@/features/party-ledger/api/partyLedger.api";
import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {string} endpoint
 * @param {Record<string, string | number | boolean | undefined | null>} [params]
 */
function withQuery(endpoint, params = {}) {
  const qs = toListQuery(params).toString();
  return qs ? `${endpoint}?${qs}` : endpoint;
}

/** Nested chart with rolled-up balances. */
export async function fetchAccountTree() {
  const data = await tenantRequest("GET", withQuery("accounts", { tree: true }));
  return Array.isArray(data) ? data : [];
}

/**
 * Flat account list for pickers.
 * @param {{ search?: string; type?: string; active?: boolean; postable?: boolean; prefix?: string }} [params]
 */
export async function fetchAccounts(params = {}) {
  const data = await tenantRequest("GET", withQuery("accounts", params));
  return Array.isArray(data) ? data : [];
}

/** @param {number | string} id */
export function fetchAccount(id) {
  return tenantRequest("GET", `accounts/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createAccount(body) {
  return tenantRequest("POST", "accounts", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 */
export function updateAccount(id, body) {
  return tenantRequest("PUT", `accounts/${id}`, body);
}

/** @param {number | string} id */
export function deleteAccount(id) {
  return tenantRequest("DELETE", `accounts/${id}`);
}

export async function fetchAccountMappings() {
  const data = await tenantRequest("GET", "account-mappings");
  return Array.isArray(data) ? data : [];
}

/** @param {Record<string, number>} mappings */
export async function updateAccountMappings(mappings) {
  const data = await tenantRequest("PUT", "account-mappings", { mappings });
  return Array.isArray(data) ? data : [];
}

/**
 * @param {{
 *   search?: string;
 *   status?: string;
 *   source_type?: string;
 *   account_id?: number;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchJournalEntries(params = {}) {
  const payload = await tenantRequest("GET", withQuery("journal-entries", params));
  return parsePaginatedList(payload, params);
}

/** @param {string} id */
export function fetchJournalEntry(id) {
  return tenantRequest("GET", `journal-entries/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createJournalEntry(body) {
  return tenantRequest("POST", "journal-entries", body);
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 */
export function updateJournalEntry(id, body) {
  return tenantRequest("PUT", `journal-entries/${id}`, body);
}

/**
 * @param {string} id
 * @param {Array<Record<string, unknown>>} lines
 */
export function replaceJournalEntryLines(id, lines) {
  return tenantRequest("PUT", `journal-entries/${id}/lines`, { lines });
}

/** @param {string} id */
export function postJournalEntry(id) {
  return tenantRequest("POST", `journal-entries/${id}/post`);
}

/** @param {string} id */
export function reverseJournalEntry(id) {
  return tenantRequest("POST", `journal-entries/${id}/reverse`);
}

/** @param {string} id */
export function deleteJournalEntry(id) {
  return tenantRequest("DELETE", `journal-entries/${id}`);
}

/** @param {{ from?: string; to?: string; level?: number; branch_id?: number }} params */
export function fetchTrialBalance(params) {
  return tenantRequest("GET", withQuery("accounting/trial-balance", params));
}

/** @param {{ account_id: number; from?: string; to?: string; branch_id?: number }} params */
export function fetchAccountLedger(params) {
  return tenantRequest("GET", withQuery("accounting/account-ledger", params));
}

/** @param {Record<string, string | number | undefined | null>} params */
export function downloadTrialBalance(params) {
  return downloadPartyLedger("accounting/trial-balance/export", params);
}

/** @param {Record<string, string | number | undefined | null>} params */
export function downloadAccountLedger(params) {
  return downloadPartyLedger("accounting/account-ledger/export", params);
}

/** @param {{ from?: string; to?: string; branch_id?: number; level?: number; compare?: string }} params */
export function fetchIncomeStatement(params) {
  return tenantRequest("GET", withQuery("accounting/income-statement", params));
}

/** @param {Record<string, string | number | undefined | null>} params */
export function downloadIncomeStatement(params) {
  return downloadPartyLedger("accounting/income-statement/export", params);
}

/** @param {{ as_of?: string; compare_as_of?: string; level?: number }} params */
export function fetchBalanceSheet(params) {
  return tenantRequest("GET", withQuery("accounting/balance-sheet", params));
}

/** @param {Record<string, string | number | undefined | null>} params */
export function downloadBalanceSheet(params) {
  return downloadPartyLedger("accounting/balance-sheet/export", params);
}

/** @param {{ from?: string; to?: string }} params */
export function fetchVatReport(params) {
  return tenantRequest("GET", withQuery("accounting/vat-report", params));
}

/** @param {Record<string, string | number | undefined | null>} params */
export function downloadVatReport(params) {
  return downloadPartyLedger("accounting/vat-report/export", params);
}

export function fetchVatSettlements() {
  return tenantRequest("GET", "accounting/vat-settlements");
}

/** @param {string} periodTo */
export function previewVatSettlement(periodTo) {
  return tenantRequest("GET", withQuery("accounting/vat-settlements/preview", { period_to: periodTo }));
}

/** @param {{ period_to: string; entry_date: string }} body */
export function createVatSettlement(body) {
  return tenantRequest("POST", "accounting/vat-settlements", body);
}

/** @param {string} id */
export function reverseVatSettlement(id) {
  return tenantRequest("POST", `accounting/vat-settlements/${id}/reverse`);
}

export function fetchAccountingPeriod() {
  return tenantRequest("GET", "accounting/period");
}

/** @param {{ books_closed_through: string | null }} body */
export function updateAccountingPeriod(body) {
  return tenantRequest("PUT", "accounting/period", body);
}

export function fetchFiscalYears() {
  return tenantRequest("GET", "accounting/fiscal-years");
}

/** @param {{ ends_on: string }} body */
export function closeFiscalYear(body) {
  return tenantRequest("POST", "accounting/fiscal-years/close", body);
}

/** @param {number | string} id */
export function reverseFiscalYear(id) {
  return tenantRequest("POST", `accounting/fiscal-years/${id}/reverse`);
}
