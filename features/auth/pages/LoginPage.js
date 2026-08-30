"use client";

import { centralRequest, tenantRequest } from "@/lib/axios";
import AuthSplitShell from "../components/AuthSplitShell";
import { useRouter, Link } from "@/i18n/navigation";
import { BRANCH_CONTEXT_QUERY_KEY, setActiveBranchId } from "@/lib/active-branch";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { AUTH_ME_QUERY_KEY } from "@/lib/auth-me";
import { clearQueryCacheOnAuthChange } from "@/lib/clear-query-cache-on-auth";
import { syncLocalPreferenceUserId } from "@/lib/local-preference-scope";
import { consumePendingAuthErrorCode } from "@/lib/pending-auth-error";
import { resolveHostMode } from "@/lib/runtime-mode";
import { setSessionToken } from "@/lib/session";
import { tenantModulesQueryKey } from "@/lib/tenant-modules";
import { companySettingsQueryKey } from "@/lib/company-settings";
import { fetchCompanySettings } from "@/lib/api/companySettings";
import { ArrowRightOutlined, CheckOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LOGIN_SUCCESS_REDIRECT_MS = 1600;

function LoginFormInner({ initialHost }) {
  const t = useTranslations("Login");
  const tApiErrors = useTranslations("ApiErrors");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loginSuccess, setLoginSuccess] = useState(false);
  const mode = useMemo(() => resolveHostMode(initialHost), [initialHost]);
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

  useEffect(() => {
    if (!loginSuccess) return undefined;
    const destination = isCentralLogin ? "/central" : "/main/overview";
    const timer = window.setTimeout(() => {
      router.replace(destination);
    }, LOGIN_SUCCESS_REDIRECT_MS);
    return () => window.clearTimeout(timer);
  }, [isCentralLogin, loginSuccess, router]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = isCentralLogin
        ? await centralRequest("POST", "login", { email, password })
        : await tenantRequest("POST", "auth/login", { email, password });

      const bearerToken = response?.access_token ?? response?.token;
      if (bearerToken) {
        clearQueryCacheOnAuthChange(queryClient);

        setSessionToken(isCentralLogin ? "central" : "tenant", bearerToken);

        if (!isCentralLogin) {
          const branchContext = response?.branch_context;
          const activeId = branchContext?.active_branch_id;
          if (activeId != null) {
            setActiveBranchId(activeId);
            queryClient.setQueryData(BRANCH_CONTEXT_QUERY_KEY, branchContext);
          }

          const me = response?.user ?? response?.me;
          if (me && typeof me === "object") {
            queryClient.setQueryData(AUTH_ME_QUERY_KEY, {
              ...me,
              permissions: response?.permissions ?? me.permissions,
            });
            syncLocalPreferenceUserId(me);
          } else if (response?.permissions != null) {
            queryClient.setQueryData(AUTH_ME_QUERY_KEY, {
              permissions: response.permissions,
            });
          }

          try {
            const assigned = await tenantRequest(
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

          try {
            const settingsPayload = await fetchCompanySettings();
            queryClient.setQueryData(
              companySettingsQueryKey(window.location.hostname),
              settingsPayload,
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
      setLoginSuccess(true);
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("error"));
    },
  });

  const onFinish = (values) => {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(
        parsed.error.issues.map((issue) => ({
          name: issue.path,
          errors: [issue.message],
        })),
      );
      return;
    }

    loginMutation.mutate(parsed.data);
  };

  return (
    <AuthSplitShell
      isCentral={isCentralLogin}
      tenantLabel={tenantLabel}
    >
      {loginSuccess ? (
        <div className="login-success py-2 text-center">
          <div className="login-success-check mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)]">
            <CheckOutlined className="text-[2rem] !text-[var(--app-success)]" aria-hidden />
          </div>
          <Typography.Title
            level={3}
            className="!mb-2 !mt-0 !text-2xl !font-bold !leading-snug !text-[var(--ant-color-text)]"
          >
            {t("loginSuccess")}
          </Typography.Title>
          <Typography.Paragraph className="!mb-6 !text-sm !text-[var(--ant-color-text-secondary)]">
            {isCentralLogin ? t("redirectingCentral") : t("redirecting")}
          </Typography.Paragraph>
          <div className="login-success-track h-2 w-full overflow-hidden rounded-full bg-[var(--ant-color-fill-secondary)]">
            <div className="login-success-bar h-full rounded-full" />
          </div>
        </div>
      ) : (
        <>
      <div className="mb-5 text-center">
        <Typography.Title
          level={3}
          className="!mb-1 !mt-0 !text-2xl !font-bold !leading-snug !tracking-tight !text-[var(--ant-color-text)]"
        >
          {t("title")}
        </Typography.Title>
        <Typography.Paragraph className="!mb-0 !text-sm !text-[var(--ant-color-text-secondary)]">
          {t("subtitle")}
        </Typography.Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        size="large"
      >
        <Form.Item
          label={t("email")}
          name="email"
          className="!mb-4"
          rules={[{ required: true, type: "email" }]}
        >
          <Input
            id="login-email"
            autoComplete="email"
            className="login-form-input"
            placeholder={t("emailPlaceholder")}
            prefix={<MailOutlined aria-hidden />}
          />
        </Form.Item>
        <Form.Item
          label={
            <span className="flex w-full items-center justify-between gap-3">
              <span>{t("password")}</span>
              <Link href="/forgot-password" className="login-inline-link text-sm font-medium">
                {t("forgotPassword")}
              </Link>
            </span>
          }
          name="password"
          className="!mb-5"
          rules={[{ required: true }]}
        >
          <Input.Password
            id="login-password"
            autoComplete="current-password"
            className="login-form-input"
            placeholder={t("passwordPlaceholder")}
            prefix={<LockOutlined aria-hidden />}
          />
        </Form.Item>
        <Form.Item className="!mb-0">
          <Button
            type="primary"
            htmlType="submit"
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
            loading={loginMutation.isPending}
            block
            size="large"
            className="login-submit-btn"
          >
            {t("submit")}
          </Button>
        </Form.Item>
      </Form>
        </>
      )}
    </AuthSplitShell>
  );
}

export default function LoginClient({ initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <LoginFormInner initialHost={initialHost} />
    </App>
  );
}
