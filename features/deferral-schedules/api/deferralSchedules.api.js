import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | boolean | undefined>} [params] */
export function fetchDeferralSchedules(params = {}) {
  return fetchPaginatedResource("deferral-schedules", params);
}

/** @param {string} id */
export function fetchDeferralSchedule(id) {
  return tenantRequest("GET", `deferral-schedules/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createDeferralSchedule(body) {
  return tenantRequest("POST", "deferral-schedules", body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function updateDeferralSchedule(id, body) {
  return tenantRequest("PUT", `deferral-schedules/${id}`, body);
}

/** @param {string} id */
export function deleteDeferralSchedule(id) {
  return tenantRequest("DELETE", `deferral-schedules/${id}`);
}

/** @param {Record<string, unknown>} body */
export function previewDeferralSchedule(body) {
  return tenantRequest("POST", "deferral-schedules/preview", body);
}

/** @param {string} id */
export function activateDeferralSchedule(id) {
  return tenantRequest("POST", `deferral-schedules/${id}/activate`);
}

/** @param {string} id @param {Record<string, unknown>} [body] */
export function postDueDeferralSchedule(id, body = {}) {
  return tenantRequest("POST", `deferral-schedules/${id}/post-due`, body);
}

/** @param {string} scheduleId @param {number | string} lineId */
export function postDeferralLine(scheduleId, lineId) {
  return tenantRequest(
    "POST",
    `deferral-schedules/${scheduleId}/lines/${lineId}/post`,
  );
}

/** @param {string} scheduleId @param {number | string} lineId */
export function reverseDeferralLine(scheduleId, lineId) {
  return tenantRequest(
    "POST",
    `deferral-schedules/${scheduleId}/lines/${lineId}/reverse`,
  );
}

/** @param {string} id */
export function pauseDeferralSchedule(id) {
  return tenantRequest("POST", `deferral-schedules/${id}/pause`);
}

/** @param {string} id */
export function resumeDeferralSchedule(id) {
  return tenantRequest("POST", `deferral-schedules/${id}/resume`);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function rescheduleDeferralSchedule(id, body) {
  return tenantRequest("POST", `deferral-schedules/${id}/reschedule`, body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function recognizeRemainingDeferral(id, body) {
  return tenantRequest(
    "POST",
    `deferral-schedules/${id}/recognize-remaining`,
    body,
  );
}

/** @param {string} id @param {{ reason: string }} body */
export function cancelDeferralSchedule(id, body) {
  return tenantRequest("POST", `deferral-schedules/${id}/cancel`, body);
}

/** Default deferral account per kind, from the account mappings. */
export function fetchDeferralDefaults() {
  return tenantRequest("GET", "deferral-schedules/defaults");
}
