"use client";

import { useThemeMode } from "@/components/AntdAppProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Layout, Space, Tooltip } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import AppBreadcrumb from "./AppBreadcrumb";

const { Header } = Layout;

export default function AppHeader({ colorBgContainer, colorSplit, menuItems }) {
  const tLogin = useTranslations("Login");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { toggleColorMode, colorMode } = useThemeMode();

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
    router.replace(pathname, { locale: key });
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
            type="text"
            icon={<GlobalOutlined />}
            aria-label={tLogin("changeLanguage")}
          />
        </Dropdown>
        <Tooltip
          title={
            colorMode === "dark"
              ? tLogin("switchToLightTheme")
              : tLogin("switchToDarkTheme")
          }
        >
          <Button
            type="text"
            icon={colorMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleColorMode}
            aria-label={
              colorMode === "dark"
                ? tLogin("switchToLightTheme")
                : tLogin("switchToDarkTheme")
            }
          />
        </Tooltip>
      </Space>
    </Header>
  );
}
