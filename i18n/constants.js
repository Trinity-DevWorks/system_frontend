/** Locales that use right-to-left layout (HTML `dir`, Ant Design `direction`, etc.). */
export const RTL_LOCALES = ["ar"];

export function isRtlLocale(locale) {
  return RTL_LOCALES.includes(locale);
}
