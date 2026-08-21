"use client";

import { centralApi } from "@/API/CentralApiService";
import tenantApiService from "@/API/TenantApiService";
import { isRtlLocale } from "@/i18n/constants";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  clearAllSidebarBookmarks,
  loadSidebarBookmarks,
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
import { hasUiLocaleOverride } from "@/lib/ui-locale-preference";
import { useQueryClient } from "@tanstack/react-query";
import { App, Layout, theme as antdTheme } from "antd";
import AppHeader from "./header/AppHeader";
import AppShellMainContent from "./AppShellMainContent";
import NotificationRealtimeProvider from "./NotificationRealtimeProvider";
import { SidebarCollapseProvider } from "./SidebarCollapseContext";
import AppSidebar from "./sidebar/AppSidebar";
import {
  ROUTES,
  buildMainNavItems,
  findModuleKeyForPath,
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
  const {
    token: { colorBgContainer, colorBgLayout, colorSplit },
  } = antdTheme.useToken();

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

  /** Empty until mount so SSR + first client paint match (localStorage differs from server). */
  const [bookmarks, setBookmarks] = useState([]);
  useEffect(() => {
    queueMicrotask(() => {
      setBookmarks(loadSidebarBookmarks());
    });
  }, []);

  const bookmarkedPaths = useMemo(
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
        const next = prev.some((b) => b.path === path)
          ? prev.filter((b) => b.path !== path)
          : [...prev, { path, label }];
        saveSidebarBookmarks(next);
        return next;
      });
    },
    [menuItems],
  );

  const handleClearBookmarks = useCallback(() => {
    setBookmarks(clearAllSidebarBookmarks());
  }, []);

  const selectedKeys = useMemo(
    () => selectedKeysForPath(pathname, menuItems),
    [menuItems, pathname],
  );

  const routeModuleKey = useMemo(
    () => findModuleKeyForPath(pathname, menuItems),
    [menuItems, pathname],
  );

  const activeModuleKey = routeModuleKey ?? menuItems?.[0]?.key ?? null;

  const handleNavigate = useCallback(
    (path) => {
      router.push(path);
    },
    [router],
  );

  const handleBrandClick = useCallback(() => {
    router.push(ROUTES.overview);
  }, [router]);

  const sidebarLabels = useMemo(
    () => ({
      pinned: t("bookmarks"),
      pages: t("navPages"),
      clearAll: t("clearAllBookmarks"),
      searchResults: t("searchResults"),
      searchPlaceholder: t("searchNavPlaceholder"),
      searchAria: t("searchNavAria"),
      noResults: t("searchNoResults"),
      addBookmark: t("bookmarkAriaAdd"),
      removeBookmark: t("bookmarkAriaRemove"),
      modulesNav: t("modulesNavAria"),
      pagesNav: t("pagesNavAria"),
    }),
    [t],
  );

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
        <SidebarCollapseProvider>
          <Layout hasSider className="h-dvh overflow-hidden">
            <AppSidebar
              navItems={menuItems}
              activeModuleKey={activeModuleKey}
              selectedPath={selectedKeys[0] ?? null}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              bookmarks={bookmarks}
              bookmarkedPaths={bookmarkedPaths}
              onToggleBookmark={handleToggleBookmark}
              onClearBookmarks={handleClearBookmarks}
              onNavigate={handleNavigate}
              brand={workspaceBrand}
              brandLogo={profile.logo}
              onBrandClick={handleBrandClick}
              isRtl={isRtlLocale(locale)}
              labels={sidebarLabels}
            />
            <Layout className="min-h-0 min-w-0 flex-1 overflow-hidden">
              <AppHeader
                colorBgContainer={colorBgContainer}
                colorSplit={colorSplit}
                menuItems={menuItems}
                companyName={workspaceBrand}
                onLogout={handleLogout}
                logoutLabel={t("logout")}
              />
              <Content
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-3"
                style={{ background: colorBgLayout }}
              >
                <AppShellMainContent>{children}</AppShellMainContent>
              </Content>
            </Layout>
          </Layout>
        </SidebarCollapseProvider>
      </NotificationRealtimeProvider>
    </App>
  );
}
