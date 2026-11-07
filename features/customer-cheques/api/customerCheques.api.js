import { tenantRequest } from "@/lib/axios";

/**
 * Cheques received from customers (paginated).
 * @param {{ status?: string; search?: string; page?: number; per_page?: number }} [params]
 */
export async function fetchCustomerCheques(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") qs.set(key, String(value));
  }
  const query = qs.toString();
  return tenantRequest("GET", query ? `customer-cheques?${query}` : "customer-cheques");
}

/**
 * The cheque cleared into a bank account.
 * @param {string} id
 * @param {{ cash_bank_account_id: number; date?: string }} body
 */
export function clearCustomerCheque(id, body) {
  return tenantRequest("POST", `customer-cheques/${id}/clear`, body);
}

/**
 * The cheque bounced: its receipt is reversed and the invoice is open again.
 * @param {string} id
 * @param {{ date?: string }} [body]
 */
export function bounceCustomerCheque(id, body = {}) {
  return tenantRequest("POST", `customer-cheques/${id}/bounce`, body);
}
