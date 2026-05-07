/**
 * Map API validation errors (details.errors) onto Ant Design Form fields.
 * @param {import("antd").FormInstance} form
 * @param {unknown} error
 * @returns {boolean} true if field errors were applied
 */
export function applyApiFieldErrors(form, error) {
  const details = error && typeof error === "object" && "details" in error ? error.details : null;
  const errors = details && typeof details === "object" && details.errors ? details.errors : null;
  if (!errors || typeof errors !== "object") return false;
  const fieldErrors = Object.entries(errors).map(([name, messages]) => ({
    name,
    errors: Array.isArray(messages) ? messages.map(String) : [String(messages)],
  }));
  if (!fieldErrors.length) return false;
  form.setFields(fieldErrors);
  return true;
}
