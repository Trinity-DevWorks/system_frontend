import { tenantRequest } from "@/lib/axios";

/**
 * The tenant's plan, limits (null = unlimited), usage and subscription dates.
 * Read-only; plans are managed from the central domain. Needs `subscription,view`.
 *
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchTenantSubscription() {
  return tenantRequest("GET", "tenant/subscription");
}
