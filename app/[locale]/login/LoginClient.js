"use client";

import centralApiService from "@/API/CentralApiService";
import tenantApiService from "@/API/TenantApiService";
import { useThemeMode } from "@/components/AntdAppProvider";
import { usePathname, useRouter, Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { resolveHostMode } from "@/lib/runtime-mode";
import { setSessionToken } from "@/lib/session";
import { tenantModulesQueryKey } from "@/lib/tenant-modules";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { consumePendingAuthErrorCode } from "@/lib/pending-auth-error";
import {
  ArrowRightOutlined,
  GlobalOutlined,
  HomeOutlined,
  InboxOutlined,
  LineChartOutlined,
  LockOutlined,
  MailOutlined,
  MoonOutlined,
  SettingOutlined,
  ShopOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Divider,
  Dropdown,
  Form,
  Input,
  Space,
  Typography,
  theme,
} from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const shellIconBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

function LoginFormInner({ initialHost }) {
  const t = useTranslations("Login");
  const tShell = useTranslations("Shell");
  const tApiErrors = useTranslations("ApiErrors");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { setColorMode, colorMode, resolvedColorMode } = useThemeMode();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const mode = useMemo(
    () => resolveHostMode(initialHost),
    [initialHost],
  );
  const isCentralLogin = mode.isCentral;
  const tenantLabel = mode.tenantSlug
    ? mode.tenantSlug.charAt(0).toUpperCase() + mode.tenantSlug.slice(1)
    : "Your";

  useEffect(() => {
    const code = consumePendingAuthErrorCode();
    if (!code) return;
    const key = `codes.${code}`;
    try {
      if (typeof tApiErrors.has === "function" && !tApiErrors.has(key)) return;
      message.error(tApiErrors(key));
    } catch {
      // Unknown code — skip toast.
    }
  }, [message, tApiErrors]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = isCentralLogin
        ? await centralApiService("POST", "login", { email, password })
        : await tenantApiService("POST", "auth/login", { email, password });

      const bearerToken = response?.access_token ?? response?.token;
      if (bearerToken) {
        setSessionToken(
          isCentralLogin ? "central" : "tenant",
          bearerToken,
        );

        if (!isCentralLogin) {
          try {
            const assigned = await tenantApiService(
              "GET",
              "tenant/assigned-modules",
            );
            queryClient.setQueryData(
              tenantModulesQueryKey(window.location.hostname),
              assigned,
            );
          } catch {
            /* optional prefetch */
          }
        }

        return response;
      }
      throw new Error(t("error"));
    },
    onSuccess: () => {
      router.replace(isCentralLogin ? "/central" : "/main/overview");
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("error"));
    },
  });

  const onFinish = (values) => {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        name: issue.path,
        errors: [issue.message],
      }));
      form.setFields(fieldErrors);
      return;
    }

    loginMutation.mutate(parsed.data);
  };

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

  const onThemeMenuClick = ({ key }) => {
    setColorMode(key);
  };

  const year = new Date().getFullYear();

  const tenantFeatures = useMemo(
    () => [
      {
        key: "realtime",
        icon: <LineChartOutlined className="text-lg text-emerald-300" aria-hidden />,
        title: t("leftFeatureRealtimeTitle"),
        body: t("leftFeatureRealtimeBody"),
      },
      {
        key: "inventory",
        icon: <InboxOutlined className="text-lg text-emerald-300" aria-hidden />,
        title: t("leftFeatureInventoryTitle"),
        body: t("leftFeatureInventoryBody"),
      },
      {
        key: "customer",
        icon: <UserOutlined className="text-lg text-emerald-300" aria-hidden />,
        title: t("leftFeatureCustomerTitle"),
        body: t("leftFeatureCustomerBody"),
      },
    ],
    [t],
  );

  const featureAnimDelays = [
    "login-anim-delay-3",
    "login-anim-delay-4",
    "login-anim-delay-5",
  ];

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
                <div className="login-brand-tile flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/15 to-white/5 shadow-lg shadow-black/30 ring-1 ring-white/20 backdrop-blur-sm">
                  <ShopOutlined className="text-[26px] text-emerald-200" aria-hidden />
                </div>
                <div className="min-w-0">
                  <Typography.Title
                    level={2}
                    className="!mb-1 !mt-0 !leading-none"
                  >
                    <span
                      className="inline-flex flex-wrap items-center gap-2 sm:gap-2.5"
                      dir="ltr"
                      lang="en"
                    >
                      <span className="inline-block bg-gradient-to-br from-white via-emerald-100 to-emerald-300/85 bg-clip-text text-[1.625rem] font-semibold uppercase tracking-[0.22em] text-transparent drop-shadow-[0_1px_12px_rgba(16,185,129,0.35)] sm:text-[2.125rem] sm:tracking-[0.26em]">
                        {t("posBrandMena")}
                      </span>
                      <span className="inline-flex items-center rounded-lg bg-gradient-to-br from-white to-emerald-50 px-2 py-1 text-lg font-black uppercase tracking-[0.06em] text-emerald-950 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.85)] ring-[1.5px] ring-white/40 sm:rounded-xl sm:px-2.5 sm:py-1 sm:text-xl">
                        {t("posBrandPos")}
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
                    isCentralLogin
                      ? t("leftCentralDisplayName")
                      : tenantLabel
                  }
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ring-1 ${
                    isCentralLogin
                      ? "bg-sky-500/20 text-sky-100 ring-sky-400/35"
                      : "bg-emerald-500/20 text-emerald-100 ring-emerald-400/35"
                  }`}
                >
                  {isCentralLogin ? (
                    <TeamOutlined className="shrink-0 text-[12px] opacity-90" aria-hidden />
                  ) : (
                    <HomeOutlined className="shrink-0 text-[12px] opacity-90" aria-hidden />
                  )}
                  <span className="min-w-0 truncate">
                    {isCentralLogin ? t("leftBadgeCentral") : tenantLabel}
                  </span>
                </span>
              </div>

              <Typography.Paragraph className="login-anim-in login-anim-delay-2 !mb-0 !text-[15px] !leading-relaxed !text-slate-200/95">
                {isCentralLogin ? t("leftCentralLead") : t("leftMarketingLead")}
              </Typography.Paragraph>

              {!isCentralLogin ? (
                <div className="mt-8 flex flex-col gap-4">
                  {tenantFeatures.map((item, index) => (
                    <div
                      key={item.key}
                      className={`login-feature-card login-anim-in flex gap-3.5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 shadow-sm shadow-black/10 ${featureAnimDelays[index] ?? "login-anim-delay-5"}`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/25">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{item.title}</div>
                        <p className="mb-0 mt-1 text-[13px] leading-snug text-slate-300">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Typography.Paragraph className="login-anim-in login-anim-delay-3 !mb-0 !mt-6 !rounded-xl !border !border-white/10 !bg-white/[0.05] !px-4 !py-3.5 !text-sm !leading-relaxed !text-slate-300">
                  {t("welcomeCentralBody")}
                </Typography.Paragraph>
              )}
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
            </Space>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-20 sm:px-8 lg:py-12">
            <div className="login-card-enter login-form-card relative w-full max-w-[min(100%,540px)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-8 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.03] backdrop-blur-md dark:border-white/[0.12] dark:bg-zinc-900/90 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)] dark:ring-white/[0.04] sm:p-10">
              <div
                className="login-top-accent-glow pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 opacity-95"
                aria-hidden
              />
              <div className="relative pt-1">
                <Typography.Title
                  level={3}
                  className="login-anim-in login-anim-delay-2 !mb-8 !mt-0 !text-[1.35rem] !font-semibold !leading-snug !tracking-tight !text-slate-900 dark:!text-white sm:!text-[1.65rem]"
                >
                  {t("title")}
                </Typography.Title>
                <Form
                  className="login-anim-in login-anim-delay-3"
                  form={form}
                  layout="vertical"
                  onFinish={onFinish}
                  requiredMark={false}
                  size="large"
                >
                  <Form.Item
                    label={
                      <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
                        {t("email")}
                      </span>
                    }
                    name="email"
                    className="!mb-5"
                    rules={[{ required: true, type: "email" }]}
                  >
                    <Input
                      id="login-email"
                      autoComplete="email"
                      className="login-form-input !rounded-lg !shadow-none"
                      placeholder={t("emailPlaceholder")}
                      prefix={
                        <MailOutlined
                          className="text-slate-400 dark:text-slate-500"
                          aria-hidden
                        />
                      }
                    />
                  </Form.Item>
                    <Form.Item
                    label={
                      <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
                        {t("password")}
                      </span>
                    }
                    name="password"
                    className="!mb-2"
                    rules={[{ required: true }]}
                  >
                    <Input.Password
                      id="login-password"
                      autoComplete="current-password"
                      className="login-form-input !rounded-lg !shadow-none"
                      placeholder={t("passwordPlaceholder")}
                      prefix={
                        <LockOutlined
                          className="text-slate-400 dark:text-slate-500"
                          aria-hidden
                        />
                      }
                    />
                  </Form.Item>
                  <div className="mb-6 flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      {t("forgotPassword")}
                    </Link>
                  </div>
                  <Form.Item className="!mb-0">
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<ArrowRightOutlined />}
                      iconPlacement="end"
                      loading={loginMutation.isPending}
                      block
                      size="large"
                      className="!h-12 !rounded-xl !text-[15px] !font-semibold !shadow-md !shadow-emerald-900/25 !transition-transform active:!scale-[0.99] motion-reduce:!transform-none"
                    >
                      {t("submit")}
                    </Button>
                  </Form.Item>
                </Form>
                <Divider className="login-anim-in login-anim-delay-5 !my-8 !border-slate-200/90 dark:!border-white/10" />
                <div className="login-anim-in login-anim-delay-6 flex items-start justify-center gap-2.5 text-center">
                  <LockOutlined
                    className="mt-0.5 shrink-0 text-emerald-600/85 dark:text-emerald-400/90"
                    aria-hidden
                  />
                  <p className="mb-0 text-start text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {t("secureNote")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LoginClient({ initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <LoginFormInner initialHost={initialHost} />
    </App>
  );
}
