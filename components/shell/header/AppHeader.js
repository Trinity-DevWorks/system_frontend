"use client";

import { useThemeMode } from "@/components/AntdAppProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  DownOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Layout, Space } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import AppBreadcrumb from "./AppBreadcrumb";

const { Header } = Layout;

export default function AppHeader({ colorBgContainer, colorSplit, menuItems }) {
  const tLogin = useTranslations("Login");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { setColorMode, colorMode } = useThemeMode();

  const languageMenuItems = useMemo(
    () =>
      routing.locales.map((loc) => ({
        key: loc,
        label: loc === "en" ? tLogin("languageEn") : tLogin("languageAr"),
        disabled: loc === locale,
      })),
    [locale, tLogin],
  );
  const currentLanguageLabel =
    locale === "en" ? tLogin("languageEn") : tLogin("languageAr");

  const onLanguageMenuClick = ({ key }) => {
    router.replace(pathname, { locale: key });
  };

  const themeMenuItems = useMemo(
    () => [
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
    [colorMode, tLogin],
  );

  const currentThemeLabel =
    colorMode === "dark"
      ? tLogin("switchToDarkTheme")
      : tLogin("switchToLightTheme");

  const onThemeMenuClick = ({ key }) => {
    setColorMode(key);
  };

  return (
    <Header
      className="flex min-h-14 items-center gap-4 px-4"
      style={{
        background: colorBgContainer,
        paddingInline: 16,
        borderBottom: `1px solid ${colorSplit}`,
      }}
    >
      {menuItems?.length ? <AppBreadcrumb menuItems={menuItems} /> : null}
      <Space size="small" wrap className="ml-auto shrink-0">
        <Dropdown
          menu={{ items: languageMenuItems, onClick: onLanguageMenuClick }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button
            type="default"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-3 text-sm font-medium text-white hover:border-white/30 hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={tLogin("changeLanguage")}
          >
            <GlobalOutlined />
            <span className="min-w-0">{currentLanguageLabel}</span>
            <DownOutlined className="text-xs" />
          </Button>
        </Dropdown>
        <Dropdown
          menu={{ items: themeMenuItems, onClick: onThemeMenuClick }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button
            type="default"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-3 text-sm font-medium text-white hover:border-white/30 hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={currentThemeLabel}
          >
            {colorMode === "dark" ? <MoonOutlined /> : <SunOutlined />}
            <span className="min-w-0">{currentThemeLabel}</span>
            <DownOutlined className="text-xs" />
          </Button>
        </Dropdown>
      </Space>
    </Header>
  );
}
