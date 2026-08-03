"use client";

import { useThemeMode } from "@/components/AntdAppProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  BellOutlined,
  GlobalOutlined,
  LogoutOutlined,
  MoonOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Badge, Button, Dropdown, Input, Layout, Space, theme } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { markUiLocaleOverride } from "@/lib/ui-locale-preference";
import AppBreadcrumb from "./AppBreadcrumb";

const { Header } = Layout;
const SHELL_CHROME_HEIGHT_PX = 56;
const shellIconBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg shadow-sm";
const profileIconBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-full shadow-sm";

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

  const profileMenuItems = useMemo(
    () => [
      {
        key: "profile",
        label: tShell("profileShow"),
        icon: <UserOutlined />,
      },
      {
        key: "logout",
        label: logoutLabel,
        danger: true,
        icon: <LogoutOutlined />,
      },
    ],
    [logoutLabel, tShell],
  );

  const onProfileMenuClick = ({ key }) => {
    if (key === "logout") {
      onLogout?.();
    }
  };

  const notificationMenuItems = useMemo(
    () => [
      {
        key: "empty",
        label: tShell("notificationsEmpty"),
        disabled: true,
      },
    ],
    [tShell],
  );

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
        <Dropdown
          menu={{ items: notificationMenuItems }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button
            type="default"
            className={shellIconBtnClass}
            aria-label={tShell("notifications")}
            title={tShell("notifications")}
          >
            <Badge dot>
              <BellOutlined style={{ color: token.colorTextSecondary }} />
            </Badge>
          </Button>
        </Dropdown>
        <Dropdown
          menu={{ items: profileMenuItems, onClick: onProfileMenuClick }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button
            type="default"
            className={profileIconBtnClass}
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
