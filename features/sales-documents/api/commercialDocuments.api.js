import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {string} resource
 */
export function createCommercialApi(resource) {
  return {
    /**
     * @param {Record<string, string | number | boolean | undefined>} [params]
     */
    async list(params = {}) {
      const qs = toListQuery(params).toString();
      const payload = await tenantRequest("GET", qs ? `${resource}?${qs}` : resource);
      return parsePaginatedList(payload, params);
    },
    /** @param {string} id */
    fetch(id) {
      return tenantRequest("GET", `${resource}/${id}`);
    },
    /** @param {Record<string, unknown>} body */
    create(body) {
      return tenantRequest("POST", resource, body);
    },
    /**
     * @param {string} id
     * @param {Record<string, unknown>} body
     */
    update(id, body) {
      return tenantRequest("PUT", `${resource}/${id}`, body);
    },
    /** @param {string} id */
    remove(id) {
      return tenantRequest("DELETE", `${resource}/${id}`);
    },
    /**
     * @param {string} id
     * @param {{ lines: Array<Record<string, unknown>> }} body
     */
    syncLines(id, body) {
      return tenantRequest("PUT", `${resource}/${id}/lines/sync`, body);
    },
    /**
     * @param {string} id
     * @param {string} action
     * @param {Record<string, unknown>} [body]
     */
    action(id, action, body) {
      return tenantRequest("POST", `${resource}/${id}/${action}`, body);
    },
  };
}
