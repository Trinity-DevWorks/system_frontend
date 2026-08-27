"use client";

import { memo } from "react";
import ModuleRouteGuard from "@/shell/ModuleRouteGuard";

/**
 * Memoized main pane — skips React re-renders when only sidebar collapse toggles.
 */
const AppShellMainContent = memo(function AppShellMainContent({ children }) {
  return (
    <div className="app-shell-main-scroll app-hide-scrollbar min-h-0 min-w-0 flex-1 overflow-auto">
      <div className="app-shell-main-inner flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <ModuleRouteGuard>{children}</ModuleRouteGuard>
      </div>
    </div>
  );
});

export default AppShellMainContent;
