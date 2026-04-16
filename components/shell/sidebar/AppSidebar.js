"use client";

import {
  BookOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { Button, Input, Layout, Menu, Typography } from "antd";
import { useMemo } from "react";
import { findNavIconForPath } from "./main-nav";

const { Sider } = Layout;

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
  addBookmarkLabel,
  removeBookmarkAria,
  onAddBookmark,
  onRemoveBookmark,
  onBookmarkNavigate,
  isCurrentBookmarked,
  currentPath,
}) {
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
            danger
            className="bookmark-remove h-6 min-w-6 shrink-0 px-0"
            aria-label={removeBookmarkAria}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveBookmark(b.path);
            }}
          >
            ×
          </Button>
        ),
      })),
    [bookmarks, mainNavItems, onRemoveBookmark, removeBookmarkAria],
  );

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      trigger={null}
      width={220}
      collapsedWidth={64}
      style={{ background: colorBgContainer, borderInlineEnd: `1px solid ${colorSplit}` }}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-3">
        {!collapsed && <span className="truncate font-semibold">{brand}</span>}
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? expandLabel : collapseLabel}
        />
      </div>
      <div className="flex h-[calc(100dvh-56px)] flex-col">
        {!collapsed ? (
          <div className="shrink-0 border-b border-black/10 pb-2 dark:border-white/10">
            <div className="mb-2 px-3">
              <Input.Search
                allowClear
                size="small"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            {bookmarks.length > 0 ? (
              <>
                <div className="mb-1 flex items-center justify-between gap-1 px-3">
                  <Typography.Text type="secondary" className="text-xs">
                    <BookOutlined className="mr-1" />
                    {bookmarksTitle}
                  </Typography.Text>
                </div>
                <div className="app-hide-scrollbar mb-2 max-h-28 overflow-y-auto">
                  <Menu
                    mode="inline"
                    selectedKeys={bookmarkSelectedKeys}
                    className="border-none"
                    items={bookmarkMenuItems}
                    onClick={({ key, domEvent }) => {
                      const el = domEvent?.target;
                      if (el instanceof Element && el.closest(".bookmark-remove")) {
                        return;
                      }
                      onBookmarkNavigate(String(key));
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="app-hide-scrollbar min-h-0 flex-1 overflow-y-auto">
          {menuMounted ? (
            <Menu
              mode="inline"
              selectedKeys={selectedKeys}
              items={menuItems}
              className="border-none"
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
        <div className="shrink-0 space-y-1 border-t border-black/10 p-2 dark:border-white/10">
          {!collapsed ? (
            <Button
              type="text"
              icon={<StarOutlined />}
              onClick={onAddBookmark}
              disabled={isCurrentBookmarked}
              className="w-full justify-start"
              size="small"
            >
              {addBookmarkLabel}
            </Button>
          ) : null}
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={onLogout}
            className="w-full justify-start"
          >
            {!collapsed ? logoutLabel : null}
          </Button>
        </div>
      </div>
    </Sider>
  );
}
