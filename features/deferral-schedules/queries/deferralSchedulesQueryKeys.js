export const DEFERRAL_SCHEDULES_LIST_QUERY_KEY = /** @type {const} */ ([
  "tenant",
  "deferral-schedules",
]);

/** @param {string | number} id */
export function deferralScheduleDetailQueryKey(id) {
  return [...DEFERRAL_SCHEDULES_LIST_QUERY_KEY, String(id)];
}
