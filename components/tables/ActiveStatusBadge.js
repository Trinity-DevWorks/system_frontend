"use client";

const BADGE_BASE = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

/**
 * @param {boolean} active
 */
export function getActiveStatusBadgeClass(active) {
  return active ? "app-status-on" : "app-status-off";
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
