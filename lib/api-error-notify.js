/**
 * Best-effort extraction of backend error code from normalized API errors.
 * @param {unknown} error
 * @returns {string | null}
 */
export function getApiErrorCode(error) {
  if (!error || typeof error !== "object") return null;
  const details = "details" in error ? error.details : undefined;
  if (details && typeof details === "object" && typeof details.code === "string") {
    const code = details.code.trim();
    return code || null;
  }
  return null;
}

/**
 * Resolve a localized API error message by error code with fallback.
 * @param {(key: string) => string} tErrors `useTranslations("ApiErrors")`
 * @param {unknown} error
 * @returns {string}
 */
export function getLocalizedApiErrorMessage(tErrors, error) {
  const code = getApiErrorCode(error);
  if (code) {
    const key = `codes.${code}`;
    try {
      return tErrors(key);
    } catch {
      // Unknown code key, continue to fallback.
    }
  }
  try {
    return tErrors("unexpected");
  } catch {
    if (error instanceof Error && error.message) return error.message;
    return "Request failed.";
  }
}
