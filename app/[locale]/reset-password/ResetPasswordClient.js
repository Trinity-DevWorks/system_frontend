"use client";

import centralApiService from "@/API/CentralApiService";
import tenantApiService from "@/API/TenantApiService";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import { Link, useRouter } from "@/i18n/navigation";
import {
  getApiErrorCode,
  getLocalizedApiErrorMessage,
} from "@/lib/api-error-notify";
import { resolveHostMode } from "@/lib/runtime-mode";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { App, Button, Form, Input, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { z } from "zod";

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    password_confirmation: z.string().min(8),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

function ResetPasswordForm({ initialHost }) {
  const t = useTranslations("ResetPassword");
  const tLogin = useTranslations("Login");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";
  const emailFromQuery = searchParams.get("email") || "";

  const mode = useMemo(() => resolveHostMode(initialHost), [initialHost]);
  const isCentral = mode.isCentral;
  const tenantLabel = mode.tenantSlug
    ? mode.tenantSlug.charAt(0).toUpperCase() + mode.tenantSlug.slice(1)
    : "Your";

  useEffect(() => {
    if (emailFromQuery) {
      form.setFieldsValue({ email: emailFromQuery });
    }
  }, [emailFromQuery, form]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const body = { ...payload, token };
      if (isCentral) {
        return centralApiService("POST", "reset-password", body);
      }
      return tenantApiService("POST", "auth/reset-password", body);
    },
    onSuccess: () => {
      message.success(t("success"));
      router.replace("/login");
    },
    onError: (err) => {
      const msg = getLocalizedApiErrorMessage(tApiErrors, err) || t("error");
      if (getApiErrorCode(err) === "PASSWORD_UNCHANGED") {
        form.setFields([{ name: "password", errors: [msg] }]);
      }
      message.error(msg);
    },
  });

  const onFinish = (values) => {
    if (!token) {
      message.error(t("missingToken"));
      return;
    }

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      form.setFields(
        parsed.error.issues.map((issue) => ({
          name: issue.path,
          errors: [issue.message],
        })),
      );
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <AuthSplitShell
      isCentral={isCentral}
      tenantLabel={tenantLabel}
      leadText={t("lead")}
    >
      <Typography.Title
        level={3}
        className="login-anim-in login-anim-delay-2 !mb-2 !mt-0 !text-[1.35rem] !font-semibold !leading-snug !tracking-tight !text-slate-900 dark:!text-white sm:!text-[1.65rem]"
      >
        {t("title")}
      </Typography.Title>
      <Typography.Paragraph className="login-anim-in login-anim-delay-2 !mb-8 !text-sm !text-slate-500 dark:!text-slate-400">
        {t("subtitle")}
      </Typography.Paragraph>

      {!token ? (
        <Typography.Paragraph className="!mb-6 !text-sm !text-amber-700 dark:!text-amber-400">
          {t("missingToken")}
        </Typography.Paragraph>
      ) : null}

      <Form
        className="login-anim-in login-anim-delay-3"
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        size="large"
        initialValues={{ email: emailFromQuery }}
      >
        <Form.Item
          label={
            <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
              {tLogin("email")}
            </span>
          }
          name="email"
          className="!mb-5"
          rules={[{ required: true, type: "email" }]}
        >
          <Input
            id="reset-email"
            autoComplete="email"
            className="login-form-input !rounded-lg !shadow-none"
            placeholder={tLogin("emailPlaceholder")}
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
          className="!mb-5"
          rules={[{ required: true, min: 8 }]}
        >
          <Input.Password
            id="reset-password"
            autoComplete="new-password"
            className="login-form-input !rounded-lg !shadow-none"
            placeholder={tLogin("passwordPlaceholder")}
            prefix={
              <LockOutlined
                className="text-slate-400 dark:text-slate-500"
                aria-hidden
              />
            }
          />
        </Form.Item>
        <Form.Item
          label={
            <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
              {t("passwordConfirmation")}
            </span>
          }
          name="password_confirmation"
          className="!mb-6"
          dependencies={["password"]}
          rules={[
            { required: true, min: 8 },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t("passwordMismatch")));
              },
            }),
          ]}
        >
          <Input.Password
            id="reset-password-confirmation"
            autoComplete="new-password"
            className="login-form-input !rounded-lg !shadow-none"
            placeholder={tLogin("passwordPlaceholder")}
            prefix={
              <LockOutlined
                className="text-slate-400 dark:text-slate-500"
                aria-hidden
              />
            }
          />
        </Form.Item>
        <Form.Item className="!mb-4">
          <Button
            type="primary"
            htmlType="submit"
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
            loading={mutation.isPending}
            disabled={!token}
            block
            size="large"
            className="!h-12 !rounded-xl !text-[15px] !font-semibold !shadow-md !shadow-emerald-900/25 !transition-transform active:!scale-[0.99] motion-reduce:!transform-none"
          >
            {t("submit")}
          </Button>
        </Form.Item>
      </Form>

      <div className="login-anim-in login-anim-delay-5 mt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <ArrowLeftOutlined aria-hidden />
          {t("backToLogin")}
        </Link>
      </div>
    </AuthSplitShell>
  );
}

export default function ResetPasswordClient({ initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <ResetPasswordForm initialHost={initialHost} />
    </App>
  );
}
