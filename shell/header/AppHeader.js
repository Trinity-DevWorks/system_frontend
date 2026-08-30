"use client";

import { useThemeMode } from "@/shared/components/AntdAppProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  GlobalOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Dropdown, Layout, Tooltip } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { cloneElement, isValidElement, useMemo } from "react";
import { markUiLocaleOverride } from "@/lib/ui-locale-preference";
import { ROUTES } from "@/features/registry";
import { selectedKeysForPath } from "@/shell/sidebar/main-nav";
import { SHELL_CHROME_HEIGHT_PX } from "@/shell/shell-metrics";
import { useSidebarCollapse } from "@/shell/SidebarCollapseContext";
import AppBreadcrumb from "@/shell/header/AppBreadcrumb";
import BranchSwitcher from "@/shell/header/BranchSwitcher";
import HeaderProfileAvatar from "@/shell/header/HeaderProfileAvatar";
import HeaderProfileMenuIdentity from "@/shell/header/HeaderProfileMenuIdentity";
import NotificationBell from "@/shell/header/NotificationBell";

const { Header } = Layout;
const PROFILE_MENU_LOGOUT_KEY = "logout";
const LANGUAGE_SUBMENU_KEY = "__language__";
const THEME_SUBMENU_KEY = "__theme__";

export default function AppHeader({
  colorBgContainer,
  colorSplit,
  menuItems,
  companyName,
  onLogout,
  logoutLabel,
}) {
  const tLogin = useTranslations("Login");
  const tShell = useTranslations("Shell");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed } = useSidebarCollapse();
  const { setColorMode, colorMode, resolvedColorMode } = useThemeMode();

  const languageMenuItems = useMemo(
    () =>
      routing.locales.map((loc) => ({
        key: loc,
        label: loc === "en" ? tLogin("languageEn") : tLogin("languageAr"),
        disabled: loc === locale,
      })),
    [locale, tLogin],
  );

  const themeMenuItems = useMemo(
    () => [
      {
        key: "system",
        label: tShell("themeSystem"),
        disabled: colorMode === "system",
        icon: <SettingOutlined />,
      },
      {
        key: "light",
        label: tLogin("switchToLightTheme"),
        disabled: colorMode === "light",
        icon: <SunOutlined />,
      },
      {
        key: "dark",
        label: tLogin("switchToDarkTheme"),
        disabled: colorMode === "dark",
        icon: <MoonOutlined />,
      },
    ],
    [colorMode, tLogin, tShell],
  );

  /**
   * Language and theme are set-once preferences, so they live in the profile menu
   * rather than holding permanent slots in the top bar.
   *
   * Navigable entries use route paths as `key` (same as the sidebar); selection is a
   * longest path-prefix match so extra profile pages highlight without per-item `if`s.
   */
  const profileMenuItems = useMemo(
    () => [
      {
        key: ROUTES.profile,
        label: tShell("profile"),
        icon: <UserOutlined />,
      },
      { type: "divider" },
      {
        key: LANGUAGE_SUBMENU_KEY,
        label: tLogin("changeLanguage"),
        icon: <GlobalOutlined />,
        children: languageMenuItems,
      },
      {
        key: THEME_SUBMENU_KEY,
        label: tShell("appearance"),
        icon: resolvedColorMode === "dark" ? <MoonOutlined /> : <SunOutlined />,
        children: themeMenuItems,
      },
      { type: "divider" },
      {
        key: PROFILE_MENU_LOGOUT_KEY,
        label: logoutLabel,
        danger: true,
        icon: <LogoutOutlined />,
      },
    ],
    [languageMenuItems, logoutLabel, resolvedColorMode, tLogin, tShell, themeMenuItems],
  );

  const profileSelectedKeys = useMemo(
    () => selectedKeysForPath(pathname, [{ key: ROUTES.profile }]),
    [pathname],
  );

  const localeKeys = useMemo(() => new Set(routing.locales), []);

  const onProfileMenuClick = ({ key }) => {
    if (key === PROFILE_MENU_LOGOUT_KEY) {
      onLogout?.();
      return;
    }
    if (localeKeys.has(key)) {
      markUiLocaleOverride();
      router.replace(pathname, { locale: key });
      return;
    }
    if (key === "system" || key === "light" || key === "dark") {
      setColorMode(key);
      return;
    }
    if (typeof key === "string" && key.startsWith("/")) {
      router.push(key);
    }
  };

  const toggleLabel = collapsed
    ? tShell("expandSidebar")
    : tShell("collapseSidebar");

  return (
    <Header
      className="shell-header"
      style={{
        height: SHELL_CHROME_HEIGHT_PX,
        minHeight: SHELL_CHROME_HEIGHT_PX,
        lineHeight: `${SHELL_CHROME_HEIGHT_PX}px`,
        background: colorBgContainer,
        borderBottom: `1px solid ${colorSplit}`,
      }}
    >
      <Tooltip title={toggleLabel}>
        <button
          type="button"
          className="shell-header-icon-btn"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
        >
          <MenuOutlined />
        </button>
      </Tooltip>

      {menuItems?.length ? (
        <div className="shell-header-breadcrumb">
          <AppBreadcrumb menuItems={menuItems} />
        </div>
      ) : null}

      <div className="shell-header-spacer" />

      <BranchSwitcher companyName={companyName} />
      <NotificationBell />

      <Dropdown
        menu={{
          items: profileMenuItems,
          selectable: true,
          selectedKeys: profileSelectedKeys,
          onClick: onProfileMenuClick,
          style: { boxShadow: "none" },
        }}
        popupRender={(menu) => (
          <div className="shell-profile-popup">
            <HeaderProfileMenuIdentity />
            <div className="shell-profile-popup-divider" aria-hidden />
            {isValidElement(menu)
              ? cloneElement(menu, {
                  style: { boxShadow: "none", background: "transparent" },
                })
              : menu}
          </div>
        )}
        placement="bottomRight"
        trigger={["click"]}
      >
        <button
          type="button"
          className="shell-header-avatar-btn"
          aria-label={tShell("profileMenu")}
          title={tShell("profile")}
        >
          <HeaderProfileAvatar size={28} />
        </button>
      </Dropdown>
    </Header>
  );
}
