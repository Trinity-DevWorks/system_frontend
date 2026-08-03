/**
 * UI locale vs tenant preferred_language.
 * Explicit user choice wins; tenant preference is default only.
 */

const OVERRIDE_KEY = "tenant_ui_locale_override";

/** Mark that the user picked a UI language (header / login switcher). */
export function markUiLocaleOverride() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(OVERRIDE_KEY, "1");
}

/** @returns {boolean} */
export function hasUiLocaleOverride() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(OVERRIDE_KEY) === "1";
}

export function clearUiLocaleOverride() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(OVERRIDE_KEY);
}
