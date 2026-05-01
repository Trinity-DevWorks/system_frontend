"use client";

import {
  BookOutlined,
  LeftOutlined,
  LogoutOutlined,
  RightOutlined,
  SearchOutlined,
  StarFilled,
} from "@ant-design/icons";
import { Button, Input, Layout, Menu, Tooltip, theme } from "antd";
import { useMemo, useState } from "react";
import { findNavIconForPath } from "./main-nav";

const { Sider } = Layout;
const SHELL_CHROME_HEIGHT_PX = 56;
const BOOKMARKS_SUBMENU_KEY = "__shell_bookmarks__";

export default function AppSidebar({
  collapsed,
  setCollapsed,
  colorBgContainer,
  colorSplit,
  menuMounted,
  selectedKeys,
  menuItems,
  /** Full nav (unfiltered); used so bookmark rows use the same icons as `buildMainNavItems`. */
  mainNavItems,
  onMenuClick,
  brand,
  expandLabel,
  collapseLabel,
  onLogout,
  logoutLabel,
  searchPlaceholder,
  searchQuery,
  onSearchChange,
  bookmarks,
  bookmarksTitle,
  removeBookmarkAria,
  onRemoveBookmark,
  onClearAllBookmarks,
  clearAllBookmarksLabel,
  onBookmarkNavigate,
  currentPath,
}) {
  const { token } = theme.useToken();
  const [bookmarkOpenKeys, setBookmarkOpenKeys] = useState(() => [BOOKMARKS_SUBMENU_KEY]);

  const bookmarkSelectedKeys = useMemo(() => {
    if (!currentPath) return [];
    let best = "";
    for (const b of bookmarks) {
      const k = b.path;
      if (currentPath === k || currentPath.startsWith(`${k}/`)) {
        if (k.length > best.length) best = k;
      }
    }
    return best ? [best] : [];
  }, [bookmarks, currentPath]);

  const bookmarkMenuItems = useMemo(
    () =>
      bookmarks.map((b) => ({
        key: b.path,
        icon: findNavIconForPath(mainNavItems, b.path) ?? <BookOutlined />,
        label: b.label,
        title: b.label,
        extra: (
          <Button
            type="text"
            size="small"
            icon={<StarFilled className="text-sm" />}
            className="shell-bookmark-row-star !h-7 !min-w-7 shrink-0 !px-0 opacity-80 hover:!opacity-100"
            aria-label={removeBookmarkAria}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveBookmark(b.path);
            }}
          />
        ),
      })),
    [bookmarks, mainNavItems, onRemoveBookmark, removeBookmarkAria],
  );

  const bookmarkNavItems = useMemo(
    () => [
      {
        key: BOOKMARKS_SUBMENU_KEY,
        className: "shell-bookmarks-submenu",
        icon: <BookOutlined />,
        label: (
          <span className="shell-bookmarks-submenu-label flex min-w-0 flex-1 items-center gap-1">
            <span className="min-w-0 flex-1 truncate">{bookmarksTitle}</span>
            <Button
              type="text"
              size="small"
              className="shell-bookmarks-clear !h-5 min-h-0 shrink-0 px-0.5 py-0 leading-none"
              aria-label={clearAllBookmarksLabel}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClearAllBookmarks?.();
              }}
            >
              {clearAllBookmarksLabel}
            </Button>
          </span>
        ),
        children: bookmarkMenuItems,
      },
    ],
    [
      bookmarkMenuItems,
      bookmarksTitle,
      clearAllBookmarksLabel,
      onClearAllBookmarks,
    ],
  );

  const shellBorder = `1px solid ${colorSplit}`;

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      trigger={null}
      width={230}
      collapsedWidth={72}
      style={{
        background: colorBgContainer,
        borderInlineEnd: shellBorder,
      }}
    >
      <div
        className={`flex items-center ${collapsed ? "justify-center px-0" : "gap-2 px-3"}`}
        style={{
          height: SHELL_CHROME_HEIGHT_PX,
          minHeight: SHELL_CHROME_HEIGHT_PX,
          borderBottom: shellBorder,
        }}
      >
        {collapsed ? (
          <Tooltip title={expandLabel} placement="right">
            <Button
              type="default"
              icon={<RightOutlined />}
              onClick={() => setCollapsed((c) => !c)}
              aria-label={expandLabel}
              className="h-9 w-9 shrink-0 rounded-xl"
              style={{ color: token.colorTextSecondary }}
            />
          </Tooltip>
        ) : (
          <>
            <div className="min-w-0 flex-1 leading-tight">
              <div
                className="truncate text-sm font-semibold"
                style={{ color: token.colorText }}
              >
                {brand}
              </div>
            </div>
            <Button
              type="default"
              icon={<LeftOutlined />}
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapseLabel}
              className="ms-auto h-9 w-9 shrink-0 rounded-xl"
              style={{ color: token.colorTextSecondary }}
            />
          </>
        )}
      </div>
      <div
        className="flex flex-col"
        style={{ height: `calc(100dvh - ${SHELL_CHROME_HEIGHT_PX}px)` }}
      >
        {!collapsed ? (
          <div className="shrink-0 px-1.5 pb-1.5 pt-1.5" style={{ borderBottom: shellBorder }}>
            <Input
              allowClear
              size="middle"
              prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="[&_.ant-input]:rounded-lg [&_.ant-input-affix-wrapper]:rounded-lg"
            />
            {bookmarks.length > 0 ? (
              <div
                className="mt-2.5 border-t pt-2"
                style={{ borderColor: token.colorBorderSecondary }}
              >
                <div className="app-hide-scrollbar max-h-48 overflow-y-auto">
                  <Menu
                    mode="inline"
                    inlineIndent={12}
                    openKeys={bookmarkOpenKeys}
                    onOpenChange={setBookmarkOpenKeys}
                    selectedKeys={bookmarkSelectedKeys}
                    items={bookmarkNavItems}
                    triggerSubMenuAction="click"
                    className="shell-main-nav border-none bg-transparent"
                    style={{ background: "transparent", borderInlineEnd: "none" }}
                    onClick={({ key, domEvent }) => {
                      if (key === BOOKMARKS_SUBMENU_KEY) return;
                      const el = domEvent?.target;
                      if (el instanceof Element && el.closest(".shell-bookmark-row-star")) {
                        return;
                      }
                      onBookmarkNavigate(String(key));
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="app-hide-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 pt-1">
          {menuMounted ? (
            <Menu
              mode="inline"
              inlineCollapsed={collapsed}
              inlineIndent={12}
              selectedKeys={selectedKeys}
              items={menuItems}
              className="shell-main-nav border-none bg-transparent"
              classNames={{ popup: { root: "shell-main-nav-popup" } }}
              style={{ background: "transparent", borderInlineEnd: "none" }}
              onClick={onMenuClick}
            />
          ) : (
            <div className="px-3 py-2" aria-hidden>
              {!collapsed ? (
                <>
                  <div className="mb-2 h-7 rounded bg-black/5 dark:bg-white/10" />
                  <div className="mb-2 h-12 rounded bg-black/5 dark:bg-white/10" />
                </>
              ) : null}
              <div className="mb-2 h-8 rounded bg-black/5 dark:bg-white/10" />
              <div className="h-8 rounded bg-black/5 dark:bg-white/10" />
            </div>
          )}
        </div>
        <div className="shrink-0 p-2.5" style={{ borderTop: shellBorder }}>
          <div
            className="flex flex-col gap-1 rounded-xl p-1.5"
            style={{
              background: token.colorFillQuaternary,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            {collapsed ? (
              <Tooltip title={logoutLabel} placement="right">
                <Button
                  type="text"
                  danger
                  icon={<LogoutOutlined />}
                  onClick={onLogout}
                  aria-label={logoutLabel}
                  className="h-9 w-full !justify-center rounded-lg font-medium"
                />
              </Tooltip>
            ) : (
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={onLogout}
                className="h-9 w-full justify-start rounded-lg font-medium"
              >
                {logoutLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Sider>
  );
}
