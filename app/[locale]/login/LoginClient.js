"use client";

import centralApiService from "@/API/CentralApiService";
import tenantApiService from "@/API/TenantApiService";
import { useThemeMode } from "@/components/AntdAppProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { resolveHostMode } from "@/lib/runtime-mode";
import { setSessionToken } from "@/lib/session";
import { tenantModulesQueryKey } from "@/lib/tenant-modules";
import {
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function LoginFormInner({ initialHost }) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { toggleColorMode, colorMode } = useThemeMode();
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

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = isCentralLogin
        ? await centralApiService("POST", "login", { email, password })
        : await tenantApiService("POST", "login", { email, password });

      if (response?.access_token) {
        setSessionToken(
          isCentralLogin ? "central" : "tenant",
          response.access_token,
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
      if (isCentralLogin) {
        router.replace("/central");
        return;
      }
      router.replace("/");
    },
    onError: (err) => {
      message.error(err?.message || t("error"));
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

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center p-6">
      <Space
        className="absolute end-4 top-4"
        size="small"
        wrap
      >
        <Dropdown
          menu={{ items: languageMenuItems, onClick: onLanguageMenuClick }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Tooltip title={t("changeLanguage")}>
            <Button type="text" icon={<GlobalOutlined />} aria-label={t("changeLanguage")} />
          </Tooltip>
        </Dropdown>
        <Tooltip
          title={
            colorMode === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")
          }
        >
          <Button
            type="text"
            icon={colorMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleColorMode}
            aria-label={
              colorMode === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")
            }
          />
        </Tooltip>
      </Space>
      <Card className="w-full max-w-md" title={t("title")}>
        <Typography.Paragraph type="secondary">
          {isCentralLogin
            ? t("centralHint")
            : t("tenantHint", { name: tenantLabel })}
        </Typography.Paragraph>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            label={t("email")}
            name="email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item
            label={t("password")}
            name="password"
            rules={[{ required: true }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loginMutation.isPending}
              block
            >
              {t("submit")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default function LoginClient({ initialHost }) {
  return (
    <App>
      <LoginFormInner initialHost={initialHost} />
    </App>
  );
}
