"use client";

const BADGE_BASE = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

/**
 * @param {boolean} active
 */
export function getActiveStatusBadgeClass(active) {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
    : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300";
}

/**
 * @param {{ active: boolean; label: string }} props
 */
export default function ActiveStatusBadge({ active, label }) {
  return (
    <span className={`${BADGE_BASE} ${getActiveStatusBadgeClass(active)}`}>{label}</span>
  );
}

/**
 * Pill badge for boolean active/inactive columns (`statusActive` / `statusInactive` keys).
 *
 * @param {boolean | null | undefined} active
 * @param {(key: string) => string} t
 */
export function renderActiveInactiveStatus(active, t) {
  const isActive = Boolean(active);
  const label = isActive ? t("statusActive") : t("statusInactive");
  return <ActiveStatusBadge active={isActive} label={label} />;
}
