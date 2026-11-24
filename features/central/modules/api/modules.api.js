import { centralRequest } from "@/lib/axios";

/**
 * Module catalog with per-module `tenants_count`.
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function fetchCentralModules() {
  const data = await centralRequest("GET", "modules");
  return Array.isArray(data) ? data : [];
}
