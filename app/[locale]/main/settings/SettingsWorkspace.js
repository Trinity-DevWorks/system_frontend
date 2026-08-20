"use client";

/**
 * Settings workspace chrome: page body only.
 * Used by app/[locale]/main/settings/layout.js.
 *
 * Section navigation lives in the shell sidebar panel (Settings is a rail module),
 * so this no longer renders a secondary nav of its own.
 */

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export default function SettingsWorkspace({ children }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-1 sm:p-2">
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
