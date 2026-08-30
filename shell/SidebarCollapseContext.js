"use client";

import { useLocalPreferenceUserId } from "@/lib/local-preference-user";
import {
  applyDocumentSidebarCollapsed,
  loadSidebarCollapsed,
  saveSidebarCollapsed,
} from "@/lib/sidebar-collapse";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** @type {import("react").Context<{ collapsed: boolean; setCollapsed: (next: boolean | ((prev: boolean) => boolean)) => void } | null>} */
const SidebarCollapseContext = createContext(null);

export function SidebarCollapseProvider({ children, initialCollapsed = false }) {
  const prefsUserId = useLocalPreferenceUserId();
  const [collapsed, setCollapsedState] = useState(Boolean(initialCollapsed));

  useEffect(() => {
    applyDocumentSidebarCollapsed(collapsed);
  }, [collapsed]);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = loadSidebarCollapsed();
      saveSidebarCollapsed(saved);
      setCollapsedState((prev) => (prev === saved ? prev : saved));
    });
  }, [prefsUserId]);

  const setCollapsed = useCallback((next) => {
    startTransition(() => {
      setCollapsedState((prev) => {
        const value = Boolean(typeof next === "function" ? next(prev) : next);
        saveSidebarCollapsed(value);
        return value;
      });
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
