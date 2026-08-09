"use client";

/**
 * Settings workspace chrome: secondary nav and page body.
 * Used by app/[locale]/main/settings/layout.js.
 */

import { theme } from "antd";
import SettingsSecondaryNav from "./SettingsSecondaryNav";

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export default function SettingsWorkspace({ children }) {
  const { token } = theme.useToken();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-1 sm:p-2">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 md:flex-row md:gap-6">
        <SettingsSecondaryNav />
        <div
          className="min-h-0 min-w-0 flex-1 border-t pt-4 md:border-s md:border-t-0 md:ps-6 md:pt-0"
          style={{ borderColor: token.colorBorderSecondary }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
