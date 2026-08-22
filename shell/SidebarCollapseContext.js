"use client";

import { createContext, startTransition, useCallback, useContext, useMemo, useState } from "react";

/** @type {import("react").Context<{ collapsed: boolean; setCollapsed: (next: boolean | ((prev: boolean) => boolean)) => void } | null>} */
const SidebarCollapseContext = createContext(null);

export function SidebarCollapseProvider({ children }) {
  const [collapsed, setCollapsedState] = useState(false);

  const setCollapsed = useCallback((next) => {
    startTransition(() => {
      setCollapsedState((prev) => (typeof next === "function" ? next(prev) : next));
    });
  }, []);

  const value = useMemo(() => ({ collapsed, setCollapsed }), [collapsed, setCollapsed]);

  return <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>;
}

export function useSidebarCollapse() {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) {
    throw new Error("useSidebarCollapse must be used within SidebarCollapseProvider");
  }
  return ctx;
}
