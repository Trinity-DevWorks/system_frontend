/**
 * API JSON contract (see system/docs/adr/0002-api-response-contract.md).
 *
 * Success: { status: true, success: true, message, data, meta? }
 * Error:   { status: false, success: false, message, code?, errors? }
 *
 * Backend `ApiResponse` sends both `status` and `success` (bool). Either flag is accepted here.
 */

/** @param {unknown} body */
export function isApiSuccess(body) {
  if (typeof body !== "object" || body === null) return false;
  if ("status" in body && body.status === true) return true;
  if ("success" in body && body.success === true) return true;
  return false;
}

/** @param {unknown} body */
export function isApiError(body) {
  if (typeof body !== "object" || body === null) return false;
  if ("status" in body && body.status === false) return true;
  if ("success" in body && body.success === false) return true;
  return false;
}

/**
 * @param {unknown} body
 * @returns {{ message: string, errors?: Record<string, string[]> }}
 */
export function getApiErrorDisplay(body) {
  if (!isApiError(body) || typeof body.message !== "string") {
    return { message: "Request failed." };
  }
  const errors =
    "errors" in body &&
    typeof body.errors === "object" &&
    body.errors !== null
      ? /** @type {Record<string, string[]>} */ (body.errors)
      : undefined;
  return { message: body.message, errors };
}
