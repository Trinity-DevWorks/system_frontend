"use client";

import { useThemeMode } from "@/components/AntdAppProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  GlobalOutlined,
  LogoutOutlined,
  MoonOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Input, Layout, Space, theme } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { cloneElement, isValidElement, useMemo } from "react";
import { markUiLocaleOverride } from "@/lib/ui-locale-preference";
import { ROUTES, selectedKeysForPath } from "@/components/shell/sidebar/main-nav";
import AppBreadcrumb from "./AppBreadcrumb";
import NotificationBell from "./NotificationBell";
import HeaderProfileMenuIdentity from "./HeaderProfileMenuIdentity";

const { Header } = Layout;
const SHELL_CHROME_HEIGHT_PX = 56;
const shellIconBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg shadow-sm";
const PROFILE_MENU_LOGOUT_KEY = "logout";

export default function AppHeader({
  colorBgContainer,
  colorSplit,
  menuItems,
  onLogout,
  logoutLabel,
}) {
  const tLogin = useTranslations("Login");
  const tShell = useTranslations("Shell");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { setColorMode, colorMode, resolvedColorMode } = useThemeMode();
  const { token } = theme.useToken();

  const languageMenuItems = useMemo(
    () =>
      routing.locales.map((loc) => ({
        key: loc,
        label: loc === "en" ? tLogin("languageEn") : tLogin("languageAr"),
        disabled: loc === locale,
      })),
    [locale, tLogin],
  );

  const onLanguageMenuClick = ({ key }) => {
    markUiLocaleOverride();
    router.replace(pathname, { locale: key });
  };

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

  const currentThemeLabel = useMemo(() => {
    if (colorMode === "system") {
      return tShell("themeSystem");
    }
    return colorMode === "dark"
      ? tLogin("switchToDarkTheme")
      : tLogin("switchToLightTheme");
  }, [colorMode, tLogin, tShell]);

  const themeIcon = resolvedColorMode === "dark" ? <MoonOutlined /> : <SunOutlined />;

  const onThemeMenuClick = ({ key }) => {
    setColorMode(key);
  };

  // Navigable items use route paths as `key` (same as the sidebar). Selection is
  // longest path-prefix match, so extra profile pages highlight without per-item `if`s.
  const profileMenuItems = useMemo(
    () => [
      {
        key: ROUTES.profile,
        label: tShell("profile"),
        icon: <UserOutlined />,
      },
      {
        key: PROFILE_MENU_LOGOUT_KEY,
        label: logoutLabel,
        danger: true,
        icon: <LogoutOutlined />,
      },
    ],
    [logoutLabel, tShell],
  );

  const profileSelectedKeys = useMemo(
    () => selectedKeysForPath(pathname, profileMenuItems),
    [pathname, profileMenuItems],
  );

  const onProfileMenuClick = ({ key }) => {
    if (key === PROFILE_MENU_LOGOUT_KEY) {
      onLogout?.();
      return;
    }
    if (typeof key === "string" && key.startsWith("/")) {
      router.push(key);
    }
  };

  return (
    <Header
      className="flex shrink-0 items-center gap-3 px-4 py-0 lg:gap-4 lg:px-6"
      style={{
        height: SHELL_CHROME_HEIGHT_PX,
        minHeight: SHELL_CHROME_HEIGHT_PX,
        paddingBlock: 0,
        paddingInline: 20,
        lineHeight: `${SHELL_CHROME_HEIGHT_PX}px`,
        background: colorBgContainer,
        borderBottom: `1px solid ${colorSplit}`,
      }}
    >
      {menuItems?.length ? (
        <div className="flex min-w-0 w-fit max-w-[min(52vw,42rem)] items-center pe-3 lg:pe-4">
          <AppBreadcrumb menuItems={menuItems} />
        </div>
      ) : (
        <div className="min-w-0 w-fit" />
      )}
      <div
        className="hidden h-6 w-px shrink-0 lg:block"
        style={{ backgroundColor: colorSplit }}
        aria-hidden
      />
      <div className="mx-3 hidden flex-1 justify-center lg:flex">
        <div className="w-full max-w-xs xl:max-w-sm">
          <Input
            readOnly
            allowClear={false}
            prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />}
            placeholder={tShell("globalSearchPlaceholder")}
            aria-label={tShell("globalSearchAria")}
            className="h-9"
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <div
          className="me-3 hidden h-6 w-px shrink-0 lg:block"
          style={{ backgroundColor: colorSplit }}
          aria-hidden
        />
        <Space size={8} wrap={false} className="shrink-0 items-center">
        <Dropdown
          menu={{ items: languageMenuItems, onClick: onLanguageMenuClick }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button
            type="default"
            className={shellIconBtnClass}
            aria-label={tLogin("changeLanguage")}
            title={tLogin("changeLanguage")}
          >
            <GlobalOutlined style={{ color: token.colorTextSecondary }} />
          </Button>
        </Dropdown>
        <Dropdown
          menu={{ items: themeMenuItems, onClick: onThemeMenuClick }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button
            type="default"
            className={shellIconBtnClass}
            aria-label={currentThemeLabel}
            title={currentThemeLabel}
          >
            <span style={{ color: token.colorWarning }}>{themeIcon}</span>
          </Button>
        </Dropdown>
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
            <div
              className="w-56 overflow-hidden rounded-lg"
              style={{
                backgroundColor: token.colorBgElevated,
                boxShadow: token.boxShadowSecondary,
              }}
            >
              <HeaderProfileMenuIdentity />
              <div
                style={{ borderTop: `1px solid ${token.colorSplit}` }}
                aria-hidden
              />
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
          <Button
            type="default"
            className={shellIconBtnClass}
            aria-label={tShell("profileMenu")}
            title={tShell("profile")}
          >
            <UserOutlined style={{ color: token.colorTextSecondary }} />
          </Button>
        </Dropdown>
        </Space>
      </div>
    </Header>
  );
}
