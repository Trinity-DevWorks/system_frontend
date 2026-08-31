"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSidebarCollapse } from "@/shell/SidebarCollapseContext";
import { SHELL_PANEL_WIDTH_PX, SHELL_RAIL_WIDTH_PX } from "@/shell/shell-metrics";
import { buildPanelSections } from "@/shell/sidebar/build-panel-sections";
import { pickSearchEnterTarget } from "@/shell/sidebar/filter-nav-items";
import SidebarModuleRail from "@/shell/sidebar/SidebarModuleRail";
import SidebarPagePanel from "@/shell/sidebar/SidebarPagePanel";

const PEEK_CLOSE_DELAY_MS = 140;

/**
 * Dual-rail sidebar: a persistent module rail plus the page panel for the active module.
 *
 * When collapsed only the rail occupies layout space; the panel becomes an overlay that
 * appears on rail click, so opening it never reflows the content tables.
 */
export default function AppSidebar({
  navItems,
  activeModuleKey,
  selectedPath,
  searchQuery,
  onSearchChange,
  bookmarks,
  bookmarkedPaths,
  onToggleBookmark,
  onClearBookmarks,
  onNavigate,
  brand,
  brandLogo,
  onBrandClick,
  isRtl,
  labels,
}) {
  const { collapsed, setCollapsed } = useSidebarCollapse();
  const [peeking, setPeeking] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  /**
   * Module whose pages the panel is showing after a rail click, without navigating.
   * Cleared when the pointer leaves the whole nav without picking a page — the
   * panel then falls back to the route-active module.
   */
  const [previewModuleKey, setPreviewModuleKey] = useState(null);
  const closeTimerRef = useRef(null);
  const navRef = useRef(null);
  const pointerInsideRef = useRef(false);

  /** Search/page rows, not a rail icon — click leaves focus on the icon. */
  const hasPanelFocus = useCallback(
    () =>
      Boolean(
        navRef.current
          ?.querySelector(".shell-panel")
          ?.contains(document.activeElement),
      ),
    [],
  );

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPeek = useCallback(() => {
    cancelClose();
    setPeeking(true);
  }, [cancelClose]);

  const closePeek = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setPeeking(false), PEEK_CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMotionReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  /**
   * Drop a stale peek when the sidebar expands, otherwise re-collapsing would
   * pop the panel open again without the pointer ever entering the nav.
   */
  const [wasCollapsed, setWasCollapsed] = useState(collapsed);
  if (wasCollapsed !== collapsed) {
    setWasCollapsed(collapsed);
    if (peeking) setPeeking(false);
  }

  const { primaryModules, footerModules } = useMemo(() => {
    const primary = [];
    const footer = [];
    for (const item of navItems ?? []) {
      if (!item) continue;
      (item.placement === "footer" ? footer : primary).push(item);
    }
    return { primaryModules: primary, footerModules: footer };
  }, [navItems]);

  /** Preview wins for what the panel renders; the rail keeps highlighting the real module. */
  const panelModuleKey = previewModuleKey ?? activeModuleKey;

  const panelModule = useMemo(
    () => (navItems ?? []).find((item) => item?.key === panelModuleKey) ?? null,
    [navItems, panelModuleKey],
  );

  const { title, sections } = useMemo(
    () =>
      buildPanelSections({
        navItems,
        panelModule,
        searchQuery,
        bookmarks,
        bookmarkedPaths,
        onClearBookmarks,
        labels,
      }),
    [navItems, panelModule, searchQuery, bookmarks, bookmarkedPaths, onClearBookmarks, labels],
  );

  const handleNavigate = useCallback(
    (path) => {
      setPreviewModuleKey(null);
      onNavigate(path);
      setPeeking(false);
    },
    [onNavigate],
  );

  const handleSearchEnter = useCallback(() => {
    const path = pickSearchEnterTarget(sections, searchQuery);
    if (!path) return;
    onSearchChange("");
    handleNavigate(path);
  }, [handleNavigate, onSearchChange, searchQuery, sections]);

  const handleSelectModule = useCallback(
    (navModule) => {
      if (searchQuery.trim()) onSearchChange("");
      setPreviewModuleKey(navModule.key);
      if (collapsed) openPeek();
    },
    [collapsed, onSearchChange, openPeek, searchQuery],
  );

  const handleMouseEnter = useCallback(() => {
    pointerInsideRef.current = true;
    cancelClose();
  }, [cancelClose]);

  /**
   * Keyboard focus outranks the pointer: the panel hides with `visibility: hidden`,
   * so closing it while the search field is focused would strip the field the user
   * is still typing into out of the a11y tree.
   */
  const handleMouseLeave = useCallback(() => {
    pointerInsideRef.current = false;
    if (hasPanelFocus()) return;
    setPreviewModuleKey(null);
    if (collapsed) closePeek();
  }, [collapsed, closePeek, hasPanelFocus]);

  const handleBlurCapture = useCallback(
    (event) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      setPreviewModuleKey(null);
      if (collapsed && !pointerInsideRef.current) closePeek();
    },
    [collapsed, closePeek],
  );

  const className = [
    "shell-nav",
    collapsed ? "is-collapsed" : "",
    collapsed && peeking ? "is-peeking" : "",
    motionReady ? "is-ready" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={navRef}
      className={className}
      style={{
        "--shell-rail-w": `${SHELL_RAIL_WIDTH_PX}px`,
        "--shell-panel-w": `${SHELL_PANEL_WIDTH_PX}px`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlurCapture={handleBlurCapture}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        setPreviewModuleKey(null);
        if (!peeking) return;
        cancelClose();
        setPeeking(false);
        if (hasPanelFocus()) {
          navRef.current
            ?.querySelector(".shell-rail-btn.is-active, .shell-rail-btn")
            ?.focus();
        }
      }}
    >
      <SidebarModuleRail
        modules={primaryModules}
        footerModules={footerModules}
        activeModuleKey={activeModuleKey}
        previewModuleKey={previewModuleKey}
        onSelectModule={handleSelectModule}
        brand={brand}
        brandLogo={brandLogo}
        onBrandClick={() => {
          if (collapsed) {
            setCollapsed(false);
            return;
          }
          onBrandClick();
        }}
        tooltipPlacement={isRtl ? "left" : "right"}
        ariaLabel={labels.modulesNav}
      />
      <SidebarPagePanel
        title={title}
        searchValue={searchQuery}
        onSearchChange={onSearchChange}
        onSearchEnter={handleSearchEnter}
        searchPlaceholder={labels.searchPlaceholder}
        searchAria={labels.searchAria}
        sections={sections}
        emptyLabel={labels.noResults}
        selectedPath={selectedPath}
        onNavigate={handleNavigate}
        onToggleBookmark={onToggleBookmark}
        addBookmarkAria={labels.addBookmark}
        removeBookmarkAria={labels.removeBookmark}
        ariaLabel={labels.pagesNav}
      />
    </div>
  );
}
