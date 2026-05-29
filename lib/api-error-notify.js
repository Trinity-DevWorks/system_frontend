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
 * @param {unknown} error
 * @returns {Record<string, string[]> | null}
 */
export function getApiValidationErrors(error) {
  if (!error || typeof error !== "object") return null;
  const details = "details" in error ? error.details : undefined;
  if (details && typeof details === "object" && details.errors && typeof details.errors === "object") {
    return /** @type {Record<string, string[]>} */ (details.errors);
  }
  return null;
}

/**
 * @param {unknown} error
 */
function isFileSizeRelatedError(error) {
  const code = getApiErrorCode(error);
  if (code === "ATTACHMENT_FILE_TOO_LARGE") return true;

  const validationErrors = getApiValidationErrors(error);
  const fileErrors = validationErrors?.file;
  if (Array.isArray(fileErrors) && fileErrors.length > 0) {
    return fileErrors.some((msg) => /large|max|size|uploaded|15\s*mb/i.test(String(msg)));
  }

  const message = error instanceof Error ? error.message : "";
  return /post data is too large|payload too large|entity too large|exceeds the maximum|file may not be greater/i.test(
    message,
  );
}

/**
 * Localized upload error for attachment panels (size limits + API codes).
 * @param {(key: string) => string} tAttachments drawer/module translations
 * @param {(key: string) => string} tErrors `useTranslations("ApiErrors")`
 * @param {unknown} error
 * @returns {string}
 */
export function getAttachmentUploadErrorMessage(tAttachments, tErrors, error) {
  if (isFileSizeRelatedError(error)) {
    return tAttachments("attachmentsFileTooLarge");
  }
  return getLocalizedApiErrorMessage(tErrors, error) || tAttachments("attachmentsUploadError");
}

/**
 * Resolve a localized API error message by error code with fallback.
 * @param {(key: string) => string} tErrors `useTranslations("ApiErrors")`
 * @param {unknown} error
 * @returns {string}
 */
export function getLocalizedApiErrorMessage(tErrors, error) {
  const validationErrors = getApiValidationErrors(error);
  if (validationErrors) {
    const fieldMessages = Object.values(validationErrors)
      .flat()
      .filter((m) => typeof m === "string" && m.trim());
    if (fieldMessages.length > 0) {
      return fieldMessages[0];
    }
  }

  if (error instanceof Error) {
    const msg = error.message?.trim();
    if (msg && msg !== "Request failed." && msg !== "Request failed") {
      return msg;
    }
  }

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
