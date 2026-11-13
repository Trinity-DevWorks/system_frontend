export const RECURRING_TEMPLATES_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "recurring-templates"]);
export const RECURRING_RUNS_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "recurring-runs"]);

/** @param {string | number} id */
export function recurringTemplateDetailQueryKey(id) {
  return [...RECURRING_TEMPLATES_LIST_QUERY_KEY, String(id)];
}
