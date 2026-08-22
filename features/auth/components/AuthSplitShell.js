"use client";

import AuthCanvasBackground from "./AuthCanvasBackground";
import { useThemeMode } from "@/shared/components/AntdAppProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  GlobalOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { markUiLocaleOverride } from "@/lib/ui-locale-preference";
import { Button, Dropdown, Space, theme } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

const shellIconBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

/**
 * Shared auth chrome (login / forgot / reset) matching the previous hero + card layout.
 */
export default function AuthSplitShell({
  isCentral,
  tenantLabel,
  children,
}) {
  const t = useTranslations("Login");
  const tShell = useTranslations("Shell");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { setColorMode, colorMode, resolvedColorMode } = useThemeMode();
  const { token } = theme.useToken();
  const isDark = resolvedColorMode === "dark";

  const languageMenuItems = useMemo(
    () =>
      routing.locales.map((loc) => ({
        key: loc,
        label: loc === "en" ? t("languageEn") : t("languageAr"),
        disabled: loc === locale,
      })),
    [locale, t],
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
        label: t("switchToLightTheme"),
        disabled: colorMode === "light",
        icon: <SunOutlined />,
      },
      {
        key: "dark",
        label: t("switchToDarkTheme"),
        disabled: colorMode === "dark",
        icon: <MoonOutlined />,
      },
    ],
    [colorMode, t, tShell],
  );

  const currentThemeLabel = useMemo(() => {
    if (colorMode === "system") {
      return tShell("themeSystem");
    }
    return colorMode === "dark"
      ? t("switchToDarkTheme")
      : t("switchToLightTheme");
  }, [colorMode, t, tShell]);

  const themeIcon = isDark ? <MoonOutlined /> : <SunOutlined />;
  const displayName = isCentral ? t("leftBadgeCentral") : tenantLabel;

  return (
    <div className="login-page relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <AuthCanvasBackground
        isDark={isDark}
        className="pointer-events-none fixed inset-0 z-0"
      />

      <div className="login-anim-in absolute end-4 top-4 z-20 sm:end-6 sm:top-6">
        <Space size={8} wrap={false} className="items-center">
          <Dropdown
            menu={{ items: languageMenuItems, onClick: onLanguageMenuClick }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Button
              type="default"
              className={shellIconBtnClass}
              aria-label={t("changeLanguage")}
              title={t("changeLanguage")}
            >
              <GlobalOutlined style={{ color: token.colorTextSecondary }} />
            </Button>
          </Dropdown>
          <Dropdown
            menu={{
              items: themeMenuItems,
              onClick: ({ key }) => setColorMode(key),
            }}
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
        </Space>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-8 px-4 py-16 md:grid-cols-[1fr_1.22fr] md:py-8">
        <div className="login-anim-in hidden md:block">
          <div className="space-y-6">
            <h1 className="m-0 text-4xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              {t.rich("heroWelcome", {
                tenant: displayName,
                highlight: (chunks) => (
                  <span className="login-hero-name">{chunks}</span>
                ),
              })}
            </h1>
            <div className="login-brand-wordmark" dir="ltr" lang="en">
              <div className="login-brand-wordmark-row">
                <span className="login-brand-mark" aria-hidden>
                  <span />
                  <span />
                </span>
                <span className="login-brand-mena">{t("brandMena")}</span>
                <span className="login-brand-solutions">{t("brandSolutions")}</span>
              </div>
              <span className="login-brand-wordmark-rule" aria-hidden />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-gray-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-2">
                <span className="login-hero-dot" aria-hidden />
                {t("heroFeatureRealtime")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="login-hero-dot" aria-hidden />
                {t("heroFeatureAnalytics")}
              </span>
            </div>
          </div>
        </div>

        <div className="login-card-enter login-form-card relative z-10 w-full overflow-hidden rounded-2xl bg-[var(--ant-color-bg-container)] px-8 py-6 shadow-xl dark:shadow-black/40 md:ms-8 sm:px-9 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
