"use client";

import { useLocale } from "next-intl";

/** Locales written right-to-left. */
const RTL_LOCALES = new Set(["ar"]);

/**
 * "From → to" arrow that follows the reading direction: "→" in English, "←" in Arabic,
 * where "from" is shown on the right.
 */
export function useForwardArrow() {
  return RTL_LOCALES.has(useLocale()) ? "←" : "→";
}

/**
 * Same arrow for table column builders that are not components (they render in the browser).
 */
export function forwardArrow() {
  if (typeof document === "undefined") return "→";
  return document.documentElement.dir === "rtl" ? "←" : "→";
}
