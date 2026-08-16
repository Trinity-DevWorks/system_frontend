"use client";

import { centralApi } from "@/API/CentralApiService";
import tenantApiService from "@/API/TenantApiService";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  clearAllSidebarBookmarks,
  loadSidebarBookmarks,
  removeSidebarBookmark,
  saveSidebarBookmarks,
} from "@/lib/sidebar-bookmarks";
import { resolveHostMode } from "@/lib/runtime-mode";
import { useCompanyProfile } from "@/lib/company-profile";
import { clearAllSessionTokens } from "@/lib/session";
import { disconnectEcho } from "@/lib/echo";
import { clearActiveBranchId } from "@/lib/active-branch";
import { clearQueryCacheOnAuthChange } from "@/lib/clear-query-cache-on-auth";
import { useTenantModules } from "@/lib/tenant-modules";
import { usePermissions } from "@/lib/permissions";
import { useTenantSettings } from "@/lib/tenant-settings";
import {
  hasUiLocaleOverride,
} from "@/lib/ui-locale-preference";
import { useQueryClient } from "@tanstack/react-query";
import { App, Layout, theme as antdTheme } from "antd";
import AppHeader from "./header/AppHeader";
import ModuleRouteGuard from "./ModuleRouteGuard";
import NotificationRealtimeProvider from "./NotificationRealtimeProvider";
import AppSidebar from "./sidebar/AppSidebar";
import { decorateMenuItemsWithBookmarkStars } from "./sidebar/decorate-menu-bookmark-stars";
import { filterMenuItemsByQuery } from "./sidebar/filter-nav-items";
import {
  ROUTES,
  buildMainNavItems,
  findNavLabelForPath,
  selectedKeysForPath,
} from "./sidebar/main-nav";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Content } = Layout;

