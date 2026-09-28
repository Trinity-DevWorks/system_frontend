"use client";

import {
  CENTRAL_FEATURES,
  CENTRAL_HOME_PATH,
  CENTRAL_NAV_SECTIONS,
  CENTRAL_ROUTES,
  centralFeatureById,
  centralFeatureForPath,
} from "@/features/central/registry";
import { isRtlLocale } from "@/i18n/constants";
import { usePathname, useRouter } from "@/i18n/navigation";
import { centralRequest } from "@/lib/axios";
import { useCentralPermissions } from "@/lib/central-permissions";
import { clearQueryCacheOnAuthChange } from "@/lib/clear-query-cache-on-auth";
import { GlobalDrawerProvider } from "@/lib/drawer/GlobalDrawerContext";
import { useLocalPreferenceUserId } from "@/lib/local-preference-user";
import { clearAllSessionTokens } from "@/lib/session";
import {
  clearAllSidebarBookmarks,
  loadSidebarBookmarks,
  saveSidebarBookmarks,
} from "@/lib/sidebar-bookmarks";
import CentralDrawerHost from "@/shell/CentralDrawerHost";
import CentralRouteGuard from "@/shell/CentralRouteGuard";
import AppHeader from "@/shell/header/AppHeader";
import CentralBreadcrumb from "@/shell/header/CentralBreadcrumb";
import CentralProfileIdentity, { CentralProfileAvatar } from "@/shell/header/CentralProfileIdentity";
import { SidebarCollapseProvider } from "@/shell/SidebarCollapseContext";
import AppSidebar from "@/shell/sidebar/AppSidebar";
import {
  buildMainNavItems,
  findModuleKeyForPath,
  findNavLabelForPath,
  selectedKeysForPath,
} from "@/shell/sidebar/main-nav";
import { useQueryClient } from "@tanstack/react-query";
import { App, Layout, theme as antdTheme } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const { Content } = Layout;

const CENTRAL_FEATURE_REGISTRY = {
  featureById: centralFeatureById,
  featureForPath: centralFeatureForPath,
};

/**
 * Platform admin shell: same sidebar / header / drawer host as the tenant
 * `AppShell`, without modules, branches, notifications or company settings.
 */
export default function CentralShell({ children, initialCollapsed = false }) {
  const t = useTranslations("CentralShell");
  const tShell = useTranslations("Shell");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const {
    token: { colorBgContainer, colorBgLayout, colorSplit },
  } = antdTheme.useToken();

  const { can } = useCentralPermissions();

  const menuItems = useMemo(
    () =>
      buildMainNavItems(t, {
        sections: CENTRAL_NAV_SECTIONS,
        features: CENTRAL_FEATURES,
        can,
      }),
    [t, can],
  );

  const [searchQuery, setSearchQuery] = useState("");

  const prefsUserId = useLocalPreferenceUserId();

  /** Empty until mount so SSR + first client paint match (localStorage differs from server). */
  const [bookmarks, setBookmarks] = useState([]);
  useEffect(() => {
    queueMicrotask(() => {
      setBookmarks(loadSidebarBookmarks());
    });
  }, [prefsUserId]);

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
    router.push(CENTRAL_HOME_PATH);
  }, [router]);

  const sidebarLabels = useMemo(
    () => ({
      pinned: tShell("bookmarks"),
      pages: tShell("navPages"),
      clearAll: tShell("clearAllBookmarks"),
      searchResults: tShell("searchResults"),
      searchPlaceholder: tShell("searchNavPlaceholder"),
      searchAria: tShell("searchNavAria"),
      noResults: tShell("searchNoResults"),
      addBookmark: tShell("bookmarkAriaAdd"),
      removeBookmark: tShell("bookmarkAriaRemove"),
      modulesNav: tShell("modulesNavAria"),
      pagesNav: tShell("pagesNavAria"),
    }),
    [tShell],
  );

  const handleLogout = async () => {
    await centralRequest("POST", "logout").catch(() => {});

    clearAllSessionTokens();
    clearQueryCacheOnAuthChange(queryClient);

    if (typeof message?.success === "function") {
      message.success(tShell("loggedOut"));
    }
    router.replace("/login");
  };

  return (
    <App>
      <GlobalDrawerProvider registry={CENTRAL_FEATURE_REGISTRY}>
        <SidebarCollapseProvider initialCollapsed={initialCollapsed}>
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
              brand={t("brand")}
              onBrandClick={handleBrandClick}
              isRtl={isRtlLocale(locale)}
              labels={sidebarLabels}
            />
            <Layout className="min-h-0 min-w-0 flex-1 overflow-hidden">
              <AppHeader
                colorBgContainer={colorBgContainer}
                colorSplit={colorSplit}
                menuItems={menuItems}
                onLogout={handleLogout}
                logoutLabel={tShell("logout")}
                actions={null}
                profilePath={CENTRAL_ROUTES.centralProfile}
                identity={<CentralProfileIdentity />}
                avatar={<CentralProfileAvatar size={28} />}
                breadcrumb={<CentralBreadcrumb />}
              />
              <Content
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-3"
                style={{ background: colorBgLayout }}
              >
                <div className="app-shell-main-scroll app-hide-scrollbar min-h-0 min-w-0 flex-1 overflow-auto">
                  <div className="app-shell-main-inner flex h-full min-h-0 min-w-0 flex-1 flex-col">
                    <CentralRouteGuard>{children}</CentralRouteGuard>
                  </div>
                </div>
                <Suspense fallback={null}>
                  <CentralDrawerHost />
                </Suspense>
              </Content>
            </Layout>
          </Layout>
        </SidebarCollapseProvider>
      </GlobalDrawerProvider>
    </App>
  );
}
