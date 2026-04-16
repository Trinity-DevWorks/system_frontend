/**
 * Tenant modules query-key helper.
 * Used to centralize cache key generation for tenant-modules requests.
 */
export function tenantModulesQueryKey(hostname) {
  return ["tenant-modules", hostname];
}
