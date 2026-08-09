"use client";

import BrandLogo from "@/components/brand/BrandLogo";
import { useThemeMode } from "@/components/AntdAppProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  GlobalOutlined,
  HomeOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { markUiLocaleOverride } from "@/lib/ui-locale-preference";
import { Button, Dropdown, Space, Typography, theme } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

const shellIconBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

/**
 * Shared two-column auth chrome (login / forgot / reset).
 */
export default function AuthSplitShell({
  isCentral,
  tenantLabel,
  leadText,
  children,
}) {
  const t = useTranslations("Login");
  const tShell = useTranslations("Shell");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { setColorMode, colorMode, resolvedColorMode } = useThemeMode();
  const { token } = theme.useToken();
  const year = new Date().getFullYear();

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

  const themeIcon =
    resolvedColorMode === "dark" ? <MoonOutlined /> : <SunOutlined />;

  return (
    <div className="login-page flex min-h-0 flex-1 flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/90 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="login-aside-bg relative flex w-full shrink-0 flex-col justify-between overflow-hidden bg-slate-950 px-6 py-10 text-white sm:px-8 lg:w-[min(58%,760px)] lg:border-e lg:border-white/10 lg:px-10 lg:py-14 xl:px-14">
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="login-orb-breathe pointer-events-none absolute -end-28 top-0 z-[1] size-[22rem] rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="login-orb-breathe-slow pointer-events-none absolute -bottom-20 -start-20 z-[1] size-[18rem] rounded-full bg-cyan-400/12 blur-3xl" />
          <div
            className="login-edge-shimmer pointer-events-none absolute start-0 top-0 z-[1] h-full w-px bg-gradient-to-b from-emerald-400/50 via-white/10 to-transparent"
            aria-hidden
          />

          <div className="relative z-[1] mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col lg:mx-0">
            <header className="login-anim-in border-b border-white/10 pb-8">
              <div className="flex items-start gap-4">
                <div className="login-brand-tile flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/15 to-white/5 shadow-lg shadow-black/30 ring-1 ring-white/20 backdrop-blur-sm">
                  <BrandLogo size={40} priority />
                </div>
                <div className="min-w-0">
                  <Typography.Title level={2} className="!mb-1 !mt-0 !leading-none">
                    <span
                      className="inline-flex flex-wrap items-center gap-2 sm:gap-2.5"
                      dir="ltr"
                      lang="en"
                    >
                      <span className="inline-block bg-gradient-to-br from-white via-emerald-100 to-emerald-300/85 bg-clip-text text-[1.625rem] font-semibold uppercase tracking-[0.22em] text-transparent drop-shadow-[0_1px_12px_rgba(16,185,129,0.35)] sm:text-[2.125rem] sm:tracking-[0.26em]">
                        {t("posBrand")}
                      </span>
                    </span>
                  </Typography.Title>
                  <Typography.Text className="!text-[13px] !font-medium !uppercase !tracking-[0.18em] !text-emerald-200/90">
                    {t("posSubtitle")}
                  </Typography.Text>
                </div>
              </div>
            </header>

            <div className="mt-8 flex flex-1 flex-col">
              <div className="login-anim-in login-anim-delay-1 mb-5 flex flex-wrap items-center gap-2">
                <span
                  title={
                    isCentral ? t("leftCentralDisplayName") : tenantLabel
                  }
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ring-1 ${
                    isCentral
                      ? "bg-sky-500/20 text-sky-100 ring-sky-400/35"
                      : "bg-emerald-500/20 text-emerald-100 ring-emerald-400/35"
                  }`}
                >
                  {isCentral ? (
                    <TeamOutlined className="shrink-0 text-[12px] opacity-90" aria-hidden />
                  ) : (
                    <HomeOutlined className="shrink-0 text-[12px] opacity-90" aria-hidden />
                  )}
                  <span className="min-w-0 truncate">
                    {isCentral ? t("leftBadgeCentral") : tenantLabel}
                  </span>
                </span>
              </div>

              <Typography.Paragraph className="login-anim-in login-anim-delay-2 !mb-0 !text-[15px] !leading-relaxed !text-slate-200/95">
                {leadText}
              </Typography.Paragraph>
            </div>
          </div>

          <footer className="login-anim-in login-anim-delay-6 relative z-[1] mx-auto mt-10 w-full max-w-2xl shrink-0 border-t border-white/10 pt-6 lg:mx-0 lg:mt-auto">
            <p className="mb-0 text-[12px] leading-relaxed text-slate-500">
              {t("leftFooterCopyright", { year })}
            </p>
          </footer>
        </aside>

        <main className="relative flex min-h-0 flex-1 flex-col">
          <div className="login-main-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)] dark:bg-[radial-gradient(ellipse_70%_45%_at_50%_-15%,rgba(52,211,153,0.08),transparent)]" />
          <div className="login-anim-in login-anim-delay-1 absolute end-4 top-4 z-10 rounded-xl border border-slate-200/70 bg-white/75 p-1.5 shadow-sm shadow-slate-900/5 backdrop-blur-md transition-shadow duration-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/75 dark:shadow-black/30 dark:hover:shadow-lg sm:end-6 sm:top-6">
            <Space size={8} wrap={false} className="pointer-events-auto shrink-0 items-center">
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

          <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-20 sm:px-8 lg:py-12">
            <div className="login-card-enter login-form-card relative w-full max-w-[min(100%,540px)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-8 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.03] backdrop-blur-md dark:border-white/[0.12] dark:bg-zinc-900/90 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)] dark:ring-white/[0.04] sm:p-10">
              <div
                className="login-top-accent-glow pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 opacity-95"
                aria-hidden
              />
              <div className="relative pt-1">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
