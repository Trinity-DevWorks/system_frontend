"use client";

import { centralApi } from "@/API/CentralApiService";
import tenantApiService from "@/API/TenantApiService";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  addSidebarBookmark,
  loadSidebarBookmarks,
  removeSidebarBookmark,
} from "@/lib/sidebar-bookmarks";
import { resolveHostMode } from "@/lib/runtime-mode";
import { clearAllSessionTokens } from "@/lib/session";
import { App, Layout, theme as antdTheme } from "antd";
import AppHeader from "./header/AppHeader";
import AppSidebar from "./sidebar/AppSidebar";
import { filterMenuItemsByQuery } from "./sidebar/filter-nav-items";
import {
  buildMainNavItems,
  findNavLabelForPath,
  selectedKeysForPath,
} from "./sidebar/main-nav";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Content } = Layout;

export default function AppShell({ children }) {
  const t = useTranslations("Shell");
  const router = useRouter();
  const pathname = usePathname();
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

  const menuItems = useMemo(() => buildMainNavItems(t), [t]);

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

  const onMenuClick = ({ key }) => {
    router.push(key);
  };

  const selectedKeys = useMemo(
    () => selectedKeysForPath(pathname, menuItems),
    [menuItems, pathname],
  );

  const bookmarkLabelForCurrent = useMemo(() => {
    return (
      findNavLabelForPath(menuItems, pathname) ||
      pathname.split("/").filter(Boolean).pop() ||
      pathname
    );
  }, [menuItems, pathname]);

  const isCurrentBookmarked = useMemo(
    () => bookmarks.some((b) => b.path === pathname),
    [bookmarks, pathname],
  );

  const handleAddBookmark = useCallback(() => {
    setBookmarks(addSidebarBookmark(pathname, bookmarkLabelForCurrent));
  }, [bookmarkLabelForCurrent, pathname]);

  const handleRemoveBookmark = useCallback((path) => {
    setBookmarks(removeSidebarBookmark(path));
  }, []);

  const handleBookmarkNavigate = useCallback(
    (path) => {
      router.push(path);
    },
    [router],
  );

  const handleLogout = async () => {
    clearAllSessionTokens();

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
      /* session already cleared */
    }

    if (typeof message?.success === "function") {
      message.success(t("loggedOut"));
    }
    router.replace("/login");
  };

  return (
    <App>
      <Layout className="h-dvh overflow-hidden">
        <AppSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          colorBgContainer={colorBgContainer}
          colorSplit={colorSplit}
          menuMounted={menuMounted}
          selectedKeys={selectedKeys}
          menuItems={displayMenuItems}
          mainNavItems={menuItems}
          onMenuClick={onMenuClick}
          brand={t("brand")}
          expandLabel={t("expandSidebar")}
          collapseLabel={t("collapseSidebar")}
          onLogout={handleLogout}
          logoutLabel={t("logout")}
          searchPlaceholder={t("searchNavPlaceholder")}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          bookmarks={bookmarks}
          bookmarksTitle={t("bookmarks")}
          addBookmarkLabel={t("addBookmark")}
          removeBookmarkAria={t("removeBookmark")}
          onAddBookmark={handleAddBookmark}
          onRemoveBookmark={handleRemoveBookmark}
          onBookmarkNavigate={handleBookmarkNavigate}
          isCurrentBookmarked={isCurrentBookmarked}
          currentPath={pathname}
        />
        <Layout className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <AppHeader
            colorBgContainer={colorBgContainer}
            colorSplit={colorSplit}
            menuItems={menuItems}
          />
          <Content
            className="m-2 flex min-h-0 flex-1 flex-col overflow-hidden p-2"
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <div className="app-hide-scrollbar min-h-0 min-w-0 flex-1 overflow-auto">
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </App>
  );
}