export default function AppShell({ children }) {
  const t = useTranslations("Shell");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG, colorSplit },
  } = antdTheme.useToken();

  /** rc-menu generates non-stable IDs during SSR; render Menu only after mount. */
  const [menuMounted, setMenuMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMenuMounted(true));
  }, []);

  const { moduleSet, isError } = useTenantModules();
  const { can: canPermission } = usePermissions();
  const { settings, isReady: settingsReady } = useTenantSettings();
  const { profile } = useCompanyProfile();

  const workspaceBrand = useMemo(() => {
    const name =
      typeof profile.company_name === "string"
        ? profile.company_name.trim()
        : "";
    return name || t("brand");
  }, [profile.company_name, t]);

  /** Apply tenant preferred_language once when user has not overridden UI locale. */
  useEffect(() => {
    if (!settingsReady) return;
    if (hasUiLocaleOverride()) return;
    const preferred = settings.preferredLanguage;
    if (!preferred || preferred === locale) return;
    router.replace(pathname, { locale: preferred });
  }, [settingsReady, settings.preferredLanguage, locale, pathname, router]);

  const effectiveModuleSet = useMemo(() => {
    if (isError) {
      return new Set(["core"]);
    }
    return moduleSet;
  }, [isError, moduleSet]);

  const menuItems = useMemo(
    () =>
      buildMainNavItems(t, {
        moduleSet: effectiveModuleSet,
        can: canPermission,
      }),
    [t, effectiveModuleSet, canPermission],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const displayMenuItems = useMemo(
    () => filterMenuItemsByQuery(menuItems, searchQuery),
    [menuItems, searchQuery],
  );

  /** Empty until mount so SSR + first client paint match (localStorage differs from server). */
  const [bookmarks, setBookmarks] = useState([]);
  useEffect(() => {
    queueMicrotask(() => {
      setBookmarks(loadSidebarBookmarks());
    });
  }, []);

  const bookmarkedPathsSet = useMemo(
    () => new Set(bookmarks.map((b) => b.path)),
    [bookmarks],
  );

  const handleToggleBookmark = useCallback(
    (path) => {
      const label =
        findNavLabelForPath(menuItems, path) ||
        path.split("/").filter(Boolean).pop() ||
        path;
      setBookmarks((prev) => {
        if (prev.some((b) => b.path === path)) {
          const next = prev.filter((b) => b.path !== path);
          saveSidebarBookmarks(next);
          return next;
        }
        const next = [...prev, { path, label }];
        saveSidebarBookmarks(next);
        return next;
      });
    },
    [menuItems],
  );

  const menuItemsWithBookmarkStars = useMemo(
    () =>
      decorateMenuItemsWithBookmarkStars(displayMenuItems, {
        labelSourceItems: menuItems,
        bookmarkedPathsSet,
        onToggleBookmark: handleToggleBookmark,
        addBookmarkAria: t("bookmarkAriaAdd"),
        removeBookmarkAria: t("bookmarkAriaRemove"),
      }),
    [
      displayMenuItems,
      menuItems,
      bookmarkedPathsSet,
      handleToggleBookmark,
      t,
    ],
  );

  const onMenuClick = ({ key, domEvent }) => {
    const el = domEvent?.target;
    if (el instanceof Element && el.closest(".shell-nav-bookmark-star")) {
      return;
    }
    router.push(key);
  };

  const selectedKeys = useMemo(
    () => selectedKeysForPath(pathname, menuItems),
    [menuItems, pathname],
  );

  const handleRemoveBookmark = useCallback((path) => {
    setBookmarks(removeSidebarBookmark(path));
  }, []);

  const handleClearAllBookmarks = useCallback(() => {
    setBookmarks(clearAllSidebarBookmarks());
  }, []);

  const handleBookmarkNavigate = useCallback(
    (path) => {
      router.push(path);
    },
    [router],
  );

  const settingsActive = pathname === ROUTES.settings || pathname.startsWith(`${ROUTES.settings}/`);

  const handleSettings = useCallback(() => {
    router.push(ROUTES.settings);
  }, [router]);

  const handleLogout = async () => {
    const host =
      typeof window !== "undefined" ? window.location.hostname : "";
    const { isCentral } = resolveHostMode(host);

    try {
      if (isCentral) {
        await centralApi.logout().catch(() => {});
      } else {
        await tenantApiService("POST", "auth/logout").catch(() => {});
      }
    } catch {
      /* still clear local session */
    }

    clearAllSessionTokens();
    disconnectEcho();
    clearActiveBranchId();
    clearQueryCacheOnAuthChange(queryClient);

    if (typeof message?.success === "function") {
      message.success(t("loggedOut"));
    }
    router.replace("/login");
  };

  return (
    <App>
      <NotificationRealtimeProvider>
      <Layout className="h-dvh overflow-hidden">
        <AppSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          colorBgContainer={colorBgContainer}
          colorSplit={colorSplit}
          menuMounted={menuMounted}
          selectedKeys={selectedKeys}
          menuItems={menuItemsWithBookmarkStars}
          mainNavItems={menuItems}
          onMenuClick={onMenuClick}
          brand={workspaceBrand}
          brandLogo={profile.logo}
          expandLabel={t("expandSidebar")}
          collapseLabel={t("collapseSidebar")}
          onSettings={handleSettings}
          settingsLabel={t("navSettings")}
          settingsActive={settingsActive}
          onLogout={handleLogout}
          logoutLabel={t("logout")}
          searchPlaceholder={t("searchNavPlaceholder")}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          bookmarks={bookmarks}
          bookmarksTitle={t("bookmarks")}
          removeBookmarkAria={t("removeBookmark")}
          onRemoveBookmark={handleRemoveBookmark}
          onClearAllBookmarks={handleClearAllBookmarks}
          clearAllBookmarksLabel={t("clearAllBookmarks")}
          onBookmarkNavigate={handleBookmarkNavigate}
          currentPath={pathname}
        />
        <Layout className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <AppHeader
            colorBgContainer={colorBgContainer}
            colorSplit={colorSplit}
            menuItems={menuItems}
            onLogout={handleLogout}
            logoutLabel={t("logout")}
          />
          <Content
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-3"
            style={{
              background: colorBgContainer,
              // borderRadius: borderRadiusLG,
            }}
          >
            <div className="app-hide-scrollbar min-h-0 min-w-0 flex-1 overflow-auto">
              <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                <ModuleRouteGuard>{children}</ModuleRouteGuard>
              </div>
            </div>
          </Content>
        </Layout>
      </Layout>
      </NotificationRealtimeProvider>
    </App>
  );
}
